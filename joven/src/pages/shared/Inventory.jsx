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
  const [categoryView, setCategoryView] = useState("All");
  const [stockFilter, setStockFilter] = useState("all");

  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [isBulkRestockOpen, setIsBulkRestockOpen] = useState(false);

  const [restockList, setRestockList] = useState([]);
  const [bulkRestockList, setBulkRestockList] = useState([]);
  const [restockSearch, setRestockSearch] = useState("");

  const [bulkFilter, setBulkFilter] = useState("all");

  const ITEMS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  useEffect(() => {
    const unsubTires = onSnapshot(collection(db, "products_tires"), async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          let supplierName = "—";
          if (data.supplierId) {
            const supRef = await getDoc(doc(db, "suppliers", data.supplierId));
            if (supRef.exists()) supplierName = supRef.data().name;
          }
          return { firestoreId: d.id, category: "tires", ...data, supplierName };
        })
      );
      setTires(list);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), async (snap) => {
      const list = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          let supplierName = "—";
          if (data.supplierId) {
            const supRef = await getDoc(doc(db, "suppliers", data.supplierId));
            if (supRef.exists()) supplierName = supRef.data().name;
          }
          return { firestoreId: d.id, category: "mags", ...data, supplierName };
        })
      );
      setMags(list);
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  useEffect(() => {
    setProducts([...tires, ...mags]);
  }, [tires, mags]);

  // ------------------------ FIXED STATUS LOGIC ------------------------  
  const getStockValue = (stock) => Number(stock) || 0; // <-- updated

  const getStatus = (stock) => {
    const val = getStockValue(stock); // <-- updated
    if (val === 0) return "Out of Stock";
    if (val <= 3) return "Low Stock";
    return "In Stock";
  };

  const getStatusClass = (stock) => {
    const val = getStockValue(stock); // <-- updated
    return val === 0 ? "text-red" : val <= 3 ? "text-yellow" : "text-green";
  };

  // ------------------------ FILTER + SORT ------------------------
  useEffect(() => {
    let filtered = [...products];

    if (categoryView === "Tires") filtered = filtered.filter((p) => p.category === "tires");
    if (categoryView === "Mags") filtered = filtered.filter((p) => p.category === "mags");

    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();

      filtered = filtered.filter((p) => {
        const brandModel = `${p.brand} ${p.model}`.toLowerCase();
        const sizeString = getSearchableSize(p).toLowerCase();
        return brandModel.includes(t) || sizeString.includes(t);
      });
    }


    if (stockFilter === "out") filtered = filtered.filter((p) => getStockValue(p.stock) === 0);
    if (stockFilter === "low") filtered = filtered.filter((p) => getStockValue(p.stock) > 0 && getStockValue(p.stock) <= 3);

    switch (sortOption) {
      case "stock-asc":
        filtered.sort((a, b) => getStockValue(a.stock) - getStockValue(b.stock)); // <-- updated
        break;
      case "stock-desc":
        filtered.sort((a, b) => getStockValue(b.stock) - getStockValue(a.stock)); // <-- updated
        break;
        case "brand-asc":
      filtered.sort((a, b) =>
        `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`)
      );
      break;
      case "modified-latest":
        filtered.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
        break;
      default:
        filtered.sort((a, b) => (a.productId || "").localeCompare(b.productId || ""));
        
    }

    setFilteredProducts(filtered);
    setPage(1);
  }, [products, searchTerm, sortOption, stockFilter, categoryView]);

  // ------------------------ RESTOCK MODALS ------------------------
  const openRestockModal = (product) => {
    setRestockList([{ ...product, qty: 1 }]);
    setIsRestockOpen(true);
  };

  const openBulkRestockModal = () => {
    setBulkRestockList(products.map((p) => ({ ...p, qty: 0 })));
    setBulkFilter("all");
    setIsBulkRestockOpen(true);
  };

  const handleRestockInput = (e, id, mode) => {
    const qty = Number(e.target.value || 0);

    if (mode === "bulk") {
      setBulkRestockList((prev) => prev.map((item) => (item.firestoreId === id ? { ...item, qty } : item)));
    } else {
      setRestockList((prev) => prev.map((item) => (item.firestoreId === id ? { ...item, qty } : item)));
    }
  };

  const saveBulk = async () => {
    for (const item of bulkRestockList) {
      if (item.qty > 0) {
        const col = item.category === "tires" ? "products_tires" : "products_mags";
        await updateDoc(doc(db, col, item.firestoreId), {
          stock: getStockValue(item.stock) + item.qty, // <-- updated
          updatedAt: serverTimestamp(),
        });
      }
    }
    alert("Bulk Restock Complete");
    setIsBulkRestockOpen(false);
  };

  const saveRestocks = async () => {
    for (const item of restockList) {
      if (item.qty > 0) {
        const col = item.category === "tires" ? "products_tires" : "products_mags";
        await updateDoc(doc(db, col, item.firestoreId), {
          stock: getStockValue(item.stock) + item.qty, // <-- updated
          updatedAt: serverTimestamp(),
        });
      }
    }
    alert("Restock Complete");
    setIsRestockOpen(false);
  };

  const formatLabel = (p) => {
    if (p.category === "tires") return `${p.tireWidth}/${p.aspectRatio}R${p.rimDiameter}`;
    if (p.category === "mags") return `${p.wheelDiameter}x${p.wheelWidth} • ${p.boltPattern}`;
    return "";
  };

  const filteredBulkItems = bulkRestockList.filter((item) => {
    const val = getStockValue(item.stock);
    if (bulkFilter === "all") return true;
    if (bulkFilter === "out") return val === 0;
    if (bulkFilter === "low") return val > 0 && val <= 3;
    if (bulkFilter === "ok") return val > 3;
    return true;
  });

  const paginatedProducts = filteredProducts.slice(
  (page - 1) * ITEMS_PER_PAGE,
  page * ITEMS_PER_PAGE
);
const startIndex = (page - 1) * ITEMS_PER_PAGE + 1;
const endIndex = Math.min(page * ITEMS_PER_PAGE, filteredProducts.length);
const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);



  return (
    <div className="inventory-page-container">
      <h1 className="inventory-page-title">Inventory</h1>

      {/* FILTER BAR */}
      <div className="inventory-controls">

        {/* SEARCH */}
      <input
        className="search-bar"
        placeholder="Search brand, model, or size..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />


        {/* SORT DROPDOWN */}
        <select
          className="sort-select"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="brand-asc">Brand: A → Z</option>
          <option value="stock-asc">Stock: Low → High</option>
          <option value="stock-desc">Stock: High → Low</option>
          <option value="modified-latest">Recently Updated</option>
        </select>


        {/* CATEGORY DROPDOWN */}
        <select
          className="sort-select"
          value={categoryView}
          onChange={(e) => setCategoryView(e.target.value)}
        >
          <option value="All">Category: All</option>
          <option value="Tires">Tires</option>
          <option value="Mags">Mags</option>
        </select>

        {/* RESTOCK BUTTON */}
        {(role === "admin" || role === "staff") && (
          <button className="btn-bulk" onClick={openBulkRestockModal}>
            Restock
          </button>
        )}
      </div>

      {/* PRODUCT TABLE */}
      <div className="inventory-card">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Sizes</th>
              <th>Brand/Model</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {paginatedProducts.map((p) => {

              const stockValue = getStockValue(p.stock); // <-- updated

              return (
                <tr key={p.firestoreId}>
                  <td><strong>{formatLabel(p)}</strong></td>
                  <td>{p.brand} {p.model}</td>
                  <td>{stockValue}</td> {/* <-- always shows valid number */}
                  <td className={getStatusClass(p.stock)}>{getStatus(p.stock)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
  <div
    style={{
      marginTop: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    }}
  >

    {/* LEFT SIDE — Showing text */}
    <span style={{ fontSize: "14px" }}>
      Showing {startIndex} to {endIndex} of {filteredProducts.length} results
    </span>

    {/* RIGHT SIDE — PAGE BUTTONS */}
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

      {/* PREVIOUS */}
      <button
        disabled={page === 1}
        className="cancel-btn"
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>

      {/* PAGE NUMBERS */}
      {[...Array(totalPages)].map((_, i) => (
        <button
          key={i}
          onClick={() => setPage(i + 1)}
          className="btn-page"
          style={{
            padding: "5px 10px",
            borderRadius: "6px",
            background: page === i + 1 ? "#333" : "#fff",
            color: page === i + 1 ? "#fff" : "#333",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          {i + 1}
        </button>
      ))}

      {/* NEXT */}
      <button
        disabled={page === totalPages}
        className="submit-btn"
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  </div>
)}




      {/* SINGLE RESTOCK MODAL */}
      {isRestockOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Restock
              searchValue={restockSearch}
              setSearchValue={setRestockSearch}
              restockList={restockList}
              onChangeQty={(e, id) => handleRestockInput(e, id, "single")}
              onClose={() => setIsRestockOpen(false)}
              onSave={saveRestocks}
            />
          </div>
        </div>
      )}

      {/* BULK RESTOCK MODAL WITH FILTER */}
      {isBulkRestockOpen && (
        <div className="modal-overlay">
          <div className="modal-content bulk-restock">
            <h2> Restock</h2>

         <select
              className="sort-select"
              style={{ width: "100%", marginBottom: "1rem" }}
              value={bulkFilter}
              onChange={(e) => setBulkFilter(e.target.value)}
            >
              <option value="all">Show: All</option>
              <option value="out">Out of Stock</option>
              <option value="low">Low Stock</option>
              <option value="ok">In Stock</option>
            </select>   

            {filteredBulkItems.length === 0 ? (
              <p>No products matching filter.</p>
            ) : (
              filteredBulkItems.map((item) => (
                <div key={item.firestoreId} className="bulk-restock-item">
                  <div>
                    <strong>{formatLabel(item)}</strong><br />
                    {item.brand} {item.model}
                    <div className={getStatusClass(item.stock)} style={{ fontWeight: "600", marginTop: "4px" }}>
                      {getStatus(item.stock)} — Stock: {getStockValue(item.stock)} {/* <-- updated */}
                    </div>
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={item.qty}
                    className="stock-input"
                    onChange={(e) => handleRestockInput(e, item.firestoreId, "bulk")}
                  />
                </div>
              ))
            )}

            <div className="restock-actions">
              <button className="submit-btn" onClick={saveBulk}>Save</button>
              <button className="cancel-btn" onClick={() => setIsBulkRestockOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
