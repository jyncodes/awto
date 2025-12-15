// src/components/user-components/MySelection.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";
import "../../styles/user-styles/MySelection.css";
import { FiX } from "react-icons/fi";

const MySelection = ({ isOpen = true, onClose }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // ✅ NEW
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  /* ================= AUTH ================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchCartItems(currentUser.uid);
      } else {
        setCartItems([]);
        setSelectedIds([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /* ================= FETCH CART ================= */
  const fetchCartItems = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, "cartSelections"),
        where("userId", "==", userId)
      );
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCartItems(items);
      setSelectedIds([]); // reset selection on reload
    } catch (error) {
      console.error("Error fetching cart:", error);
      alert("Failed to load selections.");
    } finally {
      setLoading(false);
    }
  };

  /* ================= VIEW PRODUCT ================= */
  const handleView = (productId) => {
    if (onClose) onClose();
    navigate(`/view-product/${productId}`);
  };

  /* ================= REMOVE ITEM ================= */
  const handleRemove = async (itemId) => {
    if (!user) return alert("You must be logged in.");
    try {
      await deleteDoc(doc(db, "cartSelections", itemId));
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
      await fetchCartItems(user.uid);
    } catch (error) {
      console.error("Remove error:", error);
      alert("Failed to remove item.");
    }
  };

  /* ================= CHECKBOX HANDLERS ================= */
  const toggleSelect = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectedItems = cartItems.filter((item) =>
    selectedIds.includes(item.id)
  );

  /* ================= RESERVE SELECTED ================= */
  const handleReserveSelected = () => {
    if (!selectedItems.length)
      return alert("Please select at least one item.");

    if (onClose) onClose();

navigate(`/reservation/${selectedItems[0].productId}`, {
  state: {
    type: "multiple-products",
    items: selectedItems,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="my-selection-panel-overlay">
      <div className="my-selection-panel">
        <div className="my-selection-header">
          <h3>My Selections ({cartItems.length})</h3>
          <button className="close-button" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="my-selection-body">
          {loading ? (
            <div className="empty">Loading...</div>
          ) : cartItems.length === 0 ? (
            <div className="empty">
              Your selections are empty. Add some products!
            </div>
          ) : (
            <>
              <ul className="cart-list">
                {cartItems.map((item) => (
                  <li key={item.id} className="cart-item">
                    {/* ✅ CHECKBOX */}
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="cart-checkbox"
                    />

                    <div className="cart-info">
                      <p className="cart-name">{item.productName}</p>
                      <p className="cart-brand">Brand: {item.brand}</p>

                      <p className="cart-price">
                        ₱{(item.totalPrice ?? item.pricePerItem ?? 0).toLocaleString()}
                      </p>

                      {item.vehicleLabel && (
                        <p className="cart-brand">
                          Vehicle: {item.vehicleLabel}
                        </p>
                      )}

                      <div className="cart-buttons">
                        <button
                          className="view-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(item.productId);
                          }}
                        >
                          View
                        </button>

                        <button
                          className="remove-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(item.id);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* ===== RESERVE SELECTED BUTTON ===== */}
              <div className="reserve-all-container">
                <button
                  className="reserve-all-button"
                  disabled={selectedItems.length === 0}
                  onClick={handleReserveSelected}
                >
                  Reserve Selected ({selectedItems.length})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MySelection;
