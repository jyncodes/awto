// src/pages/admin-dashboard/Products.jsx
import React, { useEffect, useState } from 'react';
import { db, auth, storage } from '../../firebase';
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import "../../styles/admin-styles/Products.css";
import ResetCounterModal from '../../components/admin-components/ResetCounterModal';

const PRODUCT_TYPE_PREFIXES = {
  Tire: 'TI',
  Mags: 'MA',
  Accessories: 'AC'
};

const INITIAL_FORM = {
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
  productId: '',
  modelUrl: '',
  // Wheel fields
  completeCode: '',
  size: '',
  et: '',
  pcd: '',
  cb: '',
  finish: '',
  qty: '',
  cash: ''
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [nextProductId, setNextProductId] = useState('');
  const [sortField, setSortField] = useState('productId');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [viewFilter, setViewFilter] = useState('all');

  // Fetch products
  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    setProducts(querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchNextProductId = async (type = formData.type) => {
    const prefix = PRODUCT_TYPE_PREFIXES[type];
    const counterRef = doc(db, `counters`, `productCounter_${prefix}`);
    const counterSnap = await getDoc(counterRef);
    const current = counterSnap.exists() ? counterSnap.data().lastId || 0 : 0;
    const padded = String(current + 1).padStart(5, '0');
    const id = `${prefix}-${padded}`;
    setNextProductId(id);
    return { id, current, prefix };
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || '' }));
    if (name === 'type' && !isEditMode) {
      await fetchNextProductId(value);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb'))
      return alert("Only .glb files are allowed.");

    setIsUploading(true);
    setUploadStatus('Uploading...');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be logged in as Admin to upload.");
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, modelUrl: downloadUrl }));
      setUploadStatus('Completed');
    } catch (err) {
      console.error("Error uploading GLB:", err);
      alert("Failed to upload 3D model. Check your network or permissions.");
      setUploadStatus('');
    } finally {
      setIsUploading(false);
    }
  };

  const verifyAdminAccess = async () => {
    const user = auth.currentUser;
    if (!user) return false;
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    if (userSnap.exists() && userSnap.data().role === 'Admin') return true;
    alert('You are not authorized to perform this action.');
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) return alert("Please wait for the 3D model to finish uploading.");

    let generatedId, current, prefix;
    if (!isEditMode) {
      const result = await fetchNextProductId(formData.type);
      generatedId = result.id;
      current = result.current;
      prefix = result.prefix;
    }

    let size = '';
    if (formData.type === 'Tire') {
      if (formData.sizeFormat === 'metric' && formData.width && formData.rimDiameter) {
        size = formData.aspectRatio
          ? `${formData.width}/${formData.aspectRatio}R${formData.rimDiameter}`
          : `${formData.width}R${formData.rimDiameter}`;
      } else if (formData.sizeFormat === 'flotation' && formData.overallDiameter && formData.sectionWidth && formData.rimDiameter) {
        size = `${formData.overallDiameter}X${formData.sectionWidth}R${formData.rimDiameter}`;
      }
    } else if (formData.type === 'Mags') {
      size = formData.size || '';
    }

    const payload = {
      ...formData,
      price: Number(formData.price) || 0,
      size,
      productId: isEditMode ? formData.productId : generatedId,
      modelUrl: formData.modelUrl || selectedProduct?.modelUrl || '',
      ...(isEditMode ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp() })
    };

    if (isEditMode && selectedProduct) {
      await updateDoc(doc(db, 'products', selectedProduct.id), payload);
    } else {
      await addDoc(collection(db, 'products'), payload);
      await setDoc(doc(db, 'counters', `productCounter_${prefix}`), { lastId: current + 1 });
    }

    setFormData(INITIAL_FORM);
    setSelectedProduct(null);
    setIsEditMode(false);
    setIsModalOpen(false);
    setNextProductId('');
    setUploadStatus('');
    fetchProducts();
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setFormData({ ...INITIAL_FORM, ...product, sizeFormat: product.overallDiameter ? 'flotation' : 'metric' });
    setNextProductId(product.productId || 'N/A');
    setIsEditMode(true);
    setIsModalOpen(true);
    setUploadStatus(product.modelUrl ? 'Completed' : '');
  };

  const handleDelete = async (id) => {
    if (await verifyAdminAccess()) {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    }
  };

  const handleBulkDelete = async () => {
    if (!(await verifyAdminAccess())) return;
    await Promise.all(selectedProducts.map(id => deleteDoc(doc(db, 'products', id))));
    setSelectedProducts([]);
    fetchProducts();
  };

  const toggleProductSelection = (id) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e, list) => {
    setSelectedProducts(e.target.checked ? list.map(p => p.id) : []);
  };

  const handleSort = (field) => {
    if (field === sortField)
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    let valA = (a[sortField] || '').toString().toLowerCase();
    let valB = (b[sortField] || '').toString().toLowerCase();
    if (!valA || !valB) return 0;
    if (!isNaN(valA) && !isNaN(valB)) {
      valA = parseFloat(valA);
      valB = parseFloat(valB);
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredProducts = sortedProducts.filter(product =>
    ['brand', 'model', 'pattern', 'completeCode'].some(key =>
      (product[key] || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  ).filter(p => {
    if (viewFilter === 'tires') return p.type === 'Tire';
    if (viewFilter === 'wheels') return p.type === 'Mags' || p.type === 'Accessories';
    return true;
  });

  return (
    <div className="products-page-container">
      <h1 className="products-page-title">Products</h1>

      <div className="controls-bar">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={() => setViewFilter('all')}>All</button>
        <button onClick={() => setViewFilter('tires')}>Tires Only</button>
        <button onClick={() => setViewFilter('wheels')}>Wheels Only</button>
        <button
          onClick={async () => {
            setIsEditMode(false);
            setFormData({ ...INITIAL_FORM, type: 'Tire' });
            await fetchNextProductId('Tire');
            setIsModalOpen(true);
          }}
        >
          Add Tire
        </button>
        <button
          onClick={async () => {
            setIsEditMode(false);
            setFormData({ ...INITIAL_FORM, type: 'Mags' });
            await fetchNextProductId('Mags');
            setIsModalOpen(true);
          }}
        >
          Add Wheel
        </button>
        <button onClick={() => setShowResetModal(true)}>
          Reset Product ID Counter
        </button>
        {selectedProducts.length > 0 && (
          <button onClick={handleBulkDelete}>
            Delete Selected ({selectedProducts.length})
          </button>
        )}
      </div>

      {/* ✅ Products Table */}
      {filteredProducts.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="product-table-wrapper">
          <table className="product-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === filteredProducts.length}
                    onChange={e => handleSelectAll(e, filteredProducts)}
                  />
                </th>
                {[
                  'type',
                  'productId',
                  'brand',
                  'size',
                  'model',
                  'pattern',
                  'loadRating',
                  'plyRating',
                  'completeCode',
                  'price',
                  'description',
                  'qty',
                  'cash',
                  'modelUrl'
                ].map(field => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    style={{ cursor: 'pointer' }}
                  >
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                    {sortField === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
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
                  <td>{product.completeCode}</td>
                  <td>{product.price}</td>
                  <td>{product.description}</td>
                  <td>{product.qty}</td>
                  <td>{product.cash}</td>
                  <td>
                    {product.modelUrl ? (
                      <a href={product.modelUrl} target="_blank" rel="noopener noreferrer">
                        View 3D
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    <button onClick={() => handleEdit(product)}>Edit</button>
                    <button onClick={() => handleDelete(product.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Add/Edit Modal Form */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{isEditMode ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit}>
              <p><b>Product ID:</b> {nextProductId || formData.productId}</p>
              <label>Brand</label>
              <input
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
              />
              <label>Model</label>
              <input
                name="model"
                value={formData.model}
                onChange={handleInputChange}
              />
              <label>Pattern</label>
              <input
                name="pattern"
                value={formData.pattern}
                onChange={handleInputChange}
              />
              <label>Price</label>
              <input
                name="price"
                type="number"
                value={formData.price}
                onChange={handleInputChange}
              />
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
              />
              {/* ✅ 3D Upload */}
              <label>3D Model (.glb)</label>
              <input type="file" onChange={handleFileUpload} />
              {uploadStatus && <p>{uploadStatus}</p>}
              <div className="modal-actions">
                <button type="submit">{isEditMode ? 'Update' : 'Add'}</button>
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Reset Counter Modal */}
      <ResetCounterModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};

export default Products;
