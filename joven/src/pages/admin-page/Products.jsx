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
    model: '',
    price: '',
    width: '',
    aspectRatio: '',
    rimDiameter: '',
    description: '',
    type: 'Tire'
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
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

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const items = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setProducts(items);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'type' && !isEditMode) {
      await fetchNextProductId(value);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { id: generatedId, current, prefix } = await fetchNextProductId(formData.type);

    const size = `${formData.width}/${formData.aspectRatio}R${formData.rimDiameter}`;

    const payload = {
      ...formData,
      size,
      productId: isEditMode && selectedProduct ? selectedProduct.productId : generatedId,
      createdAt: serverTimestamp(),
    };

    if (isEditMode && selectedProduct) {
      await updateDoc(doc(db, 'products', selectedProduct.id), payload);
    } else {
      await addDoc(collection(db, 'products'), payload);
      await setDoc(doc(db, 'counters', `productCounter_${prefix}`), { lastId: current + 1 });
    }

    setIsModalOpen(false);
    fetchProducts();
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    const [width = '', aspectRatio = '', rimDiameter = ''] =
      product.size?.match(/^(\d+)\/(\d+)R(\d+)$/)?.slice(1) || [];

    setFormData({
      brand: product.brand,
      model: product.model,
      price: product.price,
      width,
      aspectRatio,
      rimDiameter,
      description: product.description,
      type: product.type
    });

    setNextProductId(product.productId || 'N/A');
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await verifyAdminAccess();
    if (confirmed) {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await verifyAdminAccess();
    if (!confirmed) return;
    for (const id of selectedProducts) {
      await deleteDoc(doc(db, 'products', id));
    }
    setSelectedProducts([]);
    fetchProducts();
  };

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

  const filteredProducts = sortedProducts.filter((product) =>
    product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.model.toLowerCase().includes(searchTerm.toLowerCase())
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
              model: '',
              price: '',
              width: '',
              aspectRatio: '',
              rimDiameter: '',
              description: '',
              type: 'Tire'
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
          <button className="delete-button" onClick={handleBulkDelete}>
            Delete Selected ({selectedProducts.length})
          </button>
        )}
      </div>

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
                {['productId', 'type', 'brand', 'model', 'size', 'price', 'description'].map((field) => (
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
                  <td>{product.productId}</td>
                  <td>{product.type}</td>
                  <td>{product.brand}</td>
                  <td>{product.model}</td>
                  <td>{product.size}</td>
                  <td>{product.price}</td>
                  <td>{product.description}</td>
                  <td className="action-buttons">
                    <button onClick={() => setViewProduct(product)}>View</button>
                    <button onClick={() => handleEdit(product)}>Edit</button>
                    <button className="delete-button" onClick={() => handleDelete(product.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="form-modal-content">
            <h2>{isEditMode ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product ID</label>
                <input type="text" value={nextProductId || 'Loading...'} readOnly />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select name="type" value={formData.type} onChange={handleInputChange} required>
                  <option value="Tire">Tire</option>
                  <option value="Mags">Mags</option>
                  <option value="Accessories">Accessories</option>
                </select>
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Model</label>
                <input type="text" name="model" value={formData.model} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Width</label>
                <input type="number" name="width" value={formData.width} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Aspect Ratio</label>
                <input type="number" name="aspectRatio" value={formData.aspectRatio} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Rim Diameter</label>
                <input type="number" name="rimDiameter" value={formData.rimDiameter} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Price</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} required />
              </div>
              <div className="form-actions">
                <button type="submit">{isEditMode ? 'Update' : 'Add'} Product</button>
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Product Details</h2>
            <p><strong>Product ID:</strong> {viewProduct.productId}</p>
            <p><strong>Type:</strong> {viewProduct.type}</p>
            <p><strong>Brand:</strong> {viewProduct.brand}</p>
            <p><strong>Model:</strong> {viewProduct.model}</p>
            <p><strong>Price:</strong> {viewProduct.price}</p>
            <p><strong>Size:</strong> {viewProduct.size}</p>
            <p><strong>Description:</strong> {viewProduct.description}</p>
            <button onClick={() => setViewProduct(null)}>Close</button>
          </div>
        </div>
      )}

      <ResetCounterModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />
    </div>
  );
};

export default Products;
