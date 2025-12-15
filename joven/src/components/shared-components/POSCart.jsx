import React from "react";
import "../../styles/shared/POSCart.css";

export default function POSCart({ cart, incQty, decQty, updateQty, removeFromCart }) {
  return (
    <div className="cart-items-container">
      {cart.length === 0 && <div>Cart is empty</div>}

{cart.map((item, index) => (
  <div
    className="cart-item"
    key={`${item.id || "cart"}-${index}`}
  >

          <div style={{ flex: 1 }}>
            <strong>{item.name || "Unnamed Product"}</strong>

            <p>₱{Number(item.price || 0).toFixed(2)}</p>
          </div>

          {item.type === "product" && (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => decQty(item.id)}
                disabled={(item.qty ?? 1) <= 1}
              >
                -
              </button>

            <input
              type="number"
              min="1"
              value={Number.isFinite(item.qty) ? item.qty : 1}
              onChange={(e) => updateQty(item.id, e.target.value)}
              style={{ width: "40px" }}
            />

              <button onClick={() => incQty(item.id)}>+</button>
            </div>
          )}

          <button onClick={() => removeFromCart(item.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
