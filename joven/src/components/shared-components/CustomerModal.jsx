import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import "../../styles/admin-styles/POS.css"; // <-- ensures modal style loads

export default function CustomerModal({ onClose, onSelect }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");

  // Fetch customers from Firestore
  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "customers"));
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchData();
  }, []);

  // Search filter
  const filtered = search
    ? customers.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  return (
    <div className="customer-modal-bg">
      <div className="customer-modal">
        <h3 style={{ marginBottom: "10px" }}>Select Customer</h3>

        {/* Search Box */}
        <input
          className="input-field"
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "10px" }}
        />

        {/* Customer List */}
        <div style={{ maxHeight: "350px", overflowY: "auto" }}>
          {filtered.length === 0 && (
            <p style={{ color: "#64748b", textAlign: "center" }}>
              No matching customer.
            </p>
          )}

          {filtered.map((cust) => (
            <button
              key={cust.customerCode}
              className="customer-option"
              onClick={() => onSelect(cust)}
            >
              <strong>{cust.name}</strong> <br />
              <span style={{ fontSize: "12px", color: "#475569" }}>
                {cust.email} • {cust.gender}
              </span>
            </button>
          ))}
        </div>

        {/* Close Button */}
        <button
          className="btn-cancel"
          onClick={onClose}
          style={{ marginTop: "10px", width: "100%" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
