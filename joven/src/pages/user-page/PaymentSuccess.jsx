// src/pages/user-page/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { jsPDF } from "jspdf";
import { db } from "../../firebase";
import "../../styles/user-styles/PaymentSuccess.css";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [status, setStatus] = useState("Processing payment...");
  const [transactionId, setTransactionId] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [reservationId, setReservationId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);

    const txId =
      queryParams.get("tx") ||
      queryParams.get("txn_id") ||
      queryParams.get("token") ||
      queryParams.get("PayerID") ||
      queryParams.get("paymentId");

    setTransactionId(txId);

    const verifyPayment = async () => {
      if (!txId) return;

      setStatus("✔ Retrieving payment details...");

      try {
        const response = await fetch(`${BACKEND_URL}/paypal-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: txId }),
        });

        const result = await response.json();

        if (!result.success) {
          setStatus("⚠ Payment detected but not verified — manual confirmation required");
        } else {
          setStatus("✔ Payment Verified — Ready to finalize reservation");
        }

        setPaymentInfo(result);
      } catch {
        setStatus("⚠ Unable to contact server — showing fallback details.");
      }
    };

    verifyPayment();
  }, [location, BACKEND_URL]);

  /* -------------- PDF RECEIPT -------------- */
  const downloadReceipt = () => {
    if (!paymentInfo) return;

    // FIX: use generated reservation ID OR fallback format
    const fallbackId = reservationId || `TEMP-${transactionId?.slice(-6)}`;

    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Joven Tire Enterprise", 15, 15);

    docPDF.setFontSize(12);
    docPDF.text("Official Downpayment Receipt", 15, 25);
    docPDF.line(15, 30, 195, 30);

    docPDF.text(`Reservation ID: ${fallbackId}`, 15, 40);
    docPDF.text(`Customer Name: ${paymentInfo.name || ""}`, 15, 50);
    docPDF.text(`Amount Paid: ₱${paymentInfo.amount || ""}`, 15, 60);
    docPDF.text(`Payment Method: PayPal`, 15, 70);
    docPDF.text(`Transaction ID: ${transactionId || "Not detected"}`, 15, 80);
    docPDF.text(`Printed On: ${new Date().toLocaleString()}`, 15, 90);

    docPDF.save(`Receipt-${fallbackId}.pdf`);
  };

  /* -------------- CREATE RESERVATION ONLY WHEN USER CLICKS FINISH -------------- */
  const finalizeReservation = async () => {
    if (isSaved || !paymentInfo) return;

    setStatus("📦 Saving reservation...");

    try {
      // Auto-increment counter
      const counterRef = doc(db, "counters", "reservations");
      await setDoc(counterRef, { lastId: increment(1) }, { merge: true });

      const counterSnap = await getDoc(counterRef);
      const nextId = counterSnap.data().lastId;
      const newResId = `RES${String(nextId).padStart(5, "0")}`;
      setReservationId(newResId);

      // Save reservation
      await setDoc(doc(db, "reservations", newResId), {
        id: newResId,
        userEmail: paymentInfo.email,
        userName: paymentInfo.name,
        downpayment: paymentInfo.amount,
        totalPrice: paymentInfo.amount,
        transactionId,
        productName: "(Customer product is stored separately)",
        status: "Awaiting Approval",
        paymentMethod: "PayPal",
        createdAt: serverTimestamp(),
      });

      // Send confirmation email
      await fetch(`${BACKEND_URL}/send-reservation-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: paymentInfo.email,
          name: paymentInfo.name,
          reservationId: newResId,
          product: "(Order submitted)",
          date: new Date().toLocaleDateString(),
        }),
      });

      setIsSaved(true);
      setStatus("✔ Reservation successfully created!");

      alert("🎉 Reservation Completed!");
    } catch (err) {
      console.log(err);
      alert("❌ Could not save reservation. Try again.");
    }
  };

  return (
    <div className="payment-success-page">
      <h2>✔ Payment Status</h2>

      <div className="payment-success-card">
        <p className="payment-success-status">{status}</p>

        {paymentInfo && (
          <>
            <div className="receipt-box">
              <h4>Payment Summary</h4>
              <p><strong>Customer:</strong> {paymentInfo.name}</p>
              <p><strong>Email:</strong> {paymentInfo.email}</p>
              <p><strong>Amount Paid:</strong> ₱{paymentInfo.amount}</p>
              <p><strong>Transaction ID:</strong> {transactionId}</p>
            </div>

            <button className="success-button" onClick={downloadReceipt}>
              📄 Download Receipt
            </button>

            <button
              className="success-button finish-btn"
              disabled={isSaved}
              onClick={finalizeReservation}
            >
              {isSaved ? "✔ Reservation Saved" : "✅ Finish Reservation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
