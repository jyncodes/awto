import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, getDocs, serverTimestamp } from "firebase/firestore";
import "../../styles/shared/CustomerModal.css";

export default function CustomerModal({ onClose, onSelect, mode }) {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    contact: "",
    plateNo: "",
    address: "",
  });

  // Auto-open Add form
  useEffect(() => {
    setShowAddForm(mode === "add");
  }, [mode]);

  // Fetch customers
  useEffect(() => {
    const loadCustomers = async () => {
      const snap = await getDocs(collection(db, "customers"));
      const list = snap.docs.map(d => ({
        firestoreId: d.id,
        ...d.data(),
      }));

      list.sort((a, b) => a.customerCode.localeCompare(b.customerCode));
      setCustomers(list);
    };

    loadCustomers();
  }, []);

  // Search filter
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return (
      !search ||
      c.customerCode?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.contact?.includes(search) ||
      c.plateNo?.toLowerCase().includes(q)
    );
  });

  // Generate CU-xxxxx
  const generateCustomerCode = () => {
    if (customers.length === 0) return "CU-00001";
    const last = customers.at(-1);
    const next = Number(last.customerCode.split("-")[1]) + 1;
    return `CU-${String(next).padStart(5, "0")}`;
  };

  // Save new customer
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Name is required.");

    await addDoc(collection(db, "customers"), {
      customerCode: generateCustomerCode(),
      name: newCustomer.name,
      contact: newCustomer.contact,
      plateNo: newCustomer.plateNo,
      address: newCustomer.address,
      registeredAt: serverTimestamp(),
    });

    setNewCustomer({
      name: "",
      contact: "",
      plateNo: "",
      address: "",
    });

    setShowAddForm(false);
    setSearch("");
    alert("Customer added!");
  };

  return (
    <div className="customer-modal-bg">
      <div className="customer-modal">
        <h3 style={{ marginBottom: "10px" }}>
          {showAddForm ? "Add Customer" : "Select Customer"}
        </h3>

        {/* ------- SELECT MODE ------- */}
        {!showAddForm && (
          <>
            <input
              autoFocus
              className="input-field"
              placeholder="Search name, ID, contact, or plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", marginBottom: "12px" }}
            />

            <div style={{ maxHeight: "350px", overflowY: "auto", marginBottom: "12px" }}>
              {filtered.length === 0 ? (
                <p style={{ textAlign: "center", color: "#64748b" }}>No matching results.</p>
              ) : (
                filtered.map((cust) => (
                  <button
                    key={cust.firestoreId}
                    className="customer-option"
                    onClick={() => onSelect(cust)}
                  >
                    <strong>{cust.customerCode} — {cust.name}</strong>
                    <br />
                    <small style={{ color: "#475569" }}>
                      📞 {cust.contact || "N/A"} • 🚗 {cust.plateNo || "None"}
                    </small>
                  </button>
                ))
              )}
            </div>

            {/* Bottom Buttons */}
            <div className="customer-btn-row">
              <button
                className="btn-cancel"
                onClick={onClose}
              >
                ⬅ Back
              </button>

              <button
                className="btn-submit"
                style={{ background: "#10b981" }}
                onClick={() => setShowAddForm(true)}
              >
                ➕ Add Customer
              </button>
            </div>
          </>
        )}

        {/* ------- ADD CUSTOMER MODE ------- */}
        {showAddForm && (
          <div className="add-form-box">
            <input
              className="input-field"
              placeholder="Full Name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            />

            <input
              className="input-field"
              placeholder="Contact Number"
              value={newCustomer.contact}
              onChange={(e) => setNewCustomer({ ...newCustomer, contact: e.target.value })}
            />

            <input
              className="input-field"
              placeholder="Plate Number"
              value={newCustomer.plateNo}
              onChange={(e) => setNewCustomer({ ...newCustomer, plateNo: e.target.value })}
            />

            <div className="customer-btn-row">
              <button className="btn-submit" onClick={handleAddCustomer}>Save</button>
              <button className="btn-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
