import React, { useState, useEffect, useRef } from "react";
import { db, auth } from "../../firebase";
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

const Sales = () => {
  const [role, setRole] = useState(null);
  const [salesLog, setSalesLog] = useState([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const receiptRef = useRef();
  const navigate = useNavigate();

  // ---- FIX: Always load role from database ----
  useEffect(() => {
    const fetchRole = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setRole(snap.data().role);
    };

    fetchRole();
  }, []);

  // Load sales live
  useEffect(() => {
    const salesRef = collection(db, "sales");
    const unsub = onSnapshot(salesRef, (snapshot) => {
      const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      setSalesLog(
        logs.sort(
          (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        )
      );
    });

    return () => unsub();
  }, []);

  const openReceipt = (sale) => {
    setActiveReceipt(sale);
    setReceiptOpen(true);
  };

  const closeReceipt = () => {
    setReceiptOpen(false);
    setActiveReceipt(null);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=600,height=700");
    printWindow.document.write(receiptRef.current.innerHTML);
    printWindow.document.close();
    printWindow.print();
  };

  // Delete sale
  const handleDeleteSale = async (sale) => {
    if (role !== "Admin") {
      alert("Only Admin can delete sales records.");
      return;
    }

    if (
      !window.confirm(
        `Delete sale?\nCustomer: ${sale.customer?.name || "Walk-in"}
Total: ₱${sale.totalAmount.toFixed(2)}`
      )
    )
      return;

    try {
      await deleteDoc(doc(db, "sales", sale.id));
      alert("Sale deleted successfully.");
    } catch (error) {
      console.error(error);
      alert("Failed to delete sale.");
    }
  };

  // ---- FIXED Add Sale Navigation ----
  const goToPOS = () => {
    if (!role) return alert("Loading role... try again.");

    if (role === "Admin") {
      navigate("/admin-pos");
    } else if (role === "Staff") {
      navigate("/staff-pos");
    } else {
      alert(`Invalid role detected: ${role}. Contact admin.`);
    }
  };

  return (
    <div className="sales-page-container">
      <div className="sales-header">
        <h1>Sales Records</h1>
        <button className="add-sale-btn" onClick={goToPOS}>
          <FaPlus className="btn-icon" /> Add Sale
        </button>
      </div>

      <div className="sales-table-container">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Sales ID</th>
              <th>Customer Name</th>
              <th>Plate Number</th>
              <th>Date</th>
              <th>Total</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {salesLog.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No sales found.
                </td>
              </tr>
            ) : (
              salesLog.map((sale) => {
                const customer = sale.customer || {};
                return (
                  <tr key={sale.id}>
                    <td>{sale.salesId}</td>
                    <td>{customer.name || "Walk-in"}</td>
                    <td>{customer.plateNo || "—"}</td>
                    <td>
                      {sale.createdAt?.toDate
                        ? sale.createdAt.toDate().toLocaleDateString()
                        : "—"}
                    </td>
                    <td>₱{(sale.totalAmount || 0).toFixed(2)}</td>

                    <td style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                      <button className="view-receipt-btn" onClick={() => openReceipt(sale)}>
                        Receipt
                      </button>

                      {role === "Admin" && (
                        <button className="delete-sale-btn" onClick={() => handleDeleteSale(sale)}>
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
        <div className="pos-receipt-modal">
          <div ref={receiptRef} className="pos-receipt-box">
            <h3>Joven Tire Enterprise</h3>
            <p><strong>Receipt #:</strong> {activeReceipt.salesId}</p>
            <p><strong>Customer:</strong> {activeReceipt.customer?.name || "Walk-in"}</p>
            <p><strong>Plate:</strong> {activeReceipt.customer?.plateNo || "—"}</p>
            <hr />

            {activeReceipt.items?.map((i, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{i.name} x{i.qty}</span>
                <span>₱{(i.price * i.qty).toFixed(2)}</span>
              </div>
            ))}

            <hr />
            <h3>Total: ₱{activeReceipt.totalAmount.toFixed(2)}</h3>

            <div className="pos-receipt-actions no-print">
              <button className="btn-submit" onClick={handlePrint}>Print</button>
              <button className="btn-cancel" onClick={closeReceipt}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
