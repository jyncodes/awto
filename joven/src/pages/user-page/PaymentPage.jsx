// src/pages/user-page/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import "../../styles/user-styles/PaymentPage.css";

const PaymentPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ Check authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        navigate("/login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // ✅ Fetch reservation details
  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const docRef = doc(db, "reservations", reservationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data.userId !== auth.currentUser?.uid) {
            alert("❌ You do not have permission to view this reservation.");
            navigate("/my-selections");
            return;
          }

          setReservation(data);
        } else {
          alert("❌ Reservation not found.");
          navigate("/my-selections");
        }
      } catch (err) {
        console.error("❌ Error fetching reservation:", err);
        alert("Failed to load reservation.");
        navigate("/my-selections");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchReservation();
    }
  }, [reservationId, navigate, currentUser]);

  // ✅ Handle PayMongo redirect
  const handlePayNow = async () => {
    if (!reservationId || !reservation) return;
    setPaying(true);

    try {
      // 👉 Create Checkout Session on your backend
      const response = await fetch("http://localhost:5000/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: reservation.downpayment,
          description: `Downpayment for Reservation ${reservationId}`,
          email: currentUser.email,
        }),
      });

      const data = await response.json();

      if (data.success && data.checkoutUrl) {
        // ✅ Redirect user to PayMongo Checkout
        window.open(data.checkoutUrl, "_blank");

        const confirmed = window.confirm(
          "✅ Payment successful via PayMongo (mock). Click OK to return to your reservations."
        );

        if (confirmed) {
          const reservationRef = doc(db, "reservations", reservationId);
          await updateDoc(reservationRef, {
            paymentStatus: "paid",
          });

          alert("✅ Payment successful via PayMongo");
          navigate(`/profile?tab=reservations`);
        }
      } else {
        console.error("❌ PayMongo error:", data);
        alert("❌ Failed to create payment session.");
      }
    } catch (error) {
      console.error("❌ Failed to process payment:", error);
      alert("❌ Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="payment-page">Loading payment info...</div>;
  }

  if (!reservation) return null;

  const formattedDateTime =
    reservation.preferredDateTime?.toDate?.().toLocaleString?.() || "Unavailable";

  return (
    <div className="payment-page">
      <h2>Payment Summary</h2>
      <div className="payment-card">
        <p><strong>Product:</strong> {reservation.productName}</p>
        <p><strong>Brand:</strong> {reservation.brand}</p>
        <p>
          <strong>Vehicle:</strong>{" "}
          {`${reservation.vehicleBrand} ${reservation.vehicleModel} ${reservation.vehicleYear}`}
        </p>
        <p><strong>Plate Number:</strong> {reservation.plateNumber}</p>
        <p><strong>Date & Time:</strong> {formattedDateTime}</p>
        <p><strong>Service Type:</strong> {reservation.serviceType}</p>
        <p><strong>Total Price:</strong> ₱{reservation.price}</p>
        <p><strong>Downpayment (30%):</strong> ₱{reservation.downpayment}</p>
      </div>

      <button
        className="pay-button"
        onClick={handlePayNow}
        disabled={paying}
      >
        {paying ? "Processing..." : "Pay Now via PayMongo"}
      </button>

      <button className="cancel-btn" onClick={() => navigate(-1)}>
        ← Go Back
      </button>
    </div>
  );
};

export default PaymentPage;
