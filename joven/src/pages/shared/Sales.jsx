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

const ITEMS_PER_PAGE = 10;

const Sales = () => {
  const [role, setRole] = useState(null);
  const [salesLog, setSalesLog] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [page, setPage] = useState(1);

  const receiptRef = useRef();
  const navigate = useNavigate();

  // Load role
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

      const sorted = logs.sort((a, b) => {
        const numA = Number(a.salesId?.replace("SA-", "") || 0);
        const numB = Number(b.salesId?.replace("SA-", "") || 0);
        return numB - numA; // Newest first
      });

      setSalesLog(sorted);
      setFilteredList(sorted);
    });

    return () => unsub();
  }, []);

  // Search Filter
  useEffect(() => {
    let list = [...salesLog];

    if (searchTerm.trim() !== "") {
      list = list.filter((sale) =>
        `${sale.customer?.name || ""} ${sale.salesId || ""}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      );
    }

    if (searchDate !== "") {
      list = list.filter((sale) => {
        if (!sale.completedAt?.toDate) return false;
        const formatted = sale.completedAt.toDate().toISOString().split("T")[0];
        return formatted === searchDate;
      });
    }

    setFilteredList(list);
    setPage(1);
  }, [searchTerm, searchDate, salesLog]);

  // Pagination slice
  const paginatedData = filteredList.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

    const startIndex = (page - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(page * ITEMS_PER_PAGE, filteredList.length);

  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);


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

  const handleDeleteSale = async (sale) => {
    if (role !== "Admin") return alert("Only Admin can delete sales records.");

    if (!window.confirm(
      `Delete sale?\nCustomer: ${sale.customer?.name || "Walk-in"}\nTotal: ₱${sale.totalAmount.toFixed(2)}`
    )) return;

    try {
      await deleteDoc(doc(db, "sales", sale.id));
      alert("Sale deleted successfully.");
    } catch (error) {
      alert("Failed to delete sale.");
    }
  };

  const goToPOS = () => {
    if (!role) return alert("Loading role... try again.");
    role === "Admin" ? navigate("/admin-pos") : navigate("/staff-pos");
  };

  return (
    <div className="sales-page-container">
      <div className="sales-header">
        <h1>Sales Records</h1>
        <button className="add-sale-btn" onClick={goToPOS}>
          <FaPlus className="btn-icon" /> Add Sale
        </button>
      </div>

      {/* SEARCH FILTERS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <input
          type="text"
          placeholder="Search by Name or Sales ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field"
          style={{ maxWidth: "260px" }}
        />
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
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center" }}>No sales found.</td>
              </tr>
            ) : (
              paginatedData.map((sale) => {
                const customer = sale.customer || {};
                return (
                  <tr key={sale.id}>
                    <td>{sale.salesId}</td>
                    <td>{customer.name || "Walk-in"}</td>
                    <td>{customer.plateNo || "—"}</td>
                    <td>
                      {sale.completedAt?.toDate
                        ? sale.completedAt.toDate().toLocaleString("en-PH", {
                            timeZone: "Asia/Manila",
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })
                        : "—"}
                    </td>
                    <td>₱{(sale.totalAmount || 0).toFixed(2)}</td>
                    <td style={{ textAlign: "center" }}>
                      <button className="view-receipt-btn" onClick={() => openReceipt(sale)}>
                        Receipt
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
  <div
    style={{
      marginTop: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    }}
  >

    {/* LEFT SIDE — Showing X to X of X results */}
    <span style={{ fontSize: "14px" }}>
      Showing {startIndex} to {endIndex} of {filteredList.length} results
    </span>

    {/* RIGHT SIDE — PAGE BUTTONS */}
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>

      {/* PREVIOUS */}
      <button
        disabled={page === 1}
        className="btn-cancel"
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>

      {/* PAGE NUMBERS */}
      {[...Array(totalPages)].map((_, i) => (
        <button
          key={i}
          onClick={() => setPage(i + 1)}
          className="btn-page"
          style={{
            padding: "5px 10px",
            borderRadius: "6px",
            background: page === i + 1 ? "#333" : "#fff",
            color: page === i + 1 ? "#fff" : "#333",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          {i + 1}
        </button>
      ))}

      {/* NEXT */}
      <button
        disabled={page === totalPages}
        className="btn-submit"
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  </div>
)}


      {/* RECEIPT MODAL (UPDATED TO MATCH POS.jsx) */}
      {receiptOpen && activeReceipt && (() => {
        let productTotal = 0;
        let serviceTotal = 0;

        activeReceipt.items?.forEach(item => {
          if (item.type === "service") serviceTotal += item.price * item.qty;
          else productTotal += item.price * item.qty;
        });

        const productVat = productTotal - (productTotal / 1.12);
        const serviceVat = serviceTotal - (serviceTotal / 1.12);

        const isPwd = activeReceipt.customerType === "PWD" || activeReceipt.customerType === "Senior";
        const removedVat = isPwd ? serviceVat : 0;
        const serviceBase = isPwd ? serviceTotal / 1.12 : serviceTotal;
        const pwdDiscountCalc = isPwd ? serviceBase * 0.20 : 0;

        return (
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

              <p><strong>Products Total:</strong> ₱{productTotal.toFixed(2)}</p>
              <p><strong>Services Total:</strong> ₱{serviceTotal.toFixed(2)}</p>

              <p>VAT (Products): ₱{productVat.toFixed(2)}</p>
              <p>VAT (Services): ₱{serviceVat.toFixed(2)}</p>

              {isPwd && (
                <>
                  <p>Less VAT Removed (Service Only): -₱{removedVat.toFixed(2)}</p>
                  <p>PWD/Senior Discount (20% on service): -₱{pwdDiscountCalc.toFixed(2)}</p>
                </>
              )}

              {activeReceipt.negotiatedDiscount > 0 && (
                <p>Negotiated Discount: -₱{activeReceipt.negotiatedDiscount.toFixed(2)}</p>
              )}

              <h3>Total: ₱{activeReceipt.totalAmount?.toFixed(2)}</h3>

              <p>Paid via: {activeReceipt.paymentMode}</p>

              {activeReceipt.paymentMode !== "Cash" && (
                <p>Reference No: {activeReceipt.paymentRef || "N/A"}</p>
              )}

              {activeReceipt.paymentMode === "Cash" && (
                <p>Change: ₱{Math.max((activeReceipt.cashReceived || 0) - activeReceipt.totalAmount, 0).toFixed(2)}</p>
              )}

              <div className="pos-receipt-actions no-print">
                <button className="btn-submit" onClick={handlePrint}>Print</button>
                <button className="btn-cancel" onClick={closeReceipt}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Sales;
