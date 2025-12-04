// src/pages/user-page/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import { PayPalButtons } from "@paypal/react-paypal-js";
import "../../styles/user-styles/PaymentPage.css";

const PaymentPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isPaying, setIsPaying] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  const paypalTestAmount = 30; // Replace later with reservation.downpayment

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
     FETCH RESERVATION DATA
  ----------------------------------------- */
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

  /* -----------------------------------------
     CANCEL RESERVATION
  ----------------------------------------- */
  const handleCancelReservation = async () => {
    const confirmCancel = window.confirm("Are you sure?");
    if (!confirmCancel) return;

    try {
      await updateDoc(doc(db, "reservations", reservationId), {
        status: "Cancelled",
        isCancelled: true,
        cancelledAt: serverTimestamp(),
      });

      alert("Reservation cancelled.");
      navigate("/profile?tab=reservations");
    } catch (err) {
      console.error(err);
      alert("Failed to cancel reservation.");
    }
  };

  /* -----------------------------------------
     UI STATUS STATES
  ----------------------------------------- */
  if (loading) return <div className="payment-page">Loading...</div>;
  if (!reservation) return null;

  const readableDate = reservation?.preferredDate?.toDate?.()
    ? reservation.preferredDate.toDate().toLocaleDateString()
    : "N/A";

  const createdAt = reservation?.createdAt?.toDate?.()
    ? reservation.createdAt.toDate().toLocaleString()
    : "N/A";

  const isPaid = reservation.status === "Paid";
  const isPendingReview = reservation.status === "Payment Under Review";

  const disablePayments = isPaid || isPendingReview || isPaying;

  /* -----------------------------------------
     RENDER
  ----------------------------------------- */
  return (
    <div className="payment-page">
      <h2>Reservation Invoice</h2>

      <div className="payment-layout">
        {/* LEFT SIDE */}
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

            <h3>Product</h3>
            <p><strong>Product:</strong> {reservation.productName}</p>

            <hr />

            <h3>Pricing</h3>
            <p><strong>Price per Item:</strong> ₱{reservation.price.toLocaleString()}</p>
            <p><strong>Quantity:</strong> {reservation.quantity}</p>
            <p><strong>Total Price:</strong> ₱{reservation.totalPrice.toLocaleString()}</p>
            <p><strong>Downpayment:</strong> ₱{paypalTestAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="payment-right">

          {/* CANCEL BUTTON */}
          <div className="payment-warning">
            <p style={{ color: "red", fontWeight: "bold" }}>⚠ Cancellation allowed only BEFORE payment.</p>

            <button
              className="cancel-btn"
              onClick={handleCancelReservation}
              disabled={disablePayments}
            >
              {isPaid || isPendingReview ? "Cannot Cancel" : "Cancel Reservation"}
            </button>
          </div>

          {/* PAYPAL */}
          {!disablePayments && (
            <div className="paypal-section">
              <h4>Pay with PayPal / Card</h4>

              {isPaying && (
                <p style={{ color: "#0a84ff", fontWeight: "bold" }}>
                  Processing Payment...
                </p>
              )}

              <PayPalButtons
                style={{ layout: "vertical" }}
                disabled={isPaying}
                createOrder={(data, actions) => {
                  return actions.order.create({
                    purchase_units: [{
                      amount: {
                        currency_code: "PHP",
                        value: paypalTestAmount.toString(),
                      },
                      description: reservation.productName || "Reservation Downpayment",
                    }],
                  });
                }}
                onApprove={async (data, actions) => {
                  try {
                    setIsPaying(true);

                    const order = await actions.order.capture();

                    const resp = await fetch(
                      `${BACKEND_URL.replace(/\/$/, "")}/paypal-complete`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id, reservationId }),
                      }
                    );

                    const result = await resp.json();
                    console.log("PAYPAL SERVER RESULT:", result);

                    if (!result.success) {
                      alert("Backend could not verify payment.");
                      return navigate("/payment-failed");
                    }

                    return navigate("/payment-success");

                  } catch (err) {
                    console.error("PayPal error:", err);
                    navigate("/payment-failed");
                  } finally {
                    setIsPaying(false);
                  }
                }}
                onError={() => navigate("/payment-failed")}
              />
            </div>
          )}

          {/* STATUS */}
          {isPaid && <button className="pay-button" disabled style={{ background: "#4CAF50" }}>✅ Paid</button>}
          {isPendingReview && <button className="pay-button" disabled style={{ background: "#f4a300" }}>⏳ Payment Under Review</button>}

          <button className="pay-later-button" onClick={() => navigate("/profile?tab=reservations")}>Pay Later</button>
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
