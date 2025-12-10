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
  const [reservationId, setReservationId] = useState(null);
  const [transactionId, setTransactionId] = useState(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);

    // Detect all possible PayPal return params
    const txId =
      queryParams.get("tx") ||
      queryParams.get("txn_id") ||
      queryParams.get("token") ||
      queryParams.get("PayerID") ||
      queryParams.get("paymentId");

    setTransactionId(txId);

    // ✅ FIX: Read tempLockId from PayPal response OR localStorage
    const tempLockId =
      queryParams.get("custom") || localStorage.getItem("activeTempLockId");

    if (!txId || !tempLockId) {
      setStatus("⚠ Unable to verify payment.");
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/paypal-complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: txId, tempLockId }),
        });

        const result = await response.json();

        if (!result.success) {
          setStatus("⚠ Payment verification failed.");
          return;
        }

        const newReservationId = result.reservationId;
        setReservationId(newReservationId);

        const finalSnap = await getDoc(doc(db, "reservations", newReservationId));

        if (finalSnap.exists()) {
          setReservation(finalSnap.data());
          setStatus("🎉 Payment Confirmed!");
        } else {
          setStatus("⚠ Reservation not found but payment succeeded.");
        }

        localStorage.removeItem("activeTempLockId");
      } catch (err) {
        console.error(err);
        setStatus("❌ Error verifying payment.");
      }

      // Auto redirect after 5s
      setTimeout(() => navigate("/profile?tab=reservations"), 5000);
    };

    verifyPayment();
  }, [location, navigate, BACKEND_URL]);

  /* PDF Download */
  const downloadReceipt = () => {
    if (!reservation) return;

    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Joven Tire Enterprise", 15, 15);

    docPDF.setFontSize(12);
    docPDF.text("Official Payment Receipt", 15, 25);

    docPDF.line(15, 30, 195, 30);

    docPDF.text(`Reservation ID: ${reservationId}`, 15, 40);
    docPDF.text(`Customer: ${reservation.userName}`, 15, 50);
    docPDF.text(`Product: ${reservation.productName}`, 15, 60);
    docPDF.text(`Downpayment: ₱${reservation.downpayment?.toLocaleString()}`, 15, 70);
    docPDF.text(`Transaction ID: ${transactionId}`, 15, 80);
    docPDF.text(`Date Paid: ${new Date().toLocaleString()}`, 15, 90);

    docPDF.line(15, 100, 195, 100);

    docPDF.text("Thank you for your payment!", 15, 115);

    docPDF.save(`Receipt-${reservationId}.pdf`);
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
            <p><strong>Reservation ID:</strong> {reservationId}</p>
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
