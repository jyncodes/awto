import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";
import "../../styles/shared/Sales.css";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Sales = ({ role }) => {
  const [tab, setTab] = useState("all");
  const [salesLog, setSalesLog] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [reservationNames, setReservationNames] = useState({}); // 🔹 Store reservation-based names
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const navigate = useNavigate();

  // 🔹 Load sales data, user names, and reservation names
  useEffect(() => {
    const salesRef = collection(db, "sales");
    const unsubSales = onSnapshot(salesRef, async (snapshot) => {
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sorted = logs.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setSalesLog(sorted);

      // Fetch all related user names
      const userIds = [...new Set(logs.map((s) => s.userId).filter(Boolean))];
      const nameMap = {};
      for (const uid of userIds) {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            nameMap[uid] = userDoc.data().name || "—";
          }
        } catch (err) {
          console.error("Error fetching user name for:", uid, err);
        }
      }
      setUserNames(nameMap);

      // 🔹 Fetch related reservation customer names
      const reservationIds = [
        ...new Set(
          logs
            .filter((s) => s.type === "reservation" && s.reservationId)
            .map((s) => s.reservationId)
        ),
      ];

      const resNameMap = {};
      for (const rid of reservationIds) {
        try {
          const resDoc = await getDoc(doc(db, "reservations", rid));
          if (resDoc.exists()) {
            const data = resDoc.data();
            resNameMap[rid] =
              data.userName ||
              data.customerName ||
              (data.userId && userNames[data.userId]) ||
              "—";
          }
        } catch (err) {
          console.error("Error fetching reservation name for:", rid, err);
        }
      }
      setReservationNames(resNameMap);
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

  // ✅ Admin-only Delete Function
  const handleDeleteSale = async (saleId, customer, total) => {
    if (role !== "admin") {
      alert("You do not have permission to delete sales records.");
      return;
    }
    const confirmDelete = window.confirm(
      `🗑️ Are you sure you want to delete this sale?\n\nCustomer: ${
        customer || "Walk-in"
      }\nTotal: ₱${Number(total || 0).toFixed(2)}`
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

  // 🔍 Filter by tab
  const filteredSales =
    tab === "all"
      ? salesLog
      : tab === "in-store"
      ? salesLog.filter((s) => s.type === "in-store")
      : salesLog.filter((s) => s.type === "reservation");

  return (
    <div className="sales-page-container">
      <div className="sales-header">
        <h1>Sales Transactions</h1>
        <button className="add-sale-btn" onClick={() => navigate("/pos")}>
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

      {/* Sales Table */}
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
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center" }}>
                  No sales record.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => {
                // ✅ Customer name logic
                let customerName = "Walk-in";
                if (sale.type === "reservation" && sale.reservationId) {
                  customerName =
                    reservationNames[sale.reservationId] ||
                    sale.customerName ||
                    "—";
                } else {
                  customerName =
                    userNames[sale.userId] ||
                    sale.customerName ||
                    "Walk-in";
                }

                return (
                  <tr key={sale.id}>
                    <td>
                      {sale.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                    </td>
                    {/* ✅ Customer from Reservation or User */}
                    <td>{customerName}</td>
                    <td>
                      {sale.products?.map((p, i) => (
                        <div key={i}>
                          {p.productName} x{p.quantity}
                        </div>
                      ))}
                    </td>
                    <td>₱{Number(sale.totalAmount || 0).toFixed(2)}</td>
                    <td>{sale.paymentMode}</td>
                    <td>{sale.type}</td>
                    <td>
                      {sale.createdByName
                        ? `${sale.createdByName} (${sale.createdByRole})`
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="view-receipt-btn"
                        onClick={() => openReceipt(sale)}
                      >
                        Receipt
                      </button>
                      {role === "admin" && (
                        <button
                          className="delete-sale-btn"
                          onClick={() =>
                            handleDeleteSale(
                              sale.id,
                              customerName,
                              sale.totalAmount
                            )
                          }
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {receiptOpen && activeReceipt && (
        <div className="receipt-modal" role="dialog" aria-modal="true">
          <div className="receipt-box">
            <div className="receipt-header">
              <h3>Joven Tire Enterprise</h3>
              <p>Official Receipt</p>
              <small>{activeReceipt.id}</small>
            </div>

            <div className="receipt-body">
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>Customer:</strong>
                </div>
                <div>
                  {activeReceipt.type === "reservation" &&
                  activeReceipt.reservationId
                    ? reservationNames[activeReceipt.reservationId] ||
                      activeReceipt.customerName ||
                      "—"
                    : userNames[activeReceipt.userId] ||
                      activeReceipt.customerName ||
                      "Walk-in"}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>Date:</strong>
                </div>
                <div>
                  {activeReceipt.createdAt?.toDate?.().toLocaleString() || ""}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>Cashier:</strong>
                </div>
                <div>
                  {activeReceipt.createdByName} ({activeReceipt.createdByRole})
                </div>
              </div>

              <hr />
              {activeReceipt.products?.map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                  }}
                >
                  <div>
                    {item.productName} x{item.quantity}
                  </div>
                  <div>₱{item.lineTotal.toFixed(2)}</div>
                </div>
              ))}
              <hr />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Subtotal</div>
                <div>₱{activeReceipt.subtotal.toFixed(2)}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>VAT (12%)</div>
                <div>₱{activeReceipt.vat.toFixed(2)}</div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                }}
              >
                <div>Total</div>
                <div>₱{activeReceipt.totalAmount.toFixed(2)}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>Payment</div>
                <div>{activeReceipt.paymentMode}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn-submit" onClick={handlePrintReceipt}>
                Print
              </button>
              <button className="close-receipt-btn" onClick={closeReceipt}>
                Close
              </button>
            </div>
            <div className="receipt-footer">Thank you for your purchase!</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
