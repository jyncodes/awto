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

// 🔒 FIRESTORE SAFE SANITIZER (REQUIRED)
const sanitizeForFirestore = (obj) => {
  // ✅ DO NOT TOUCH Firestore Timestamp
  if (obj instanceof Timestamp) return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }

  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    );
  }

  return obj;
};

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


const {
  fromReservation,
  reservedItems,
  customer: reservedCustomer,
  reservationId
} = location.state || {};


const isCustomerLocked = fromReservation === true;
const [customerName, setCustomerName] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("search");
  

  const reservationFeeApplied = fromReservation ? RESERVATION_FEE : 0;

  const renderDate = (ts) => {
  if (!ts) return "";
  if (typeof ts.toDate === "function") {
    return ts.toDate().toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  // fallback if plain object (seconds)
  if (ts.seconds) {
    return new Date(ts.seconds * 1000).toLocaleString("en-PH");
  }

  return "";
};


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

// When POS is opened from a reservation, normalize customer data
useEffect(() => {
  if (fromReservation && reservedCustomer) {
    const normalizedCustomer = {
      ...reservedCustomer,
      lastPlateNumber: reservedCustomer.plateNo || reservedCustomer.lastPlateNumber || "",
      customerCode: reservedCustomer.customerCode || "",
    };

    setSelectedCustomer(normalizedCustomer);
    setCustomerName(normalizedCustomer.name);
  }
}, [fromReservation, reservedCustomer]);

useEffect(() => {
  if (!fromReservation || !Array.isArray(reservedItems)) return;

    const normalizedCart = reservedItems.map((item) => {
    const productKey = item.selectedDocId || item.productId || item.id;

const resolvedName =
  typeof item.name === "string" && item.name.trim().length > 0
    ? item.name
    : typeof item.productName === "string" && item.productName.trim().length > 0
      ? item.productName
      : `${item.brand || ""} ${item.model || ""} ${item.selectedSize || ""}`.trim();

    return {
     id: `product-${productKey}`,
  firestoreId: productKey,

  name: resolvedName || "Unnamed Product",

      price: Number(
        item.price ??
        item.pricePerItem ??
        item.sellingPrice ??
        item.unitPrice ??
        0
      ),

      qty: Number(item.quantity ?? item.qty ?? 1),

      // 🔖 TYPE
      type: item.type || "product",

      // 🗂 CATEGORY
      category:
        item.type === "service"
          ? "service"
          : item.collection === "products_mags"
          ? "mags"  
          : "tires",

      // ⚠️ TEMP SAFE STOCK
      stock:
  item.type === "product"
    ? Number(item.stock ?? item.quantity ?? 0)
    : 0,


      // OPTIONAL
      brand: item.brand,
      model: item.model,
      selectedSize: item.selectedSize,
    };
  });

  console.log("✅ FINAL normalized reservation cart:", normalizedCart);
  setCart(normalizedCart);
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
    if (existing.qty + 1 > existing.stock) {
      alert("Not enough stock.");
      return;
    }

    setCart(
      cart.map((c) =>
        c.firestoreId === product.firestoreId
          ? { ...c, qty: c.qty + 1 }
          : c
      )
    );
    return;
  }

  // 🔥 NORMALIZE PRODUCT BEFORE ADDING TO CART
  setCart([
    {
      id: `product-${product.firestoreId}`,
firestoreId: product.firestoreId,


      // ✅ REQUIRED BY POSCart
      name: `${product.brand} ${product.model}`,
      price: Number(
        product.price ??
        product.pricePerItem ??
        product.sellingPrice ??
        0
      ),

      qty: 1,

      // REQUIRED LOGIC
      type: "product",
      firestoreId: product.firestoreId,
      category: product.category,
      stock: Number(product.stock ?? 0),

      // OPTIONAL
      brand: product.brand,
      model: product.model,
    },
    ...cart,
  ]);
};

useEffect(() => {
  console.table(cart);
}, [cart]);


const addServiceToCart = (svc) => {
  if (cart.some((c) => c.id === svc.id)) {
    alert("Service already added");
    return;
  }

  setCart([
    {
      id: `service-${svc.id}`,


      // ✅ REQUIRED BY POSCart & totals
      name: svc.name,
      price: Number(svc.price ?? 0),
      qty: 1,

      // REQUIRED
      type: "service",

      // optional
      category: "service",
    },
    ...cart,
  ]);
};


  const incQty = (id) => setCart(cart.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c)));
  const decQty = (id) =>
    setCart(cart.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0));
  const updateQty = (id, q) => {
  setCart(cart.map((c) => {
    if (c.id !== id) return c;

    const newQty = Math.max(1, Number(q) || 1);

    if (c.type === "product" && newQty > c.stock) {
      alert("Quantity exceeds available stock.");
      return c;
    }

    return { ...c, qty: newQty };
  }));
};

  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id));

  // ================== TOTALS ==================

const computeTotals = () => {
  let productTotal = 0;
  let serviceTotal = 0;

  // Separate product vs service totals
cart.forEach(item => {
  const price = Number(item.price || 0);
  const qty = Number(item.qty || 0);

  if (item.type === "service") {
    serviceTotal += price * qty;
  } else {
    productTotal += price * qty;
  }
});


  // VAT calculations
  const productVat = productTotal - (productTotal / 1.12);
  const serviceVat = serviceTotal - (serviceTotal / 1.12);

  let serviceBase = serviceTotal;
  let pwdDiscount = 0;

  // If PWD/Senior — VAT is removed and 20% applies ONLY to services
  if (customerType === "PWD" || customerType === "Senior") {
    serviceBase = serviceTotal / 1.12; // Remove VAT from service
    pwdDiscount = serviceBase * 0.20; // 20% discount only for service
  }

  const discountedServiceTotal = serviceBase - pwdDiscount;

  // Final total calculation
  let computedTotal = productTotal + discountedServiceTotal;

  // Negotiated discount still applies last
  if (isNegotiated && negotiatedDiscount > 0) {
    computedTotal -= negotiatedDiscount;
    if (computedTotal < 0) computedTotal = 0;
  }

  return {
    baseSubtotal: productTotal + serviceTotal,
    baseVAT: productVat + (customerType === "Regular" ? serviceVat : 0),
    computedTotal,
    pwdDiscount
  };
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

const safeCustomer = selectedCustomer
  ? {
      customerCode: selectedCustomer.customerCode || "",
      name: selectedCustomer.name || customerName,
      lastPlateNumber:
        selectedCustomer.lastPlateNumber ||
        selectedCustomer.plateNo ||
        "",
      contact: selectedCustomer.contact || "",
      uid: selectedCustomer.uid || "",
    }
  : {
      name: customerName,
      type: "Walk-in",
    };


  const saleData = {
    salesId: formattedSaleId,
    customer: safeCustomer,
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
    completedAt: Timestamp.now(),
    createdByName: userData?.name || "System",
  createdByRole: userData?.role || "Staff",

    reservationApplied: reservationFeeApplied > 0,
  };

const safeSaleData = sanitizeForFirestore(saleData);

console.log("🔥 FINAL SALE DATA (sanitized):", safeSaleData);

await setDoc(
  doc(db, "sales", formattedSaleId),
  safeSaleData,
  { merge: false }
);



// ✅ IF SALE CAME FROM RESERVATION → MARK AS COMPLETED
if (fromReservation && reservationId) {
  await updateDoc(doc(db, "reservations", reservationId), {
    status: "Completed",
    completedAt: Timestamp.now(),
    salesId: formattedSaleId
  });
}


    // update product stocks
for (const item of cart.filter((i) => i.type === "product")) {
  const newStock = Math.max(Number(item.stock || 0) - Number(item.qty || 0), 0);

  await updateDoc(
    doc(
      db,
      item.category === "mags" ? "products_mags" : "products_tires",
      item.firestoreId
    ),
    { stock: newStock }
  );
}


    setLastReceipt({ id: formattedSaleId, ...safeSaleData });
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
  window.print();
};

        // ================== COMPUTE RECEIPT VALUES ==================
    const receiptSubtotal = Number(lastReceipt?.subtotal || 0);
    const receiptVAT = Number(lastReceipt?.vat || 0);
    const receiptPWD = Number(lastReceipt?.pwdDiscount || 0);
    const receiptNegotiated = Number(lastReceipt?.negotiatedDiscount || 0);
    const receiptTotal = Number(lastReceipt?.totalAmount || 0);
    const receiptCash = Number(lastReceipt?.cashReceived || 0);

    const receiptBasePrice = receiptSubtotal / 1.12; // Actual price without VAT
    const receiptVatAmount = receiptSubtotal - receiptBasePrice; // VAT included in subtotal
    const isPwdOrSenior =
      lastReceipt?.customerType === "PWD" || lastReceipt?.customerType === "Senior";

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
  disabled={isCustomerLocked}
  title={isCustomerLocked ? "Customer locked from reservation" : ""}
  onClick={() => {
    if (!isCustomerLocked) {
      setModalMode("search");
      setCustomerModalOpen(true);
    }
  }}
    >
      🔍
    </button>

    <button
      className="btn-small success"
      disabled={isCustomerLocked}
      title={isCustomerLocked ? "Customer locked from reservation" : ""}
      onClick={() => {
        if (!isCustomerLocked) {
          setModalMode("add");
          setCustomerModalOpen(true);
        }
      }}
    >
      ➕
    </button>

    </div>
{selectedCustomer && (
  <div className="customer-details">
    <p><strong>Customer ID:</strong> {selectedCustomer.customerCode}</p>
    <p>
      <strong>Name:</strong> {selectedCustomer.name}
      {isCustomerLocked && <span style={{ color: "red", marginLeft: 6 }}>🔒</span>}
    </p>
    <p>
      <strong>Plate Number:</strong> {selectedCustomer.lastPlateNumber || selectedCustomer.plateNo || "None"}
      {isCustomerLocked && <span style={{ color: "red", marginLeft: 6 }}>🔒</span>}
    </p>
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
        cart={cart}
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
              <p>
                <p><strong>Date:</strong> {renderDate(lastReceipt?.createdAt)}</p>
              </p>

        {lastReceipt?.items.map((i, idx) => (
          <div key={`${i.firestoreId || i.id}-${idx}`}>
                  <span>{i.name} x{i.qty}</span>
                  <span>₱{(i.price * i.qty).toFixed(2)}</span>
                </div>
              ))}

              <hr />
              
              {/* -------- VAT + Discount Breakdown -------- */}
        {(() => {
          let productTotal = 0;
          let serviceTotal = 0;

          // separate product vs services
          lastReceipt?.items?.forEach(item => {
            if (item.type === "service") {
              serviceTotal += item.price * item.qty;
            } else {
              productTotal += item.price * item.qty;
            }
          });

          const productVat = productTotal - (productTotal / 1.12);
          const serviceVat = serviceTotal - (serviceTotal / 1.12);

          const isPwdOrSenior = lastReceipt?.customerType === "PWD" || lastReceipt?.customerType === "Senior";

          const removedVat = isPwdOrSenior ? serviceVat : 0;
          const serviceBase = isPwdOrSenior ? serviceTotal / 1.12 : serviceTotal;
          const pwdDiscountCalc = isPwdOrSenior ? serviceBase * 0.20 : 0;

          return (
            <>
              <p><strong>Products Total:</strong> ₱{productTotal.toFixed(2)}</p>
              <p><strong>Services Total:</strong> ₱{serviceTotal.toFixed(2)}</p>

              <p>VAT (Products): ₱{productVat.toFixed(2)}</p>
              <p>VAT (Services): ₱{serviceVat.toFixed(2)}</p>

              {isPwdOrSenior && (
                <>
                  <p>Less VAT Removed (Service Only): -₱{removedVat.toFixed(2)}</p>
                  <p>PWD/Senior Discount (20% on service): -₱{pwdDiscountCalc.toFixed(2)}</p>
                </>
              )}

              {lastReceipt?.negotiatedDiscount > 0 && (
                <p>Negotiated Discount: -₱{lastReceipt.negotiatedDiscount.toFixed(2)}</p>
              )}
            </>
          );
        })()}

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
          if (isCustomerLocked) return;
          setSelectedCustomer(cust);
          setCustomerName(cust.name);
          setCustomerModalOpen(false);
        }}
  />
)}
    </>
  );
}
