import React from "react";

import "../../styles/shared/POSPayment.css";

export default function POSPayment({
  subtotal,
  vat,
  cart,
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

  // Breakdown logic (must match POS.jsx compute totals)
  const isPwdOrSenior = customerType === "PWD" || customerType === "Senior";

  let productTotal = 0;
  let serviceTotal = 0;

cart.forEach(item => {
  const price = Number(item.price || 0);
  const qty = Number(item.qty || 0);

  if (item.type === "service") serviceTotal += price * qty;
  else productTotal += price * qty;
});

  // VAT breakdown
  const productVat = productTotal - (productTotal / 1.12);
  const serviceVat = serviceTotal - (serviceTotal / 1.12);

  let serviceBase = serviceTotal;
  let displayServiceDiscount = 0;
  let removedVatAmount = 0;

  if (isPwdOrSenior) {
    removedVatAmount = serviceVat;
    serviceBase = serviceTotal / 1.12;
    displayServiceDiscount = serviceBase * 0.20;
  }

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
              value={Number.isFinite(negotiatedDiscount) ? negotiatedDiscount : ""}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? 0 : Number(raw);
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
          value={cashReceived || ""}
          onChange={(e) => setCashReceived(e.target.value)}
        />

        </div>
      )}

      {/* SUMMARY */}
      <div className="payment-summary">
        <p>Subtotal: ₱{subtotal.toFixed(2)}</p>

        {customerType === "Regular" && (
          <>
            <p>VAT (Products): ₱{productVat.toFixed(2)}</p>
            <p>VAT (Services): ₱{serviceVat.toFixed(2)}</p>
          </>
        )}

        {isPwdOrSenior && (
          <>
            <p>Product VAT Included: ₱{productVat.toFixed(2)}</p>
            <p>Service VAT Included: ₱{serviceVat.toFixed(2)}</p>
            <p>Less VAT Removed (Service Only): -₱{removedVatAmount.toFixed(2)}</p>

            {displayServiceDiscount > 0 && (
              <p>PWD/Senior Discount (20% on service): -₱{displayServiceDiscount.toFixed(2)}</p>
            )}
          </>
        )}

        {isNegotiated && negotiatedDiscount > 0 && (
          <p>Negotiated Discount: -₱{negotiatedDiscount.toFixed(2)}</p>
        )}

        <h3>Total: ₱{total.toFixed(2)}</h3>

        {paymentMode === "Cash" && <p><strong>Change:</strong> ₱{change.toFixed(2)}</p>}
      </div>

      {/* FINAL BUTTON */}
      <button
        className="btn-submit full-width"
        onClick={handleCheckout}
        disabled={
          isProcessing ||
          (paymentMode === "Cash" &&
          (!cashReceived || Number(cashReceived) < total))
          ||
          ((paymentMode === "GCash" || paymentMode === "Bank Transfer") && paymentRef.trim() === "")
        }
      >
        {isProcessing ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );
}
