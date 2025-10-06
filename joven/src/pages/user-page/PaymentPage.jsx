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

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const docRef = doc(db, "reservations", reservationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // Only allow owner of the reservation to access
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

  const handlePayNow = async () => {
    if (!reservationId) return;

    setPaying(true);
    try {
      const reservationRef = doc(db, "reservations", reservationId);
      await updateDoc(reservationRef, {
        paymentStatus: "paid",
      });

      alert("✅ Payment successful via PayMongo (mock)");
      navigate(`/profile?tab=reservations`);
    } catch (error) {
      console.error("❌ Failed to update payment status:", error);
      alert("❌ Payment failed. You may not have permission.");
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
        <p><strong>Vehicle:</strong> {`${reservation.vehicleBrand} ${reservation.vehicleModel} ${reservation.vehicleYear}`}</p>
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
