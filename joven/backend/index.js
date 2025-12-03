const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

/* ======================================================
   🔥 RAW BODY PARSER — REQUIRED BY PAYMONGO WEBHOOKS
====================================================== */

// 1) Capture raw body BEFORE json parser
app.use(
  express.raw({ type: "*/*" })  // <--- REQUIRED
);

// 2) After raw parser, enable JSON parsing while keeping rawBody
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // PayMongo uses this for signature check
    },
  })
);

app.use(cors());

/* ======================================================
   🔥 FIREBASE SETUP
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
   📩 BREVO — SEND EMAIL
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
   🔥 PAYPAL — TOKEN + INVOICE
====================================================== */
const getPayPalToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

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

app.post("/create-paypal-invoice", async (req, res) => {
  try {
    const { amount, customerEmail, customerName, reservationId } = req.body;

    const token = await getPayPalToken();

    const invoiceData = {
      detail: {
        currency_code: "PHP",
        invoice_number: `INV-${Date.now()}`,
        reference: reservationId,
        note: "Joven Tire Enterprise Reservation Payment",
      },
      invoicer: {
        name: { given_name: "Joven Tire Enterprise" },
        email_address: process.env.SENDER_EMAIL,
      },
      primary_recipients: [
        {
          billing_info: {
            name: { given_name: customerName || "Customer" },
            email_address: customerEmail,
          },
        },
      ],
      items: [
        {
          name: "Reservation Downpayment",
          description: "Tire/Wheel Reservation",
          quantity: "1",
          unit_amount: { currency_code: "PHP", value: String(amount) },
        },
      ],
    };

    const response = await axios.post(
      "https://api-m.paypal.com/v2/invoicing/invoices",
      invoiceData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.send({
      success: true,
      invoiceId: response.data.id,
      message: "Invoice created successfully",
    });
  } catch (err) {
    console.error("❌ PayPal Create Invoice Error:", err.response?.data || err);
    res.status(500).json({ success: false, error: err.response?.data || err });
  }
});

app.post("/send-paypal-invoice", async (req, res) => {
  try {
    const { invoiceId } = req.body;

    const token = await getPayPalToken();

    await axios.post(
      `https://api-m.paypal.com/v2/invoicing/invoices/${invoiceId}/send`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.send({ success: true, message: "Invoice sent successfully" });
  } catch (err) {
    console.error("❌ PayPal Send Invoice Error:", err.response?.data || err);
    res.status(500).json({ success: false, error: err.response?.data || err });
  }
});

/* ======================================================
   💳 PAYMONGO — CHECKOUT SESSION
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
    console.error("❌ FULL PayMongo ERROR:", error.response?.data || error);
    res.status(500).send({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

/* ======================================================
   🔔 PAYMONGO WEBHOOK — PAYMENT VERIFIED
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
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;
    const eventType = event.data?.attributes?.type;

    if (eventType === "checkout_session.payment.paid") {
      const attributes = event.data.attributes.data.attributes;
      const reservationId = attributes.metadata.reservationId;

      if (reservationId) {
        const ref = doc(db, "reservations", reservationId);
        await updateDoc(ref, {
          paymentStatus: "paid",
          paidAt: new Date(),
        });
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).send("Webhook error");
  }
});

/* ======================================================
   🚀 START SERVER
====================================================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend running on port ${PORT}`)
);
