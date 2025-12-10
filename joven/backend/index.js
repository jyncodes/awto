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
   📩 SEND EMAIL FUNCTION (Brevo)
====================================================== */
const sendPaymentEmail = async (customerEmail, name, reservationId, productName, appointmentDate) => {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Joven Tire Enterprise",
          email: process.env.SENDER_EMAIL,
        },
        to: [{ email: customerEmail, name }],
        subject: `✔ Reservation Confirmed - ${reservationId}`,
        htmlContent: `
          <h2>Thank you, ${name}!</h2>
          <p>Your reservation has been successfully submitted.</p>

          <p><strong>Reservation ID:</strong> ${reservationId}</p>
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>Appointment Date:</strong> ${appointmentDate}</p>

          <br/><br/>
          <p>We will notify you once your schedule is approved.</p>
          <p>— Joven Tire Enterprise</p>
        `,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📩 Confirmation email sent.");
  } catch (err) {
    console.error("❌ Email sending error:", err.response?.data || err.message);
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
   🎯 SIMPLIFIED PAYPAL CHECK ROUTE
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

    const payerEmail = order.payer_info?.email_id || "unknown@customer.com";
    const payerName =
      order.payer_info?.payer_name?.alternative_full_name ||
      order.payer_info?.payer_name?.given_name ||
      "Customer";

    const amount = order.transaction_info?.transaction_amount?.value || "0";

    return res.json({
      success: isPaid,
      status,
      email: payerEmail,
      name: payerName,
      amount,
    });

  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err);
    return res.json({ success: false, message: "Server Error" });
  }
});

/* ======================================================
   📧 Trigger Email After Reservation Save
====================================================== */
app.post("/send-confirmation", async (req, res) => {
  const { email, name, reservationId, productName, date } = req.body;

  if (!email || !reservationId) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    await sendPaymentEmail(email, name, reservationId, productName, date);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
