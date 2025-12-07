import React from "react";

export default function POSServiceList({ services, addServiceToCart }) {
  return (
    <div>
      <h4>🧰 Services</h4>
      <div className="pos-product-items-container">
        {services.length === 0 ? (
          <div>No services available</div>
        ) : (
          services.map((svc) => (
            <div className="pos-product-item" key={svc.id}>
              <div>
                <strong>{svc.name}</strong>
                <p>₱{svc.price}</p>
              </div>
              <button className="btn-submit" onClick={() => addServiceToCart(svc)}>
                Add
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
