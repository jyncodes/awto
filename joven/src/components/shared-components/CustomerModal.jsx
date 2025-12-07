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
    email: "",
    gender: "",
    birthday: "",
    address: "",
  });

  // Auto-open if coming from Add button
  useEffect(() => {
    setShowAddForm(mode === "add");
  }, [mode]);

  // Fetch customers from Firestore
  const loadCustomers = async () => {
    const snap = await getDocs(collection(db, "customers"));
    const list = snap.docs.map((d) => ({
      firestoreId: d.id,
      ...d.data(),
    }));

    list.sort((a, b) => a.customerCode.localeCompare(b.customerCode));
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Live Search by name
 const filtered = customers.filter((c) => {
  if (!search) return true;
  return (
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact?.includes(search) ||
    c.plateNo?.toLowerCase().includes(search.toLowerCase())
  );
});

  // Generate next ID format CU-00001
  const generateCustomerCode = () => {
    if (customers.length === 0) return "CU-00001";
    const last = customers.at(-1);
    const next = Number(last.customerCode.split("-")[1]) + 1;
    return `CU-${String(next).padStart(5, "0")}`;
  };

  // Save new customer
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return alert("Name is required.");

    const customerData = {
      ...newCustomer,
      customerCode: generateCustomerCode(),
      registeredAt: serverTimestamp(),
    };

    await addDoc(collection(db, "customers"), customerData);

    setNewCustomer({
      name: "",
      contact: "",
      plateNo: "",
      email: "",
      gender: "",
      birthday: "",
      address: "",
    });

    setShowAddForm(false);
    await loadCustomers();
    alert("Customer added!");
  };

  return (
    <div className="customer-modal-bg">
      <div className="customer-modal">
        <h3 style={{ marginBottom: "10px" }}>Search Customer</h3>

        {/* Search + Add */}
        <div className="btn-row" style={{ marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <input
              className="input-field"
              placeholder="Search customer name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowAddForm(false); // <-- ensures searching mode works
              }}
              style={{ width: "100%" }}
            />

            {search && (
              <p style={{ fontSize: "13px", marginTop: "4px", color: "#475569" }}>
                🔍 Searching for: <strong>"{search}"</strong>
              </p>
            )}
          </div>

          {/* Search Button */}
            <button
            className="btn-submit"
            onClick={() => {
                setShowAddForm(false);
                setSearch(prev => prev.trim()); // forces UI update
            }}
            >
            🔍 Search
            </button>

          {/* Add Button */}
          <button
            className="btn-submit"
            style={{ background: "#10b981" }}
            onClick={() => setShowAddForm(true)}
          >
            ➕ Add
          </button>
        </div>

        {/* Add Customer Form Modal */}
        {showAddForm && (
          <div
            style={{
              marginBottom: "12px",
              background: "#f1f5f9",
              padding: "10px",
              borderRadius: "8px",
            }}
          >
            <h4>Add New Customer</h4>

            <input
              className="input-field"
              placeholder="Full Name"
              value={newCustomer.name}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, name: e.target.value })
              }
            />

            <input
              className="input-field"
              placeholder="Contact Number"
              value={newCustomer.contact}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, contact: e.target.value })
              }
            />

            <input
              className="input-field"
              placeholder="Vehicle Plate No."
              value={newCustomer.plateNo}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, plateNo: e.target.value })
              }
            />

            <input
              className="input-field"
              placeholder="Email"
              value={newCustomer.email}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, email: e.target.value })
              }
            />

            <select
              className="input-field"
              value={newCustomer.gender}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, gender: e.target.value })
              }
            >
              <option value="">Select Gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>

            <input
              type="date"
              className="input-field"
              value={newCustomer.birthday}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, birthday: e.target.value })
              }
            />

            <input
              className="input-field"
              placeholder="Address"
              value={newCustomer.address}
              onChange={(e) =>
                setNewCustomer({ ...newCustomer, address: e.target.value })
              }
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button className="btn-submit" onClick={handleAddCustomer}>
                Save
              </button>
              <button
                className="btn-cancel"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Customer Search Results */}
        <div style={{ maxHeight: "350px", overflowY: "auto" }}>
          {filtered.length === 0 && (
            <p style={{ textAlign: "center", color: "#64748b" }}>
              No matching customer.
            </p>
          )}

          {filtered.map((cust) => (
            <button
              key={cust.firestoreId}
              className="customer-option"
              onClick={() => onSelect(cust)}
            >
              <strong>{cust.name}</strong>
              <br />
              <small style={{ color: "#475569" }}>
                {cust.email} • {cust.gender}
              </small>
            </button>
          ))}
        </div>

        {/* Close */}
        <button
          className="btn-cancel"
          onClick={onClose}
          style={{ width: "100%", marginTop: "10px" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
