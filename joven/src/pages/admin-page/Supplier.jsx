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
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierNameInput, setSupplierNameInput] = useState("");
  const [allProducts, setAllProducts] = useState([]);

  // 🔁 Fetch suppliers + requests + products
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "suppliers"), async (snap) => {
      const supplierList = [];

      for (const docSnap of snap.docs) {
        const supplierData = { id: docSnap.id, ...docSnap.data() };

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
      if (!selectedSupplier && supplierList.length > 0)
        setSelectedSupplier(supplierList[0]);
    });

    // Fetch all products from products_tires and products_mags
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

      const tireProducts = tiresSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          type: "Tire",
          supplier: supplierMap[data.supplierId] || "Unknown Supplier",
          supplierId: data.supplierId || null,
        };
      });

      const magProducts = magsSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          type: "Mags",
          supplier: supplierMap[data.supplierId] || "Unknown Supplier",
          supplierId: data.supplierId || null,
        };
      });

      setAllProducts([...tireProducts, ...magProducts]);
    };

    fetchAllProducts();

    return unsub;
  }, []);

  // ➕ Add Supplier
  const handleAddSupplier = async (e) => {
    e.preventDefault();
    if (!supplierNameInput.trim()) return alert("Enter a supplier name.");
    try {
      await addDoc(collection(db, "suppliers"), {
        name: supplierNameInput.trim(),
        createdAt: serverTimestamp(),
      });
      setSupplierNameInput("");
      alert("✅ Supplier added!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to add supplier.");
    }
  };

  // ✏️ Edit Supplier
  const handleEditSupplier = async (supplierId, newName) => {
    if (!newName.trim()) return;
    await updateDoc(doc(db, "suppliers", supplierId), { name: newName });
    alert("✏️ Supplier updated.");
  };

  // 🗑️ Delete Supplier
  const handleDeleteSupplier = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    await deleteDoc(doc(db, "suppliers", id));
    alert("🗑️ Supplier deleted.");
    if (selectedSupplier?.id === id) setSelectedSupplier(null);
  };

  // ✏️ Edit Request
  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setIsEditRequestModalOpen(true);
  };

  // 💾 Save Request Update
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
      alert("✅ Request updated successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update request.");
    }
  };

  const filteredSuppliers = suppliers.filter((sup) =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🧩 Filter products by selected supplier
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
      {/* 🔹 Header Navigation */}
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
          <button
            className="btn-edit-supplier"
            onClick={() => setIsManageModalOpen(true)}
          >
            ⚙️ Edit Suppliers
          </button>
        </div>
      </div>

      {/* 🔹 Supplier Info & Tables */}
      {selectedSupplier ? (
        <div className="supplier-details-section">
          <h2 className="supplier-name-title">{selectedSupplier.name}</h2>
          <p className="supplier-contact">
            📞 {selectedSupplier.contact || "No contact info"} <br />
            📧 {selectedSupplier.email || "No email"} <br />
            🏷️ {selectedSupplier.productType || "General"}
          </p>

          {/* 🧾 Products Table (filtered by supplier) */}
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

          {/* 📦 Requests Table */}
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
                            {r.status || "Pending"}
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

      {/* ⚙️ Manage Suppliers Modal */}
      {isManageModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
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
                <button type="submit" className="btn-save">
                  ➕ Add
                </button>
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
                    onBlur={(e) => handleEditSupplier(sup.id, e.target.value)}
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
          <div className="modal-content">
            <h2>Edit Request</h2>
            <form onSubmit={handleSaveRequest} className="edit-request-form">
              <input
                type="text"
                value={selectedRequest.productName || ""}
                onChange={(e) =>
                  setSelectedRequest({
                    ...selectedRequest,
                    productName: e.target.value,
                  })
                }
                placeholder="Product Name"
                required
              />
              <input
                type="number"
                value={selectedRequest.quantity || 0}
                onChange={(e) =>
                  setSelectedRequest({
                    ...selectedRequest,
                    quantity: Number(e.target.value),
                  })
                }
                placeholder="Quantity"
                required
              />
              <select
                value={selectedRequest.status || "Pending"}
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
                <button type="submit" className="btn-save">
                  💾 Save
                </button>
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
