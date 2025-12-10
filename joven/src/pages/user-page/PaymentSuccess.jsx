// src/pages/user-page/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import { db, auth } from "../../firebase";
import "../../styles/user-styles/PaymentSuccess.css";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [status, setStatus] = useState("Processing payment...");
  const [transactionId, setTransactionId] = useState(null);
  const [doneData, setDoneData] = useState(null);
  const [reservationId, setReservationId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // ---------------- Load Data Saved in PaymentPage ----------------
  useEffect(() => {
    const stored = localStorage.getItem("finalReservationData");
    if (stored) {
      setDoneData(JSON.parse(stored));
      setStatus("✔ Waiting for PayPal confirmation...");
    } else {
      setStatus("⚠ No reservation data found.");
    }
  }, []);

  // ---------------- Detect PayPal return parameters ----------------
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

        await response.json(); // You can store this if needed later
        setStatus("✔ Payment Confirmed — Click Finish to save reservation");
      } catch {
        setStatus("⚠ Could not verify payment — using fallback.");
      }
    };

    verifyPayment();
  }, [location, BACKEND_URL]);

  // ---------------- Generate PDF Receipt ----------------
  const downloadReceipt = () => {
    if (!doneData) return;

    const finalId = reservationId || `TEMP-${transactionId?.slice(-6)}`;
    const docPDF = new jsPDF();

    docPDF.setFontSize(18);
    docPDF.text("Joven Tire Enterprise", 15, 15);

    docPDF.setFontSize(12);
    docPDF.text("Official Downpayment Receipt", 15, 25);
    docPDF.line(15, 30, 195, 30);

    docPDF.text(`Customer Name: ${doneData.userName}`, 15, 50);
    docPDF.text(`Amount Paid: ₱${doneData.downpayment}`, 15, 60);
    docPDF.text(`Payment Method: PayPal`, 15, 70);
    docPDF.text(`Printed On: ${new Date().toLocaleString()}`, 15, 80);

    docPDF.save(`Receipt-${finalId}.pdf`);
  };

  // ---------------- Save Reservation to Firestore ----------------
  const finalizeReservation = async () => {
    if (isSaved || !doneData) return;

    setStatus("📦 Saving reservation...");

    try {
      const counterRef = doc(db, "counters", "reservations");
      await setDoc(counterRef, { lastId: increment(1) }, { merge: true });

      const counterSnap = await getDoc(counterRef);
      const nextId = counterSnap.data().lastId;
      const newResId = `RES${String(nextId).padStart(5, "0")}`;
      setReservationId(newResId);

      await setDoc(doc(db, "reservations", newResId), {
        id: newResId,
        userId: doneData.userId,
        userEmail: doneData.userEmail,
        userName: doneData.userName,

        productId: doneData.selectedDocId,
        productName: `${doneData.product?.brand} ${doneData.product?.model} ${doneData.selectedSize}`,
        brand: doneData.product?.brand,
        model: doneData.product?.model,
        type: doneData.product?.type || "Tire",
        size: doneData.selectedSize,

        quantity: doneData.quantity,
        price: doneData.pricePerItem,
        totalPrice: doneData.pricePerItem * doneData.quantity,
        downpayment: doneData.downpayment,

        vehicleBrand: doneData.vehicleBrand,
        vehicleModel: doneData.vehicleModel,
        vehicleYear: doneData.vehicleYear,
        plateNumber: doneData.plateNumber,

        note: doneData.note || "",
        preferredDate: new Date(doneData.preferredDate),

        paymentMethod: "PayPal",
        status: "Awaiting Approval",
        createdAt: serverTimestamp(),
        isCancelled: false,
      });

      // Cleanup
      localStorage.removeItem("finalReservationData");
      localStorage.removeItem("reservationDraft");

      setIsSaved(true);
      setStatus("✔ Reservation successfully created!");
      alert("🎉 Reservation Completed!");
      navigate("/profile?tab=reservations");
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

        {doneData && (
          <>
            <div className="receipt-box">
              <h4>Payment Summary</h4>
              <p><strong>Customer:</strong> {doneData.userName}</p>
              <p><strong>Email:</strong> {doneData.userEmail}</p>
              <p><strong>Amount Paid:</strong> ₱{doneData.downpayment}</p>
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
