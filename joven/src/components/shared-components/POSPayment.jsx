import React from "react";
import "../../styles/shared/POSPayment.css";

export default function POSPayment({
  cart = [],
  productTotal = 0,
  serviceTotal = 0,
  productVat = 0,
  serviceVat = 0,
  total = 0,
  pwdDiscount = 0,
  reservationFee = 0,

  paymentMode,
  setPaymentMode,
  customerType,
  setCustomerType,

  isNegotiated,
  setIsNegotiated,
  negotiatedDiscount = 0,
  setNegotiatedDiscount,

  cashReceived,
  setCashReceived,
  paymentRef = "",
  setPaymentRef,

  handleCheckout,
  isProcessing
}) {


  const isPwdOrSenior = customerType === "PWD" || customerType === "Senior";

  const change =
    paymentMode === "Cash"
      ? Math.max(Number(cashReceived || 0) - total, 0)
      : 0;

  return (
    <div className="payment-box">
      <h3>Payment Details</h3>

      {/* CUSTOMER TYPE */}
      <div className="payment-field">
        <label>Customer Type</label>
        <select
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
          className="input-field"
        >
          <option value="Regular">Regular</option>
          <option value="PWD">PWD</option>
          <option value="Senior">Senior</option>
        </select>
      </div>

      {/* NEGOTIATION */}
      <div className="payment-field">
        <input
          type="checkbox"
          checked={isNegotiated}
          disabled={total === 0}
          onChange={(e) => {
            const checked = e.target.checked;
            setIsNegotiated(checked);
            if (!checked) setNegotiatedDiscount(0);
          }}
        />
        <label>Apply Negotiated Discount?</label>
      </div>

      {isNegotiated && (
        <div className="payment-field">
          <label>Negotiated Discount (₱)</label>
          <input
            type="number"
            className="input-field"
            value={negotiatedDiscount}
            onChange={(e) =>
              setNegotiatedDiscount(Number(e.target.value || 0))
            }
          />
        </div>
      )}

      {/* PAYMENT METHOD */}
      <div className="payment-field">
        <label>Payment Method</label>
        <select
          className="input-field"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
        >
          <option value="Cash">Cash</option>
          <option value="GCash">GCash</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
      </div>

      {paymentMode !== "Cash" && (
        <div className="payment-field">
          <label>Reference No.</label>
          <input
            type="text"
            className="input-field"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
          />
        </div>
      )}

      {paymentMode === "Cash" && (
        <div className="payment-field">
          <label>Cash Received</label>
          <input
            type="number"
            className="input-field"
            value={cashReceived || ""}
            onChange={(e) => setCashReceived(e.target.value)}
          />
        </div>
      )}

      {/* SUMMARY */}
      <div className="payment-summary">
        <p>Products Total (VAT-Inclusive): ₱{productTotal.toFixed(2)}</p>
        <p>Services Total (VAT-Inclusive): ₱{serviceTotal.toFixed(2)}</p>

        <p>VAT (Products): ₱{productVat.toFixed(2)}</p>
        <p>VAT (Services): ₱{serviceVat.toFixed(2)}</p>

        {isPwdOrSenior && (
          <>
            <p>Less VAT Removed (Service Only): -₱{serviceVat.toFixed(2)}</p>
            <p>PWD/Senior Discount (20% Service): -₱{pwdDiscount.toFixed(2)}</p>
          </>
        )}

        {isNegotiated && negotiatedDiscount > 0 && (
          <p>Negotiated Discount: -₱{negotiatedDiscount.toFixed(2)}</p>
        )}

        {reservationFee > 0 && (
          <p>Reservation Downpayment: -₱{reservationFee.toFixed(2)}</p>
        )}

        <h3>Total Amount Due: ₱{total.toFixed(2)}</h3>

        {paymentMode === "Cash" && (
          <p>Change: ₱{change.toFixed(2)}</p>
        )}
      </div>

      <button
        className="btn-submit full-width"
        disabled={
          isProcessing ||
          (paymentMode === "Cash" &&
            (!cashReceived || Number(cashReceived) < total)) ||
          ((paymentMode === "GCash" || paymentMode === "Bank Transfer") &&
            paymentRef.trim() === "")
        }
        onClick={handleCheckout}
      >
        {isProcessing ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );
}
