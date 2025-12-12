//  src/pages/user-page/PaymentSuccess.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import { db } from "../../firebase";
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

  const isServiceReservation = doneData?.type === "service";


  /* ---------------- Fetch Draft from Local Storage ---------------- */
  useEffect(() => {
    const loadData = async () => {
      const stored = localStorage.getItem("finalReservationData");

      if (!stored) {
        setStatus("⚠ No reservation data found.");
        return;
      }

      let parsed = JSON.parse(stored);

      try {
        const userRef = doc(db, "users", parsed.userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          parsed.userName = userSnap.data().name;
          parsed.userEmail = userSnap.data().email;
        }
      } catch (err) {
        console.log("⚠ Failed to fetch Firestore user name:", err);
      }

      setDoneData(parsed);
      setStatus("✔ Waiting for PayPal confirmation...");
    };

    loadData();
  }, []);

  /* ---------------- Detect PayPal Return Parameters ---------------- */
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

        setDoneData((prev) => ({
          ...prev,
          paypalAmount: result.amount,
          paypalEmail: result.email,
          paypalPayerName: result.name,
          transactionStatus: result.status,
        }));

        setStatus("✔ Payment Confirmed — Click Finish to save reservation");
      } catch {
        setStatus("⚠ Could not verify payment — using fallback.");
      }
    };

    verifyPayment();
  }, [location, BACKEND_URL]);

  /* ---------------- Generate PDF Receipt ---------------- */
  const downloadReceipt = () => {
    if (!doneData) return;

    const finalId = reservationId || `TEMP-${transactionId?.slice(-6)}`;
    const docPDF = new jsPDF();

    docPDF.setFontSize(18);
    docPDF.text("Joven Tire Enterprise", 15, 15);

    docPDF.setFontSize(12);
    docPDF.text("Reservation Downpayment Receipt", 15, 23);
    docPDF.line(15, 30, 195, 30);

    docPDF.text("Customer Information:", 15, 40);
    docPDF.text(
      `Name: ${doneData.userName || doneData.paypalPayerName || "N/A"}`,
      15,
      48
    );
    docPDF.text(`Email: ${doneData.userEmail}`, 15, 56);
    docPDF.text(`Plate Number: ${doneData.plateNumber}`, 15, 64);

    docPDF.text("Payment Details:", 15, 72);
    docPDF.text(`Amount Paid: ₱${doneData.downpayment}`, 15, 80);
    docPDF.text(`Payment Method: PayPal`, 15, 88);

    if (transactionId) {
      docPDF.text(`Transaction ID: ${transactionId}`, 15, 96);
    }

    docPDF.text(`Order ID: ${finalId}`, 15, 104);
    docPDF.text(`Date: ${new Date().toLocaleString()}`, 15, 112);

    docPDF.line(15, 120, 195, 120);
    docPDF.text("Thank you for choosing Joven Tire Enterprise!", 15, 130);

    docPDF.save(`Receipt-${finalId}.pdf`);
  };

  /* ---------------- Save Reservation + Update Customer ---------------- */
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

let reservationData;

if (isServiceReservation) {
  // ⭐ SERVICE RESERVATION FORMAT
  reservationData = {
    id: newResId,
    type: "service",
    userId: doneData.userId,
    userEmail: doneData.userEmail,
    userName: doneData.userName,

    selectedServices: doneData.selectedServices,
    totalServicePrice: doneData.totalServicePrice,

    vehicleBrand: doneData.vehicleBrand,
    vehicleModel: doneData.vehicleModel,
    vehicleYear: doneData.vehicleYear,
    plateNumber: doneData.plateNumber,
    note: doneData.note || "",

    preferredDate: new Date(doneData.preferredDate),
    downpayment: doneData.downpayment,
    paymentMethod: "PayPal",
    transactionId: transactionId || null,
    status: "Awaiting Approval",
    createdAt: serverTimestamp(),
    isCancelled: false,
  };

} else {
  reservationData = {
    id: newResId,
    type: "product",
    userId: doneData.userId,
    userEmail: doneData.userEmail,
    userName: doneData.userName,

    productId: doneData.selectedDocId,
    productName: `${doneData.product?.brand} ${doneData.product?.model} ${doneData.selectedSize}`,
    quantity: doneData.quantity,
    price: doneData.pricePerItem,
    totalPrice: doneData.pricePerItem * doneData.quantity,

    vehicleBrand: doneData.vehicleBrand,
    vehicleModel: doneData.vehicleModel,
    vehicleYear: doneData.vehicleYear,
    plateNumber: doneData.plateNumber,
    note: doneData.note || "",

    preferredDate: new Date(doneData.preferredDate),
    downpayment: doneData.downpayment,
    paymentMethod: "PayPal",
    transactionId: transactionId || null,
    status: "Awaiting Approval",
    createdAt: serverTimestamp(),
    isCancelled: false,
  };
}

// SAVE FINAL DATA TO FIRESTORE
await setDoc(doc(db, "reservations", newResId), reservationData);


      // ---------------- SAVE ONLY LAST PLATE NUMBER ----------------
      try {
        const q = query(
          collection(db, "customers"),
          where("uid", "==", doneData.userId)
        );

        const snap = await getDocs(q);

        if (!snap.empty) {
          const customerDoc = snap.docs[0];
          const customerId = customerDoc.id;

          await setDoc(
            doc(db, "customers", customerId),
            {
              lastPlateNumber: doneData.plateNumber,
            },
            { merge: true }
          );

          console.log("🚗 Last plate number saved for:", customerId);
        }
      } catch (err) {
        console.log("❌ Failed to update last plate number:", err);
      }

      // 🔥 Send Confirmation Email
      try {
        await fetch(`${BACKEND_URL}/send-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: doneData.userEmail,
            name: doneData.userName,
            reservationId: newResId,
            productName: isServiceReservation
              ? doneData.selectedServices.map(s => s.name).join(", ")
              : `${doneData.product?.brand} ${doneData.product?.model} ${doneData.selectedSize}`,
            plateNumber: doneData.plateNumber,
            date: new Date(doneData.preferredDate).toLocaleDateString(),
          }),
        });
      } catch (err) {
        console.error("❌ Email send failed:", err);
      }

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
              <p><strong>Plate Number:</strong> {doneData.plateNumber}</p>
              <p><strong>Amount Paid:</strong> ₱{doneData.downpayment}</p>
              {transactionId && (
                <p><strong>Transaction ID:</strong> {transactionId}</p>
              )}
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
