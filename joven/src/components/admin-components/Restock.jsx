import React from "react";
import "../../styles/admin-styles/Restock.css";

const Restock = ({
  searchValue,
  setSearchValue,
  onSearch,
  restockList,
  onChangeQty,
  onClose,
  onSave,
}) => {
  // Filter out-of-stock products
  const outOfStockItems = restockList.filter(
    (item) => Number(item.stock || 0) === 0
  );

  return (
    <div className="restock-modal">
      <h2 className="restock-title">Restock Products</h2>

      {/* Out of Stock Table */}
      {outOfStockItems.length > 0 && (
        <div className="outofstock-section">
          <h3 className="outofstock-title">Out of Stock Items</h3>
          <div className="outofstock-table-wrapper">
            <table className="outofstock-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {outOfStockItems.map((item) => {
                  return (
                    <tr key={item.id}>
                      <td>{item.model}</td>
                      <td>{item.type}</td>
                      <td>{item.brand}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="restock-search-container">
        <input
          type="text"
          placeholder="Search product by ID or Name..."
          className="restock-search-bar"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <button className="restock-search-btn" onClick={onSearch}>
          Search
        </button>
      </div>

      {/* Product List */}
      <div className="restock-list">
        {restockList.length === 0 ? (
          <p className="no-result">Search a product to restock.</p>
        ) : (
          restockList.map((item) => {
            const isLowStock = Number(item.stock || 0) <= 5;

            return (
              <div key={item.id} className="restock-item">
                <div className="restock-info">
                  <span className="restock-name">
                    {item.brand} {item.model}
                  </span>
                  <span className="restock-type">({item.type})</span>
                </div>

                <div className="restock-input-container">
                  <input
                    type="number"
                    className="stock-input"
                    value={item.qty}
                    onChange={(e) => onChangeQty(e, item.id)}
                    min="0"
                  />
                </div>

                {isLowStock && (
                  <div className="low-stock-alert">
                    ⚠ Low stock —{" please restock soon!"}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="restock-actions">
        <button className="submit-btn" onClick={onSave}>
          Save Changes
        </button>
        <button className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default Restock;
