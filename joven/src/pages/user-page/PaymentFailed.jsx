// src/pages/user-page/PaymentFailed.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/user-styles/PaymentPage.css";

const PaymentFailed = () => {
  const navigate = useNavigate();

  // Auto redirect back
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/profile?tab=reservations");
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-page" style={{ animation: "fadeIn 0.5s" }}>
      <h2>❌ Payment Failed</h2>

      <div className="payment-card">
        <p>Your PayMongo payment was not completed.</p>
        <p>Please try again or choose another payment method.</p>
        <p style={{ marginTop: "10px", opacity: 0.7 }}>
          Redirecting you back to your reservations...
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
