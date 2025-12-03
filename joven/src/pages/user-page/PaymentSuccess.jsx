// src/pages/user-page/PaymentSuccess.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/user-styles/PaymentPage.css";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  // Auto redirect to reservations
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/profile?tab=reservations");
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-page" style={{ animation: "fadeIn 0.5s" }}>
      <h2>🎉 Payment Successful!</h2>

      <div className="payment-card">
        <p>Your payment has been successfully processed via PayMongo.</p>
        <p>Redirecting you to your reservations...</p>
        <p style={{ marginTop: "10px", opacity: 0.7 }}>
          If not redirected, click the button below.
        </p>
      </div>

      <button
        className="pay-button"
        onClick={() => navigate("/profile?tab=reservations")}
      >
        Go to My Reservations →
      </button>
    </div>
  );
};

export default PaymentSuccess;
