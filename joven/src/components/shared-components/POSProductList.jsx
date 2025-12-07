import React from "react";


export default function POSProductList({ search, setSearch, filteredProducts, addToCart }) {
  return (
    <div>
      <div className="pos-search">
        <input
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <h4>🛞 Products</h4>
      <div className="pos-product-items-container">
        {filteredProducts.length === 0 ? (
          <div>No products</div>
        ) : (
          filteredProducts.map((p) => (
            <div className="pos-product-item" key={p.firestoreId}>
              <div>
                <strong>{p.brand} {p.model}</strong>
                <p>₱{Number(p.price).toFixed(2)} — {p.stock || 0} stock</p>
              </div>
              <button
                className="btn-submit"
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
              >
                Add
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
