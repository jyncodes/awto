// src/pages/user-page/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import "../../styles/user-styles/PaymentPage.css";

const PaymentPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // --------------------------
  // AUTH CHECK
  // --------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return navigate("/login");
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  // --------------------------
  // FETCH RESERVATION
  // --------------------------
  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const ref = doc(db, "reservations", reservationId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          alert("Reservation not found.");
          return navigate(-1);
        }

        const data = snap.data();
        if (data.userId !== auth.currentUser?.uid) {
          alert("You are not allowed to view this reservation.");
          return navigate("/profile?tab=reservations");
        }

        setReservation(data);
      } catch (err) {
        console.error(err);
        alert("Failed to load reservation.");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    if (reservationId && currentUser) fetchReservation();
  }, [reservationId, currentUser, navigate]);

  // --------------------------
  // PAY NOW (PAYMONGO CHECKOUT)
  // --------------------------
  const handlePayMongo = async () => {
    try {
      const response = await fetch(
        "https://awto-backend.onrender.com/create-payment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: reservation.downpayment,
            description: reservation.productName || "Downpayment",
            email: currentUser.email,
            reservationId,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        alert("Payment creation failed.");
        return;
      }

      // Redirect to PayMongo checkout page
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("Error connecting to payment server.");
    }
  };

  // --------------------------
  // CANCEL RESERVATION
  // --------------------------
  const handleCancelReservation = async () => {
    const confirmCancel = window.confirm(
      "Are you sure you want to cancel this reservation?"
    );
    if (!confirmCancel) return;

    try {
      await updateDoc(doc(db, "reservations", reservationId), {
        status: "Cancelled",
        isCancelled: true,
        cancelledAt: serverTimestamp(),
      });

      alert("Reservation has been cancelled.");
      navigate("/profile?tab=reservations");
    } catch (err) {
      console.error(err);
      alert("Failed to cancel reservation.");
    }
  };

  // --------------------------
  // LOADING
  // --------------------------
  if (loading) return <div className="payment-page">Loading...</div>;
  if (!reservation) return null;

  const readableDate = reservation?.preferredDate?.toDate?.()
    ? reservation.preferredDate.toDate().toLocaleString()
    : "N/A";

  const createdAt = reservation?.createdAt?.toDate?.()
    ? reservation.createdAt.toDate().toLocaleString()
    : "N/A";

  const isPaid = reservation.paymentStatus === "paid";

  return (
    <div className="payment-page">
      <h2>Reservation Invoice</h2>

      <div className="payment-layout">
        {/* LEFT COLUMN */}
        <div className="payment-left">
          <div className="payment-card">
            <p><strong>Invoice ID:</strong> {reservationId}</p>
            <p><strong>Created At:</strong> {createdAt}</p>
            <p><strong>Appointment:</strong> {readableDate}</p>

            <hr />

            <h3>Customer Vehicle</h3>
            <p><strong>Brand:</strong> {reservation.vehicleBrand}</p>
            <p><strong>Model:</strong> {reservation.vehicleModel}</p>
            <p><strong>Year:</strong> {reservation.vehicleYear}</p>
            <p><strong>Plate No.:</strong> {reservation.plateNumber}</p>

            <hr />

            <h3>Service & Product</h3>
            <p><strong>Service Type:</strong> {reservation.serviceType}</p>
            <p><strong>Product:</strong> {reservation.productName}</p>
            <p><strong>Brand:</strong> {reservation.brand}</p>
            <p><strong>Size:</strong> {reservation.size}</p>
            <p><strong>Type:</strong> {reservation.type}</p>

            <hr />

            <h3>Payment Details</h3>
            <p><strong>Total Price:</strong> ₱{reservation.price?.toLocaleString()}</p>
            <p><strong>Downpayment:</strong> ₱{reservation.downpayment?.toLocaleString()}</p>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="payment-right">

          <div className="payment-warning">
            <p style={{ color: "red", fontWeight: "bold" }}>
              ⚠ You can cancel only BEFORE payment. Once paid, the reservation is non-refundable.
            </p>

            <button
              className="cancel-btn"
              onClick={handleCancelReservation}
              disabled={isPaid}
            >
              {isPaid ? "Cancel Reservation (Disabled - Already Paid)" : "Cancel Reservation"}
            </button>
          </div>

          {/* Pay Now (PayMongo) */}
          <button
            className="pay-button"
            onClick={handlePayMongo}
            disabled={isPaid}
          >
            {isPaid ? "Already Paid" : "Pay Now (GCash / Card)"}
          </button>

          <button
            className="pay-later-button"
            onClick={() => navigate("/profile?tab=reservations")}
            disabled={isPaid}
          >
            Pay Later
          </button>

          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
