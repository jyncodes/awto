import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  getDoc,
  query,
  where,
} from "firebase/firestore";

import "../../styles/shared/Sales.css";
import "../../styles/admin-styles/POS.css";

import POSProductList from "../../components/shared-components/POSProductList";
import POSServiceList from "../../components/shared-components/POSServiceList";
import POSCart from "../../components/shared-components/POSCart";
import POSPayment from "../../components/shared-components/POSPayment";
import CustomerModal from "../../components/shared-components/CustomerModal";

const VAT_RATE = 0.12;
const RESERVATION_FEE = 500;

export default function POS() {
  const navigate = useNavigate();
  const location = useLocation();
  const receiptRef = useRef(null);

  // ================== STATE ==================
  const [role, setRole] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [services, setServices] = useState([]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [filter, setFilter] = useState("All");


  const { fromReservation, reservedItems, customerName: reservedCustomer, reservationId } =
    location.state || {};

const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("search");
  

  const reservationFeeApplied = fromReservation ? RESERVATION_FEE : 0;

  // ================== GET USER ROLE ==================
  useEffect(() => {
    const loadRole = async () => {
      const user = auth.currentUser;
      if (!user) return navigate("/");
      const snap = await getDoc(doc(db, "users", user.uid));
      setRole(snap.exists() ? snap.data().role : "Guest");
    };
    loadRole();
  }, []);

  // ================== FETCH PRODUCTS ==================
  useEffect(() => {
    const unsubTires = onSnapshot(collection(db, "products_tires"), (snap) => {
      setProducts((prev) => [
        ...snap.docs.map((d) => ({ firestoreId: d.id, ...d.data(), category: "tires", type: "product" })),
        ...prev.filter((p) => p.category === "mags"),
      ]);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), (snap) => {
      setProducts((prev) => [
        ...prev.filter((p) => p.category === "tires"),
        ...snap.docs.map((d) => ({ firestoreId: d.id, ...d.data(), category: "mags", type: "product" })),
      ]);
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // ================== FETCH SERVICES ==================
  useEffect(() => {
    const q = query(collection(db, "services"), where("active", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      setServices(snap.docs.map((d) => ({ id: d.id, ...d.data(), type: "service" })));
    });
    return () => unsub();
  }, []);

  // ================== LOAD RESERVED ITEMS ==================
  useEffect(() => {
    if (!fromReservation || !reservedItems) return;

    setCart(
      reservedItems.map((item, i) => ({
        id: `reserved-${i}`,
        name: `${item.brand} ${item.model}`,
        price: Number(item.price),
        qty: item.qty || 1,
        stock: item.stock || 1,
        firestoreId: item.firestoreId,
        type: "product",
      }))
    );
  }, [fromReservation, reservedItems]);

  // ================== SEARCH FILTER ==================
  useEffect(() => {
  setFilteredProducts(
    products.map((p) => ({
      ...p,
      name: `${p.brand} ${p.model}` // normalize naming for search use
    }))
  );
}, [products]);

  // ================== CART ACTIONS ==================
  const addToCart = (product) => {
    const existing = cart.find((c) => c.firestoreId === product.firestoreId);
    if (existing) {
      if (existing.qty + 1 > product.stock) return alert("Not enough stock.");
      return setCart(cart.map((c) => (c.firestoreId === product.firestoreId ? { ...c, qty: c.qty + 1 } : c)));
    }
    setCart([{ ...product, id: product.productId, qty: 1 }, ...cart]);
  };

  const addServiceToCart = (svc) => {
    if (cart.some((c) => c.id === svc.id)) return alert("Service already added");
    setCart([{ ...svc, qty: 1 }, ...cart]);
  };

  const incQty = (id) => setCart(cart.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c)));
  const decQty = (id) =>
    setCart(cart.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0));
  const updateQty = (id, q) => setCart(cart.map((c) => (c.id === id ? { ...c, qty: Number(q) } : c)));
  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id));

  // ================== TOTALS ==================
  const subtotal = cart.reduce((t, i) => t + i.price * i.qty, 0);
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat - reservationFeeApplied;

  // ================== CHECKOUT ==================
const handleCheckout = async () => {
  if (!customerName.trim()) return alert("Enter customer name.");
  if (cart.length === 0) return alert("Cart empty.");

  if (paymentMode === "Cash") {
    if (!cashReceived.trim() || Number(cashReceived) <= 0) {
      return alert("Please enter valid payment amount.");
    }

    if (Number(cashReceived) < total) {
      return alert("Cash received is insufficient.");
    }
  }

  setIsProcessing(true);

   const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
  const userData = snapshot.data();

  const saleData = {
    customer: selectedCustomer || { name: customerName, type: "Walk-in" },
    items: cart,
    subtotal,
    vat,
    totalAmount: total,
    paymentMode,
    paymentRef: paymentMode === "Cash" ? "" : paymentRef,
    createdAt: Timestamp.now(),
    createdByName: userData.name,
    createdByRole: userData.role,
    reservationApplied: reservationFeeApplied > 0,
  };

  if (reservationId) {
    saleData.reservationId = reservationId;
  }

    const docRef = await addDoc(collection(db, "sales"), saleData);

    for (const item of cart.filter((i) => i.type === "product")) {
      await updateDoc(doc(db, item.category === "mags" ? "products_mags" : "products_tires", item.firestoreId), {
        stock: item.stock - item.qty,
      });
    }

    setLastReceipt({ id: docRef.id, ...saleData });
    setReceiptOpen(true);
    setCart([]);
  };

  // ================== PRINT ==================
  const handlePrint = () => {
    const win = window.open("", "", "width=600,height=700");
    win.document.write(receiptRef.current.innerHTML);
    win.document.close();
    win.print();
  };

  // ================== ⛔ FIXED — CONDITIONAL RETURN MOVED HERE ==================
  if (!role)
    return (
      <h2 className="pos-container" style={{ textAlign: "center" }}>
        Loading POS...
      </h2>
    );

  // ================== UI ==================
  return (
    <>
      <div className="pos-container">
        <div className="pos-header">
          <div>🧾 Point of Sale</div>
          <button className="pos-close-btn" onClick={() => navigate(role === "Admin" ? "/admin-dashboard/sales" : "/staff-dashboard/sales")}>
            Back
          </button>
        </div>

        <div className="pos-main">

      {/* LEFT SIDE — PRODUCTS & SERVICES */}
      <div className="pos-column pos-products">
        {/** GLOBAL SEARCH */}
        <div className="pos-global-search">
          <input
            type="text"
            placeholder="Search products or services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/** FILTER TABS */}
        <div className="pos-tabs">
          {["All", "Tires", "Mags", "Services"].map((t) => (
            <button
              key={t}
              className={`pos-tab-btn ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {/** PRODUCT + SERVICE LIST */}
        <div className="pos-list-grid">
          {(filter === "All" || filter === "Tires" || filter === "Mags") && (
            <POSProductList
              filteredProducts={filteredProducts.filter((item) =>
                item.name?.toLowerCase().includes(search.toLowerCase())
              )}
              addToCart={addToCart}
              filter={filter}
            />
          )}

          {(filter === "All" || filter === "Services") && (
            <POSServiceList
              services={services.filter((svc) =>
                svc.name.toLowerCase().includes(search.toLowerCase())
              )}
              addServiceToCart={addServiceToCart}
            />
          )}
        </div>
      </div>

      {/* MIDDLE COLUMN — CART ONLY */}
      <div className="pos-column pos-cart-area">
        <h3>🛒 Cart</h3>
        <POSCart
          cart={cart}
          incQty={incQty}
          decQty={decQty}
          removeFromCart={removeFromCart}
          updateQty={updateQty}
        />
      </div>

 
  {/* RIGHT COLUMN — CUSTOMER + PAYMENT */}
<div className="pos-column pos-payment-area">

  {/* Customer UI */}
  <div className="customer-box">
    <h4>👤 Customer</h4>

    <div className="customer-row">
      <div className="selected-customer-box">
      {selectedCustomer ? (
        <strong>{selectedCustomer.name}</strong>
      ) : (
        <span style={{ color: "#6b7280" }}>No customer selected</span>
      )}
    </div>

      <button
        className="btn-small primary"
        onClick={() => {
          setModalMode("search");
          setCustomerModalOpen(true);
        }}
      >
        🔍
      </button>

      <button
        className="btn-small success"
        onClick={() => {
          setModalMode("add");
          setCustomerModalOpen(true);
        }}
      >
        ➕
      </button>
    </div>

        {selectedCustomer && (
      <div className="customer-details">
        <p><strong>Customer ID:</strong> {selectedCustomer.customerCode}</p>
        <p><strong>Name:</strong> {selectedCustomer.name}</p>
        <p><strong>Contact:</strong> {selectedCustomer.contact || "N/A"}</p>
      </div>
    )}
  </div>
        <POSPayment
          subtotal={subtotal}
          vat={vat}
          total={total}
          paymentMode={paymentMode}
          setPaymentMode={setPaymentMode}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          paymentRef={paymentRef}
          setPaymentRef={setPaymentRef}
          handleCheckout={handleCheckout}
          isProcessing={isProcessing}
        />
      </div>
    </div>

        {receiptOpen && (
          <div className="pos-receipt-overlay">
            <div ref={receiptRef} className="pos-receipt-box">
              <h3>Joven Tire Enterprise</h3>
              <p><strong>Receipt #:</strong> {lastReceipt?.id}</p>
              <p><strong>Customer:</strong> {lastReceipt?.customer.name}</p>
              <hr/>

              {lastReceipt?.items.map((i, idx) => (
                <div key={`receipt-${idx}`} className="receipt-row">
                  <span>{i.name} x{i.qty}</span>
                  <span>₱{(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}

              <hr />
              <p>Subtotal: ₱{subtotal.toFixed(2)}</p>
              <p>VAT: ₱{vat.toFixed(2)}</p>
              {reservationFeeApplied > 0 && <p>Reservation Discount: -₱{RESERVATION_FEE}</p>}
              <h3>Total: ₱{total.toFixed(2)}</h3>
              <p>Paid via: {lastReceipt?.paymentMode}</p>

            <div className="pos-receipt-actions no-print">
              <button className="btn-submit" onClick={handlePrint}>Print</button>
              <button className="btn-cancel" onClick={() => setReceiptOpen(false)}>Close</button>
            </div>

            </div>

          </div>
        )}
      </div>

      {customerModalOpen && (
      <CustomerModal
        mode={modalMode}
        onClose={() => {
          setCustomerModalOpen(false);
          setModalMode("search");
        }}
        onSelect={(cust) => {
          setSelectedCustomer(cust);
          setCustomerName(cust.name);
          setCustomerModalOpen(false);
        }}
  />
)}
    </>
  );
}
