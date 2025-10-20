// 📄 src/pages/shared/Sales.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import '../../styles/shared/Sales.css';

const Sales = ({ role }) => {
  const [products, setProducts] = useState([]);
  const [salesLog, setSalesLog] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // ✅ Listen to both tires and mags collections safely
    const tiresRef = collection(db, 'products_tires');
    const magsRef = collection(db, 'products_mags');
    const salesRef = collection(db, 'sales');

    const unsubTires = onSnapshot(tiresRef, snapshot => {
      const tires = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prev => {
        const magsOnly = prev.filter(p => p.type === 'mags');
        const updated = [...tires.map(t => ({ ...t, type: 'tires' })), ...magsOnly];
        setFilteredProducts(updated);
        return updated;
      });
    });

    const unsubMags = onSnapshot(magsRef, snapshot => {
      const mags = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prev => {
        const tiresOnly = prev.filter(p => p.type === 'tires');
        const updated = [...tiresOnly, ...mags.map(m => ({ ...m, type: 'mags' }))];
        setFilteredProducts(updated);
        return updated;
      });
    });

    const unsubSales = onSnapshot(salesRef, snapshot => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sorted = logs.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setSalesLog(sorted);
    });

    // 🧹 Proper cleanup
    return () => {
      unsubTires();
      unsubMags();
      unsubSales();
    };
  }, []);

  const handleSearch = () => {
    const filtered = products.filter(p =>
      `${p.brand} ${p.model} ${p.size}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const handleSubmit = async () => {
    if (!customerName || !selectedProduct || quantity <= 0 || quantity > selectedProduct.stock) {
      alert('Please complete the form properly.');
      return;
    }

    const unitPrice = Number(selectedProduct.price);
    const totalAmount = unitPrice * quantity;

    const saleData = {
      customerName,
      productId: selectedProduct.id,
      productName: `${selectedProduct.brand} ${selectedProduct.model}`,
      quantity,
      unitPrice,
      totalAmount,
      createdAt: Timestamp.now(),
      type: 'in-store',
      status: 'completed',
      createdBy: role,
    };

    try {
      await addDoc(collection(db, 'sales'), saleData);
      await updateDoc(doc(db, selectedProduct.type === 'tires' ? 'products_tires' : 'products_mags', selectedProduct.id), {
        stock: selectedProduct.stock - quantity,
      });

      setCustomerName('');
      setSelectedProduct(null);
      setSearchTerm('');
      setQuantity(1);
      setShowForm(false);
      alert('Sale recorded!');
    } catch (err) {
      console.error('Sale error:', err);
    }
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <h1>Sales Transactions</h1>
        <button onClick={() => setShowForm(true)}>+ Add Transaction</button>
      </div>

      {showForm && (
        <div className="sales-modal">
          <div className="sales-form large">
            <h2>New Sale</h2>

            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <div className="search-section">
              <input
                type="text"
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button onClick={handleSearch}>Search</button>
            </div>

            <div className="search-results-grid">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={`product-result-card ${selectedProduct?.id === p.id ? 'selected' : ''}`}
                  onClick={() => setSelectedProduct(p)}
                >
                  <strong>{p.brand} {p.model} {p.size}</strong>
                  <p>₱{p.price} — {p.stock} in stock</p>
                </div>
              ))}
            </div>

            <input
              type="number"
              min="1"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <div className="form-buttons">
              <button onClick={handleSubmit}>Submit</button>
              <button onClick={() => setShowForm(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <table className="sales-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Recorded By</th>
          </tr>
        </thead>
        <tbody>
          {salesLog.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>No sales yet.</td>
            </tr>
          ) : (
            salesLog.map((log) => (
              <tr key={log.id}>
                <td>{log.createdAt?.toDate().toLocaleDateString() || 'N/A'}</td>
                <td>{log.customerName || 'N/A'}</td>
                <td>{log.productName || 'N/A'}</td>
                <td>{log.quantity || 0}</td>
                <td>₱{Number(log.unitPrice || 0).toFixed(2)}</td>
                <td>₱{Number(log.totalAmount || 0).toFixed(2)}</td>
                <td>{log.createdBy || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Sales;
