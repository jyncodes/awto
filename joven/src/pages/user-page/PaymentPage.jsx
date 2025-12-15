// src/pages/user-page/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import "../../styles/user-styles/PaymentPage.css";

import Navbar from "../../components/Navbar";

const PaymentPage = () => {
  const navigate = useNavigate();
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [tempLockId, setTempLockId] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);


  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return navigate("/login");
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  /* ---------------- LOAD LOCAL DRAFT ---------------- */
  useEffect(() => {
    const reservationDraft = localStorage.getItem("reservationDraft");

    if (!reservationDraft) {
      alert("No reservation details found.");
      return navigate("/profile?tab=reservations");
    }

    setDraft(JSON.parse(reservationDraft));
    setLoading(false);
  }, [navigate]);

  /* ---------------- CREATE TEMP LOCK ---------------- */
  const createTemporaryReservationLock = async () => {
    if (!currentUser || !draft) return;

    try {
      const docRef = await addDoc(collection(db, "temp_locks"), {
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        expiresAt: serverTimestamp(),
        ...draft,
        status: "pending-payment",
      });

      setTempLockId(docRef.id);
      localStorage.setItem("activeTempLockId", docRef.id);
    } catch (err) {
      console.error("Failed to create temporary lock:", err);
      alert("Something went wrong. Try again.");
    }
  };

  /* ---------------- CALL CREATE TEMP LOCK WHEN READY ---------------- */
  useEffect(() => {
    if (currentUser && draft && !tempLockId) {
      createTemporaryReservationLock();
    }
  }, [currentUser, draft]);

  /* ---------------- HANDLE PAY CLICK ---------------- */
  const handlePayClick = (e) => {
    if (!draft || !currentUser) {
      e.preventDefault();
      return alert("Missing reservation details.");
    }

    const finalReservationData = {
      ...draft,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.displayName || "Customer",
      timestamp: Date.now()
    };

    localStorage.setItem("finalReservationData", JSON.stringify(finalReservationData));

  };

  if (loading || !draft) return <div className="payment-page">Loading...</div>;

const totalPrice =
  draft.type === "service"
    ? draft.totalServicePrice
    : draft.type === "multiple-products"
      ? draft.items.reduce(
          (sum, item) =>
            sum + (item.totalPrice ?? item.pricePerItem * item.quantity),
          0
        )
      : draft.pricePerItem * draft.quantity;


  return (
    <div className="payment-page-wrapper">
      <Navbar />

      <div className="payment-page">
        <h2>Reservation Payment</h2>

        <div className="payment-layout">
          {/* LEFT */}
          <div className="payment-left">
            <div className="payment-card">
              <h3>Order Summary</h3>
              <hr />

            {draft.type === "service" ? (
  <>
    <p><strong>Service Reservation</strong></p>
    <ul>
      {draft.selectedServices?.map((svc, index) => (
        <li key={index}>
          {svc.name} — ₱{svc.price.toLocaleString()}
        </li>
      ))}
    </ul>
  </>
) : draft.type === "multiple-products" ? (
  <>
    <p><strong>Selected Products</strong></p>
    <ul>
      {draft.items.map((item, index) => (
        <li key={index}>
          {item.productName} — ₱
          {(item.totalPrice ?? item.pricePerItem * item.quantity).toLocaleString()}
        </li>
      ))}
    </ul>
  </>
) : (
  <p>
    <strong>Product:</strong> {draft.product?.brand} {draft.product?.model}
  </p>
)}


              <h3>Vehicle Info</h3>
              <p><strong>Brand:</strong> {draft.vehicleBrand}</p>
              <p><strong>Model:</strong> {draft.vehicleModel}</p>
              <p><strong>Year:</strong> {draft.vehicleYear}</p>
              <p><strong>Plate Number:</strong> {draft.plateNumber}</p>

              <hr />
              <h3>Pricing</h3>

              {draft.type === "service" ? (
  <>
    <p><strong>Total Service Price:</strong> ₱{draft.totalServicePrice.toLocaleString()}</p>
    <p><strong>Downpayment Required:</strong> ₱{draft.downpayment.toLocaleString()}</p>
  </>
) : draft.type === "multiple-products" ? (
  <>
    <p>
      <strong>Total Price:</strong> ₱{totalPrice.toLocaleString()}
    </p>
    <p>
      <strong>Downpayment Required:</strong> ₱{draft.downpayment.toLocaleString()}
    </p>
  </>
) : (
  <>
    <p><strong>Price per item:</strong> ₱{draft.pricePerItem.toLocaleString()}</p>
    <p><strong>Quantity:</strong> {draft.quantity}</p>
    <p>
      <strong>Total Price:</strong> ₱{(draft.pricePerItem * draft.quantity).toLocaleString()}
    </p>
    <p>
      <strong>Downpayment Required:</strong> ₱{draft.downpayment.toLocaleString()}
    </p>
  </>
)}

            </div>
          </div>

          {/* RIGHT */}
          <div className="payment-right">
            <div className="paypal-section">
              <h4>Pay with PayPal / Card</h4>

              <form
                action={`https://www.paypal.com/ncp/payment/RBE5XPZVG4RRC?return=https://awto.vercel.app/payment-success&cancel_return=https://awto.vercel.app/payment-failed&custom=${tempLockId}`}
                method="post"
                target="_blank"
                onSubmit={handlePayClick}
                style={{
                  display: "inline-grid",
                  justifyItems: "center",
                  alignContent: "start",
                  gap: "0.5rem",
                }}
              >
                <input
                  type="submit"
                  value="Pay Now"
                  style={{
                    textAlign: "center",
                    border: "none",
                    borderRadius: "0.25rem",
                    minWidth: "11.625rem",
                    padding: "0 2rem",
                    height: "2.625rem",
                    fontWeight: "bold",
                    backgroundColor: "#FFD140",
                    color: "#000000",
                    fontSize: "1rem",
                    cursor: "pointer",
                  }}
                />
                <img
                  src="https://www.paypalobjects.com/images/Debit_Credit.svg"
                  alt="cards"
                  style={{ width: "120px" }}
                />
                <small style={{ fontSize: "0.75rem" }}>Powered by PayPal</small>
              </form>
            </div>

          <button
            className="pay-later-button"
            onClick={() => setShowCancelConfirm(true)}
          >
            Cancel & Back
          </button>

            <button className="back-btn" onClick={() => navigate(-1)}>
              ← Back
            </button>

            {showCancelConfirm && (
  <div className="confirm-overlay">
    <div className="confirm-modal">
      <h3>Cancel Reservation?</h3>
      <p>
        Are you sure you want to cancel this reservation?
        <br />
        <strong>This action is irreversible.</strong>
      </p>

      <div className="confirm-actions">
        <button
          className="confirm-cancel"
          onClick={() => {
            localStorage.removeItem("reservationDraft");
            localStorage.removeItem("finalReservationData");
            navigate("/profile?tab=reservations");
          }}
        >
          Yes, Cancel Reservation
        </button>

        <button
          className="confirm-stay"
          onClick={() => setShowCancelConfirm(false)}
        >
          No, Stay on Page
        </button>
      </div>
    </div>
  </div>
)}


          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
