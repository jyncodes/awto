// awto/joven/backend/index.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* ===========================
   📩 BREVO - Send Email
=========================== */
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

/* ===========================
   💳 PAYMONGO - Create Checkout Session
=========================== */
app.post("/create-payment", async (req, res) => {
  const { amount, description, email } = req.body;

  try {
    const response = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Convert to centavos
            currency: "PHP",
            description: description || "Reservation Payment",
            cancel_url: "http://localhost:5173/payment-failed",
            success_url: "http://localhost:5173/payment-success",
            payment_method_types: ["card", "gcash", "paymaya"],
            billing: {
              name: email,
              email: email,
            },
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

    const checkoutUrl = response.data.data.attributes.checkout_url;
    res.status(200).send({ success: true, checkoutUrl });
  } catch (error) {
    console.error("❌ PayMongo error:", error.response?.data || error.message);
    res
      .status(500)
      .send({ success: false, error: error.response?.data || error.message });
  }
});

/* ===========================
   🚀 Server Start
=========================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend server running on port ${PORT}`)
);
