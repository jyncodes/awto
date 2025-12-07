import React, { useState } from "react";
import "../../styles/shared/POSServiceList.css";

export default function POSServiceList({ services, addServiceToCart }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const totalPages = Math.ceil(services.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const visibleServices = services.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <h4>
        🧰 Services — {visibleServices.length} of {services.length}
      </h4>

      <div className="pos-scroll-list">
        {visibleServices.length === 0 ? (
          <div>No services available</div>
        ) : (
          visibleServices.map((svc) => (
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

      {totalPages > 1 && (
        <div className="pos-pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
