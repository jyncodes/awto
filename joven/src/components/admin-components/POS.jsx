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
} from "firebase/firestore";
import "../../styles/shared/Sales.css"; // for inputs/receipt common styles
import "../../styles/admin-styles/POS.css"; // POS specific styling

const PAYMENT_MODES = ["Cash", "GCash", "Bank Transfer", "Card"];
const VAT_RATE = 0.12; // 12%

export default function POS({ role }) {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]); // merged tires + mags
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]); // { id, brand, model, price, stock, type, qty, productId }
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [cashReceived, setCashReceived] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);

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
          qty: 1,
        },
        ...cart,
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
        if (!window.confirm("No payment reference provided. Continue anyway?"))
          return;
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
        type: i.type,
      }));

      // ✅ Fix: Always store actual logged-in user UID and info
      let createdByName = role || "Staff";
      let createdByRole = role || "Staff";
      let createdByUID = auth?.currentUser?.uid || null;

      try {
        if (createdByUID) {
          const userDocRef = doc(db, "users", createdByUID);
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
        customerName: lastReceipt?.customerName || "Walk-in",
        products: productsArray,
        subtotal,
        vat,
        totalAmount: total,
        paymentMode,
        paymentRef: paymentRef || "",
        createdAt: Timestamp.now(),
        type: "in-store",
        status: "completed",
        createdBy: createdByUID,
        createdByName,
        createdByRole,
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
        total: total,
        paymentMode,
        cashReceived: Number(cashReceived || 0),
        change: Number(cashReceived || 0) - total,
        createdByName,
        createdByRole,
        createdAt: new Date().toISOString(),
      };

      setCart([]);
      setPaymentMode("Cash");
      setCashReceived("");
      setPaymentRef("");

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

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="pos-container">
      <div className="pos-header">
        <div>Joven Tire Enterprise — Point of Sale</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="pos-close-btn" onClick={() => navigate("/admin-dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Rest of your UI (unchanged) */}
      {/* ... */}
    </div>
  );
}
