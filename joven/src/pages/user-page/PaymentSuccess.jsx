// src/pages/user-page/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
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
  const [isVerified, setIsVerified] = useState(false); // NEW FLAG

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

    // ❗ Do NOT stop UI if these are missing — just mark as unverified
    if (!txId || !tempLockId) {
      setStatus("⚠ Payment could not be verified, but details are shown.");
      setIsVerified(false);
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
          setStatus("⚠ Payment could not be verified.");
          setIsVerified(false);
        } else {
          setStatus("🎉 Payment Verified Successfully!");
          setIsVerified(true);
        }

        const newReservationId = result?.reservationId;
        setReservationId(newReservationId);

        if (newReservationId) {
          const finalSnap = await getDoc(doc(db, "reservations", newReservationId));
          if (finalSnap.exists()) {
            setReservation(finalSnap.data());
          }
        }

        localStorage.removeItem("activeTempLockId");
      } catch (err) {
        console.error(err);
        setStatus("⚠ Something went wrong.");
        setIsVerified(false);
      }
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
    docPDF.text(`Transaction ID: ${transactionId}`, 15, 100);
    docPDF.text(`Paid On: ${new Date().toLocaleString()}`, 15, 110);

    docPDF.line(15, 120, 195, 120);

    docPDF.text("Please present this receipt upon arrival.", 15, 135);

    docPDF.save(`Receipt-${reservationId}.pdf`);
  };

  /* Save Reservation Record - Only allowed when verified */
  const finalizeReservation = async () => {
    if (!reservation || isSaved || !isVerified) return;

    try {
      const reservationFormat = {
        id: reservationId,
        userId: reservation.userId,
        userName: reservation.userName || "Customer",
        userEmail: reservation.userEmail,
        productName: reservation.productName,
        productId: reservation.productId,
        type: reservation.type,
        brand: reservation.brand,
        model: reservation.model,
        size: reservation.size,
        selectedSize: reservation.selectedSize,
        selectedDocId: reservation.selectedDocId,
        quantity: reservation.quantity,
        price: reservation.price,
        totalPrice: reservation.totalPrice,
        downpayment: reservation.downpayment,
        paymentMethod: "PayPal Invoice",
        vehicleBrand: reservation.vehicleBrand,
        vehicleModel: reservation.vehicleModel,
        vehicleYear: reservation.vehicleYear,
        plateNumber: reservation.plateNumber,
        preferredDate: reservation.preferredDate,
        status: "Downpayment Pending",
        note: reservation.note || "",
        createdAt: serverTimestamp(),
        isCancelled: false,
      };

      await addDoc(collection(db, "reservations"), reservationFormat);

      setIsSaved(true);
      alert("Reservation successfully recorded!");
      navigate("/profile?tab=reservations");
    } catch (error) {
      console.error("Error saving reservation:", error);
      alert("Error saving reservation. Try again.");
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
              <p><strong>Downpayment Paid:</strong> ₱{reservation.downpayment?.toLocaleString()}</p>
              <p><strong>Customer:</strong> {reservation.userName}</p>
              <p><strong>Transaction ID:</strong> {transactionId || "Not detected"}</p>
            </div>

            <div className="next-steps">
              <h4>📌 What happens next?</h4>
              <ol>
                <li>Download and print your receipt.</li>
                <li>Check your email for appointment confirmation.</li>
                <li>Visit the shop on your scheduled date and present your receipt.</li>
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
              ✅ Finish Reservation
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
