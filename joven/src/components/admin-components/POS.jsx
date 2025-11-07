import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  where
} from "firebase/firestore";
import "../../styles/shared/Sales.css"; // for inputs/receipt common styles
import "../../styles/admin-styles/POS.css"; // POS specific styling

const PAYMENT_MODES = ["Cash", "GCash", "Bank Transfer", "Card"];
const VAT_RATE = 0.12; // 12%

export default function POS({ role }) {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

  // 🧍 Customer-related states
  const [customerName, setCustomerName] = useState("");
  const [customerList, setCustomerList] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 🔹 Load registered customers (role = "User")
  useEffect(() => {
    const fetchCustomers = async () => {
      const q = query(collection(db, "users"), where("role", "==", "User"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCustomerList(list);
    };
    fetchCustomers();
  }, []);

  // 🔹 Filter customers by search input
  useEffect(() => {
    if (!customerName.trim()) {
      setFilteredCustomers([]);
      return;
    }
    const term = customerName.toLowerCase();
    const matches = customerList.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
    setFilteredCustomers(matches);
  }, [customerName, customerList]);

  // Load products from both collections and merge them
  useEffect(() => {
    const tiresRef = collection(db, "products_tires");
    const magsRef = collection(db, "products_mags");

    const unsubTires = onSnapshot(tiresRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), type: "tires" }));
      setProducts((prev) => {
        const magsOnly = prev.filter((p) => p.type === "mags");
        const merged = [...list, ...magsOnly];
        setFilteredProducts(merged);
        return merged;
      });
    });

    const unsubMags = onSnapshot(magsRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), type: "mags" }));
      setProducts((prev) => {
        const tiresOnly = prev.filter((p) => p.type === "tires");
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

  // search
  useEffect(() => {
    if (!search) {
      setFilteredProducts(products);
      return;
    }
    const q = search.toLowerCase();
    setFilteredProducts(
      products.filter((p) =>
        `${p.brand || ""} ${p.model || ""} ${p.productId || p.id || ""}`
          .toLowerCase()
          .includes(q)
      )
    );
  }, [search, products]);

  // cart helpers
  const addToCart = (product) => {
    const existing = cart.find((c) => c.id === product.id);
    if (existing) {
      if (existing.qty + 1 > (product.stock || 0)) {
        alert("Not enough stock.");
        return;
      }
      setCart(cart.map((c) => (c.id === product.id ? { ...c, qty: c.qty + 1 } : c)));
    } else {
      if (1 > (product.stock || 0)) {
        alert("Not enough stock.");
        return;
      }
      setCart([
        {
          id: product.id,
          productId: product.productId || product.id,
          brand: product.brand,
          model: product.model,
          price: Number(product.price || 0),
          stock: product.stock || 0,
          type: product.type,
          qty: 1
        },
        ...cart
      ]);
    }
  };

  const incQty = (id) => {
    const product = products.find((p) => p.id === id);
    const item = cart.find((c) => c.id === id);
    if (!item || !product) return;
    if (item.qty + 1 > (product.stock || 0)) {
      alert("Not enough stock.");
      return;
    }
    setCart(cart.map((c) => (c.id === id ? { ...c, qty: c.qty + 1 } : c)));
  };

  const decQty = (id) => {
    const item = cart.find((c) => c.id === id);
    if (!item) return;
    if (item.qty - 1 <= 0) {
      setCart(cart.filter((c) => c.id !== id));
      return;
    }
    setCart(cart.map((c) => (c.id === id ? { ...c, qty: c.qty - 1 } : c)));
  };

  const updateQty = (id, value) => {
    const qty = Number(value || 0);
    if (isNaN(qty) || qty < 1) return;
    const product = products.find((p) => p.id === id);
    if (product && qty > (product.stock || 0)) {
      alert("Not enough stock.");
      return;
    }
    setCart(cart.map((c) => (c.id === id ? { ...c, qty } : c)));
  };

  const removeFromCart = (id) => setCart(cart.filter((c) => c.id !== id));

  // totals
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("Cart is empty.");
      return;
    }

    const finalCustomer = customerName.trim() || "Walk-in";

    if (!paymentMode) {
      alert("Choose a payment method.");
      return;
    }

    if (paymentMode === "Cash") {
      const cashVal = Number(cashReceived || 0);
      if (isNaN(cashVal) || cashVal < total) {
        alert(`Cash received must be at least ₱${total.toFixed(2)}.`);
        return;
      }
    } else {
      if (!paymentRef || paymentRef.trim().length < 3) {
        if (!window.confirm("No payment reference provided. Continue anyway?")) return;
      }
    }

    setIsProcessing(true);
    try {
      const productsArray = cart.map((i) => ({
        productId: i.productId || i.id,
        productName: `${i.brand} ${i.model}`,
        quantity: i.qty,
        unitPrice: i.price,
        lineTotal: i.price * i.qty,
        type: i.type
      }));

      let createdByName = role || "Staff";
      let createdByRole = role || "Staff";
      try {
        const uid = auth?.currentUser?.uid;
        if (uid) {
          const userDocRef = doc(db, "users", uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const u = userSnap.data();
            createdByName = u.name || createdByName;
            createdByRole = u.role || createdByRole;
          }
        }
      } catch (err) {
        console.warn("Unable to fetch user info for sale metadata:", err);
      }

      const saleData = {
        customerName: finalCustomer,
        products: productsArray,
        subtotal,
        vat,
        totalAmount: total,
        paymentMode,
        paymentRef: paymentRef || "",
        createdAt: Timestamp.now(),
        type: "in-store",
        status: "completed",
        createdBy: auth?.currentUser?.uid || null,
        createdByName,
        createdByRole
      };

      const saleRef = await addDoc(collection(db, "sales"), saleData);

      for (const item of cart) {
        const collectionName =
          item.type === "mags" ? "products_mags" : "products_tires";
        const prodRef = doc(db, collectionName, item.id);

        try {
          const prodSnap = await getDoc(prodRef);
          const latestStock = Number(
            prodSnap.exists() ? prodSnap.data().stock || 0 : item.stock || 0
          );
          const newStock = Math.max(0, latestStock - item.qty);
          await updateDoc(prodRef, { stock: newStock });
        } catch (err) {
          console.warn("Failed to update stock for", item.id, err);
        }
      }

      const receipt = {
        id: saleRef.id,
        items: productsArray,
        subtotal,
        vat,
        total,
        paymentMode,
        cashReceived: Number(cashReceived || 0),
        change: Number(cashReceived || 0) - total,
        createdByName,
        createdByRole,
        createdAt: new Date().toISOString(),
        customerName: finalCustomer
      };

      setCart([]);
      setPaymentMode("Cash");
      setCashReceived("");
      setPaymentRef("");
      setCustomerName("");

      setLastReceipt(receipt);
      setReceiptOpen(true);
      alert("✅ Checkout successful — sale recorded and stock updated.");
    } catch (err) {
      console.error("Checkout error:", err);
      alert("❌ Checkout failed. See console.");
    } finally {
      setIsProcessing(false);
    }
  };

  const closeReceipt = () => {
    setReceiptOpen(false);
    setLastReceipt(null);
  };

  const handlePrintReceipt = () => window.print();

  return (
    <div className="pos-container">
      <div className="pos-header">
        <div>Joven Tire Enterprise — Point of Sale</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="pos-close-btn"
            onClick={() => navigate("/admin-dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="pos-main">
        {/* Products list */}
        <div className="pos-product-list">
          <div className="pos-search">
            <input
              placeholder="Search product by brand / model / id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={() => setSearch(search)}>Search</button>
          </div>

          <div className="pos-product-items-container">
            {filteredProducts.length === 0 && (
              <div style={{ color: "#64748b" }}>No products</div>
            )}
            {filteredProducts.map((p) => (
              <div className="pos-product-item" key={p.id}>
                <div>
                  <div style={{ fontWeight: 700 }}>
                    {p.brand} {p.model}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      marginTop: 4
                    }}
                  >
                    {p.productId
                      ? `ID: ${p.productId}`
                      : `ID: ${p.id}`}{" "}
                    — ₱{Number(p.price || 0).toFixed(2)} — {p.stock ?? 0} in stock
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <button
                    className="btn-submit"
                    onClick={() => addToCart(p)}
                    disabled={(p.stock || 0) <= 0}
                  >
                    Add
                  </button>
                  <button className="btn-cancel" onClick={() => addToCart(p)}>
                    Quick
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="pos-cart">
          <h3 style={{ marginTop: 0 }}>Cart</h3>

          <div className="cart-items-container">
            {cart.length === 0 ? (
              <div style={{ color: "#64748b" }}>Cart is empty</div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      flex: 1
                    }}
                  >
                    <div className="cart-item-name">
                      {item.brand} {item.model}
                    </div>
                    <div style={{ fontSize: 13, color: "#475569" }}>
                      ₱{item.price.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      className="cart-item-qty"
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <button
                        className="btn-cancel"
                        onClick={() => decQty(item.id)}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateQty(item.id, e.target.value)}
                        style={{ width: 56, margin: "0 6px" }}
                      />
                      <button
                        className="btn-submit"
                        onClick={() => incQty(item.id)}
                      >
                        +
                      </button>
                    </div>
                    <div
                      style={{
                        minWidth: 90,
                        textAlign: "right",
                        fontWeight: 700
                      }}
                    >
                      ₱{(item.price * item.qty).toFixed(2)}
                    </div>
                    <div>
                      <button
                        className="cart-item-remove"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div
            style={{
              borderTop: "1px dashed #e2e8f0",
              paddingTop: 12,
              marginTop: 12
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Subtotal</div>
              <div>₱{subtotal.toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>VAT (12%)</div>
              <div>₱{vat.toFixed(2)}</div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700
              }}
            >
              <div>Total</div>
              <div>₱{total.toFixed(2)}</div>
            </div>
          </div>

          {/* ✅ Customer Name Search */}
          <div style={{ marginTop: 12, position: "relative" }}>
            <label style={{ fontWeight: 700 }}>Customer</label>
            <input
              className="input-field"
              placeholder="Enter customer name or leave blank for Walk-in"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {showSuggestions && filteredCustomers.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  background: "white",
                  border: "1px solid #ccc",
                  width: "100%",
                  maxHeight: 150,
                  overflowY: "auto",
                  zIndex: 10
                }}
              >
                {filteredCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    style={{
                      padding: "6px 10px",
                      cursor: "pointer",
                      borderBottom: "1px solid #eee"
                    }}
                    onMouseDown={() => {
                      setCustomerName(cust.name);
                      setShowSuggestions(false);
                    }}
                  >
                    {cust.name} — <small>{cust.email}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontWeight: 700 }}>Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="sort-select"
              style={{ width: "100%", marginTop: 6 }}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
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
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
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
                <label style={{ fontWeight: 600 }}>
                  {paymentMode} Reference
                </label>
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
                setCustomerName("");
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptOpen && lastReceipt && (
        <div className="pos-receipt-modal" role="dialog" aria-modal="true">
          <div className="pos-receipt-box">
            <div className="receipt-header">
              <h3>Joven Tire Enterprise</h3>
              <div>Official Receipt</div>
              <small>{lastReceipt.id}</small>
            </div>

            <div className="receipt-body">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8
                }}
              >
                <div>
                  <strong>Customer:</strong>
                </div>
                <div>{lastReceipt.customerName}</div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8
                }}
              >
                <div>
                  <strong>Cashier:</strong>
                </div>
                <div>
                  {lastReceipt.createdByName || role} (
                  {lastReceipt.createdByRole || role})
                </div>
              </div>

              {lastReceipt.items.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6
                  }}
                >
                  <div>
                    {it.productName} x{it.quantity}
                  </div>
                  <div>₱{it.lineTotal.toFixed(2)}</div>
                </div>
              ))}

              <hr
                style={{ border: "none", borderTop: "1px dashed #ddd", margin: "8px 0" }}
              />

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Subtotal</div>
                <div>₱{lastReceipt.subtotal.toFixed(2)}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>VAT (12%)</div>
                <div>₱{lastReceipt.vat.toFixed(2)}</div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700
                }}
              >
                <div>Total</div>
                <div>₱{lastReceipt.total.toFixed(2)}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <div>Payment</div>
                <div>{lastReceipt.paymentMode}</div>
              </div>
              {lastReceipt.paymentMode === "Cash" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>Cash</div>
                  <div>₱{(lastReceipt.cashReceived || 0).toFixed(2)}</div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Change</div>
                <div>
                  ₱
                  {lastReceipt.change && lastReceipt.change > 0
                    ? lastReceipt.change.toFixed(2)
                    : "0.00"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-submit" onClick={handlePrintReceipt}>
                Print
              </button>
              <button className="btn-cancel" onClick={closeReceipt}>
                Close
              </button>
            </div>

            <div className="receipt-footer">Thank you for your purchase!</div>
          </div>
        </div>
      )}
    </div>
  );
}
