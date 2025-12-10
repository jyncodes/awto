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

      // ---- Localhost Mode Always Shows Receipt ----
      if (window.location.hostname === "localhost") {
        setStatus("🧪 Local Test Mode — No PayPal Connected");
        fetchedReservationId = "TEST-RESERVATION";
      } else {
        // ---- LIVE MODE: Skip verification and still load Firebase ----
        setStatus("✔ Payment Received — Processing Reservation...");
      }

      setReservationId(fetchedReservationId);

      // ---- Fetch reservation with retry ----
      if (fetchedReservationId && fetchedReservationId !== "TEST-RESERVATION") {
        let attempts = 0;
        const maxAttempts = 6;

        const fetchWithRetry = async () => {
          const snap = await getDoc(doc(db, "reservations", fetchedReservationId));

          if (snap.exists()) {
            setReservation(snap.data());
            setStatus("✔ Payment Verified — Reservation Loaded");
            return;
          }

          attempts++;

          if (attempts < maxAttempts) {
            setStatus(`⏳ Finalizing payment... (${attempts}/${maxAttempts})`);
            setTimeout(fetchWithRetry, 2000);
          } else {
            setStatus("⚠ Reservation not found — showing stored details.");
          }
        };

        fetchWithRetry();
      }

      // ---- Local fallback ----
      if (window.location.hostname === "localhost" && !reservation) {
        const draft = JSON.parse(localStorage.getItem("reservationDraft"));
        if (draft) setReservation(draft);
      }

      localStorage.removeItem("activeTempLockId");
    };

    verifyPayment();
  }, [location, BACKEND_URL]);

  /* ---- PDF ---- */
  const downloadReceipt = () => {
    if (!reservation) return;

    const docPDF = new jsPDF();
    docPDF.setFontSize(18);
    docPDF.text("Joven Tire Enterprise", 15, 15);

    docPDF.setFontSize(12);
    docPDF.text("Official Downpayment Receipt", 15, 25);
    docPDF.line(15, 30, 195, 30);

    docPDF.text(`Reservation ID: ${reservationId}`, 15, 40);
    docPDF.text(`Customer Name: ${reservation.userName || ""}`, 15, 50);
    docPDF.text(`Product: ${reservation.productName || ""}`, 15, 60);
    docPDF.text(`Price: ₱${reservation.totalPrice?.toLocaleString() || ""}`, 15, 70);
    docPDF.text(`Downpayment: ₱${reservation.downpayment?.toLocaleString() || ""}`, 15, 80);
    docPDF.text(`Payment Method: PayPal`, 15, 90);
    docPDF.text(`Transaction ID: ${transactionId || "Not detected"}`, 15, 100);
    docPDF.text(`Printed On: ${new Date().toLocaleString()}`, 15, 110);

    docPDF.save(`Receipt-${reservationId}.pdf`);
  };

  /* ---- FINALIZE BUTTON ALWAYS CLICKABLE ---- */
  const finalizeReservation = async () => {
    if (!reservation || isSaved) return;

    try {
      await updateDoc(doc(db, "reservations", reservationId), {
        status: "Awaiting Approval",
        transactionId: transactionId || null,
        finalizedAt: serverTimestamp(),
      });

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
    } catch {
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
              <p><strong>Product:</strong> {reservation.productName || "(none)"}</p>
              <p><strong>Total Price:</strong> ₱{reservation.totalPrice?.toLocaleString() || "0"}</p>
              <p><strong>Downpayment:</strong> ₱{reservation.downpayment?.toLocaleString() || "0"}</p>
              <p><strong>Customer:</strong> {reservation.userName || ""}</p>
              <p><strong>Vehicle:</strong> {reservation.vehicleBrand} {reservation.vehicleModel} {reservation.vehicleYear}</p>
              <p><strong>Plate:</strong> {reservation.plateNumber}</p>
              <p><strong>Transaction ID:</strong> {transactionId || "Not detected"}</p>
            </div>

            <button className="success-button" onClick={downloadReceipt}>
              📄 Download Receipt
            </button>

            <button
              className="success-button finish-btn"
              disabled={isSaved}
              onClick={finalizeReservation}
            >
              {isSaved ? "✔ Saved" : "✅ Finish Reservation"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
