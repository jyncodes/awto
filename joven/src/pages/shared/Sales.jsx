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

const ITEMS_PER_PAGE = 20;

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

      const sorted = logs.sort(
        (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );

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
        if (!sale.createdAt?.toDate) return false;
        const formatted = sale.createdAt.toDate().toISOString().split("T")[0];
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

      <p style={{ marginBottom: "10px", fontWeight: 600 }}>
        Showing {paginatedData.length} of {filteredList.length} results
      </p>

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
                <td colSpan="6" style={{ textAlign: "center" }}>
                  No sales found.
                </td>
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
                      {sale.createdAt?.toDate
                        ? sale.createdAt.toDate().toLocaleDateString()
                        : "—"}
                    </td>
                    <td>₱{(sale.totalAmount || 0).toFixed(2)}</td>
                    <td style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
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

      {/* SIMPLE PAGINATION */}
      {filteredList.length > ITEMS_PER_PAGE && (
        <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
          <button
            disabled={page === 1}
            className="btn-cancel"
            onClick={() => setPage(page - 1)}
          >
            Prev
          </button>

          <button
            disabled={page * ITEMS_PER_PAGE >= filteredList.length}
            className="btn-submit"
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

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

          <p>Subtotal: ₱{(activeReceipt.subtotal || 0).toFixed(2)}</p>
          <p>Product Price: ₱{((activeReceipt.subtotal || 0) - (activeReceipt.vat || 0)).toFixed(2)}</p>

          {/* VAT logic */}
          {activeReceipt.customerType === "Regular" && (
            <p>VAT (12%): ₱{(activeReceipt.vat || 0).toFixed(2)}</p>
          )}

          {(activeReceipt.customerType === "PWD" || activeReceipt.customerType === "Senior") && (
            <>
              <p>VAT Included in Price: ₱{(activeReceipt.vat || 0).toFixed(2)}</p>
              <p>VAT Exempted: -₱{(activeReceipt.vat || 0).toFixed(2)}</p>
              {activeReceipt.pwdDiscount > 0 && (
                <p>PWD/Senior Discount (20%): -₱{activeReceipt.pwdDiscount.toFixed(2)}</p>
              )}
            </>
          )}

          {/* Negotiated Discount */}
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
      )}
    </div>
  );
};

export default Sales;
