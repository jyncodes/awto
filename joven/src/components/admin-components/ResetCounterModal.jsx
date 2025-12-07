// src/components/admin-components/ResetCounterModal.jsx
import React, { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";

const PRODUCT_TYPE_PREFIXES = {
  Tire: "TI",
  Mags: "MA"
};

// Reservation and Customers have unique prefixes
const RESERVATION_PREFIX = "RES";
const CUSTOMER_PREFIX = "CU";

const ResetCounterModal = ({ isOpen, onClose }) => {
  const [selectedType, setSelectedType] = useState("Tire");
  const [nextIdPreview, setNextIdPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch next ID preview
  const fetchNextId = async (type) => {
    try {
      setLoading(true);

      // Customer Counter Preview
      if (type === "Customer") {
        const ref = doc(db, "counters", "customerCounter");
        const snap = await getDoc(ref);
        const current = snap.exists() ? snap.data().lastId : 0;

        setNextIdPreview(`${CUSTOMER_PREFIX}-${String(current + 1).padStart(5, "0")}`);
        return;
      }

      // Reservation Preview
      if (type === "Reservation") {
        const ref = doc(db, "counters", "reservations");
        const snap = await getDoc(ref);
        const current = snap.exists() ? snap.data().lastId : 0;

        setNextIdPreview(`${RESERVATION_PREFIX}-${String(current + 1).padStart(5, "0")}`);
        return;
      }

      // Tire / Mags Preview
      const prefix = PRODUCT_TYPE_PREFIXES[type];
      const counterRef = doc(db, "counters", `productCounter_${prefix}`);
      const snap = await getDoc(counterRef);
      const current = snap.exists() ? snap.data().lastId : 0;

      setNextIdPreview(`${prefix}-${String(current + 1).padStart(5, "0")}`);
    } catch (err) {
      console.error("Failed to fetch preview:", err);
      setError("Failed to load next ID.");
      setNextIdPreview("Error");
    } finally {
      setLoading(false);
    }
  };

  // Verify Admin
  const verifyAdmin = async () => {
    const user = auth.currentUser;
    if (!user) return false;

    const userDoc = await getDoc(doc(db, "users", user.uid));
    return userDoc.exists() && userDoc.data().role === "Admin";
  };

  // Reset counter
  const handleReset = async () => {
    setError("");
    setLoading(true);

    try {
      const isAdmin = await verifyAdmin();
      if (!isAdmin) {
        setError("❌ You are not authorized.");
        setLoading(false);
        return;
      }

      const confirmReset = window.confirm(`Reset ${selectedType} counter?`);
      if (!confirmReset) {
        setLoading(false);
        return;
      }

      // Reset Customer Counter
      if (selectedType === "Customer") {
        await setDoc(
          doc(db, "counters", "customerCounter"),
          { lastId: 0 },
          { merge: true }
        );

        alert("✅ Customer counter reset (CU-00001 next).");
        onClose();
        return;
      }

      // Reset Reservation Counter
      if (selectedType === "Reservation") {
        await setDoc(
          doc(db, "counters", "reservations"),
          { lastId: 0 },
          { merge: true }
        );

        alert("✅ Reservation counter reset (RES-00001 next).");
        onClose();
        return;
      }

      // Reset Tire / Mags
      const prefix = PRODUCT_TYPE_PREFIXES[selectedType];
      await setDoc(
        doc(db, `counters/productCounter_${prefix}`),
        { lastId: 0 },
        { merge: true }
      );

      alert(`✅ ${selectedType} counter reset.`);
      onClose();
    } catch (err) {
      console.error("Reset failed:", err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Auto preview refresh
  useEffect(() => {
    if (isOpen) {
      fetchNextId(selectedType);
      setError("");
    }
  }, [isOpen, selectedType]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Reset ID Counter</h2>

        <div className="form-group">
          <label>Select Counter</label>

          <select
            className="counter-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="Tire">Tire</option>
            <option value="Mags">Mags</option>
            <option value="Customer">Customer</option> {/* 👈 Added */}
            <option value="Reservation">Reservation</option>
          </select>
        </div>

        <p>
          <strong>Next ID Preview:</strong>{" "}
          {loading ? "Loading..." : nextIdPreview}
        </p>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button onClick={handleReset} disabled={loading}>
            {loading ? "Resetting..." : "Reset Counter"}
          </button>
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetCounterModal;
