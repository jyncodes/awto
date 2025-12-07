import React from "react";

export default function POSCart({ cart, incQty, decQty, updateQty, removeFromCart }) {
  return (
    <div className="cart-items-container">
      {cart.length === 0 && <div>Cart is empty</div>}

      {cart.map((item) => (
        <div className="cart-item" key={item.id}>
          <div style={{ flex: 1 }}>
            <strong>{item.name}</strong>
            <p>₱{item.price.toFixed(2)}</p>
          </div>

          {item.type === "product" && (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => decQty(item.id)}>-</button>
              <input
                type="number"
                value={item.qty}
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
