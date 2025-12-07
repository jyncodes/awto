import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import "../../styles/shared/Sales.css";
import { FaPlus } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

const Sales = ({ role }) => {
  const [tab, setTab] = useState("all");
  const [salesLog, setSalesLog] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [reservationNames, setReservationNames] = useState({});
  const [reservationProducts, setReservationProducts] = useState({});
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Auto-open receipt if redirected from POS
  useEffect(() => {
    if (location.state?.newSale) {
      const newSale = location.state.newSale;
      setActiveReceipt(newSale);
      setReceiptOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const salesRef = collection(db, "sales");
    const unsubSales = onSnapshot(salesRef, async (snapshot) => {
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sorted = logs.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setSalesLog(sorted);

      // Fetch names for customer linking
      const usersSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "User"))
      );
      const usersMap = {};
      usersSnap.forEach((docSnap) => {
        const data = docSnap.data();
        usersMap[docSnap.id] = data.name || "—";
      });
      setUserNames(usersMap);

      // Load reservation-based names and products
      const reservationIds = [
        ...new Set(
          logs
            .filter((s) => s.type === "reservation" && s.reservationId)
            .map((s) => s.reservationId)
        ),
      ];

      const resNameMap = {};
      const resProductsMap = {};
      for (const rid of reservationIds) {
        try {
          const resDoc = await getDoc(doc(db, "reservations", rid));
          if (resDoc.exists()) {
            const data = resDoc.data();
            let finalName = data.userName || data.customerName || "—";
            if (data.userId && usersMap[data.userId]) {
              finalName = usersMap[data.userId];
            }
            resNameMap[rid] = finalName;
            resProductsMap[rid] = data.products || [
              {
                productName: data.productName || "Reserved Item",
                brand: data.brand || "",
                model: data.model || "",
                type: data.type || "",
                price: data.price || 0,
                qty: 1,
              },
            ];
          }
        } catch (err) {
          console.error("Error fetching reservation data for:", rid, err);
        }
      }

      setReservationNames(resNameMap);
      setReservationProducts(resProductsMap);
    });

    return () => unsubSales();
  }, []);

  const openReceipt = (sale) => {
    setActiveReceipt(sale);
    setReceiptOpen(true);
  };

  const closeReceipt = () => {
    setReceiptOpen(false);
    setActiveReceipt(null);
  };

  const handlePrintReceipt = () => window.print();

  const handleDeleteSale = async (saleId, customer, total) => {
    if (role !== "admin") {
      alert("You do not have permission to delete sales records.");
      return;
    }
    const confirmDelete = window.confirm(
      `🗑️ Delete this sale?\nCustomer: ${customer || "Walk-in"}\nTotal: ₱${Number(
        total || 0
      ).toFixed(2)}`
    );
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, "sales", saleId));
      alert("✅ Sale deleted successfully.");
    } catch (error) {
      console.error("Error deleting sale:", error);
      alert("❌ Failed to delete sale. See console for details.");
    }
  };

  // Route POS based on role
  const handleComplete = (reservationId, products, customerName) => {
    navigate(role === "admin" ? "/admin-pos" : "/staff-pos", {
      state: {
        fromReservation: true,
        reservationId,
        reservedItems: products,
        customerName,
      },
    });
  };

  // Filtering
  const filteredSales =
    tab === "all"
      ? salesLog
      : tab === "in-store"
      ? salesLog.filter((s) => s.type === "in-store")
      : salesLog.filter((s) => s.type === "reservation");

  // Group by customer
  const groupedSales = filteredSales.reduce((acc, sale) => {
    const name =
      sale.customerName ||
      reservationNames[sale.reservationId] ||
      "Walk-in";

    if (!acc[name]) {
      acc[name] = {
        customerName: name,
        history: [],
        totalSpent: 0,
      };
    }

    acc[name].history.push(sale);
    acc[name].totalSpent += sale.totalAmount || 0;
    return acc;
  }, {});

  return (
    <div className="sales-page-container">
      <div className="sales-header">
        <h1>Sales Transactions</h1>
        <button
          className="add-sale-btn"
          onClick={() =>
            navigate(role === "admin" ? "/admin-pos" : "/staff-pos")
          }
        >
          <FaPlus className="btn-icon" /> Add Sale
        </button>
      </div>

      {/* Tab Filters */}
      <div className="sales-tabs">
        <button className={`sales-tab-btn ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>All Sales</button>
        <button className={`sales-tab-btn ${tab === "in-store" ? "active" : ""}`} onClick={() => setTab("in-store")}>In-Store</button>
        <button className={`sales-tab-btn ${tab === "reservation" ? "active" : ""}`} onClick={() => setTab("reservation")}>Reservations</button>
      </div>

      <div className="sales-table-container">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Type</th>
              <th>By</th>
              <th>Actions</th>
            </tr>
          </thead>

          {/* NEW: Grouped table */}
          <tbody>
            {Object.keys(groupedSales).length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: "center" }}>No sales record.</td></tr>
            ) : (
              Object.values(groupedSales).map((customer, idx) => (
                <>
                  <tr key={idx} style={{ background: "#eef2ff", fontWeight: "bold" }}>
                    <td colSpan="2">{customer.customerName}</td>
                    <td colSpan="3">Transactions: {customer.history.length}</td>
                    <td colSpan="1">—</td>
                    <td colSpan="1">—</td>
                    <td style={{ color: "green" }}>₱{customer.totalSpent.toFixed(2)}</td>
                  </tr>

                  {customer.history.map((sale) => {
                    const isReservation = sale.type === "reservation";
                    const items = sale.items || [];
                    return (
                      <tr key={sale.id}>
                        <td>{sale.createdAt?.toDate?.().toLocaleDateString() || "N/A"}</td>
                        <td>{customer.customerName}</td>
                        <td>
                          {items.map((i, idx2) => (
                            <div key={idx2}>
                              {i.name || i.productName} x{ i.qty || i.quantity || 1 }
                            </div>
                          ))}
                        </td>
                        <td>₱{(sale.totalAmount || 0).toFixed(2)}</td>
                        <td>{sale.paymentMode || "—"}</td>
                        <td>{sale.type}</td>
                        <td>{sale.createdByName || "—"}</td>

                        <td>
                          {isReservation ? (
                            <button className="btn-submit"
                              onClick={() => handleComplete(
                                sale.reservationId,
                                reservationProducts[sale.reservationId] || [],
                                customer.customerName
                              )}
                            >
                              Complete
                            </button>
                          ) : (
                            <button className="view-receipt-btn" onClick={() => openReceipt(sale)}>
                              Receipt
                            </button>
                          )}

                          {role === "admin" && (
                            <button className="delete-sale-btn"
                              onClick={() => handleDeleteSale(sale.id, customer.customerName, sale.totalAmount)}>
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {receiptOpen && activeReceipt && (
        <div className="pos-receipt-modal">
          <div className="pos-receipt-box">
            <h3>Joven Tire Enterprise</h3>
            <p><strong>Official Receipt</strong><br />Transaction ID: {activeReceipt.id}</p>
            <hr />
            <p><strong>Customer:</strong> {activeReceipt.customerName || "Walk-in"}</p>
            <p><strong>Cashier:</strong> {activeReceipt.createdByName} ({activeReceipt.createdByRole})</p>
            <hr />

            {activeReceipt.items?.map((i, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>{i.name || i.productName} x{ i.qty || i.quantity || 1 }</div>
                <div>₱{(i.price * (i.qty || i.quantity || 1)).toFixed(2)}</div>
              </div>
            ))}

            <hr />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>Subtotal</div>
              <div>₱{Number(activeReceipt.subtotal || 0).toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>VAT (12%)</div>
              <div>₱{Number(activeReceipt.vat || 0).toFixed(2)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <div>Total</div>
              <div>₱{Number(activeReceipt.totalAmount || 0).toFixed(2)}</div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button className="btn-submit" onClick={handlePrintReceipt}>Print</button>
              <button className="btn-cancel" onClick={closeReceipt}>Close</button>
            </div>

            <div style={{ marginTop: 12, textAlign: "center", fontSize: 13 }}>Thank you for your purchase!</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
