// awto/joven/backend/index.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

/* ======================================================
   🔥 RAW BODY PARSER FOR PAYMONGO SIGNATURE VERIFICATION
====================================================== */
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // PayMongo requires this
    },
  })
);

app.use(cors());

/* ======================================================
   🔥 FIREBASE SETUP (for updating reservation status)
====================================================== */
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, updateDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.FB_API_KEY,
  authDomain: process.env.FB_AUTH_DOMAIN,
  projectId: process.env.FB_PROJECT_ID,
  storageBucket: process.env.FB_STORAGE_BUCKET,
  messagingSenderId: process.env.FB_SENDER_ID,
  appId: process.env.FB_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

/* ======================================================
   📩 BREVO - Send Email
====================================================== */
app.post("/send-email", async (req, res) => {
  const { to, name, subject, htmlContent } = req.body;

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Joven Tire Enterprise",
          email: process.env.SENDER_EMAIL,
        },
        to: [{ email: to, name }],
        subject,
        htmlContent,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).send({ success: true, data: response.data });
  } catch (error) {
    console.error("❌ Brevo error:", error.response?.data || error.message);
    res.status(500).send({ success: false, error: error.message });
  }
});

/* ======================================================
   💳 PAYMONGO - Create Checkout Session (LIVE READY)
====================================================== */
app.post("/create-payment", async (req, res) => {
  const { amount, description, email, reservationId } = req.body;

  console.log("💰 Creating payment with amount:", amount);
  console.log("🧾 Reservation ID:", reservationId);
  console.log("📧 Customer Email:", email);

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
            description: description || "Reservation Payment",
            send_email_receipt: true,

            billing: {
              email,
              name: email,
            },

            success_url: "http://localhost:5173/payment-success",
            cancel_url: "http://localhost:5173/payment-failed",

            metadata: { reservationId },
          },
        },
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64"),
          "Content-Type": "application/json",
        },
      }
    );

    const checkoutUrl =
      response.data.data.attributes.checkout_url ||
      response.data.data.attributes.redirect?.checkout_url;

    res.status(200).send({ success: true, checkoutUrl });

  } catch (error) {

    // ⭐⭐⭐ FULL PAYMENT ERROR LOGGING ADDED HERE ⭐⭐⭐
    console.error("❌ FULL PayMongo ERROR OBJECT:", error);
    console.error("❌ PayMongo RESPONSE DATA:", error.response?.data);
    console.error("❌ PayMongo RESPONSE STATUS:", error.response?.status);
    console.error("❌ PayMongo REQUEST DATA SENT:", {
      amount,
      description,
      email,
      reservationId
    });

    res.status(500).send({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

/* ======================================================
   🔔 PAYMONGO WEBHOOK - PAYMENT VERIFIED
====================================================== */
app.post("/webhook/paymongo", async (req, res) => {
  try {
    const signature = req.headers["paymongo-signature"];
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

    const computed = crypto
      .createHmac("sha256", secret)
      .update(req.rawBody)
      .digest("hex");

    if (computed !== signature) {
      console.log("❌ Invalid webhook signature — rejected");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;
    const eventType = event.data?.attributes?.type;

    console.log("📩 Webhook Event:", eventType);

    if (eventType === "payment.paid") {
      const paymentAttributes = event.data.attributes.data.attributes;
      const reservationId = paymentAttributes.metadata.reservationId;

      if (!reservationId) {
        console.log("⚠️ No reservationId found in metadata.");
        return res.status(200).send("OK");
      }

      console.log("💰 Payment confirmed for reservation:", reservationId);

      const reservationRef = doc(db, "reservations", reservationId);
      await updateDoc(reservationRef, {
        paymentStatus: "paid",
        paidAt: new Date(),
      });

      console.log("✅ Firestore updated (paymentStatus = paid)");
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).send("Webhook error");
  }
});

/* ======================================================
   🚀 SERVER START
====================================================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend server running on port ${PORT}`)
);
