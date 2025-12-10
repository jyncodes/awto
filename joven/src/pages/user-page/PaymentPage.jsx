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

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [tempLockId, setTempLockId] = useState(null);

  /* -----------------------------------------
     AUTH CHECK
  ----------------------------------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return navigate("/login");
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  /* -----------------------------------------
     LOAD RESERVATION DRAFT
  ----------------------------------------- */
  useEffect(() => {
    const reservationDraft = localStorage.getItem("reservationDraft");

    if (!reservationDraft) {
      alert("No reservation details found.");
      return navigate("/profile?tab=reservations");
    }

    setDraft(JSON.parse(reservationDraft));
    setLoading(false);
  }, [navigate]);

  /* -----------------------------------------
     CREATE TEMP LOCK BEFORE PAYMENT
  ----------------------------------------- */
  const createTemporaryReservationLock = async () => {
    if (!currentUser || !draft) return;

    try {
      const docRef = await addDoc(collection(db, "temp_locks"), {
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        expiresAt: serverTimestamp(), // Will be replaced by Cloud Function later
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

  /* -----------------------------------------
     HANDLE PAYPAL BUTTON CLICK
  ----------------------------------------- */
  const handlePayClick = async () => {
    if (!tempLockId) await createTemporaryReservationLock();

    alert("Redirecting to PayPal...");
  };

  /* -----------------------------------------
     UI LOADING STATE
  ----------------------------------------- */
  if (loading || !draft) return <div className="payment-page">Loading...</div>;

  const totalPrice = draft.pricePerItem * draft.quantity;

  return (
    <div className="payment-page-wrapper">
      <Navbar />

      <div className="payment-page">
        <h2>Reservation Payment</h2>

        <div className="payment-layout">
          {/* LEFT SECTION */}
          <div className="payment-left">
            <div className="payment-card">
              <h3>Order Summary</h3>
              <hr />

              <p><strong>Product:</strong> {draft.product?.brand} {draft.product?.model}</p>

              <h3>Vehicle</h3>
              <p><strong>Brand:</strong> {draft.vehicleBrand}</p>
              <p><strong>Model:</strong> {draft.vehicleModel}</p>
              <p><strong>Year:</strong> {draft.vehicleYear}</p>
              <p><strong>Plate:</strong> {draft.plateNumber}</p>

              <hr />
              <h3>Pricing</h3>
              <p><strong>Price per item:</strong> ₱{draft.pricePerItem.toLocaleString()}</p>
              <p><strong>Quantity:</strong> {draft.quantity}</p>
              <p><strong>Total Price:</strong> ₱{totalPrice.toLocaleString()}</p>
              <p><strong>Downpayment Required:</strong> ₱{draft.downpayment.toLocaleString()}</p>

            </div>
          </div>

          {/* RIGHT SECTION */}
          <div className="payment-right">

            {/* PAYPAL BUTTON */}
            <div className="paypal-section">
              <h4>Pay with PayPal / Card</h4>

              <form
                action={`https://www.paypal.com/ncp/payment/RBE5XPZVG4RRC?return=http://awto.vercel.app/payment-success&cancel_return=http://awto.vercel.app/payment-failed`}
                method="post"
                target="_self"
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
              onClick={() => navigate("/profile?tab=reservations")}
            >
              Cancel & Back
            </button>

            <button className="back-btn" onClick={() => navigate(-1)}>
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
