const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ======================================================
   🔥 GLOBAL MIDDLEWARE (JSON for ALL normal routes)
====================================================== */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

/* ======================================================
   🔥 FIREBASE ADMIN SETUP (SERVER-SIDE)
====================================================== */
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

/* ======================================================
   📩 SEND EMAIL FUNCTION (Brevo)
====================================================== */
const sendPaymentEmail = async (customerEmail, name, reservationId, amount) => {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Joven Tire Enterprise",
          email: process.env.SENDER_EMAIL,
        },
        to: [{ email: customerEmail, name }],
        subject: `Payment Confirmed - Reservation ${reservationId}`,
        htmlContent: `
          <h2>✔ Payment Successful</h2>
          <p>Thank you for your payment.</p>
          <p><strong>Reservation ID:</strong> ${reservationId}</p>
          <p><strong>Amount Paid:</strong> ₱${amount}</p>
        `,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📩 Email sent:", customerEmail);
  } catch (err) {
    console.error("❌ Failed to send email:", err.response?.data || err.message);
  }
};

/* ======================================================
   🔥 PAYPAL TOKEN (LIVE)
====================================================== */
const getPayPalToken = async () => {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString("base64");

  const res = await axios.post(
    "https://api-m.paypal.com/v1/oauth2/token",
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return res.data.access_token;
};

/* ======================================================
   📦 SMART CHECKOUT COMPLETION ~ HOSTED BUTTON
====================================================== */
app.post("/paypal-complete", async (req, res) => {
  try {
    // ⭐ UPDATED — now expecting tempLockId instead of reservationId
    const { orderId, tempLockId } = req.body;

    if (!orderId || !tempLockId) {
      return res.status(400).json({
        success: false,
        message: "Missing orderId or tempLockId",
      });
    }

    const token = await getPayPalToken();

    const orderRes = await axios.get(
      `https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const order = orderRes.data;
    console.log("🔍 PayPal response status:", order.status);

    const validStatuses = [
      "COMPLETED",
      "PENDING",
      "APPROVED",
      "PAYER_ACTION_REQUIRED",
      "HELD",
      "ONHOLD",
      "PARTIALLY_CAPTURED",
      "AWAITING_SELLER_ACTION",
    ];

    if (!validStatuses.includes(order.status)) {
      console.log("❌ PayPal order rejected:", order.status);
      return res.status(400).json({ success: false });
    }

    /* ---------------- Step 1: Get Temp Reservation Draft ---------------- */
    const tempDoc = await db.collection("temp_locks").doc(tempLockId).get();
    if (!tempDoc.exists) {
      return res.status(404).json({ success: false, message: "Temp reservation not found." });
    }

    const draftData = tempDoc.data();

    /* ---------------- Step 2: Generate new reservationId ---------------- */
    const counterRef = db.collection("counters").doc("reservations");
    const counterSnap = await counterRef.get();
    const nextId = (counterSnap.exists ? counterSnap.data().lastId : 0) + 1;

    await counterRef.set({ lastId: nextId }, { merge: true });

    const reservationId = `RES${String(nextId).padStart(5, "0")}`;

    /* ---------------- Step 3: Create Final Reservation ---------------- */
    await db.collection("reservations").doc(reservationId).set({
      id: reservationId,
      ...draftData,
      status: order.status === "COMPLETED" ? "Paid" : "Payment Under Review",
      paymentStatus: "paid",
      paypalStatus: order.status,
      paidAt: new Date(),
      paypalOrderId: orderId,
      isCancelled: false,
      createdAt: new Date(),
    });

    /* ---------------- Step 4: Cleanup temp lock ---------------- */
    await db.collection("temp_locks").doc(tempLockId).delete();

    /* ---------------- Step 5: Email Confirmation ---------------- */
    const paymentDetails = order?.purchase_units?.[0]?.payments?.captures?.[0];
    const amountPaid = paymentDetails?.amount?.value || draftData.downpayment;

    await sendPaymentEmail(draftData.userEmail, draftData.userName, reservationId, amountPaid);

    console.log("✔ Reservation finalized:", reservationId);

    return res.json({ success: true, reservationId });

  } catch (err) {
    console.error("❌ PayPal complete error:", err.response?.data || err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ======================================================
   💳 PAYMONGO (LEGACY)
====================================================== */
app.post("/create-payment", async (req, res) => {
  const { amount, description, email, reservationId } = req.body;

  try {
    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            line_items: [
              {
                name: description || "Downpayment",
                amount: Math.round(amount * 100),
                currency: "PHP",
                quantity: 1,
              },
            ],
            payment_method_types: ["card", "gcash", "grab_pay"],
            send_email_receipt: true,
            description: description || "Reservation Payment",
            billing: { email, name: email },
            success_url: "https://awto.vercel.app/payment-success",
            cancel_url: "https://awto.vercel.app/payment-failed",
            metadata: { reservationId },
          },
        },
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
              "base64"
            ),
          "Content-Type": "application/json",
        },
      }
    );

    const checkoutUrl =
      response.data.data.attributes.checkout_url ||
      response.data.data.attributes.redirect?.checkout_url;

    res.status(200).send({ success: true, checkoutUrl });
  } catch (error) {
    console.error("❌ FULL PayMongo ERROR:", error.response?.data || error);
    res.status(500).send({ success: false });
  }
});

/* ======================================================
   🧪 TEST ROUTE
====================================================== */
app.get("/test", (req, res) => {
  res.send("Backend is working!");
});

/* ======================================================
   🚀 START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend running on port ${PORT}`)
);
