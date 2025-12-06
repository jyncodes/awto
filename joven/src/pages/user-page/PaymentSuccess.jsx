// src/pages/user-page/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { jsPDF } from "jspdf";
import { db } from "../../firebase";
import "../../styles/user-styles/PaymentPage.css";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [status, setStatus] = useState("Processing payment...");
  const [reservation, setReservation] = useState(null);
  const [transactionId, setTransactionId] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const txId = queryParams.get("tx");
    const reservationId = localStorage.getItem("activeReservationId");
    setTransactionId(txId);

    if (!txId || !reservationId) {
      setStatus("⚠ Unable to verify payment.");
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/paypal-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: txId, reservationId }),
        });

        const data = await res.json();

        if (data.success) {
          setStatus("🎉 Payment Confirmed!");
        } else {
          setStatus("⚠ Payment could not be verified.");
        }

        const snap = await getDoc(doc(db, "reservations", reservationId));
        if (snap.exists()) setReservation(snap.data());

        localStorage.removeItem("activeReservationId");
      } catch (err) {
        console.error(err);
        setStatus("❌ Error verifying payment.");
      }

      setTimeout(() => navigate("/profile?tab=reservations"), 6000);
    };

    verifyPayment();
  }, [location, navigate, BACKEND_URL]);

  /* ------------------------------ 🔧 Generate Receipt PDF ------------------------------ */
  const downloadReceipt = () => {
    if (!reservation) return;

    const docPDF = new jsPDF();

    docPDF.setFontSize(18);
    docPDF.text("Joven Tire Enterprise", 15, 15);

    docPDF.setFontSize(12);
    docPDF.text("Official Payment Receipt", 15, 25);

    docPDF.line(15, 30, 195, 30);

    docPDF.text(`Reservation ID: ${reservation.id}`, 15, 40);
    docPDF.text(`Customer: ${reservation.userName}`, 15, 50);
    docPDF.text(`Product: ${reservation.productName}`, 15, 60);
    docPDF.text(`Downpayment: ₱${reservation.downpayment?.toLocaleString()}`, 15, 70);
    docPDF.text(`Transaction ID: ${transactionId}`, 15, 80);
    docPDF.text(`Date Paid: ${new Date().toLocaleString()}`, 15, 90);

    docPDF.line(15, 100, 195, 100);

    docPDF.text("Thank you for your payment!", 15, 115);

    docPDF.save(`Receipt-${reservation.id}.pdf`);
  };

  return (
    <div className="payment-page" style={{ animation: "fadeIn 0.4s" }}>
      <h2>✔ Payment Successful</h2>

      <div className="payment-card">
        <p style={{ fontWeight: "bold", color: "#008000", fontSize: "18px" }}>
          {status}
        </p>

        {reservation && (
          <div style={{ marginTop: "12px", textAlign: "left" }}>
            <p><strong>Reservation ID:</strong> {reservation.id}</p>
            <p><strong>Product:</strong> {reservation.productName}</p>
            <p><strong>Downpayment Paid:</strong> ₱{reservation.downpayment?.toLocaleString()}</p>
            <p><strong>Customer:</strong> {reservation.userName}</p>
            <p><strong>Transaction ID:</strong> {transactionId}</p>
            <br />
            <p style={{ fontSize: "12px", opacity: 0.7 }}>
              A confirmation email has also been sent to you.
            </p>
          </div>
        )}

        {/* 📎 New: Receipt Button */}
        {reservation && (
          <button
            className="pay-button"
            style={{ marginTop: "18px", background: "#4A90E2" }}
            onClick={downloadReceipt}
          >
            📄 Download Receipt (PDF)
          </button>
        )}

        <p style={{ marginTop: "16px", fontSize: "14px", opacity: 0.7 }}>
          Redirecting you to your reservation list...
        </p>
      </div>

      <button
        className="pay-button"
        onClick={() => navigate("/profile?tab=reservations")}
        style={{ marginTop: "16px" }}
      >
        View My Reservations →
      </button>
    </div>
  );
};

export default PaymentSuccess;
