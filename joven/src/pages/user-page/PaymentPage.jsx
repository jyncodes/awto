// src/pages/user-page/PaymentPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/PaymentPage.css";

const PaymentPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const docRef = doc(db, "reservations", reservationId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReservation(docSnap.data());
        } else {
          alert("Reservation not found.");
          navigate("/my-selections");
        }
      } catch (err) {
        console.error("Error fetching reservation:", err);
        navigate("/my-selections");
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId, navigate]);

  const handlePayNow = () => {
    setPaying(true);
    setTimeout(() => {
      alert("✅ Payment successful via PayMongo (mock)");
      navigate(`/invoice/${reservationId}`);
    }, 2000);
  };

  if (loading) {
    return <div className="payment-page">Loading payment info...</div>;
  }

  if (!reservation) return null;

  const formattedDateTime = reservation.preferredDateTime?.toDate?.().toLocaleString?.() || "Unavailable";

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
