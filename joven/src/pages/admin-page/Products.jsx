// src/pages/admin-dashboard/Products.jsx
import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import "../../styles/admin-styles/Products.css";
import ResetCounterModal from "../../components/admin-components/ResetCounterModal";

const PRODUCT_TYPE_PREFIXES = {
  Tire: "TI",
  Mags: "MA",
};

const INITIAL_FORM = {
  type: "Tire",
  productId: "",
  brand: "",
  model: "",
  tireWidth: "",
  aspectRatio: "",
  rimDiameter: "",
  wheelDiameter: "",
  wheelWidth: "",
  offset: "",
  boltPattern: "",
  centerBore: "",
  price: "",
  description: "",
};

const Products = () => {
  const [tires, setTires] = useState([]);
  const [mags, setMags] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [nextProductId, setNextProductId] = useState("");
  const [currentView, setCurrentView] = useState("tires");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ================================
  // FETCH PRODUCTS
  // ================================
  const fetchTires = async () => {
    const snapshot = await getDocs(collection(db, "products_tires"));
    setTires(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchMags = async () => {
    const snapshot = await getDocs(collection(db, "products_mags"));
    setMags(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    fetchTires();
    fetchMags();
  }, []);

  // ================================
  // GENERATE PRODUCT ID
  // ================================
  const fetchNextProductId = async (type = "Tire") => {
    try {
      const prefix = PRODUCT_TYPE_PREFIXES[type];
      const counterRef = doc(db, "counters", `productCounter_${prefix}`);
      const counterSnap = await getDoc(counterRef);
      const current = counterSnap.exists() ? counterSnap.data().lastId || 0 : 0;
      const padded = String(current + 1).padStart(5, "0");
      const id = `${prefix}-${padded}`;
      setNextProductId(id);
      return { id, current, prefix };
    } catch (error) {
      console.error("Error fetching product ID:", error);
      alert("Failed to generate product ID. Please try again.");
    }
  };

  // ================================
  // INPUT HANDLER
  // ================================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ================================
  // VERIFY ADMIN
  // ================================
  const verifyAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) return false;
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists() && userSnap.data().role === "Admin") return true;
    alert("You are not authorized.");
    return false;
  };

  // ================================
  // ADD / EDIT PRODUCT
  // ================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let generatedId, current, prefix;

      if (!isEditMode) {
        const result = await fetchNextProductId(formData.type);
        if (!result?.id) throw new Error("Failed to generate product ID");
        generatedId = result.id;
        current = result.current;
        prefix = result.prefix;
      }

      const payload = {
        ...formData,
        productId: isEditMode ? formData.productId : generatedId,
        price: Number(formData.price) || 0,
        updatedAt: serverTimestamp(),
        ...(isEditMode ? {} : { createdAt: serverTimestamp() }),
      };

      const collectionName =
        formData.type === "Tire" ? "products_tires" : "products_mags";

      if (isEditMode && selectedProduct) {
        await updateDoc(doc(db, collectionName, selectedProduct.id), payload);
        alert("Product updated successfully!");
      } else {
        await setDoc(doc(db, collectionName, generatedId), payload);
        await setDoc(doc(db, "counters", `productCounter_${prefix}`), {
          lastId: current + 1,
        });
        alert("Product added successfully!");
      }

      setFormData(INITIAL_FORM);
      setIsModalOpen(false);
      setIsEditMode(false);
      if (formData.type === "Tire") await fetchTires();
      else await fetchMags();
    } catch (error) {
      console.error("Error adding/updating product:", error);
      alert("Something went wrong. Please check your input or try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================================
  // EDIT PRODUCT
  // ================================
  const handleEdit = (product, type) => {
    setSelectedProduct(product);
    setFormData({ ...INITIAL_FORM, ...product, type });
    setNextProductId(product.productId || "");
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // ================================
  // DELETE PRODUCT
  // ================================
  const handleDelete = async (product, type) => {
    if (!(await verifyAdminAccess())) return;
    const collectionName = type === "Tire" ? "products_tires" : "products_mags";
    await deleteDoc(doc(db, collectionName, product.id));
    if (type === "Tire") fetchTires();
    else fetchMags();
    alert("Product deleted successfully!");
  };

  // ================================
  // OPEN ADD MODAL
  // ================================
  const openAddModal = async (type) => {
    setIsEditMode(false);
    setFormData({ ...INITIAL_FORM, type });
    await fetchNextProductId(type);
    setIsModalOpen(true);
  };

  // ================================
  // FILTER PRODUCTS BY SEARCH
  // ================================
  const filterProducts = (arr) =>
    arr.filter((p) =>
      ["brand", "productId", "model"].some((key) =>
        (p[key] || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  // ================================
  // RENDER
  // ================================
  return (
    <div className="products-page-container">
      <h1 className="products-page-title">Products</h1>

      <div className="controls-bar">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={() => setCurrentView("tires")}>Tires</button>
        <button onClick={() => setCurrentView("mags")}>Mags</button>
        <button onClick={() => openAddModal("Tire")}>Add Tire</button>
        <button onClick={() => openAddModal("Mags")}>Add Mag</button>
        <button onClick={() => setShowResetModal(true)}>Reset Counter</button>
      </div>

      {/* ================= TIRES TABLE ================= */}
      {currentView === "tires" && (
        <div className="product-table-wrapper">
          <h2>Tires</h2>
          {filterProducts(tires).length === 0 ? (
            <p>No tires found.</p>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Width</th>
                  <th>Aspect</th>
                  <th>Rim</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterProducts(tires).map((p) => (
                  <tr key={p.id}>
                    <td>{p.productId}</td>
                    <td>{p.brand}</td>
                    <td>{p.model}</td>
                    <td>{p.tireWidth}</td>
                    <td>{p.aspectRatio}</td>
                    <td>{p.rimDiameter}</td>
                    <td>{p.price}</td>
                    <td>
                      <button onClick={() => handleEdit(p, "Tire")}>Edit</button>
                      <button onClick={() => handleDelete(p, "Tire")}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ================= MAGS TABLE ================= */}
      {currentView === "mags" && (
        <div className="product-table-wrapper">
          <h2>Mags</h2>
          {filterProducts(mags).length === 0 ? (
            <p>No mags found.</p>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Wheel Diameter</th>
                  <th>Wheel Width</th>
                  <th>Offset</th>
                  <th>Bolt Pattern</th>
                  <th>Center Bore</th>
                  <th>Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterProducts(mags).map((p) => (
                  <tr key={p.id}>
                    <td>{p.productId}</td>
                    <td>{p.brand}</td>
                    <td>{p.model}</td>
                    <td>{p.wheelDiameter}</td>
                    <td>{p.wheelWidth}</td>
                    <td>{p.offset}</td>
                    <td>{p.boltPattern}</td>
                    <td>{p.centerBore}</td>
                    <td>{p.price}</td>
                    <td>
                      <button onClick={() => handleEdit(p, "Mags")}>Edit</button>
                      <button onClick={() => handleDelete(p, "Mags")}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ================= ADD / EDIT MODAL ================= */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="form-modal-content">
            <h2>{isEditMode ? "Edit Product" : `Add New ${formData.type}`}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Product ID</label>
                <input
                  type="text"
                  value={
                    isEditMode
                      ? formData.productId
                      : nextProductId || "Generating..."
                  }
                  readOnly
                />
              </div>

              <div className="form-group">
                <label>Brand</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Model</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {formData.type === "Tire" ? (
                <>
                  <div className="form-group">
                    <label>Tire Width (mm)</label>
                    <input
                      type="number"
                      name="tireWidth"
                      value={formData.tireWidth}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Aspect Ratio</label>
                    <input
                      type="number"
                      name="aspectRatio"
                      value={formData.aspectRatio}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rim Diameter</label>
                    <input
                      type="number"
                      name="rimDiameter"
                      value={formData.rimDiameter}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Wheel Diameter</label>
                    <input
                      type="number"
                      name="wheelDiameter"
                      value={formData.wheelDiameter}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Wheel Width</label>
                    <input
                      type="number"
                      name="wheelWidth"
                      value={formData.wheelWidth}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Offset</label>
                    <input
                      type="text"
                      name="offset"
                      value={formData.offset}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bolt Pattern</label>
                    <input
                      type="text"
                      name="boltPattern"
                      value={formData.boltPattern}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Center Bore</label>
                    <input
                      type="text"
                      name="centerBore"
                      value={formData.centerBore}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group full">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? "Saving..."
                    : isEditMode
                    ? "Update"
                    : "Add Product"}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET COUNTER MODAL */}
      <ResetCounterModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};

export default Products;
