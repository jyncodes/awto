import React, { useState, useEffect } from "react";
import "../../styles/shared/POSProductList.css";

export default function POSProductList({ filteredProducts, addToCart, filter }) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Apply filter from parent (Tires / Mags / All)
  const processedProducts = filteredProducts.filter((p) => {
    if (filter === "Tires") return p.category === "tires";
    if (filter === "Mags") return p.category === "mags";
    return true; // All
  });

  const totalPages = Math.ceil(processedProducts.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const visibleProducts = processedProducts.slice(startIndex, startIndex + pageSize);

  // Reset page when filter changes (so page doesn't stay stuck)
  useEffect(() => setPage(1), [filter, filteredProducts.length]);

  return (
    <div>
      <h4>
        🛞 {filter === "All" ? "Products" : filter} — {visibleProducts.length} of {processedProducts.length}
      </h4>

      <div className="pos-scroll-list">
        {visibleProducts.length === 0 ? (
          <div>No items</div>
        ) : (
          visibleProducts.map((p) => {
            // Build format line for tires/mags
            let sizeLine = "";
            if (p.category === "tires") {
              sizeLine = `${p.tireWidth}/${p.aspectRatio}R${p.rimDiameter}`;
            } else if (p.category === "mags") {
              sizeLine = `${p.wheelDiameter}x${p.wheelWidth} • ${p.boltPattern}`;
            }

            return (
              <div className="pos-product-item" key={p.firestoreId}>
                <div>

                  <strong>{sizeLine}</strong>

                    <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                    {p.brand} {p.model}
                    </p>

                  <p>₱{Number(p.price).toFixed(2)} — {p.stock} stock</p>
                </div>

                <button
                  className="btn-submit"
                  onClick={() => addToCart(p)}
                  disabled={p.stock <= 0}
                >
                  Add
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
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
