const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ======================================================
   🔥 GLOBAL MIDDLEWARE
====================================================== */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://awto.vercel.app",
    ],
    methods: ["GET", "POST"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================================================
   🔥 FIREBASE ADMIN SETUP
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
   🔥 PAYPAL TOKEN
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
   📦 SMART CHECKOUT COMPLETION FOR HOSTED BUTTON
====================================================== */
app.post("/paypal-complete", async (req, res) => {
  console.log("📩 Request received:", req.body);

  try {
    const { orderId, tempLockId } = req.body;

    if (!orderId || !tempLockId) {
      console.log("❌ Missing required values:", req.body);
      return res.json({
        success: false,
        message: "Missing orderId or tempLockId",
        reservationId: tempLockId,
      });
    }

    console.log("🔑 Getting PayPal Token...");
    const token = await getPayPalToken();

    console.log("🔍 Checking PayPal Transaction...");
    const txLookup = await axios.get(
      `https://api-m.paypal.com/v1/reporting/transactions?transaction_id=${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const order = txLookup.data.transaction_details?.[0] || null;

    if (!order) {
      console.log("❌ No PayPal transaction found!");
      return res.json({
        success: false,
        message: "Transaction not found.",
        reservationId: tempLockId,
      });
    }

    const rawStatus = order.transaction_info?.transaction_status || "";
    const status = typeof rawStatus === "string" ? rawStatus.trim() : "";

    console.log("💳 PayPal Status:", status);

    const validStatuses = ["S","COMPLETED", "SUCCESS"];

    if (!validStatuses.some((s) => status.toUpperCase().includes(s.toUpperCase()))) {
      console.log("⚠ Payment invalid:", status);
      return res.json({
        success: false,
        message: `Payment not completed. Status: ${status}`,
        reservationId: tempLockId,
      });
    }

    console.log("🔍 Finding temp lock:", tempLockId);
    const tempDoc = await db.collection("temp_locks").doc(tempLockId).get();

    if (!tempDoc.exists) {
      console.log("❌ temp_locks NOT found");
      return res.json({
        success: false,
        message: "Temp reservation not found.",
        reservationId: tempLockId,
      });
    }

    const draftData = tempDoc.data();
    console.log("📌 Temp Data:", draftData);

    /* ---------- AUTO INCREMENT ---------- */
    const counterRef = db.collection("counters").doc("reservations");
    const counterSnap = await counterRef.get();
    const nextId = (counterSnap.exists ? counterSnap.data().lastId : 0) + 1;

    await counterRef.set({ lastId: nextId }, { merge: true });

    const reservationId = `RES${String(nextId).padStart(5, "0")}`;
    console.log("🆕 Reservation ID:", reservationId);

    /* ---------- SAVE FINAL BOOKING ---------- */
    await db.collection("reservations").doc(reservationId).set({
      id: reservationId,
      ...draftData,
      status: "Paid",
      paymentStatus: "Paid",
      paymentMethod: "PayPal",
      paypalStatus: status,
      paypalTransactionId: orderId,
      paidAt: new Date(),
      createdAt: new Date(),
      isCancelled: false,
    });

    await db.collection("temp_locks").doc(tempLockId).delete();

    const amountPaid =
      order.transaction_info?.transaction_amount?.value || draftData.downpayment;

    await sendPaymentEmail(
      draftData.userEmail,
      draftData.userName,
      reservationId,
      amountPaid
    );

    return res.json({ success: true, reservationId });

  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err);
    return res.json({
      success: false,
      message: "Server error",
      reservationId: req.body.tempLockId || null,
    });
  }
});

app.post("/send-reservation-email", async (req, res) => {
  const { email, name, reservationId, product, date } = req.body;

  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Joven Tire Enterprise",
          email: process.env.SENDER_EMAIL,
        },
        to: [{ email, name }],
        subject: `Reservation Confirmed - ${reservationId}`,
        htmlContent: `
          <h2>Reservation Confirmed</h2>
          <p>Hello <strong>${name}</strong>, your reservation has been submitted.</p>
          <p><strong>Reservation ID:</strong> ${reservationId}</p>
          <p><strong>Product:</strong> ${product}</p>
          <p><strong>Appointment Date:</strong> ${date}</p>
          <br>
          <p>You will receive another email if changes occur.</p>
        `,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed email:", err.response?.data || err.message);
    res.status(500).json({ success: false });
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
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
