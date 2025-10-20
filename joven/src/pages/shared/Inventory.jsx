// 📄 src/pages/shared/Inventory.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import "../../styles/shared/Inventory.css";
import Restock from "../../components/admin-components/Restock";

const Inventory = ({ role }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("id-asc");

  // Restock
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockList, setRestockList] = useState([]);
  const [restockSearch, setRestockSearch] = useState("");

  // Edit
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  // Supplier
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierSuggestion, setSupplierSuggestion] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  // =========================
  // FETCH PRODUCTS (TIRES + MAGS)
  // =========================
  useEffect(() => {
    const unsubTires = onSnapshot(collection(db, "products_tires"), (snap) => {
      const tireList = snap.docs.map((doc) => ({
        id: doc.id,
        type: "Tire",
        ...doc.data(),
      }));
      setProducts((prev) => [...tireList, ...prev.filter((p) => p.type === "Mags")]);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), (snap) => {
      const magsList = snap.docs.map((doc) => ({
        id: doc.id,
        type: "Mags",
        ...doc.data(),
      }));
      setProducts((prev) => [...prev.filter((p) => p.type === "Tire"), ...magsList]);
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // =========================
  // FETCH SUPPLIERS
  // =========================
  useEffect(() => {
    const fetchSuppliers = async () => {
      const snap = await getDocs(collection(db, "suppliers"));
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSuppliers(list);
    };
    fetchSuppliers();
  }, []);

  // =========================
  // FILTER + SORT PRODUCTS
  // =========================
  useEffect(() => {
    let filtered = [...products];

    if (searchTerm.trim() !== "") {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        `${p.productId || ""} ${p.brand || ""} ${p.model || ""}`.toLowerCase().includes(lower)
      );
    }

    switch (sortOption) {
      case "id-asc":
        filtered.sort((a, b) => (a.productId || "").localeCompare(b.productId || ""));
        break;
      case "id-desc":
        filtered.sort((a, b) => (b.productId || "").localeCompare(a.productId || ""));
        break;
      case "stock-asc":
        filtered.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
        break;
      case "stock-desc":
        filtered.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
        break;
      case "modified-latest":
        filtered.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, sortOption]);

  // =========================
  // RESTOCK HANDLERS
  // =========================
  const openRestockModal = () => {
    setRestockList([]);
    setRestockSearch("");
    setIsRestockOpen(true);
  };

  const closeRestockModal = () => setIsRestockOpen(false);

  const handleSearchRestockProduct = () => {
    const term = restockSearch.toLowerCase();
    const result = products
      .filter((p) =>
        `${p.productId || ""} ${p.brand || ""} ${p.model || ""}`.toLowerCase().includes(term)
      )
      .map((p) => ({ ...p, qty: 0 }));
    setRestockList(result);
  };

  const handleRestockInput = (e, id) => {
    const qty = parseInt(e.target.value || 0);
    setRestockList((prev) => prev.map((item) => (item.id === id ? { ...item, qty } : item)));
  };

  const saveRestocks = async () => {
    try {
      for (const item of restockList) {
        if (item.qty > 0) {
          const collectionName = item.type === "Tire" ? "products_tires" : "products_mags";
          const ref = doc(db, collectionName, item.id);
          const original = products.find((p) => p.id === item.id);
          const newStock = Number(original.stock || 0) + Number(item.qty);

          await updateDoc(ref, {
            stock: newStock,
            updatedAt: serverTimestamp(),
          });
        }
      }
      alert("✅ Restock saved successfully!");
      closeRestockModal();
    } catch (err) {
      console.error("Restock failed:", err);
      alert("❌ Failed to save restocks.");
    }
  };

  // =========================
  // SUPPLIER SUGGESTION
  // =========================
  const handleSupplierSuggestion = (product) => {
    const matched = suppliers.find(
      (s) =>
        s.productType?.toLowerCase() === product.type.toLowerCase() ||
        s.brand?.toLowerCase() === product.brand?.toLowerCase()
    );
    setSupplierSuggestion({ product, supplier: matched || null });
    setIsSupplierModalOpen(true);
  };

  const closeSupplierModal = () => {
    setIsSupplierModalOpen(false);
    setSupplierSuggestion(null);
  };

  // =========================
  // EDIT HANDLERS
  // =========================
  const openEditModal = (product) => {
    setEditData({ ...product });
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditData(null);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const saveEditChanges = async () => {
    try {
      const collectionName = editData.type === "Tire" ? "products_tires" : "products_mags";
      const ref = doc(db, collectionName, editData.id);
      await updateDoc(ref, {
        brand: editData.brand,
        model: editData.model,
        price: Number(editData.price),
        stock: Number(editData.stock),
        updatedAt: serverTimestamp(),
      });
      alert("✅ Product updated successfully!");
      closeEditModal();
    } catch (err) {
      console.error("Edit failed:", err);
      alert("❌ Failed to update product.");
    }
  };

  // =========================
  // RENDER UI
  // =========================
  return (
    <div className="inventory-page-container">
      <h1 className="inventory-page-title">Inventory</h1>
      <p className="inventory-page-subtitle">Manage your current product stock, updates, and restocks.</p>

      {/* Controls */}
      <div className="inventory-controls">
        <input
          type="text"
          placeholder="Search by Product Name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="sort-select"
        >
          <option value="id-asc">Ascending Product ID</option>
          <option value="id-desc">Descending Product ID</option>
          <option value="stock-asc">Stock Low to High</option>
          <option value="stock-desc">Stock High to Low</option>
          <option value="modified-latest">Latest Modified</option>
        </select>

        {(role === "admin" || role === "staff") && (
          <button onClick={openRestockModal} className="restock-btn">
            Restock
          </button>
        )}
      </div>

      {/* Table */}
      <div className="inventory-card">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Total Value</th>
              <th>Last Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const productName =
                  product.type === "Tire"
                    ? `${product.brand} ${product.model} ${product.tireWidth}/${product.aspectRatio}R${product.rimDiameter}`
                    : `${product.brand} ${product.model} ${product.wheelDiameter}x${product.wheelWidth}`;
                const total = Number(product.stock || 0) * Number(product.price || 0);
                const status = Number(product.stock) <= 5 ? "Out of Stock" : "In Stock";
                const date = product.updatedAt?.toDate?.().toLocaleString() || "—";

                return (
                  <tr key={product.id}>
                    <td>{product.productId || product.id}</td>
                    <td>{productName}</td>
                    <td>{product.type}</td>
                    <td className={status === "Out of Stock" ? "text-red" : "text-green"}>
                      {status}
                    </td>
                    <td>{product.stock || 0}</td>
                    <td>₱{Number(product.price || 0).toFixed(2)}</td>
                    <td>₱{total.toFixed(2)}</td>
                    <td>{date}</td>
                    <td>
                      {(role === "admin" || role === "staff") && (
                        <button className="btn-edit" onClick={() => openEditModal(product)}>
                          Edit
                        </button>
                      )}
                      {status === "Out of Stock" && (
                        <button
                          className="btn-supplier"
                          onClick={() => handleSupplierSuggestion(product)}
                        >
                          Contact Supplier
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {isRestockOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Restock
              searchValue={restockSearch}
              setSearchValue={setRestockSearch}
              onSearch={handleSearchRestockProduct}
              restockList={restockList}
              onChangeQty={handleRestockInput}
              onClose={closeRestockModal}
              onSave={saveRestocks}
              suppliers={suppliers}
            />
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && supplierSuggestion && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Supplier Suggestion</h2>
            <p>
              Product:{" "}
              <strong>
                {supplierSuggestion.product.brand} {supplierSuggestion.product.model}
              </strong>
            </p>
            {supplierSuggestion.supplier ? (
              <>
                <p>
                  <strong>Supplier:</strong> {supplierSuggestion.supplier.name}
                </p>
                <p>
                  <strong>Contact:</strong> {supplierSuggestion.supplier.contact}
                </p>
                <p>
                  <strong>Type:</strong> {supplierSuggestion.supplier.productType}
                </p>
              </>
            ) : (
              <p className="text-red">No supplier found for this product.</p>
            )}
            <div className="modal-actions">
              <button className="btn-delete" onClick={closeSupplierModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit Product</h2>
            <div className="edit-form">
              <label>Brand</label>
              <input
                type="text"
                name="brand"
                value={editData.brand}
                onChange={handleEditChange}
              />
              <label>Model</label>
              <input
                type="text"
                name="model"
                value={editData.model}
                onChange={handleEditChange}
              />
              <label>Price (₱)</label>
              <input
                type="number"
                name="price"
                value={editData.price}
                onChange={handleEditChange}
              />
              <label>Stock</label>
              <input
                type="number"
                name="stock"
                value={editData.stock}
                onChange={handleEditChange}
              />

              <div className="modal-actions">
                <button className="btn-submit" onClick={saveEditChanges}>
                  Save Changes
                </button>
                <button className="btn-delete" onClick={closeEditModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
