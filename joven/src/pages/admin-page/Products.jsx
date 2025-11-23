// src/pages/admin-page/Products.jsx
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
  onSnapshot,
} from "firebase/firestore";
import "../../styles/admin-styles/Products.css";

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
  retail: "",
  description: "",
  supplierId: "",
};

const INITIAL_SERVICE_FORM = {
  name: "",
  price: "",
  taxable: true,
  durationMinutes: "",
  active: true,
};

const Products = () => {
  const [tires, setTires] = useState([]);
  const [mags, setMags] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [nextProductId, setNextProductId] = useState("");
  const [currentView, setCurrentView] = useState("tires");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [services, setServices] = useState([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceForm, setServiceForm] = useState(INITIAL_SERVICE_FORM);
  const [editingService, setEditingService] = useState(null);
  const [isServiceSaving, setIsServiceSaving] = useState(false);

  const [showSupplierList, setShowSupplierList] = useState(false);

  const fetchTires = async () => {
    const snapshot = await getDocs(collection(db, "products_tires"));
    setTires(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchMags = async () => {
    const snapshot = await getDocs(collection(db, "products_mags"));
    setMags(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const fetchSuppliers = async () => {
    const snapshot = await getDocs(collection(db, "suppliers"));
    setSuppliers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const subscribeServices = () => {
    const col = collection(db, "services");
    return onSnapshot(col, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setServices(list.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    });
  };

  useEffect(() => {
    fetchTires();
    fetchMags();
    fetchSuppliers();
    const unsubServices = subscribeServices();
    return () => unsubServices && unsubServices();
  }, []);

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
      alert("Failed to generate product ID.");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "price") {
      const priceNum = Number(value) || 0;
      const retail = (priceNum * 1.25).toFixed(2);
      setFormData((prev) => ({ ...prev, price: value, retail }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const verifyAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) return false;
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists() && userSnap.data().role === "Admin") return true;
    alert("You are not authorized.");
    return false;
  };

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
        retail: Number(formData.retail) || 0,
        updatedAt: serverTimestamp(),
        ...(isEditMode ? {} : { createdAt: serverTimestamp() }),
      };

      const collectionName =
        formData.type === "Tire" ? "products_tires" : "products_mags";

      if (isEditMode && selectedProduct) {
        await updateDoc(doc(db, collectionName, selectedProduct.id), payload);
        alert("Product updated!");
      } else {
        await setDoc(doc(db, collectionName, generatedId), payload);
        await setDoc(doc(db, "counters", `productCounter_${prefix}`), {
          lastId: current + 1,
        });
        alert("Product added!");
      }

      setFormData(INITIAL_FORM);
      setIsModalOpen(false);
      setIsEditMode(false);

      if (formData.type === "Tire") await fetchTires();
      else await fetchMags();
    } catch (error) {
      console.error(error);
      alert("Error saving product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product, type) => {
    setSelectedProduct(product);
    setFormData({ ...INITIAL_FORM, ...product, type });
    setNextProductId(product.productId || "");
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (product, type) => {
    if (!(await verifyAdminAccess())) return;
    const collectionName = type === "Tire" ? "products_tires" : "products_mags";
    await deleteDoc(doc(db, collectionName, product.id));
    if (type === "Tire") fetchTires();
    else fetchMags();
    alert("Product deleted!");
  };

  const openAddModal = async (type) => {
    setIsEditMode(false);
    setFormData({ ...INITIAL_FORM, type });
    await fetchNextProductId(type);
    setIsModalOpen(true);
  };

  const filterProducts = (arr) =>
    arr.filter((p) =>
      ["brand", "productId", "model"].some((key) =>
        (p[key] || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

  return (
    <div className="products-page-container">
      <h1 className="products-page-title">Products</h1>

      <div className="controls-bar">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button className="btn-tires" onClick={() => setCurrentView("tires")}>
          Tires
        </button>
        <button className="btn-mags" onClick={() => setCurrentView("mags")}>
          Mags
        </button>
        <button className="btn-add-tire" onClick={() => openAddModal("Tire")}>
          Add Tire
        </button>
        <button className="btn-add-mag" onClick={() => openAddModal("Mags")}>
          Add Mag
        </button>

        <button className="btn-services" onClick={() => setCurrentView("services")}>
          Services
        </button>
      </div>

      {/* ------------------ TIRES TABLE ------------------ */}
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
                  <th>Supplier</th>
                  <th>Price</th>
                  <th>Retail</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterProducts(tires).map((p) => {
                  const supplier = suppliers.find((s) => s.id === p.supplierId);
                  return (
                    <tr key={p.id}>
                      <td>{p.productId}</td>
                      <td>{p.brand}</td>
                      <td>{p.model}</td>
                      <td>{p.tireWidth}</td>
                      <td>{p.aspectRatio}</td>
                      <td>{p.rimDiameter}</td>
                      <td>{supplier ? supplier.name : "—"}</td>
                      <td>{p.price}</td>
                      <td>{p.retail}</td>
                      <td>
                        <button onClick={() => handleEdit(p, "Tire")}>Edit</button>
                        <button onClick={() => handleDelete(p, "Tire")}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ------------------ MAGS TABLE ------------------ */}
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
                  <th>Supplier</th>
                  <th>Price</th>
                  <th>Retail</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filterProducts(mags).map((p) => {
                  const supplier = suppliers.find((s) => s.id === p.supplierId);
                  return (
                    <tr key={p.id}>
                      <td>{p.productId}</td>
                      <td>{p.brand}</td>
                      <td>{p.model}</td>
                      <td>{p.wheelDiameter}</td>
                      <td>{p.wheelWidth}</td>
                      <td>{p.offset}</td>
                      <td>{p.boltPattern}</td>
                      <td>{p.centerBore}</td>
                      <td>{supplier ? supplier.name : "—"}</td>
                      <td>{p.price}</td>
                      <td>{p.retail}</td>
                      <td>
                        <button onClick={() => handleEdit(p, "Mags")}>Edit</button>
                        <button onClick={() => handleDelete(p, "Mags")}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ------------------ SERVICES TABLE ------------------ */}
      {currentView === "services" && (
        <div className="product-table-wrapper">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem",
            }}
          >
            <h2>Services</h2>
            <div>
              <button className="btn-submit" onClick={() => {
                setEditingService(null);
                setServiceForm(INITIAL_SERVICE_FORM);
                setServiceModalOpen(true);
              }}>
                Add Service
              </button>
            </div>
          </div>

          {services.length === 0 ? (
            <p style={{ padding: "1rem" }}>No services found.</p>
          ) : (
            <table className="product-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Taxable</th>
                  <th>Duration</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>₱{Number(s.price || 0).toFixed(2)}</td>
                    <td>{s.taxable ? "Yes" : "No"}</td>
                    <td>{s.durationMinutes ?? "—"}</td>
                    <td>{s.active ? "Yes" : "No"}</td>

                    <td>
                      <button
                        onClick={() => {
                          setEditingService(s);
                          setServiceForm({
                            name: s.name,
                            price: s.price,
                            taxable: s.taxable,
                            durationMinutes: s.durationMinutes,
                            active: s.active,
                          });
                          setServiceModalOpen(true);
                        }}
                      >
                        Edit
                      </button>

                      <button onClick={() => {
                        updateDoc(doc(db, "services", s.id), {
                          active: !s.active,
                          updatedAt: serverTimestamp(),
                        });
                      }}>
                        {s.active ? "Disable" : "Enable"}
                      </button>

                      <button onClick={() => deleteDoc(doc(db, "services", s.id))}>
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

      {/* ------------------ PRODUCT MODAL ------------------ */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="form-modal-content">
            <h2>{isEditMode ? "Edit Product" : `Add New ${formData.type}`}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <label>Product ID</label>
                <input
                  type="text"
                  value={formData.productId || nextProductId}
                  disabled
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
                    <label>Tire Width</label>
                    <input
                      type="text"
                      name="tireWidth"
                      value={formData.tireWidth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Aspect Ratio</label>
                    <input
                      type="text"
                      name="aspectRatio"
                      value={formData.aspectRatio}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Rim Diameter</label>
                    <input
                      type="text"
                      name="rimDiameter"
                      value={formData.rimDiameter}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Wheel Diameter</label>
                    <input
                      type="text"
                      name="wheelDiameter"
                      value={formData.wheelDiameter}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Wheel Width</label>
                    <input
                      type="text"
                      name="wheelWidth"
                      value={formData.wheelWidth}
                      onChange={handleInputChange}
                      required
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
                <label>Supplier</label>
                <select
                  name="supplierId"
                  value={formData.supplierId}
                  onChange={handleInputChange}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Retail (Auto Markup)</label>
                <input type="number" name="retail" value={formData.retail} readOnly />
              </div>

              <div className="form-group full-span">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-buttons">
                <button type="submit" disabled={isSubmitting}>
                  {isEditMode ? "Update" : "Add"} Product
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------ SERVICE MODAL ------------------ */}
      {serviceModalOpen && (
        <div className="modal-overlay">
          <div className="form-modal-content">
            <h2>{editingService ? "Edit Service" : "Add Service"}</h2>

            <form className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  name="price"
                  value={serviceForm.price}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="form-group checkbox-group">
                <label>Taxable</label>
                <input
                  type="checkbox"
                  name="taxable"
                  checked={serviceForm.taxable}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      taxable: e.target.checked,
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Duration (minutes)</label>
                <input
                  type="number"
                  name="durationMinutes"
                  value={serviceForm.durationMinutes}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      durationMinutes: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="form-group checkbox-group">
                <label>Active</label>
                <input
                  type="checkbox"
                  name="active"
                  checked={serviceForm.active}
                  onChange={(e) =>
                    setServiceForm((prev) => ({
                      ...prev,
                      active: e.target.checked,
                    }))
                  }
                />
              </div>

              <div className="form-buttons">
                <button
                  type="button"
                  disabled={isServiceSaving}
                  onClick={async () => {
                    if (!serviceForm.name.trim()) {
                      alert("Service name required");
                      return;
                    }

                    setIsServiceSaving(true);

                    try {
                      if (editingService) {
                        await updateDoc(doc(db, "services", editingService.id), {
                          name: serviceForm.name,
                          price: Number(serviceForm.price),
                          taxable: serviceForm.taxable,
                          durationMinutes: serviceForm.durationMinutes
                            ? Number(serviceForm.durationMinutes)
                            : null,
                          active: serviceForm.active,
                          updatedAt: serverTimestamp(),
                        });
                        alert("Service updated");
                      } else {
                        await addDoc(collection(db, "services"), {
                          name: serviceForm.name,
                          price: Number(serviceForm.price),
                          taxable: serviceForm.taxable,
                          durationMinutes: serviceForm.durationMinutes
                            ? Number(serviceForm.durationMinutes)
                            : null,
                          active: serviceForm.active,
                          createdAt: serverTimestamp(),
                          updatedAt: serverTimestamp(),
                        });
                        alert("Service added");
                      }

                      setServiceModalOpen(false);
                      setEditingService(null);
                    } catch (err) {
                      console.error(err);
                      alert("Error saving service");
                    } finally {
                      setIsServiceSaving(false);
                    }
                  }}
                >
                  {editingService ? "Update" : "Add"} Service
                </button>

                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setServiceModalOpen(false)}
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

export default Products;
