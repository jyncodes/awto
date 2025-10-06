import React, { useState, useEffect } from "react"; 
import { useNavigate } from "react-router-dom";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/MySelection.css";

const MySelection = ({ cartItems, onClose }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState(cartItems || []);

  useEffect(() => {
    setItems(cartItems);
  }, [cartItems]);

  const handleRemoveItem = async (itemId) => {
    const confirmed = window.confirm("Are you sure you want to remove this item?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "cartSelections", itemId));
      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error("Failed to remove item:", error);
    }
  };

  const handleReserve = (item) => {
    navigate(`/reservation/${item.productId}`, {
      state: {
        vehicleLabel: item.vehicleLabel || "",
        size: item.size || [],
        productName: item.productName,
        brand: item.brand,
        price: item.price,
      },
    });
    onClose();
  };

  const handleViewProduct = (item) => {
    navigate(`/view-product/${item.productId}`, {
      state: {
        vehicleLabel: item.vehicleLabel || "",
        size: item.size || [],
      },
    });
    onClose();
  };

  const handleOverlayClick = () => {
    onClose();
  };

  return (
    <div className="my-selection-panel-overlay" onClick={handleOverlayClick}>
      <div
        className="my-selection-panel"
        onClick={(e) => e.stopPropagation()} // <-- This prevents overlay from blocking clicks inside panel
      >
        <div className="my-selection-header">
          <h3>🛒 My Selection</h3>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="my-selection-body">
          {items.length === 0 ? (
            <p className="empty">No items in your selection.</p>
          ) : (
            <ul className="cart-list">
              {items.map((item) => (
                <li key={item.id} className="cart-item">
                  <p className="cart-name">{item.productName}</p>
                  <p className="cart-brand">
                    <strong>Brand:</strong> {item.brand}
                  </p>
                  <p className="cart-price">
                    <strong>Price:</strong> ₱{item.price?.toLocaleString()}
                  </p>

                  <div className="cart-buttons">
                    <button
                      className="view-button"
                      onClick={() => handleViewProduct(item)}
                    >
                      View
                    </button>
                    <button
                      className="reserve-button"
                      onClick={() => handleReserve(item)}
                    >
                      Reserve
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MySelection;
