import React from "react";
import "../../styles/shared/POSPayment.css";


export default function POSPayment({
  subtotal,
  vat,
  total,
  paymentMode,
  setPaymentMode,
  cashReceived,
  setCashReceived,
  paymentRef,
  setPaymentRef,
  handleCheckout,
  isProcessing
}) {
  return (
    <div className="payment-box">

      <h3>Payment Details</h3>

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
          <option value="Card">Card</option>
        </select>
      </div>

      {(paymentMode !== "Cash") && (
        <div className="payment-field">
          <label>Reference / Proof</label>
          <input
            className="input-field"
            type="text"
            placeholder="Enter reference number"
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
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
          />
        </div>
      )}

      <div className="payment-summary">
        <p>Subtotal: ₱{subtotal.toFixed(2)}</p>
        <p>VAT (12%): ₱{vat.toFixed(2)}</p>
        <h3>Total: ₱{total.toFixed(2)}</h3>
      </div>

      <button
        className="btn-submit full-width"
        onClick={handleCheckout}
        disabled={
          isProcessing ||
          (paymentMode === "Cash" && (cashReceived.trim() === "" || Number(cashReceived) <= 0))
        }
      >
        {isProcessing ? "Processing..." : "Complete Sale"}
      </button>

    </div>
  );
}
