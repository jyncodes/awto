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
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-page" style={{ animation: "fadeIn 0.5s" }}>
      <h2>❌ Payment Failed</h2>

      <div className="payment-card">
        <p>Your PayPal transaction was not completed.</p>
        <p>Please try again or use another payment option.</p>

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
