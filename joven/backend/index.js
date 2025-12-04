const express = require("express");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

/* ======================================================
   🔥 GLOBAL MIDDLEWARE (JSON for ALL normal routes)
====================================================== */
app.use(cors());
app.use(express.json()); // JSON parser for all non-webhook routes

/* ======================================================
   🔥 FIREBASE SETUP
====================================================== */
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, updateDoc } = require("firebase/firestore");

// use the VITE_FIREBASE_ envs you already have in .env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
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
   🔥 PAYPAL INVOICE (STILL HERE IF YOU NEED IT)
====================================================== */
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
    res.status(500).json({ success: false });
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
    res.status(500).json({ success: false });
  }
});

/* ======================================================
   ✅ PAYPAL SMART CHECKOUT COMPLETE (NEW)
====================================================== */
app.post("/paypal-complete", async (req, res) => {
  try {
    const { orderId, reservationId } = req.body;

    if (!orderId || !reservationId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing orderId or reservationId" });
    }

    const token = await getPayPalToken();

    // Get order details from PayPal (LIVE)
    const orderRes = await axios.get(
      `https://api-m.paypal.com/v2/checkout/orders/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );


    const order = orderRes.data;
    
        console.log("🔍 PayPal response status:", order.status);


    // Accept PayPal statuses that mean payment is captured or pending review
      const validStatuses = [
      "COMPLETED",
      "PENDING",
      "APPROVED",
      "PAYER_ACTION_REQUIRED",
      "HELD",
      "ONHOLD",
      "PARTIALLY_CAPTURED",
      "AWAITING_SELLER_ACTION"
    ];

    if (!validStatuses.includes(order.status)) {
      console.log("❌ PayPal order rejected:", order.status);
      return res.status(400).json({ success: false });
    }

    // Update Firestore reservation
      await updateDoc(doc(db, "reservations", reservationId), {
        paymentStatus: "paid",
        paypalStatus: order.status,
        status:
          order.status === "COMPLETED"
            ? "Paid"
            : "Payment Under Review",
        paidAt: new Date(),
        paypalOrderId: orderId,
      });

    console.log("✔ PayPal payment verified & Firestore updated:", reservationId);

    res.json({ success: true });
  } catch (err) {
    console.error("❌ PayPal complete error:", err.response?.data || err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ======================================================
   💳 PAYMONGO CHECKOUT SESSION (LEGACY, CAN DELETE LATER)
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
    res.status(500).send({ success: false });
  }
});

/* ======================================================
   🔔 PAYMONGO WEBHOOK (LEGACY)
====================================================== */
app.post(
  "/webhook/paymongo",
  express.raw({ type: "*/*" }), // raw ONLY for webhook
  async (req, res) => {
    try {
      const signature = req.headers["paymongo-signature"];
      const secret = process.env.PAYMONGO_WEBHOOK_SECRET;

      const computed = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (computed !== signature) {
        console.log("❌ Invalid signature");
        return res.status(400).send("Invalid signature");
      }

      const event = JSON.parse(req.body.toString());
      const eventType = event.data?.attributes?.type;

      console.log("🚀 Webhook received:", eventType);

      if (eventType === "checkout_session.payment.paid") {
        const attributes = event.data.attributes.data.attributes;
        const reservationId = attributes.metadata.reservationId;

        await updateDoc(doc(db, "reservations", reservationId), {
          paymentStatus: "paid",
          paidAt: new Date(),
        });

        console.log("✔ Payment verified & Firestore updated:", reservationId);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.status(500).send("Webhook error");
    }
  }
);

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
