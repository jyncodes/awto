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
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-page" style={{ animation: "fadeIn 0.5s" }}>
      <h2>🎉 Payment Successful!</h2>

      <div className="payment-card">
        <p>Your payment has been successfully processed via <strong>PayPal</strong>.</p>
        <p>Your reservation status will now appear as <strong>Paid</strong>.</p>
        <p>Redirecting you to your reservations...</p>

        <p style={{ marginTop: "12px", fontSize: "14px", opacity: 0.6 }}>
          If you are not redirected automatically, click below.
        </p>
      </div>

      <button
        className="pay-button"
        onClick={() => navigate("/profile?tab=reservations")}
      >
        View My Reservations →
      </button>
    </div>
  );
};

export default PaymentSuccess;
