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
  const [tires, setTires] = useState([]);
  const [mags, setMags] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState("id-asc");

  const [currentView, setCurrentView] = useState("Tires");

  // Restock modal states
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockList, setRestockList] = useState([]);
  const [restockSearch, setRestockSearch] = useState("");

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState(null);

  // =========================
  // FETCH TIRES + MAGS SEPARATELY
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
            } catch {}
          }

          return {
            id: docItem.id,
            type: "Tire",
            supplierName,
            supplierContact,
            ...data,
          };
        })
      );

      setTires(tireList);
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
            } catch {}
          }

          return {
            id: docItem.id,
            type: "Mags",
            supplierName,
            supplierContact,
            ...data,
          };
        })
      );

      setMags(magsList);
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // =========================
  // MERGE TIRES + MAGS INTO products[]
  // =========================
  useEffect(() => {
    setProducts([...tires, ...mags]);
  }, [tires, mags]);

  // =========================
  // FILTER + SORT
  // =========================
  useEffect(() => {
    let filtered = [...products];

    if (searchTerm.trim() !== "") {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        `${p.productId || ""} ${p.brand || ""} ${p.model || ""}`
          .toLowerCase()
          .includes(lower)
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
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, sortOption, currentView]);

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
    setRestockList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty } : item))
    );
  };

  const saveRestocks = async () => {
    try {
      for (const item of restockList) {
        if (item.qty > 0) {
          const collectionName = item.type === "Tire" ? "products_tires" : "products_mags";
          const ref = doc(db, collectionName, item.firestoreId);
          const current = products.find((p) => p.id === item.firestoreId);
          const newStock = Number(current.stock || 0) + Number(item.qty);

          await updateDoc(ref, {
            stock: newStock,
            updatedAt: serverTimestamp(),
          });
        }
      }

      alert("✅ Restock saved successfully!");
      closeRestockModal();
    } catch (err) {
      alert("❌ Failed to save restocks.");
    }
  };

  // =========================
  // CONTACT SUPPLIER
  // =========================
  const handleContactSupplier = async (product) => {
    if (!product.supplierId) return alert("⚠️ No supplier linked.");

    try {
      const supplierRef = collection(
        db,
        "suppliers",
        product.supplierId,
        "requests"
      );

      await addDoc(supplierRef, {
        productName:
          product.type === "Tire"
            ? `${product.brand} ${product.model} ${product.tireWidth}/${product.aspectRatio}R${product.rimDiameter}`
            : `${product.brand} ${product.model} ${product.wheelDiameter}x${product.wheelWidth}`,
        quantity: 1,
        sellingPrice: product.price || 0,
        costPrice: 0,
        status: "Pending",
        createdAt: serverTimestamp(),
      });

      alert(`📩 Request sent to ${product.supplierName}!`);
    } catch {
      alert("❌ Failed to send request.");
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
      </div>

      {/* Tabs */}
      <div className="inventory-filter-tabs">
        <button
          className={currentView === "Tire" ? "active-tab" : ""}
          onClick={() => setCurrentView("Tire")}
        >
          Tires
        </button>

        <button
          className={currentView === "Mags" ? "active-tab" : ""}
          onClick={() => setCurrentView("Mags")}
        >
          Mags
        </button>
      </div>

      {/* TABLE */}
      <div className="inventory-card">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>
                {currentView === "Tire" ? "Stock (per piece)" : "Stock (per set)"}
              </th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts
              .filter((p) => p.type === currentView)
              .map((product) => {
                const productName =
                  product.type === "Tire"
                    ? `${product.brand} ${product.model} ${product.tireWidth}/${product.aspectRatio}R${product.rimDiameter}`
                    : `${product.brand} ${product.model} ${product.wheelDiameter}x${product.wheelWidth}`;

                const lowStock = product.type === "Tire" ? 3 : 1;
                const status =
                  Number(product.stock || 0) <= lowStock ? "Out of Stock" : "In Stock";

                return (
                  <tr key={product.id}>

                    <td>{product.productId}</td>
                    <td>{productName}</td>
                    <td>{product.stock || 0}</td>

                    <td className={status === "Out of Stock" ? "text-red" : "text-green"}>
                      {status}
                    </td>

                    <td className="actions-cell">
                      {(role === "admin" || role === "staff") && (
                        <>
                          {Number(product.stock) <= lowStock && (
                            <button
                              className="btn-restock"
                              onClick={() => {
                                setRestockList([{ ...product, qty: 1 }]);
                                setIsRestockOpen(true);
                              }}
                            >
                              Restock
                            </button>
                          )}

                          <button
                            className="btn-contact"
                            onClick={() => handleContactSupplier(product)}
                          >
                            Contact Supplier
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}

            {filteredProducts.filter((p) => p.type === currentView).length === 0 && (
              <tr>
                <td colSpan="10" className="text-center text-gray-500">
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
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
