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
  getDocs,
  query,
  where,
} from "firebase/firestore";
import "../../styles/shared/Sales.css";
import "../../styles/admin-styles/POS.css";

const PAYMENT_MODES = ["Cash", "GCash", "Bank Transfer", "Card"];
const VAT_RATE = 0.12;
const RESERVATION_FEE = 500;

export default function POS({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const receiptRef = useRef(null);

  const {
    fromReservation = false,
    reservedItems = [],
    customerName: reservedCustomer = "",
    reservationId = null,
  } = location.state || {};

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
  const [customerName, setCustomerName] = useState(reservedCustomer || "");
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reservationFeeApplied, setReservationFeeApplied] = useState(
    fromReservation ? RESERVATION_FEE : 0
  );

  // 🧍 Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      const q = query(collection(db, "users"), where("role", "==", "User"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCustomerList(list);
    };
    fetchCustomers();
  }, []);

  // 🔹 Load products
  useEffect(() => {
    const tiresRef = collection(db, "products_tires");
    const magsRef = collection(db, "products_mags");

    const unsubTires = onSnapshot(tiresRef, (snap) => {
      const list = snap.docs.map((d) => ({
        firestoreId: d.id,
        productId: d.data().productId,
        ...d.data(),
        type: "product",
        category: "tires",
        unitsPerSet: d.data().unitsPerSet || 1,
      }));
      setProducts((prev) => {
        const magsOnly = prev.filter((p) => p.category === "mags");
        const merged = [...list, ...magsOnly];
        setFilteredProducts(merged);
        return merged;
      });
    });

    const unsubMags = onSnapshot(magsRef, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        type: "product",
        category: "mags",
        unitsPerSet: d.data().unitsPerSet || 4,
      }));
      setProducts((prev) => {
        const tiresOnly = prev.filter((p) => p.category === "tires");
        const merged = [...tiresOnly, ...list];
        setFilteredProducts(merged);
        return merged;
      });
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // 🔹 Load services
  useEffect(() => {
    const q = query(collection(db, "services"), where("active", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), type: "service" }));
      setServices(list);
    });
    return () => unsub();
  }, []);

  // 🧾 Reservation items auto-load
  useEffect(() => {
    if (fromReservation && reservedItems?.length > 0) {
      const converted = reservedItems.map((item, index) => ({
        id: item.id || `reserved-${index}-${Date.now()}`,
        productId: item.productId || item.id || "",
        name: `${item.brand || ""} ${item.model || item.productName || ""}`,
        price: Number(item.price || 0),
        stock: item.stock || 1,
        qty: item.quantity || item.qty || 1,
        type: "product",
      }));
      setCart((prev) => [...converted, ...prev]);
      setReservationFeeApplied(RESERVATION_FEE);
    }
  }, [fromReservation, reservedItems]);

  // 🔍 Search
  useEffect(() => {
    if (!search) setFilteredProducts(products);
    else {
      const q = search.toLowerCase();
      setFilteredProducts(
        products.filter((p) =>
          `${p.brand || ""} ${p.model || ""}`.toLowerCase().includes(q)
        )
      );
    }
  }, [search, products]);

  // ================= CART LOGIC =================
const addToCart = (product) => {
  const unitsPerSet = product.unitsPerSet || 1;

    const existing = cart.find(
      (c) => c.firestoreId === product.firestoreId && c.type === "product"
    );
  // STOCK CHECK per SET
  if (existing) {
    if (existing.qty + 1 > product.stock) {
      return alert("Not enough stock (per set/item).");
    }

    setCart(
      cart.map((c) =>
        c.id === product.id && c.type === "product"
          ? { ...c, qty: c.qty + 1 }
          : c
      )
    );
  } else {
    if (product.stock <= 0) {
      return alert("Not enough stock.");
    }

    setCart([
      {
        id: product.productId,
        firestoreId: product.firestoreId,
        name: `${product.brand} ${product.model}`,
        price: Number(product.price),     // price already per set or per piece
        qty: 1,
        stock: product.stock,           // stock = number of sets (for mags)
        unitsPerSet,
        type: "product",
      },
      ...cart,
    ]);
  }
};

  const addServiceToCart = (svc) => {
    const existing = cart.find((c) => c.id === svc.id && c.type === "service");
    if (existing) {
      alert("This service is already added to cart.");
      return;
    }
    setCart([
      {
        id: svc.id,
        name: svc.name,
        price: Number(svc.price || 0),
        qty: 1,
        type: "service",
      },
      ...cart,
    ]);
  };

  const incQty = (id) =>
    setCart(
      cart.map((c) =>
        c.id === id && c.type === "product"
          ? { ...c, qty: c.qty + 1 }
          : c
      )
    );

  const decQty = (id) =>
    setCart(
      cart
        .map((c) =>
          c.id === id && c.type === "product"
            ? { ...c, qty: c.qty - 1 }
            : c
        )
        .filter((c) => c.qty > 0)
    );

  const updateQty = (id, value) =>
    setCart(
      cart.map((c) =>
        c.id === id && c.type === "product"
          ? { ...c, qty: Number(value) }
          : c
      )
    );

  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id));

  // 💰 Totals
  const subtotalProducts = cart
    .filter((i) => i.type === "product")
    .reduce((sum, i) => sum + i.price * i.qty, 0);

  const subtotalServices = cart
    .filter((i) => i.type === "service")
    .reduce((sum, i) => sum + i.price, 0);

  const subtotal = subtotalProducts + subtotalServices;
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat - (reservationFeeApplied || 0);

  // ================= CHECKOUT =================
  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty.");
    const finalCustomer = customerName.trim() || "Walk-in";

    setIsProcessing(true);
    try {
      const items = cart.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        total: i.price * (i.qty || 1),
        type: i.type,
      }));

      const uid = auth?.currentUser?.uid;
      
          let createdByName = "Staff";
    let createdByRole = "Staff";

    if (uid) {
      // Try users
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        createdByName = userDoc.data().name;
        createdByRole = userDoc.data().role;
      } else {
        // Try staff
        const staffDoc = await getDoc(doc(db, "staff", uid));
        if (staffDoc.exists()) {
          createdByName = staffDoc.data().name;
          createdByRole = staffDoc.data().role;
        }
      }
    }

      const saleData = {
        customerName: finalCustomer,
        items,
        subtotal,
        vat,
        totalAmount: total,
        paymentMode,
        paymentRef,
        createdAt: Timestamp.now(),
        type: "in-store",
        status: "completed",
        createdBy: uid || null,
        createdByName,
        createdByRole,
        reservationApplied: Boolean(reservationFeeApplied),
        reservationId: reservationId || null,
      };

            for (const item of cart.filter((c) => c.type === "product")) {
        const ref = doc(
          db,
          item.unitsPerSet === 4 ? "products_mags" : "products_tires",
          item.firestoreId
        );

        const newStock = item.stock - item.qty; // Deduct per set or per piece

        await updateDoc(ref, { stock: newStock });
      }

      const docRef = await addDoc(collection(db, "sales"), saleData);
      setLastReceipt({ id: docRef.id, ...saleData });
      setReceiptOpen(true);

      setCart([]);
      setCashReceived("");
      setPaymentRef("");
      setCustomerName("");
      setReservationFeeApplied(0);
    } catch (err) {
      console.error(err);
      alert("❌ Checkout failed. See console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContents = receiptRef.current.innerHTML;
      const newWindow = window.open("", "", "width=800,height=600");
      newWindow.document.write(`
        <html><head><title>Receipt</title></head>
        <body>${printContents}</body></html>
      `);
      newWindow.document.close();
      newWindow.print();
      newWindow.close();
    }
  };

  // ================= RENDER =================
  return (
        <div className="pos-container">
      <div className="pos-header">
        <div>Joven Tire Enterprise — Point of Sale</div>
        <button
          className="pos-close-btn"
          onClick={() => {
            if (role === "Admin") navigate("/admin-dashboard/sales");
            else navigate("/staff-dashboard/sales");
          }}
        >
          Back to Dashboard
        </button>
      </div>

      <div className="pos-main">
        {/* ========== LEFT SIDE (PRODUCTS + SERVICES) ========== */}
        <div className="pos-product-list">
          <div className="pos-search">
            <input
              placeholder="Search product by brand / model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <h4 style={{ margin: "0.5rem 0", color: "#1e293b" }}>🛞 Products</h4>
          <div className="pos-product-items-container">
            {filteredProducts.length === 0 ? (
              <div style={{ color: "#64748b" }}>No products</div>
            ) : (
              filteredProducts.map((p) => (
                <div className="pos-product-item" key={p.id}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {p.brand} {p.model}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      ₱{Number(p.price || 0).toFixed(2)} — {p.stock ?? 0} in stock
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                      className="btn-submit"
                      onClick={() => addToCart(p)}
                      disabled={(p.stock || 0) <= 0}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <h4 style={{ margin: "1rem 0 0.5rem 0", color: "#1e293b" }}>🧰 Services</h4>
          <div className="pos-product-items-container">
            {services.length === 0 ? (
              <div style={{ color: "#64748b" }}>No services available</div>
            ) : (
              services.map((svc) => (
                <div className="pos-product-item" key={svc.id}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{svc.name}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                      ₱{Number(svc.price || 0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button className="btn-submit" onClick={() => addServiceToCart(svc)}>
                      Add
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========== RIGHT SIDE (CART) ========== */}
        <div className="pos-cart">
          <h3 style={{ marginTop: 0 }}>Cart</h3>

          <div className="cart-items-container">
            {cart.filter((i) => i.type === "product").length > 0 && (
              <>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>🛞 Products</div>
                {cart
                  .filter((i) => i.type === "product")
                  .map((item) => (
                    <div className="cart-item" key={item.id}>
                      <div style={{ flex: 1 }}>
                        <div className="cart-item-name">{item.name}</div>
                        <div style={{ fontSize: 13, color: "#475569" }}>
                          ₱{item.price.toFixed(2)}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="cart-item-qty" style={{ display: "flex", alignItems: "center" }}>
                          <button className="btn-cancel" onClick={() => decQty(item.id)}>-</button>
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => updateQty(item.id, e.target.value)}
                            style={{ width: 56, margin: "0 6px" }}
                          />
                          <button className="btn-submit" onClick={() => incQty(item.id)}>+</button>
                        </div>
                        <div style={{ minWidth: 90, textAlign: "right", fontWeight: 700 }}>
                          ₱{(item.price * item.qty).toFixed(2)}
                        </div>
                        <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            )}

            {cart.filter((i) => i.type === "service").length > 0 && (
              <>
                <div style={{ fontWeight: 700, marginTop: 16, marginBottom: 6 }}>
                  🧰 Services
                </div>
                {cart
                  .filter((i) => i.type === "service")
                  .map((svc) => (
                    <div className="cart-item" key={svc.id}>
                      <div style={{ flex: 1 }}>
                        <div className="cart-item-name">{svc.name}</div>
                        <div style={{ fontSize: 13, color: "#475569" }}>
                          ₱{svc.price.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <button className="cart-item-remove" onClick={() => removeFromCart(svc.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            )}

            {cart.length === 0 && <div style={{ color: "#64748b" }}>Cart is empty</div>}
          </div>

          {/* ========== TOTALS ========== */}
          <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Subtotal</div>
              <div>₱{subtotal.toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div>VAT (12%)</div>
              <div>₱{vat.toFixed(2)}</div>
            </div>
            {reservationFeeApplied > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <div>Less Reservation Fee</div>
                <div>- ₱{reservationFeeApplied.toFixed(2)}</div>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8 }}>
              <div>Total</div>
              <div>₱{total.toFixed(2)}</div>
            </div>
          </div>

          {/* ========== PAYMENT SECTION ========== */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontWeight: 700 }}>Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="sort-select"
              style={{ width: "100%", marginTop: 6 }}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {paymentMode === "Cash" ? (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontWeight: 600 }}>Cash Received</label>
                <input
                  className="input-field"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`Enter amount (≥ ₱${total.toFixed(2)})`}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <div>Change</div>
                  <div style={{ fontWeight: 700 }}>
                    ₱
                    {Number(cashReceived || 0) - total > 0
                      ? (Number(cashReceived || 0) - total).toFixed(2)
                      : "0.00"}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontWeight: 600 }}>{paymentMode} Reference</label>
                <input
                  className="input-field"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Transaction reference / note (optional)"
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="pos-checkout-btn"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : `Pay ₱${total.toFixed(2)}`}
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setCart([]);
                setCashReceived("");
                setPaymentRef("");
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* ✅ RECEIPT MODAL */}
      {receiptOpen && lastReceipt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            ref={receiptRef}
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              width: "400px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ textAlign: "center" }}>🧾 Official Receipt</h3>
            <p><strong>Receipt ID:</strong> {lastReceipt.id}</p>
            <p><strong>Customer:</strong> {lastReceipt.customerName}</p>
            <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
            <hr />
            {/* 🛞 Products */}
              {lastReceipt.items
                .filter((i) => i.type === "product")
                .map((i, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>Product {String(idx + 1).padStart(4, "0")} - {i.name}</div>
                    <div>₱{i.total.toFixed(2)}</div>
                  </div>
                ))}

              {/* 🧰 Services */}
              {lastReceipt.items
                .filter((i) => i.type === "service")
                .map((i, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>Service {String(idx + 1).padStart(3, "0")} - {i.name}</div>
                    <div>₱{i.total.toFixed(2)}</div>
                  </div>
                ))}

            <hr />
            <p>Subtotal: ₱{lastReceipt.subtotal.toFixed(2)}</p>
            <p>VAT: ₱{lastReceipt.vat.toFixed(2)}</p>
            {lastReceipt.reservationApplied && (
              <p>Less Reservation Fee: ₱{RESERVATION_FEE}</p>
            )}
            <p><strong>Total: ₱{lastReceipt.totalAmount.toFixed(2)}</strong></p>
            <p><strong>Payment:</strong> {lastReceipt.paymentMode}</p>
            {lastReceipt.paymentRef && <p><strong>Ref:</strong> {lastReceipt.paymentRef}</p>}
            <p><strong>Served by:</strong> {lastReceipt.createdByName}</p>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button className="btn-submit" onClick={handlePrint} style={{ marginRight: "8px" }}>
                Print
              </button>
              <button className="btn-cancel" onClick={() => setReceiptOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
