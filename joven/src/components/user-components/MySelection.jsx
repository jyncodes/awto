import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebase';
import '../../styles/MySelections.css'; 
import { useNavigate } from 'react-router-dom';

const MySelections = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'cartSelections'),
        where('userId', '==', user.uid)
      );

      const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCartItems(items);
        setLoading(false);
      });

      return () => unsubscribeFirestore();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleRemove = async (itemId) => {
    try {
      await deleteDoc(doc(db, 'cartSelections', itemId));
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  return (
    <div className="my-selections">
      <h2>🛒 My Selections</h2>

      {loading ? (
        <p className="loading">Loading selections...</p>
      ) : cartItems.length === 0 ? (
        <p className="empty">No items in your selections.</p>
      ) : (
        <div className="cart-grid">
          {cartItems.map((item) => (
            <div key={item.id} className="cart-card">
              <h3>{item.productName}</h3>
              <p><strong>Brand:</strong> {item.brand}</p>
              <p><strong>Price:</strong> ₱{item.price?.toLocaleString()}</p>
              <div className="actions">
                <button
                  className="reserve-btn"
                  onClick={() => navigate(`/reserve/${item.productId}`)}
                >
                  Reserve
                </button>
                <button
                  className="remove-btn"
                  onClick={() => handleRemove(item.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySelections;
