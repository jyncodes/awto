// src/pages/user-page/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { jsPDF } from "jspdf";
import { db } from "../../firebase";
import "../../styles/user-styles/PaymentSuccess.css";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [status, setStatus] = useState("Processing payment...");
  const [reservation, setReservation] = useState(null);
  const [reservationId, setReservationId] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);

    const txId =
      queryParams.get("tx") ||
      queryParams.get("txn_id") ||
      queryParams.get("token") ||
      queryParams.get("PayerID") ||
      queryParams.get("paymentId");

    setTransactionId(txId);

    const tempLockId =
      queryParams.get("custom") || localStorage.getItem("activeTempLockId");

    const verifyPayment = async () => {
      let fetchedReservationId = tempLockId;

      // ================= LOCALHOST UI TEST MODE (NO PAYMENT) =================
      if (window.location.hostname === "localhost") {
        setStatus("🧪 Local Test Mode — No PayPal Connected");
        setIsVerified(false);
        fetchedReservationId = "TEST-RESERVATION";
      }

      // ================= PAYPAL VERIFY FLOW (LIVE WEBSITE ONLY) =================
      if (txId && tempLockId && window.location.hostname !== "localhost") {
        try {
          const response = await fetch(`${BACKEND_URL}/paypal-complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: txId, tempLockId }),
          });

          const result = await response.json();
          fetchedReservationId = result?.reservationId ?? tempLockId;

          if (result?.success === true) {
            setStatus("🎉 Payment Verified Successfully!");
            setIsVerified(true);
          } else {
            setStatus("⚠ Payment could not be verified — but details are shown.");
            setIsVerified(false);
          }
        } catch {
          setStatus("⚠ Verification failed — showing stored details.");
          setIsVerified(false);
        }
      }

      setReservationId(fetchedReservationId);

      // =============== LOAD RESERVATION FROM FIREBASE IF EXISTS ===============
      if (fetchedReservationId !== "TEST-RESERVATION") {
        const snap = await getDoc(doc(db, "reservations", fetchedReservationId));
        if (snap.exists()) setReservation(snap.data());
      }

      // =============== FALLBACK FOR LOCALHOST FROM DRAFT ======================
      if (window.location.hostname === "localhost" && !reservation) {
        const draft = JSON.parse(localStorage.getItem("reservationDraft"));
        if (draft) setReservation(draft);
      }

      localStorage.removeItem("activeTempLockId");
    };

    verifyPayment();
  }, [location, BACKEND_URL]);

  /* Generate PDF Receipt */
  const downloadReceipt = () => {
    if (!reservation) return;

    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Joven Tire Enterprise", 15, 15);

    docPDF.setFontSize(12);
    docPDF.text("Official Downpayment Receipt", 15, 25);
    docPDF.line(15, 30, 195, 30);

    docPDF.text(`Reservation ID: ${reservationId}`, 15, 40);
    docPDF.text(`Customer Name: ${reservation.userName}`, 15, 50);
    docPDF.text(`Product: ${reservation.productName}`, 15, 60);
    docPDF.text(`Price: ₱${reservation.totalPrice?.toLocaleString()}`, 15, 70);
    docPDF.text(`Downpayment: ₱${reservation.downpayment?.toLocaleString()}`, 15, 80);
    docPDF.text(`Payment Method: PayPal Invoice`, 15, 90);
    docPDF.text(`Transaction ID: ${transactionId || "Not detected"}`, 15, 100);
    docPDF.text(`Printed On: ${new Date().toLocaleString()}`, 15, 110);

    docPDF.line(15, 120, 195, 120);
    docPDF.text("Please present this receipt upon arrival.", 15, 135);

    docPDF.save(`Receipt-${reservationId}.pdf`);
  };

  /* Save Final Reservation */
  const finalizeReservation = async () => {
    if (!reservation || isSaved || !isVerified) return;

    try {
      await updateDoc(doc(db, "reservations", reservationId), {
        status: "Awaiting Approval",
        transactionId: transactionId || null,
        finalizedAt: serverTimestamp(),
      });

      // send email
      await fetch(`${BACKEND_URL}/send-reservation-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: reservation.userEmail,
          name: reservation.userName,
          reservationId,
          product: reservation.productName,
          date: reservation.preferredDate
            ? new Date(reservation.preferredDate.seconds * 1000).toLocaleDateString()
            : "Scheduled",
        }),
      });

      setIsSaved(true);
      alert("🎉 Reservation Completed! Awaiting approval.");
      navigate("/profile?tab=reservations");
    } catch (error) {
      console.error(error);
      alert("❌ Something went wrong. Try again.");
    }
  };

  return (
    <div className="payment-success-page">
      <h2>✔ Payment Status</h2>

      <div className="payment-success-card">
        <p className="payment-success-status">{status}</p>

        {reservation && (
          <>
            <div className="receipt-box">
              <h4>Reservation Receipt</h4>
              <p><strong>Reservation ID:</strong> {reservationId}</p>
              <p><strong>Product:</strong> {reservation.productName}</p>
              <p><strong>Total Price:</strong> ₱{reservation.totalPrice?.toLocaleString()}</p>
              <p><strong>Downpayment:</strong> ₱{reservation.downpayment?.toLocaleString()}</p>
              <p><strong>Customer:</strong> {reservation.userName}</p>
              <p><strong>Vehicle:</strong> {reservation.vehicleBrand} {reservation.vehicleModel} {reservation.vehicleYear}</p>
              <p><strong>Plate:</strong> {reservation.plateNumber}</p>
              <p><strong>Transaction ID:</strong> {transactionId || "Not detected"}</p>
            </div>

            <div className="next-steps">
              <h4>📌 Next Steps</h4>
              <ol>
                <li>Print or download your receipt.</li>
                <li>Wait for your appointment confirmation email.</li>
                <li>Show this receipt during your scheduled visit.</li>
              </ol>
            </div>

            <button className="success-button" onClick={downloadReceipt}>
              📄 Download Receipt
            </button>

            <button
              className="success-button finish-btn"
              disabled={!isVerified || isSaved}
              onClick={finalizeReservation}
            >
              {isVerified ? "✅ Finish Reservation" : "🔒 PayPal Required to Finish"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
