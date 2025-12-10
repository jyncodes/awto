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
   🎯 SIMPLIFIED PAYPAL PAYMENT COMPLETION
====================================================== */
app.post("/paypal-complete", async (req, res) => {
  console.log("📩 Request received:", req.body);

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.json({ success: false, message: "Missing order ID" });
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

    const order = txLookup.data.transaction_details?.[0];

    if (!order) return res.json({ success: false, message: "PayPal transaction not found." });

    const status = order.transaction_info?.transaction_status?.toUpperCase() || "UNKNOWN";
    console.log("💳 PayPal Status:", status);

    const allowed = ["COMPLETED", "SUCCESS", "S", "OK", "CAPTURED"];
    const isPaid = allowed.some((s) => status.includes(s));

    if (!isPaid) {
      return res.json({
        success: false,
        message: `Payment not completed. Status: ${status}`,
      });
    }

    /* ---------- AUTO INCREMENT RESERVATION ID ---------- */
    const counterRef = db.collection("counters").doc("reservations");
    const snap = await counterRef.get();
    const nextId = (snap.exists ? snap.data().lastId : 0) + 1;

    await counterRef.set({ lastId: nextId }, { merge: true });

    const reservationId = `RES${String(nextId).padStart(5, "0")}`;

    /* ---------- STORE BASIC RESERVATION (NO tempLockId NEEDED) ---------- */
    const payerEmail = order.payer_info?.email_id || "unknown@customer.com";
    const buyer = order.payer_info?.payer_name?.alternate_full_name || "Customer";

    const amount =
      order.transaction_info?.transaction_amount?.value || "0";

    await db.collection("reservations").doc(reservationId).set({
      id: reservationId,
      userEmail: payerEmail,
      userName: buyer,
      totalPrice: amount,
      downpayment: amount,
      productName: "No linked product (Manual Assignment Required)",
      status: "Paid",
      paymentMethod: "PayPal",
      paypalTransactionId: orderId,
      paypalStatus: status,
      createdAt: new Date(),
      paidAt: new Date(),
      isCancelled: false,
    });

    await sendPaymentEmail(payerEmail, buyer, reservationId, amount);

    return res.json({ success: true, reservationId });

  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err);
    return res.json({ success: false, message: "Server Error" });
  }
});

/* ======================================================
   🧪 TEST ROUTE
====================================================== */
app.get("/test", (req, res) => {
  res.send("Backend is running and accessible!");
});

/* ======================================================
   🚀 START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
