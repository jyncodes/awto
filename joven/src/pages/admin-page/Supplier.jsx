// src/pages/admin-dashboard/Supplier.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import "../../styles/admin-styles/Supplier.css";

const Supplier = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isSupplierInfoModalOpen, setIsSupplierInfoModalOpen] = useState(false);
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierNameInput, setSupplierNameInput] = useState("");

  const [supplierInfoInput, setSupplierInfoInput] = useState({
    name: "",
    contact: "",
    email: "",
    productType: "",
    address: "",
    agent: "",
  });

  const [allProducts, setAllProducts] = useState([]);

  // 🔁 Fetch suppliers
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "suppliers"), async (snap) => {
      const supplierList = [];

      for (const docSnap of snap.docs) {
        const supplierData = { id: docSnap.id, ...docSnap.data() };

        // fetch nested requests
        const requestsSnap = await getDocs(
          collection(db, "suppliers", docSnap.id, "requests")
        );

        supplierData.requests = requestsSnap.docs.map((r) => ({
          id: r.id,
          ...r.data(),
        }));

        supplierList.push(supplierData);
      }

      setSuppliers(supplierList);

      if (!selectedSupplier && supplierList.length > 0) {
        setSelectedSupplier(supplierList[0]);
      }
    });

    // fetch all products
    const fetchAllProducts = async () => {
      const [tiresSnap, magsSnap, suppliersSnap] = await Promise.all([
        getDocs(collection(db, "products_tires")),
        getDocs(collection(db, "products_mags")),
        getDocs(collection(db, "suppliers")),
      ]);

      const supplierMap = {};
      suppliersSnap.docs.forEach((docSnap) => {
        supplierMap[docSnap.id] = docSnap.data().name || "Unknown Supplier";
      });

      const tires = tiresSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          type: "Tire",
          supplier: supplierMap[d.supplierId] || "Unknown Supplier",
          supplierId: d.supplierId || null,
        };
      });

      const mags = magsSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          type: "Mags",
          supplier: supplierMap[d.supplierId] || "Unknown Supplier",
          supplierId: d.supplierId || null,
        };
      });

      setAllProducts([...tires, ...mags]);
    };

    fetchAllProducts();

    return unsub;
  }, []);

  // ➕ Add Supplier
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierNameInput.trim()) return alert("Enter supplier name.");

    try {
      await addDoc(collection(db, "suppliers"), {
        name: supplierNameInput.trim(),
        contact: "",
        email: "",
        productType: "",
        address: "",
        agent: "",
        createdAt: serverTimestamp(),
      });

      setSupplierNameInput("");
      alert("Supplier added!");
    } catch (err) {
      console.error(err);
      alert("Failed to add supplier.");
    }
  };

  // ✏️ Edit supplier info modal
  const openSupplierInfoEditor = () => {
    if (!selectedSupplier) return;

    setSupplierInfoInput({
      name: selectedSupplier.name || "",
      contact: selectedSupplier.contact || "",
      email: selectedSupplier.email || "",
      productType: selectedSupplier.productType || "",
      address: selectedSupplier.address || "",
      agent: selectedSupplier.agent || "",
    });

    setIsSupplierInfoModalOpen(true);
  };

  // 💾 Save Supplier Info
  const handleSaveSupplierInfo = async (e) => {
    e.preventDefault();
    try {
      const ref = doc(db, "suppliers", selectedSupplier.id);
      await updateDoc(ref, { ...supplierInfoInput });

      setIsSupplierInfoModalOpen(false);
      alert("Supplier info updated.");
    } catch (err) {
      console.error(err);
      alert("Failed to update supplier info.");
    }
  };

  // ✏️ Edit Request
  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setIsEditRequestModalOpen(true);
  };

  // 💾 Save Request
  const handleSaveRequest = async (e) => {
    e.preventDefault();
    try {
      const reqRef = doc(
        db,
        "suppliers",
        selectedSupplier.id,
        "requests",
        selectedRequest.id
      );
      await updateDoc(reqRef, { ...selectedRequest });

      setIsEditRequestModalOpen(false);
      alert("Request updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to update request.");
    }
  };

  // 🗑 Delete supplier
  const handleDeleteSupplier = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    await deleteDoc(doc(db, "suppliers", id));

    alert("Supplier deleted.");
    if (selectedSupplier?.id === id) setSelectedSupplier(null);
  };

  // Search filter
  const filteredSuppliers = suppliers.filter((sup) =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get products under supplier
  const filteredProducts =
    selectedSupplier && allProducts.length > 0
      ? allProducts.filter(
          (p) =>
            p.supplierId === selectedSupplier.id ||
            p.supplier === selectedSupplier.name
        )
      : [];

  return (
    <div className="supplier-page">

      {/* Header */}
      <div className="supplier-header">
        <div className="supplier-left-nav">
          <div className="supplier-nav">
            {filteredSuppliers.map((sup) => (
              <button
                key={sup.id}
                className={`supplier-nav-btn ${
                  selectedSupplier?.id === sup.id ? "active" : ""
                }`}
                onClick={() => setSelectedSupplier(sup)}
              >
                {sup.name}
              </button>
            ))}
          </div>
        </div>

        <div className="supplier-right-actions">
          <input
            type="text"
            className="supplier-search"
            placeholder="🔍 Search supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button className="btn-edit-supplier" onClick={openSupplierInfoEditor}>
            📝 Edit Supplier Info
          </button>

          <button
            className="btn-edit-supplier"
            onClick={() => setIsManageModalOpen(true)}
          >
            ⚙️ Manage Suppliers
          </button>
        </div>
      </div>

      {/* Supplier Details */}
      {selectedSupplier ? (
        <div className="supplier-details-section">
          <h2 className="supplier-name-title">{selectedSupplier.name}</h2>

          <p className="supplier-contact">
            📞 {selectedSupplier.contact || "No contact"} <br />
            📧 {selectedSupplier.email || "No email"} <br />
            🏷️ {selectedSupplier.productType || "General"} <br />
            📍 {selectedSupplier.address || "No address"} <br />
            🧑‍💼 Agent: {selectedSupplier.agent || "No agent"} <br />
          </p>

          {/* PRODUCTS TABLE */}
          <div className="supplier-products-table">
            <h3>{selectedSupplier.name} - Products</h3>
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Product ID</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Price (₱)</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p, i) => (
                    <tr key={i}>
                      <td>{p.supplier}</td>
                      <td>{p.productId || p.id}</td>
                      <td>{p.brand || "N/A"}</td>
                      <td>{p.model || "N/A"}</td>
                      <td>{p.type}</td>
                      <td>₱{p.price?.toFixed(2) || "0.00"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-gray">
                      No products found for this supplier.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* REQUESTS */}
          <div className="supplier-requests">
            <h3>Requests</h3>
            <table className="supplier-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Unit Price</th>
                  <th>Profit/Item</th>
                  <th>Total Profit</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {selectedSupplier.requests &&
                selectedSupplier.requests.length > 0 ? (
                  selectedSupplier.requests.map((r, i) => {
                    const profitPerItem =
                      (r.sellingPrice || 0) - (r.costPrice || 0);
                    const totalProfit = (r.quantity || 0) * profitPerItem;

                    return (
                      <tr key={i}>
                        <td>{r.productName}</td>
                        <td>{r.quantity}</td>

                        <td>
                          <span
                            className={`status-badge ${
                              r.status === "Ordered"
                                ? "status-ordered"
                                : "status-pending"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td>₱{r.sellingPrice?.toFixed(2) || "0.00"}</td>
                        <td>₱{profitPerItem.toFixed(2)}</td>
                        <td>₱{totalProfit.toFixed(2)}</td>

                        <td>
                          <button
                            className="btn-edit-small"
                            onClick={() => handleEditRequest(r)}
                          >
                            ✏️ Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="text-gray">
                      No requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-gray mt-6">Select a supplier to view details.</p>
      )}

      {/* 📝 Edit Supplier Modal */}
      {isSupplierInfoModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <h2>Edit Supplier Information</h2>

            <form onSubmit={handleSaveSupplierInfo} className="supplier-info-form">

              <label>Name</label>
              <input
                type="text"
                value={supplierInfoInput.name}
                onChange={(e) =>
                  setSupplierInfoInput({
                    ...supplierInfoInput,
                    name: e.target.value,
                  })
                }
                required
              />

              <label>Contact Number</label>
              <input
                type="text"
                value={supplierInfoInput.contact}
                onChange={(e) =>
                  setSupplierInfoInput({
                    ...supplierInfoInput,
                    contact: e.target.value,
                  })
                }
              />

              <label>Email</label>
              <input
                type="text" 
                value={supplierInfoInput.email}
                onChange={(e) =>
                  setSupplierInfoInput({
                    ...supplierInfoInput,
                    email: e.target.value,
                  })
                }
              />

              <label>Product Type</label>
              <input
                type="text"
                value={supplierInfoInput.productType}
                onChange={(e) =>
                  setSupplierInfoInput({
                    ...supplierInfoInput,
                    productType: e.target.value,
                  })
                }
              />

              <label>Address</label>
              <input
                type="text"
                value={supplierInfoInput.address}
                onChange={(e) =>
                  setSupplierInfoInput({
                    ...supplierInfoInput,
                    address: e.target.value,
                  })
                }
              />

              <label>Agent of the Company</label>
              <input
                type="text"
                value={supplierInfoInput.agent}
                onChange={(e) =>
                  setSupplierInfoInput({
                    ...supplierInfoInput,
                    agent: e.target.value,
                  })
                }
              />

              <div className="modal-buttons">
                <button type="submit" className="btn-save">
                  💾 Save Changes
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsSupplierInfoModalOpen(false)}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ⚙️ Manage Suppliers Modal */}
      {isManageModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <h2>Manage Suppliers</h2>

            <form className="add-supplier-form" onSubmit={handleAddSupplier}>
              <input
                type="text"
                placeholder="New Supplier Name"
                value={supplierNameInput}
                onChange={(e) => setSupplierNameInput(e.target.value)}
                required
              />

              <div className="modal-buttons">
                <button type="submit" className="btn-save">Add</button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsManageModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </form>

            <div className="existing-suppliers">
              {suppliers.map((sup) => (
                <div key={sup.id} className="supplier-manage-item">
                  <input
                    defaultValue={sup.name}
                    onBlur={(e) =>
                      updateDoc(doc(db, "suppliers", sup.id), {
                        name: e.target.value,
                      })
                    }
                    className="edit-supplier-input"
                  />
                  <button
                    className="btn-delete-small"
                    onClick={() => handleDeleteSupplier(sup.id)}
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ✏️ Edit Request Modal */}
      {isEditRequestModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content small">
            <h2>Edit Request</h2>
            <form onSubmit={handleSaveRequest} className="edit-request-form">

              <input
                type="text"
                value={selectedRequest.productName}
                onChange={(e) =>
                  setSelectedRequest({
                    ...selectedRequest,
                    productName: e.target.value,
                  })
                }
              />

              <input
                type="number"
                value={selectedRequest.quantity}
                onChange={(e) =>
                  setSelectedRequest({
                    ...selectedRequest,
                    quantity: Number(e.target.value),
                  })
                }
                min="1"
              />

              <select
                value={selectedRequest.status}
                onChange={(e) =>
                  setSelectedRequest({
                    ...selectedRequest,
                    status: e.target.value,
                  })
                }
              >
                <option value="Pending">Pending</option>
                <option value="Ordered">Ordered</option>
              </select>

              <div className="modal-buttons">
                <button type="submit" className="btn-save">Save</button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsEditRequestModalOpen(false)}
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Supplier;
