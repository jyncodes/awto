// 📄 src/pages/admin-dashboard/Sales.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore';
import '../../styles/shared/Sales.css';
import { FaPlus } from 'react-icons/fa';

const VAT_RATE = 0.12; // user chose Option B: VAT added on top

const Sales = ({ role }) => {
  const [tab, setTab] = useState("all");
  const [products, setProducts] = useState([]);
  const [salesLog, setSalesLog] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // receipt modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [isEditingReceipt, setIsEditingReceipt] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState({});

  // ==============================
  // Sync completed reservations to sales
  // ==============================
  useEffect(() => {
    const resRef = query(collection(db, 'reservations'), where('status', '==', 'Completed'));
    const unsub = onSnapshot(resRef, async (snapshot) => {
      for (const docSnap of snapshot.docs) {
        const res = { id: docSnap.id, ...docSnap.data() };
        const salesRef = query(collection(db, 'sales'), where('reservationId', '==', res.id));
        const existing = await getDocs(salesRef);
        if (!existing.empty) continue;

        const fullPrice = Number(res.price || res.totalAmount || 0);
        const paidAmount = Number(res.downpayment || 0);

        const saleData = {
          reservationId: res.id,
          customerName: res.userName,
          productName: res.productName,
          quantity: 1,
          unitPrice: fullPrice,
          fullPrice,
          paidAmount,
          totalAmount: fullPrice,
          type: 'reservation',
          createdAt: Timestamp.now(),
          status: 'Completed',
          createdBy: res.approvedBy || "System"
        };

        await addDoc(collection(db, 'sales'), saleData);
      }
    });
    return () => unsub();
  }, []);

  // ==============================
  // Load products + sales
  // ==============================
  useEffect(() => {
    const tiresRef = collection(db, 'products_tires');
    const magsRef = collection(db, 'products_mags');
    const salesRef = collection(db, 'sales');

    const unsubTires = onSnapshot(tiresRef, snapshot => {
      const tires = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: "tires" }));
      setProducts(prev => {
        const magsOnly = prev.filter(p => p.type === 'mags');
        const updated = [...tires, ...magsOnly];
        setFilteredProducts(updated);
        return updated;
      });
    });

    const unsubMags = onSnapshot(magsRef, snapshot => {
      const mags = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: "mags" }));
      setProducts(prev => {
        const tiresOnly = prev.filter(p => p.type === 'tires');
        const updated = [...tiresOnly, ...mags];
        setFilteredProducts(updated);
        return updated;
      });
    });

    const unsubSales = onSnapshot(salesRef, snapshot => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = logs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSalesLog(sorted);
    });

    return () => {
      unsubTires();
      unsubMags();
      unsubSales();
    };
  }, []);

  // ==============================
  // Utility: detect which collection a productId belongs to
  // returns { collectionName, productDoc } or null
  // ==============================
  const detectProductCollection = async (productId) => {
    if (!productId) return null;
    // quick attempt: check tires then mags
    const tireRef = doc(db, 'products_tires', productId);
    const tireSnap = await getDoc(tireRef);
    if (tireSnap.exists()) return { collectionName: 'products_tires', productDoc: tireSnap };

    const magRef = doc(db, 'products_mags', productId);
    const magSnap = await getDoc(magRef);
    if (magSnap.exists()) return { collectionName: 'products_mags', productDoc: magSnap };

    return null;
  };

  // ==============================
  // Search
  // ==============================
  const handleSearch = () => {
    const filtered = products.filter(p =>
      `${p.brand || ''} ${p.model || ''} ${p.size || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  // ==============================
  // Handle Add Sale (with inventory stock update)
  // ==============================
  const handleSubmit = async () => {
    if (!customerName || !selectedProduct || quantity <= 0 || quantity > selectedProduct.stock) {
      alert('⚠️ Please complete the form properly.');
      return;
    }

    const unitPrice = Number(selectedProduct.price);
    const totalAmount = unitPrice * quantity;

    const saleData = {
      customerName,
      productId: selectedProduct.id,
      productType: selectedProduct.type || 'tires', // store product type for later edits
      productName: `${selectedProduct.brand} ${selectedProduct.model}`,
      quantity,
      unitPrice,
      fullPrice: totalAmount,
      paidAmount: totalAmount,
      totalAmount,
      createdAt: Timestamp.now(),
      type: 'in-store',
      status: 'Completed',
      createdBy: role,
    };

    try {
      // 1. Add sale record
      const saleRef = await addDoc(collection(db, 'sales'), saleData);

      // 2. Deduct stock in inventory (use productType)
      const collectionName = saleData.productType === 'mags' ? 'products_mags' : 'products_tires';
      const productRef = doc(db, collectionName, selectedProduct.id);
      await updateDoc(productRef, { stock: selectedProduct.stock - quantity });

      // 3. Reset form
      setCustomerName('');
      setSelectedProduct(null);
      setSearchTerm('');
      setQuantity(1);
      setShowForm(false);

      // 4. Open receipt for the newly created sale
      setActiveReceipt({ id: saleRef.id, ...saleData });
      setReceiptOpen(true);
      setIsEditingReceipt(false);
      setEditedReceipt({});

      alert('✅ Sale recorded and stock updated!');
    } catch (err) {
      console.error('❌ Sale error:', err);
      alert('Error recording sale.');
    }
  };

  // ==============================
  // Open receipt modal for a sale
  // ==============================
  const openReceipt = async (sale) => {
    // ensure we show a fresh object with latest fields
    // if the sale is a local object already good; else just set it
    setActiveReceipt(sale);
    setReceiptOpen(true);
    setIsEditingReceipt(false);
    setEditedReceipt({});
  };

  const closeReceipt = () => {
    setReceiptOpen(false);
    setActiveReceipt(null);
    setIsEditingReceipt(false);
    setEditedReceipt({});
  };

  // ==============================
  // Print receipt (simple browser print)
  // ==============================
  const handlePrintReceipt = () => {
    // rely on CSS print rules in Sales.css to only show receipt box
    window.print();
  };

  // ==============================
  // Start editing receipt (admin only)
  // ==============================
  const startEditReceipt = () => {
    if (!activeReceipt) return;
    if (role !== 'admin') {
      alert('Only admin can edit receipts.');
      return;
    }
    setIsEditingReceipt(true);
    setEditedReceipt({
      customerName: activeReceipt.customerName || '',
      quantity: activeReceipt.quantity || 1,
      paidAmount: activeReceipt.paidAmount || (activeReceipt.totalAmount || 0)
    });
  };

  // ==============================
  // Save edited receipt (admin only) — adjusts inventory stock accordingly
  // ==============================
  const saveEditedReceipt = async () => {
    if (!activeReceipt) return;
    if (role !== 'admin') {
      alert('Only admin can edit receipts.');
      return;
    }

    const newQty = Number(editedReceipt.quantity || 0);
    const newCustomer = editedReceipt.customerName || '';
    const newPaid = Number(editedReceipt.paidAmount || 0);

    if (!newCustomer || newQty <= 0) {
      alert('Please provide valid values.');
      return;
    }

    try {
      // detect product collection
      const productId = activeReceipt.productId;
      let collectionInfo = null;

      // Prefer using productType stored on sale if present
      if (activeReceipt.productType) {
        const colName = activeReceipt.productType === 'mags' ? 'products_mags' : 'products_tires';
        const pRef = doc(db, colName, productId);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) collectionInfo = { collectionName: colName, productDoc: pSnap };
      }

      // fallback: detect by querying both collections
      if (!collectionInfo) collectionInfo = await detectProductCollection(productId);

      if (!collectionInfo) {
        alert('Associated product not found in inventory. Cannot adjust stock.');
        return;
      }

      const { collectionName, productDoc } = collectionInfo;
      const productData = productDoc.data();
      const currentStock = Number(productData.stock || 0);

      const oldQty = Number(activeReceipt.quantity || 0);
      const diff = newQty - oldQty; // positive => need to deduct more; negative => return stock
      // check availability if increasing qty
      if (diff > 0 && currentStock < diff) {
        alert(`Not enough stock to increase quantity. Available: ${currentStock}`);
        return;
      }

      const updatedStock = currentStock - diff;

      // 1) update product stock
      const pRefToUpdate = doc(db, collectionName, productId);
      await updateDoc(pRefToUpdate, { stock: updatedStock });

      // 2) update sale record
      const saleRef = doc(db, 'sales', activeReceipt.id);
      const unitPrice = Number(activeReceipt.unitPrice || 0);
      const newFullPrice = unitPrice * newQty;
      const newTotalAmount = newFullPrice; // for simplicity; VAT will be computed in receipt display
      await updateDoc(saleRef, {
        customerName: newCustomer,
        quantity: newQty,
        fullPrice: newFullPrice,
        paidAmount: newPaid,
        totalAmount: newTotalAmount,
        // keep productType if existed
      });

      // 3) reflect changes in UI: update activeReceipt
      setActiveReceipt(prev => ({
        ...prev,
        customerName: newCustomer,
        quantity: newQty,
        fullPrice: newFullPrice,
        paidAmount: newPaid,
        totalAmount: newTotalAmount
      }));

      setIsEditingReceipt(false);
      setEditedReceipt({});
      alert('✅ Receipt updated and inventory adjusted.');
    } catch (err) {
      console.error('Failed saving edited receipt:', err);
      alert('Failed to save receipt edits.');
    }
  };

  // ==============================
  // Receipt display helpers
  // ==============================
  const calcReceiptTotals = (sale) => {
    const unit = Number(sale.unitPrice || 0);
    const qty = Number(sale.quantity || 0);
    const subtotal = unit * qty;
    // VAT option B: VAT added on top
    const vat = subtotal * VAT_RATE;
    const grandTotal = subtotal + vat;
    const paid = Number(sale.paidAmount || grandTotal);
    const change = paid - grandTotal;
    return { subtotal, vat, grandTotal, paid, change };
  };

  // ==============================
  // Filter by tab (All, In-Store, Reservation)
  // ==============================
  const filteredSales =
    tab === "all"
      ? salesLog
      : tab === "in-store"
      ? salesLog.filter(s => s.type === "in-store")
      : salesLog.filter(s => s.type === "reservation");

  // ==============================
  // Render UI
  // ==============================
  return (
    <div className="sales-page-container">
      <div className="sales-header">
        <h1>Sales Transactions</h1>
        <button className="add-sale-btn" onClick={() => setShowForm(true)}>
          <FaPlus className="btn-icon" /> Add Sale
        </button>
      </div>

      {/* Tabs */}
      <div className="sales-tabs">
        <button
          className={`sales-tab-btn ${tab === "all" ? "active" : ""}`}
          onClick={() => setTab("all")}
        >
          All Sales
        </button>
        <button
          className={`sales-tab-btn ${tab === "in-store" ? "active" : ""}`}
          onClick={() => setTab("in-store")}
        >
          In-Store
        </button>
        <button
          className={`sales-tab-btn ${tab === "reservation" ? "active" : ""}`}
          onClick={() => setTab("reservation")}
        >
          Reservations
        </button>
      </div>

      {/* Add Sale Modal */}
      {showForm && (
        <div className="sales-modal">
          <div className="sales-form large">
            <h2>Record New Sale</h2>

            <input
              className="input-field"
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <div className="search-section">
              <input
                className="input-field"
                type="text"
                placeholder="Search product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="search-btn" onClick={handleSearch}>
                Search
              </button>
            </div>

            <div className="search-results-grid">
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={`product-result-card ${
                    selectedProduct?.id === p.id ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedProduct(p)}
                >
                  <strong>
                    {p.brand} {p.model} {p.size || ""}
                  </strong>
                  <p>₱{p.price} — {p.stock} in stock</p>
                </div>
              ))}
            </div>

            <input
              className="input-field"
              type="number"
              min="1"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <div className="form-buttons">
              <button className="btn-submit" onClick={handleSubmit}>
                Submit
              </button>
              <button className="btn-cancel" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="sales-table-container">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Full Price</th>
              <th>Paid</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center' }}>No sales record.</td>
              </tr>
            ) : (
              filteredSales.map((log) => (
                <tr key={log.id}>
                  <td>{log.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</td>
                  <td>{log.customerName || 'N/A'}</td>
                  <td>{log.productName || 'N/A'}</td>
                  <td>{log.quantity || '—'}</td>
                  <td>₱{Number(log.unitPrice || 0).toFixed(2)}</td>
                  <td>₱{Number(log.fullPrice || 0).toFixed(2)}</td>
                  <td>₱{Number(log.paidAmount || 0).toFixed(2)}</td>
                  <td>{log.type}</td>
                  <td>
                    <button className="view-receipt-btn" onClick={() => openReceipt(log)}>
                      Receipt
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal (shown centered) */}
      {receiptOpen && activeReceipt && (
        <div className="receipt-modal" role="dialog" aria-modal="true">
          <div className="receipt-box">
            <div className="receipt-header">
              <h3>Joven Tire Enterprise</h3>
              <p>Official Receipt</p>
              <small>{activeReceipt.id}</small>
            </div>

            {/* Receipt body */}
            <div className="receipt-body">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>Customer:</strong></div>
                <div>{activeReceipt.customerName || 'Walk-in'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>Date:</strong></div>
                <div>{activeReceipt.createdAt?.toDate?.().toLocaleString() || new Date().toLocaleString()}</div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #ddd', margin: '8px 0' }} />

              <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                <div>Item</div>
                <div style={{ textAlign: 'right' }}>Total</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <div>
                  {activeReceipt.productName} x {activeReceipt.quantity}
                </div>
                <div style={{ textAlign: 'right' }}>₱{(Number(activeReceipt.unitPrice || 0) * Number(activeReceipt.quantity || 0)).toFixed(2)}</div>
              </div>

              {/* totals */}
              {(() => {
                const { subtotal, vat, grandTotal, paid, change } = calcReceiptTotals(activeReceipt);
                return (
                  <>
                    <hr style={{ border: 'none', borderTop: '1px dashed #ddd', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>Subtotal</div>
                      <div>₱{subtotal.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>VAT (12%)</div>
                      <div>₱{vat.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <div>Total</div>
                      <div>₱{grandTotal.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>Paid</div>
                      <div>₱{paid.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>Change</div>
                      <div>₱{(change >= 0 ? change : 0).toFixed(2)}</div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Admin edit fields (conditional) */}
            {isEditingReceipt ? (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontWeight: 600 }}>Customer</label>
                <input
                  value={editedReceipt.customerName}
                  onChange={(e) => setEditedReceipt(prev => ({ ...prev, customerName: e.target.value }))}
                  className="input-field"
                />
                <label style={{ display: 'block', fontWeight: 600, marginTop: 8 }}>Quantity</label>
                <input
                  type="number"
                  value={editedReceipt.quantity}
                  min={1}
                  onChange={(e) => setEditedReceipt(prev => ({ ...prev, quantity: e.target.value }))}
                  className="input-field"
                />
                <label style={{ display: 'block', fontWeight: 600, marginTop: 8 }}>Paid Amount</label>
                <input
                  type="number"
                  value={editedReceipt.paidAmount}
                  onChange={(e) => setEditedReceipt(prev => ({ ...prev, paidAmount: e.target.value }))}
                  className="input-field"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn-submit" onClick={saveEditedReceipt}>Save</button>
                  <button className="btn-cancel" onClick={() => { setIsEditingReceipt(false); setEditedReceipt({}); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn-submit" onClick={handlePrintReceipt}>Print</button>
                {role === 'admin' && <button className="btn-submit" onClick={startEditReceipt}>Edit</button>}
                <button className="close-receipt-btn" onClick={closeReceipt}>Close</button>
              </div>
            )}

            <div className="receipt-footer">
              Thank you for your purchase!
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
