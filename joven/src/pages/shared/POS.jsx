import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db, auth } from "../../firebase";
import { getDocs } from "firebase/firestore";

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
  orderBy,
  limit,
  setDoc
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
  const [customerType, setCustomerType] = useState("Regular");
const [negotiatedDiscount, setNegotiatedDiscount] = useState(0);
const [isNegotiated, setIsNegotiated] = useState(false);




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

const computeTotals = () => {
  let baseSubtotal = subtotal;
  let baseVAT = baseSubtotal - (baseSubtotal / 1.12);
  let computedTotal = baseSubtotal;
  let pwdDiscount = 0;

  // PWD & Senior Logic — Remove VAT + apply 20% discount
  if (customerType === "PWD" || customerType === "Senior") {
    const vatExempt = baseSubtotal / 1.12;
    pwdDiscount = vatExempt * 0.20;
    computedTotal = vatExempt - pwdDiscount;
    baseVAT = 0;
  }

    if (isNegotiated && negotiatedDiscount > 0) {
      computedTotal -= negotiatedDiscount;
      if (computedTotal < 0) computedTotal = 0;
    }


  return { baseSubtotal, baseVAT, computedTotal, pwdDiscount };
};

const { baseSubtotal, baseVAT, computedTotal, pwdDiscount } = computeTotals();

const change = paymentMode === "Cash" 
  ? Math.max(Number(cashReceived || 0) - computedTotal, 0)
  : 0;

  // ================== CHECKOUT ==================
const handleCheckout = async () => {
  try {
    if (!customerName.trim()) return alert("Enter customer name.");
    if (cart.length === 0) return alert("Cart empty.");

    if (paymentMode === "Cash") {
      if (!cashReceived.trim() || Number(cashReceived) <= 0) {
        return alert("Please enter valid payment amount.");
      }

      if (Number(cashReceived) < computedTotal) {
        return alert("Cash received is insufficient.");
      }
    }

  setIsProcessing(true);

   const snapshot = await getDoc(doc(db, "users", auth.currentUser.uid));
  const userData = snapshot.data();

// ---- USE SALES COUNTER ----
const counterRef = doc(db, "counters", "salesCounter");
const counterSnap = await getDoc(counterRef);


let nextSaleNumber = 1;

if (counterSnap.exists()) {
  nextSaleNumber = counterSnap.data().lastId + 1;
}

const formattedSaleId = `SA-${String(nextSaleNumber).padStart(5, "0")}`;

await setDoc(counterRef, { lastId: nextSaleNumber }, { merge: true });


  const saleData = {
    salesId: formattedSaleId,
    customer: selectedCustomer || { name: customerName, type: "Walk-in" },
    items: cart,
    subtotal: baseSubtotal,
    vat: baseVAT,
    pwdDiscount, 
    totalAmount: computedTotal,
    customerType,
    negotiatedDiscount,
    paymentMode,
    paymentRef: paymentMode === "Cash" ? "" : paymentRef,
    cashReceived: paymentMode === "Cash" ? Number(cashReceived) : 0,
    createdAt: Timestamp.now(),
    createdByName: userData.name,
    createdByRole: userData.role,
    reservationApplied: reservationFeeApplied > 0,
  };

  await setDoc(doc(db, "sales", formattedSaleId), saleData);

    // update product stocks
    for (const item of cart.filter((i) => i.type === "product")) {
      await updateDoc(
        doc(db, item.category === "mags" ? "products_mags" : "products_tires", item.firestoreId),
        { stock: item.stock - item.qty }
      );
    }

    setLastReceipt({ id: formattedSaleId, ...saleData });
    setReceiptOpen(true);

    // RESET UI
    setCart([]);
    setCashReceived("");
    setPaymentRef("");
    setSelectedCustomer(null);
    setCustomerName("");

  } catch (error) {
    console.error("Checkout Error:", error);
    alert("❌ Something went wrong. Try again.");
  } finally {
    setIsProcessing(false); // <- ALWAYS resets button, even when failed
  }
};

  // ================== PRINT ==================
  const handlePrint = () => {
    const win = window.open("", "", "width=600,height=700");
    win.document.write(receiptRef.current.innerHTML);
    win.document.close();
    win.print();
  };

        // ================== COMPUTE RECEIPT VALUES ==================
    const receiptSubtotal = Number(lastReceipt?.subtotal || 0);
    const receiptVAT = Number(lastReceipt?.vat || 0);
    const receiptPWD = Number(lastReceipt?.pwdDiscount || 0);
    const receiptNegotiated = Number(lastReceipt?.negotiatedDiscount || 0);
    const receiptTotal = Number(lastReceipt?.totalAmount || 0);
    const receiptCash = Number(lastReceipt?.cashReceived || 0);

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
          <button className="pos-close-btn" onClick={() => navigate(-1)}>
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


        <h3>🛒 Cart</h3>
        <POSCart
          cart={cart}
          incQty={incQty}
          decQty={decQty}
          removeFromCart={removeFromCart}
          updateQty={updateQty}
        />
      </div>
    </div>
 
      <POSPayment
        subtotal={baseSubtotal}
        vat={baseVAT}
        total={computedTotal}
        pwdDiscount={pwdDiscount}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        customerType={customerType}
        setCustomerType={setCustomerType}
        isNegotiated={isNegotiated}
        setIsNegotiated={setIsNegotiated}
        negotiatedDiscount={negotiatedDiscount}
        setNegotiatedDiscount={setNegotiatedDiscount}
        cashReceived={cashReceived}
        setCashReceived={setCashReceived}
        paymentRef={paymentRef}
        setPaymentRef={setPaymentRef}
        handleCheckout={handleCheckout}
        isProcessing={isProcessing}
      />
      </div>

        {receiptOpen && (
          <div className="pos-receipt-overlay">
            <div ref={receiptRef} className="pos-receipt-box">
              <h3>Joven Tire Enterprise</h3>
              <p><strong>Receipt #:</strong> {lastReceipt?.salesId}</p>
              <p><strong>Customer:</strong> {lastReceipt?.customer.name}</p>
              <hr/> 

        {lastReceipt?.items.map((i, idx) => (
          <div key={`${i.firestoreId || i.id}-${idx}`}>
                  <span>{i.name} x{i.qty}</span>
                  <span>₱{(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}

              <hr />
      <p>Subtotal: ₱{receiptSubtotal.toFixed(2)}</p>
      <p>Product Price: ₱{(receiptSubtotal - receiptVAT).toFixed(2)}</p>

            {/* VAT logic */}
            {lastReceipt?.customerType === "Regular" && (
              <p>VAT (12%): ₱{lastReceipt?.vat?.toFixed(2)}</p>
            )}

            {(lastReceipt?.customerType === "PWD" || lastReceipt?.customerType === "Senior") && (
              <>
                <p>VAT Included in Price: ₱{lastReceipt?.vat?.toFixed(2)}</p>
                <p>VAT Exempted: -₱{lastReceipt?.vat?.toFixed(2)}</p>
                {lastReceipt?.pwdDiscount > 0 && (
                  <p>PWD/Senior Discount (20%): -₱{lastReceipt?.pwdDiscount.toFixed(2)}</p>
                )}
              </>
            )}

            {/* Negotiated Discount */}
            {lastReceipt?.negotiatedDiscount > 0 && (
              <p>Negotiated Discount: -₱{lastReceipt?.negotiatedDiscount.toFixed(2)}</p>
            )}

            <h3>Total: ₱{lastReceipt?.totalAmount?.toFixed(2)}</h3>

            <p>Paid via: {lastReceipt?.paymentMode}</p>

            {lastReceipt?.paymentMode !== "Cash" && (
            <p>Reference No: {lastReceipt?.paymentRef || "N/A"}</p>
          )}

            {lastReceipt?.paymentMode === "Cash" && (
              <p>Change: ₱{Math.max((lastReceipt?.cashReceived || 0) - lastReceipt?.totalAmount, 0).toFixed(2)}</p>
            )}

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
