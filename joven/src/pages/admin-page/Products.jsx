// src/pages/admin-dashboard/Products.jsx
import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase';
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
} from 'firebase/firestore';
import "../../styles/admin-styles/Products.css";
import ResetCounterModal from '../../components/admin-components/ResetCounterModal';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    brand: '',
    pattern: '',
    model: '',
    price: '',
    width: '',
    aspectRatio: '',
    rimDiameter: '',
    overallDiameter: '',
    sectionWidth: '',
    description: '',
    loadRating: '',
    plyRating: '',
    type: 'Tire',
    sizeFormat: 'metric',
    productId: ''
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [nextProductId, setNextProductId] = useState('');
  const [sortField, setSortField] = useState('productId');
  const [sortOrder, setSortOrder] = useState('asc');

  const PRODUCT_TYPE_PREFIXES = {
    Tire: 'TI',
    Mags: 'MA',
    Accessories: 'AC'
  };

  // Fetch products
  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const items = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    setProducts(items);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Generate next productId
  const fetchNextProductId = async (type = formData.type) => {
    const prefix = PRODUCT_TYPE_PREFIXES[type];
    const counterRef = doc(db, 'counters', `productCounter_${prefix}`);
    const counterSnap = await getDoc(counterRef);

    const current = (counterSnap.exists() && typeof counterSnap.data().lastId === 'number')
      ? counterSnap.data().lastId
      : 0;

    const padded = String(current + 1).padStart(5, '0');
    const id = `${prefix}-${padded}`;
    setNextProductId(id);
    return { id, current, prefix };
  };

  // Input change
  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || '' }));

    if (name === 'type' && !isEditMode) {
      await fetchNextProductId(value);
    }
  };

  // Admin check
  const verifyAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) return false;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().role === 'Admin') {
      return true;
    } else {
      alert('You are not authorized to perform this action.');
      return false;
    }
  };

  // Submit Add / Update
  const handleSubmit = async (e) => {
    e.preventDefault();

    let generatedId, current, prefix;
    if (!isEditMode) {
      const result = await fetchNextProductId(formData.type);
      generatedId = result.id;
      current = result.current;
      prefix = result.prefix;
    }

    // Format size string
    let size = '';
    if (formData.sizeFormat === 'metric' && formData.width && formData.rimDiameter) {
      size = formData.aspectRatio
        ? `${formData.width}/${formData.aspectRatio}R${formData.rimDiameter}`
        : `${formData.width}R${formData.rimDiameter}`;
    } else if (
      formData.sizeFormat === 'flotation' &&
      formData.overallDiameter &&
      formData.sectionWidth &&
      formData.rimDiameter
    ) {
      size = `${formData.overallDiameter}X${formData.sectionWidth}R${formData.rimDiameter}`;
    }

    const safeTrim = (val) => (val ? val.toString().trim() : '');

    const payload = {
      brand: safeTrim(formData.brand),
      pattern: safeTrim(formData.pattern),
      model: safeTrim(formData.model),
      price: formData.price ? Number(formData.price) : 0,
      width: formData.width || '',
      aspectRatio: formData.aspectRatio || '',
      rimDiameter: formData.rimDiameter || '',
      overallDiameter: formData.overallDiameter || '',
      sectionWidth: formData.sectionWidth || '',
      description: safeTrim(formData.description),
      loadRating: safeTrim(formData.loadRating),
      plyRating: safeTrim(formData.plyRating),
      type: formData.type,
      sizeFormat: formData.sizeFormat,
      size,
      productId: isEditMode ? formData.productId : generatedId,
      ...(isEditMode
        ? { updatedAt: serverTimestamp() }
        : { createdAt: serverTimestamp() })
    };

    if (isEditMode && selectedProduct) {
      const docRef = doc(db, 'products', selectedProduct.id);
      await updateDoc(docRef, payload);
    } else {
      await addDoc(collection(db, 'products'), payload);
      await setDoc(doc(db, 'counters', `productCounter_${prefix}`), { lastId: current + 1 });
    }

    // Reset state
    setIsModalOpen(false);
    setIsEditMode(false);
    setSelectedProduct(null);
    setFormData({
      brand: '',
      pattern: '',
      model: '',
      price: '',
      width: '',
      aspectRatio: '',
      rimDiameter: '',
      overallDiameter: '',
      sectionWidth: '',
      description: '',
      loadRating: '',
      plyRating: '',
      type: 'Tire',
      sizeFormat: 'metric',
      productId: ''
    });

    fetchProducts();
  };

  // Edit product
  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      brand: product.brand || '',
      pattern: product.pattern || '',
      model: product.model || '',
      price: product.price || '',
      width: product.width || '',
      aspectRatio: product.aspectRatio || '',
      rimDiameter: product.rimDiameter || '',
      overallDiameter: product.overallDiameter || '',
      sectionWidth: product.sectionWidth || '',
      description: product.description || '',
      loadRating: product.loadRating || '',
      plyRating: product.plyRating || '',
      type: product.type || 'Tire',
      sizeFormat: product.overallDiameter ? 'flotation' : 'metric',
      productId: product.productId || ''
    });
    setNextProductId(product.productId || 'N/A');
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Delete
  const handleDelete = async (id) => {
    const confirmed = await verifyAdminAccess();
    if (confirmed) {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    const confirmed = await verifyAdminAccess();
    if (!confirmed) return;
    for (const id of selectedProducts) {
      await deleteDoc(doc(db, 'products', id));
    }
    setSelectedProducts([]);
    fetchProducts();
  };

  // Selection
  const toggleProductSelection = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredProducts.map((p) => p.id);
      setSelectedProducts(allIds);
    } else {
      setSelectedProducts([]);
    }
  };

  // Sorting
  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let valA = a[sortField]?.toString().toLowerCase();
    let valB = b[sortField]?.toString().toLowerCase();

    if (!valA || !valB) return 0;
    if (!isNaN(valA) && !isNaN(valB)) {
      valA = parseFloat(valA);
      valB = parseFloat(valB);
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter
  const filteredProducts = sortedProducts.filter((product) =>
    (product.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.pattern || '').toLowerCase().includes(searchTerm.toLowerCase())
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
        <button
          className="add-product-button"
          onClick={async () => {
            setIsEditMode(false);
            setFormData({
              brand: '',
              pattern: '',
              model: '',
              price: '',
              width: '',
              aspectRatio: '',
              rimDiameter: '',
              overallDiameter: '',
              sectionWidth: '',
              description: '',
              loadRating: '',
              plyRating: '',
              type: 'Tire',
              sizeFormat: 'metric',
              productId: ''
            });
            await fetchNextProductId('Tire');
            setIsModalOpen(true);
          }}
        >
          Add New Product
        </button>
        <button className="add-product-button" onClick={() => setShowResetModal(true)}>
          Reset Product ID Counter
        </button>
        {selectedProducts.length > 0 && (
          <button className="delete-selected-button" onClick={handleBulkDelete}>
            Delete Selected ({selectedProducts.length})
          </button>
        )}
      </div>

      {/* Product Table */}
      {filteredProducts.length === 0 ? (
        <p className="no-products-message">No products found.</p>
      ) : (
        <div className="product-table-wrapper">
          <table className="product-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length}
                    onChange={handleSelectAll}
                  />
                </th>
                {['type','productId','brand','size','model','pattern','loadRating','plyRating','price','description'].map((field) => (
                  <th key={field} onClick={() => handleSort(field)} style={{ cursor: 'pointer' }}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                    {sortField === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                    />
                  </td>
                  <td>{product.type}</td>
                  <td>{product.productId}</td>
                  <td>{product.brand}</td>
                  <td>{product.size}</td>
                  <td>{product.model}</td>
                  <td>{product.pattern}</td>
                  <td>{product.loadRating}</td>
                  <td>{product.plyRating}</td>
                  <td>{product.price}</td>
                  <td>{product.description}</td>
                  <td className="action-buttons">
                    <button onClick={() => handleEdit(product)}>Edit</button>
                    <button className="delete-button" onClick={() => handleDelete(product.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="form-modal-content">
            <h2>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit} className="form-grid">
              {/* Left Column */}
              <div className="form-group">
                <label>Type</label>
                <select name="type" value={formData.type} onChange={handleInputChange} required disabled={isEditMode}>
                  <option value="Tire">Tire</option>
                  <option value="Mags">Mags</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
              <div className="form-group">
                <label>Product ID</label>
                <input type="text" value={isEditMode ? formData.productId : nextProductId || 'Loading...'} readOnly />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Size Format</label>
                <select name="sizeFormat" value={formData.sizeFormat} onChange={handleInputChange}>
                  <option value="metric">Metric (205/55R16)</option>
                  <option value="flotation">Flotation (31X10.5R15)</option>
                </select>
              </div>

              {formData.sizeFormat === 'metric' ? (
                <>
                  <div className="form-group">
                    <label>Width</label>
                    <input type="number" name="width" value={formData.width} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Aspect Ratio</label>
                    <input type="number" name="aspectRatio" value={formData.aspectRatio} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Rim Diameter</label>
                    <input type="number" name="rimDiameter" value={formData.rimDiameter} onChange={handleInputChange} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Overall Diameter</label>
                    <input type="number" name="overallDiameter" value={formData.overallDiameter} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Section Width</label>
                    <input type="number" step="0.1" name="sectionWidth" value={formData.sectionWidth} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Rim Diameter</label>
                    <input type="number" name="rimDiameter" value={formData.rimDiameter} onChange={handleInputChange} />
                  </div>
                </>
              )}

              {/* Right Column */}
              <div className="form-group">
                <label>Model</label>
                <input type="text" name="model" value={formData.model} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Pattern</label>
                <input type="text" name="pattern" value={formData.pattern} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Load Rating</label>
                <input type="text" name="loadRating" value={formData.loadRating} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Ply Rating</label>
                <input type="text" name="plyRating" value={formData.plyRating} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Price</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} />
              </div>

              <div className="form-actions">
                <button type="submit">{isEditMode ? 'Update Product' : 'Add Product'}</button>
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ResetCounterModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />
    </div>
  );
};

export default Products;
