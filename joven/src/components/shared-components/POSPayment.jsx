import React from "react";

import "../../styles/shared/POSPayment.css";

export default function POSPayment({
  subtotal,
  vat,
  total,
  pwdDiscount,
  paymentMode,
  setPaymentMode,
  customerType,
  setCustomerType,
  isNegotiated,
  setIsNegotiated,
  negotiatedDiscount,
  setNegotiatedDiscount,
  cashReceived,
  setCashReceived,
  paymentRef,
  setPaymentRef,
  handleCheckout,
  isProcessing
}) {

  const change = paymentMode === "Cash"
    ? Math.max(Number(cashReceived || 0) - total, 0)
    : 0;

  const computedVatIncluded = subtotal - subtotal / 1.12;
  const computedPwdDiscount = pwdDiscount !== undefined ? pwdDiscount : (subtotal / 1.12) * 0.20;

  return (
    <div className="payment-box">
      <h3>Payment Details</h3>

      {/* CUSTOMER TYPE */}
      <div className="payment-field">
        <label>Customer Type</label>
        <select
          className="input-field"
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
        >
          <option value="Regular">Regular</option>
          <option value="PWD">PWD</option>
          <option value="Senior">Senior</option>
        </select>
      </div>

      {/* NEGOTIATION CHECKBOX */}
      <div className="payment-field" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          disabled={subtotal === 0}
          checked={isNegotiated}
          onChange={(e) => {
            const checked = e.target.checked;
            setIsNegotiated(checked);
            if (!checked) setNegotiatedDiscount(0);
            else if (checked && negotiatedDiscount === 0) setNegotiatedDiscount(1);
          }}
        />
        <label>Apply Negotiated Discount?</label>
      </div>

      {/* NEGOTIATED AMOUNT FIELD */}
      {isNegotiated && subtotal > 0 && (
        <div className="payment-field">
          <label>Negotiated Discount Amount (₱)</label>
          <input
            type="number"
            className="input-field"
            value={negotiatedDiscount}
            onChange={(e) => {
              const val = Number(e.target.value);
              setNegotiatedDiscount(val > subtotal ? subtotal : val);
            }}
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

      {/* REFERENCE FIELD (NON-CASH) */}
      {paymentMode !== "Cash" && (
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

      {/* CASH FIELD */}
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

      {/* SUMMARY */}
      <div className="payment-summary">
        <p>Subtotal: ₱{subtotal.toFixed(2)}</p>

        {customerType === "Regular" && <p>VAT (12%): ₱{vat.toFixed(2)}</p>}

        {(customerType === "PWD" || customerType === "Senior") && (
          <>
            <p>VAT Included in Price: ₱{computedVatIncluded.toFixed(2)}</p>
            <p>VAT Exempted: -₱{computedVatIncluded.toFixed(2)}</p>
            <p>PWD/Senior Discount (20%): -₱{computedPwdDiscount.toFixed(2)}</p>
          </>
        )}

        {isNegotiated && negotiatedDiscount > 0 && (
          <p>Negotiated Discount: -₱{negotiatedDiscount.toFixed(2)}</p>
        )}

        <h3>Total: ₱{total.toFixed(2)}</h3>

        {paymentMode === "Cash" && <p><strong>Change:</strong> ₱{change.toFixed(2)}</p>}
      </div>

      {/* FINAL BUTTON (FIXED DISABLE LOGIC) */}
      <button
        className="btn-submit full-width"
        onClick={handleCheckout}
        disabled={
          isProcessing ||
          (paymentMode === "Cash" && (cashReceived.trim() === "" || Number(cashReceived) < total)) ||
          ((paymentMode === "GCash" || paymentMode === "Bank Transfer") && paymentRef.trim() === "")
        }
      >
        {isProcessing ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );
}
