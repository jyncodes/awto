import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import "../../styles/shared/Sales.css";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const Sales = ({ role }) => {
  const [tab, setTab] = useState("all");
  const [salesLog, setSalesLog] = useState([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const navigate = useNavigate();

  // Load sales data
  useEffect(() => {
    const salesRef = collection(db, "sales");
    const unsubSales = onSnapshot(salesRef, (snapshot) => {
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sorted = logs.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      setSalesLog(sorted);
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
              filteredSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    {sale.createdAt?.toDate?.().toLocaleDateString() || "N/A"}
                  </td>
                  <td>{sale.customerName || "Walk-in"}</td>
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
                  {/* ✅ Shows correct Admin/Staff info */}
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
                  </td>
                </tr>
              ))
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
                <div><strong>Customer:</strong></div>
                <div>{activeReceipt.customerName || "Walk-in"}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><strong>Date:</strong></div>
                <div>
                  {activeReceipt.createdAt?.toDate?.().toLocaleString() || ""}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div><strong>Cashier:</strong></div>
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
