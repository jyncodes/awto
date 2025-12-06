// src/pages/user-page/PaymentFailed.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/PaymentPage.css";

const PaymentFailed = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const reservationId = localStorage.getItem("activeReservationId");

    if (reservationId) {
      // Reset reservation since payment was cancelled or failed
      updateDoc(doc(db, "reservations", reservationId), {
        status: "Pending Payment",
        paymentStatus: "failed",
        failedAt: new Date(),
      }).catch((err) => console.error("Reset failed status:", err));

      // Cleanup stored reference
      localStorage.removeItem("activeReservationId");
    }

    // Auto redirect
    const timer = setTimeout(() => {
      navigate("/profile?tab=reservations");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-page" style={{ animation: "fadeIn 0.5s" }}>
      <h2>❌ Payment Failed</h2>

      <div className="payment-card">
        <p>Your PayPal transaction was not completed.</p>
        <p>Please try again or choose another payment option.</p>

        <p style={{ marginTop: "12px", fontSize: "14px", opacity: 0.6 }}>
          Returning you to your reservations...
        </p>
      </div>

      <button
        className="pay-button"
        onClick={() => navigate("/profile?tab=reservations")}
      >
        Return to My Reservations →
      </button>
    </div>
  );
};

export default PaymentFailed;
