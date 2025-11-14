import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/user-styles/PaymentPage.css"; // reuse existing styling

const PaymentSuccess = () => {
  const navigate = useNavigate();

  // ✅ Auto redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/profile?tab=reservations");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="payment-page" style={{ animation: "fadeIn 0.5s" }}>
      <h2>🎉 Payment Successful!</h2>

      <div className="payment-card">
        <p>Your payment has been processed successfully.</p>
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
