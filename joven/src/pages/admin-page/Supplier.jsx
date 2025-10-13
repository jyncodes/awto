import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import "../../styles/admin-styles/Supplier.css";

const Supplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
  });
  const [editingId, setEditingId] = useState(null);

  // 🔹 Real-time Fetch
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      setSuppliers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  // 🔹 Handle Form Input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔹 Add or Update Supplier
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.contactPerson || !formData.phone) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      if (editingId) {
        const docRef = doc(db, "suppliers", editingId);
        await updateDoc(docRef, formData);
        alert("Supplier updated successfully!");
      } else {
        await addDoc(collection(db, "suppliers"), {
          ...formData,
          createdAt: serverTimestamp(),
        });
        alert("Supplier added successfully!");
      }
      setFormData({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error saving supplier:", error);
    }
  };

  // 🔹 Edit Supplier
  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
    });
    setEditingId(supplier.id);
  };

  // 🔹 Delete Supplier
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      await deleteDoc(doc(db, "suppliers", id));
    }
  };

  return (
    <div className="supplier-page">
      <h1>Suppliers Management</h1>
      <p className="subtitle">
        Manage your product sources and purchase history here.
      </p>

      {/* 🔸 Form Section */}
      <form onSubmit={handleSubmit} className="supplier-form">
        <h2>{editingId ? "Edit Supplier" : "Add New Supplier"}</h2>
        <div className="form-grid">
          <input
            type="text"
            name="name"
            placeholder="Company Name *"
            value={formData.name}
            onChange={handleChange}
          />
          <input
            type="text"
            name="contactPerson"
            placeholder="Contact Person *"
            value={formData.contactPerson}
            onChange={handleChange}
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone *"
            value={formData.phone}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
          <input
            type="text"
            name="address"
            placeholder="Address"
            value={formData.address}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="btn-submit">
          {editingId ? "Update Supplier" : "Add Supplier"}
        </button>
      </form>

      {/* 🔸 Supplier Table */}
      <div className="supplier-table">
        <h2>Supplier List</h2>
        <table>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Contact Person</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.contactPerson}</td>
                  <td>{supplier.phone}</td>
                  <td>{supplier.email || "-"}</td>
                  <td>{supplier.address || "-"}</td>
                  <td>
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(supplier)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(supplier.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No suppliers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Supplier;
