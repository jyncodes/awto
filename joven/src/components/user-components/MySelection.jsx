import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore"; // Firestore-specific imports
import { onAuthStateChanged } from "firebase/auth"; // Auth-specific import
import { auth, db } from "../../firebase";
import "../../styles/user-styles/MySelection.css";
import { FiX } from "react-icons/fi"; // For close button icon

const MySelection = ({ isOpen = true, onClose }) => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser ] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser ) => {
      setUser (currentUser );
      if (currentUser ) {
        fetchCartItems(currentUser .uid);
      } else {
        setCartItems([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchCartItems = async (userId) => {
    if (!userId) return;
    try {
      setLoading(true);
      const q = query(collection(db, "cartSelections"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCartItems(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
      alert("Failed to load selections.");
    } finally {
      setLoading(false);
    }
  };

  const handleView = (productId) => {
    console.log("View button clicked for productId:", productId); // DEBUG: Check if click fires
    try {
      if (onClose) onClose();
      navigate(`/product/${productId}`); // Adjust route if needed, e.g., '/view-product/${productId}'
      console.log("Navigation attempted to:", `/product/${productId}`); // DEBUG
    } catch (error) {
      console.error("Navigation error:", error);
      alert("Failed to navigate to product.");
    }
  };

  const handleRemove = async (itemId) => {
    console.log("Remove button clicked for itemId:", itemId); // DEBUG: Check if click fires
    if (!user) {
      console.log("No user logged in for remove"); // DEBUG
      return alert("You must be logged in.");
    }
    try {
      await deleteDoc(doc(db, "cartSelections", itemId));
      setCartItems((prev) => prev.filter((item) => item.id !== itemId));
      // Refetch to ensure sync
      await fetchCartItems(user.uid);
      if (onClose) onClose();
      alert("Item removed from selections.");
      console.log("Remove successful"); // DEBUG
    } catch (error) {
      console.error("Remove error:", error);
      alert("Failed to remove item.");
    }
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
            <div className="empty">Your selections are empty. Add some products!</div>
          ) : (
            <ul className="cart-list">
              {cartItems.map((item) => (
                <li key={item.id} className="cart-item">
                  <p className="cart-name">{item.productName}</p>
                  <p className="cart-brand">Brand: {item.brand}</p>
                  <p className="cart-price">₱{item.price?.toLocaleString() || "N/A"}</p>
                  {item.vehicleLabel && <p className="cart-brand">Vehicle: {item.vehicleLabel}</p>}
                  <div className="cart-buttons">
                    <button
                      className="view-button"
                      onClick={() => handleView(item.productId)}
                      style={{ pointerEvents: 'auto' }} // Fallback for clickability
                    >
                      View
                    </button>
                    <button
                      className="remove-button"
                      onClick={() => handleRemove(item.id)}
                      style={{ pointerEvents: 'auto' }} // Fallback for clickability
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