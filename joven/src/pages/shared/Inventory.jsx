import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  addDoc,
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

  // =========================
  // FETCH PRODUCTS
  // =========================
  useEffect(() => {
    const unsubTires = onSnapshot(collection(db, "products_tires"), async (snap) => {
      const tireList = await Promise.all(
        snap.docs.map(async (docItem) => {
          const data = docItem.data();
          let supplierName = "—";
          let supplierContact = "";
          let supplierId = data.supplierId || "";
          if (supplierId) {
            try {
              const supplierRef = doc(db, "suppliers", supplierId);
              const supplierSnap = await getDoc(supplierRef);
              if (supplierSnap.exists()) {
                supplierName = supplierSnap.data().name;
                supplierContact = supplierSnap.data().contact || "";
              }
            } catch (err) {
              console.warn("Supplier fetch failed:", err);
            }
          }
          return {
            id: docItem.id,
            type: "Tire",
            supplierId,
            supplierName,
            supplierContact,
            ...data,
          };
        })
      );
      setProducts((prev) => [...tireList, ...prev.filter((p) => p.type === "Mags")]);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), async (snap) => {
      const magsList = await Promise.all(
        snap.docs.map(async (docItem) => {
          const data = docItem.data();
          let supplierName = "—";
          let supplierContact = "";
          let supplierId = data.supplierId || "";
          if (supplierId) {
            try {
              const supplierRef = doc(db, "suppliers", supplierId);
              const supplierSnap = await getDoc(supplierRef);
              if (supplierSnap.exists()) {
                supplierName = supplierSnap.data().name;
                supplierContact = supplierSnap.data().contact || "";
              }
            } catch (err) {
              console.warn("Supplier fetch failed:", err);
            }
          }
          return {
            id: docItem.id,
            type: "Mags",
            supplierId,
            supplierName,
            supplierContact,
            ...data,
          };
        })
      );
      setProducts((prev) => [...prev.filter((p) => p.type === "Tire"), ...magsList]);
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // =========================
  // FILTER + SORT
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
  // CONTACT SUPPLIER LOGIC
  // =========================
  const handleContactSupplier = async (product) => {
    if (!product.supplierId) {
      alert("⚠️ No supplier linked to this product.");
      return;
    }

    try {
      const supplierRef = collection(db, "suppliers", product.supplierId, "requests");
      await addDoc(supplierRef, {
        productName:
          product.type === "Tire"
            ? `${product.brand} ${product.model} ${product.tireWidth}/${product.aspectRatio}R${product.rimDiameter}`
            : `${product.brand} ${product.model} ${product.wheelDiameter}x${product.wheelWidth}`,
        quantity: 10,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      alert(`📩 Request sent to ${product.supplierName}!`);
    } catch (err) {
      console.error("Failed to contact supplier:", err);
      alert("❌ Failed to send request to supplier.");
    }
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
      <p className="inventory-page-subtitle">
        Manage your current product stock, updates, and restocks.
      </p>

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

        {role === "admin" && (
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
              <th>Supplier</th>
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

                // ✅ FIXED STATUS: If stock <= 3 → "Out of Stock"
                const status = Number(product.stock || 0) <= 3 ? "Out of Stock" : "In Stock";

                const date = product.updatedAt?.toDate?.().toLocaleString() || "—";

                return (
                  <tr key={product.id}>
                    <td>{product.productId || product.id}</td>
                    <td>{productName}</td>
                    <td>{product.type}</td>
                    <td>{product.supplierName || "—"}</td>
                    <td className={status === "Out of Stock" ? "text-red" : "text-green"}>
                      {status}
                    </td>
                    <td>{product.stock || 0}</td>
                    <td>₱{Number(product.price || 0).toFixed(2)}</td>
                    <td>₱{total.toFixed(2)}</td>
                    <td>{date}</td>
                    <td className="actions-cell">
                      {(role === "admin" || role === "staff") && (
                        <>
                          <button className="btn-edit" onClick={() => openEditModal(product)}>
                            Edit
                          </button>
                          {Number(product.stock) <= 3 && role === "admin" && (
                            <button className="btn-contact" onClick={() => handleContactSupplier(product)}>
                              Contact Supplier
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="10" className="text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
