import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, serverTimestamp, doc, setDoc } from "firebase/firestore";
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

  const [errors, setErrors] = useState({
  name: "",
  contact: "",
  plateNo: ""
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
      (c.lastPlateNumber || c.plateNo || "")
        .toLowerCase()
        .includes(q)
          );
  });

  // Generate CU-xxxxx
  const generateCustomerCode = () => {
    if (customers.length === 0) return "CU-00001";
    const last = customers.at(-1);
    const next = Number(last.customerCode.split("-")[1]) + 1;
    return `CU-${String(next).padStart(5, "0")}`;
  };

  // Validation Rules
const validateInputs = () => {
  // NAME VALIDATION (letters + spaces, no leading space)
  const nameRegex = /^[A-Za-z][A-Za-z\s]*$/;
  if (!newCustomer.name.trim() || !nameRegex.test(newCustomer.name)) {
    alert("❌ Name must contain only letters and spaces, and cannot start with a space.");
    return false;
  }

  // CONTACT VALIDATION (must be 11 digits & start with 09)
  const contactRegex = /^09\d{9}$/;
  if (!contactRegex.test(newCustomer.contact)) {
    alert("❌ Contact number must be 11 digits and start with 09 (ex: 09123456789).");
    return false;
  }

  // PLATE FORMAT VALIDATION
  // Old format: ABC 123 | New format: ABC 1234 
  const plateRegex = /^([A-Za-z]{2,3}-?\s?\d{3,4})$/;
  if (newCustomer.plateNo && !plateRegex.test(newCustomer.plateNo)) {
    alert("❌ Plate number format invalid. Examples:\n- ABC 123\n- ABC 1234");
    return false;
  }

  return true;
};

const validateField = (field, value) => {
  let message = "";

  if (field === "name") {
    const nameRegex = /^[A-Za-z][A-Za-z\s]*$/;
    if (!value.trim()) message = "Name is required.";
    else if (!nameRegex.test(value)) message = "Only letters allowed, cannot start with space.";
  }

  if (field === "contact") {
    if (!/^09\d{9}$/.test(value)) message = "Must be 11 digits & start with 09.";
  }

  if (field === "plateNo" && value) {
    const plateRegex = /^([A-Za-z]{2,3}-?\s?\d{3,4})$/;
    if (!plateRegex.test(value)) message = "Format: ABC 123 or ABC 1234.";
  }

  setErrors(prev => ({ ...prev, [field]: message }));
  return message === ""; // return true if valid
};

  // Save new customer
const handleAddCustomer = async () => {
  if (!validateInputs()) return; 

  const newCode = generateCustomerCode();


    await setDoc(doc(db, "customers", newCode), {
      customerCode: newCode,
      name: newCustomer.name.trim(),
      contact: newCustomer.contact,
      plateNo: newCustomer.plateNo.toUpperCase().trim(),
      address: newCustomer.address || "",
      registeredAt: serverTimestamp(),
    });

      // Refresh list
  const snap = await getDocs(collection(db, "customers"));
  setCustomers(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })));

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
                      🚗 {cust.lastPlateNumber || cust.plateNo || "None"}
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
        {/* NAME FIELD */}
        <input
          className="input-field"
          placeholder="Full Name"
          value={newCustomer.name}
          onChange={(e) => {
            const val = e.target.value.replace(/[^A-Za-z\s]/g, "");
            setNewCustomer({ ...newCustomer, name: val });
            validateField("name", val);
          }}
        />
        {errors.name && <p className="error-text">{errors.name}</p>}

        {/* CONTACT FIELD */}
        <input
          className="input-field"
          placeholder="Contact Number"
          maxLength={11}
          value={newCustomer.contact}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "");
            setNewCustomer({ ...newCustomer, contact: val });
            validateField("contact", val);
          }}
        />
        {errors.contact && <p className="error-text">{errors.contact}</p>}

        {/* PLATE FIELD */}
        <input
          className="input-field"
          placeholder="Plate Number"
          value={newCustomer.plateNo}
          onChange={(e) => {
            const val = e.target.value.toUpperCase().replace(/[^A-Za-z0-9 ]/g, "");
            setNewCustomer({ ...newCustomer, plateNo: val });
            validateField("plateNo", val);
          }}
        />
        {errors.plateNo && <p className="error-text">{errors.plateNo}</p>}

            <div className="customer-btn-row">
            <button 
              className="btn-submit" 
              onClick={handleAddCustomer}
              disabled={errors.name || errors.contact || errors.plateNo}
            >
              Save
            </button>              
            <button className="btn-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
