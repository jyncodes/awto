import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
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
  const [currentView, setCurrentView] = useState("Tire");

  // Restock modal
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockList, setRestockList] = useState([]);
  const [restockSearch, setRestockSearch] = useState("");

  // ============================================
  // FETCH TIRES + MAGS
  // ============================================
  useEffect(() => {
    const unsubTires = onSnapshot(collection(db, "products_tires"), async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          let supplierName = "—";
          let supplierContact = "";
          let supplierId = data.supplierId || "";

          if (supplierId) {
            try {
              const supRef = doc(db, "suppliers", supplierId);
              const supSnap = await getDoc(supRef);
              if (supSnap.exists()) {
                supplierName = supSnap.data().name;
                supplierContact = supSnap.data().contact || "";
              }
            } catch {}
          }

          return {
            firestoreId: d.id,
            id: data.productId || "",
            type: "Tire",
            supplierName,
            supplierContact,
            ...data,
          };
        })
      );

      setTires(list);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();

          let supplierName = "—";
          let supplierContact = "";
          let supplierId = data.supplierId || "";

          if (supplierId) {
            try {
              const supRef = doc(db, "suppliers", supplierId);
              const supSnap = await getDoc(supRef);
              if (supSnap.exists()) {
                supplierName = supSnap.data().name;
                supplierContact = supSnap.data().contact || "";
              }
            } catch {}
          }

          return {
            firestoreId: d.id,
            id: data.productId || "",
            type: "Mags",
            supplierName,
            supplierContact,
            ...data,
          };
        })
      );

      setMags(list);
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // ============================================
  // MERGE PRODUCTS
  // ============================================
  useEffect(() => {
    setProducts([...tires, ...mags]);
  }, [tires, mags]);

  // ============================================
  // FILTER + SORT
  // ============================================
  useEffect(() => {
    let filtered = [...products];

    if (searchTerm.trim() !== "") {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        `${p.id} ${p.brand} ${p.model}`.toLowerCase().includes(t)
      );
    }

    switch (sortOption) {
      case "id-asc":
        filtered.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
        break;
      case "id-desc":
        filtered.sort((a, b) => (b.id || "").localeCompare(a.id || ""));
        break;
      case "stock-asc":
        filtered.sort((a, b) => Number(a.stock) - Number(b.stock));
        break;
      case "stock-desc":
        filtered.sort((a, b) => Number(b.stock) - Number(a.stock));
        break;
      case "modified-latest":
        filtered.sort((a, b) => {
          const A = a.updatedAt?.toMillis?.() || 0;
          const B = b.updatedAt?.toMillis?.() || 0;
          return B - A;
        });
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, sortOption]);

  // ============================================
  // RESTOCK HANDLERS
  // ============================================
  const openRestockModal = (product = null) => {
    if (product) {
      setRestockList([{ ...product, qty: 1 }]);
    } else {
      setRestockList([]);
    }

    setRestockSearch("");
    setIsRestockOpen(true);
  };

  const closeRestockModal = () => setIsRestockOpen(false);

  const handleSearchRestockProduct = () => {
    const term = restockSearch.toLowerCase();

    const results = products
      .filter((p) =>
        `${p.id} ${p.brand} ${p.model}`.toLowerCase().includes(term)
      )
      .map((p) => ({ ...p, qty: 0 }));

    setRestockList(results);
  };

  const handleRestockInput = (e, firestoreId) => {
    const qty = parseInt(e.target.value || 0);
    setRestockList((prev) =>
      prev.map((it) =>
        it.firestoreId === firestoreId ? { ...it, qty } : it
      )
    );
  };

  const saveRestocks = async () => {
    try {
      for (const item of restockList) {
        if (item.qty > 0) {
          const colName = item.type === "Tire" ? "products_tires" : "products_mags";
          const ref = doc(db, colName, item.firestoreId);
          const newStock = Number(item.stock || 0) + Number(item.qty);

          await updateDoc(ref, {
            stock: newStock,
            updatedAt: serverTimestamp(),
          });
        }
      }

      alert("✅ Restock saved!");
      closeRestockModal();
    } catch (err) {
      alert("❌ Failed to restock.");
    }
  };

  // ============================================
  // UI
  // ============================================
  return (
    <div className="inventory-page-container">
      <h1 className="inventory-page-title">Inventory</h1>
      <p className="inventory-page-subtitle">
        Manage your current product stock, updates, and restocks.
      </p>

      {/* Search + Sort */}
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
                const isLowStock = Number(product.stock || 0) <= lowStock;

                return (
                  <tr key={product.firestoreId}>
                    <td>{product.id}</td>
                    <td>{productName}</td>
                    <td>{product.stock || 0}</td>

                    <td className={isLowStock ? "text-red" : "text-green"}>
                      {isLowStock ? "Out of Stock" : "In Stock"}
                    </td>

                    <td className="actions-cell">
                      {(role === "admin" || role === "staff") && (
                        <>
                          <button
                            className="btn-restock"
                            onClick={() => openRestockModal(product)}
                          >
                            Restock
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

      {/* RESTOCK MODAL */}
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
