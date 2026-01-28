import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";  

import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import "../../styles/shared/Reservations.css";

const Reservations = ({ role }) => {
  const navigate = useNavigate();
  const normalizedRole = (role || "").toLowerCase();

  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState({});
  const [activeTab, setActiveTab] = useState("Scheduled");
  const [viewModal, setViewModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // Number of rows per page


  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);


  /* ===============================
     DATE HELPERS (SAFE)
  =============================== */
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const toDate = (d) => {
    const raw = d?.seconds ? new Date(d.seconds * 1000) : new Date(d);
    return new Date(raw.getFullYear(), raw.getMonth(), raw.getDate());
  };

  /* ===============================
     STATUS NORMALIZER (IMPORTANT)
  =============================== */
  const normalizeStatus = (status) => {
    if (!status) return "Approved";
    if (status === "Awaiting Downpayment") return "Approved";
    if (status === "Awaiting Approval") return "Approved";
    return status;
  };

  /* ===============================
     LOAD RESERVATIONS (READ ONLY)
  =============================== */
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservations"), async (snap) => {
      const list = snap.docs.map((d) => d.data());
      setReservations(list);

      // LOAD CUSTOMER INFO
      const uidSet = [...new Set(list.map((r) => r.userId).filter(Boolean))];
      const map = {};

      for (const uid of uidSet) {
        const q = query(collection(db, "customers"), where("uid", "==", uid));
        const snap = await getDocs(q);

        if (!snap.empty) {
          map[uid] = snap.docs[0].data();
        } else {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) map[uid] = userSnap.data();
        }
      }

      setCustomers(map);
    });

    return () => unsub();
  }, []);

  /* ===============================
     TAB FILTERING (CORRECT LOGIC)
  =============================== */
const filtered = reservations.filter((r) => {
  const date = toDate(r.preferredDate);
  const status = normalizeStatus(r.status);

  

  if (activeTab === "Scheduled")
    return status === "Approved" && date > todayStart;

  if (activeTab === "Today’s Appointments")
    return status === "Approved" && date.getTime() === todayStart.getTime();

  if (activeTab === "In Progress") return status === "In-Service";

  if (activeTab === "Completed Services") return status === "Completed";

  if (activeTab === "Missed Appointments")
    return status !== "Completed" && date < todayStart;

  return true;
});

// Reset pagination when tab or filtered data changes
useEffect(() => {
  setCurrentPage(1);
}, [activeTab, filtered.length]);


// =======================
// Pagination Logic
// =======================
const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
const totalPages = Math.ceil(filtered.length / itemsPerPage);




  /* ===============================
     ACTIONS
  =============================== */
  const proceedToService = async (res) => {
    await updateDoc(doc(db, "reservations", res.id), {
      status: "In-Service",
    });
  };

      const openCompletedReceipt = async (reservation) => {
  if (!reservation.salesId) {
    alert("No receipt linked to this reservation.");
    return;
  }

  const saleSnap = await getDoc(doc(db, "sales", reservation.salesId));

  if (!saleSnap.exists()) {
    alert("Receipt not found.");
    return;
  }

  setActiveReceipt({ id: saleSnap.id, ...saleSnap.data() });
  setReceiptOpen(true);
};

const goToPOS = (res) => {
  const cust = customers[res.userId] || {};

  // Prevent double payment
  if (res.status === "Completed") {
    alert("This reservation is already paid.");
    return;
  }

  
  // 🔥 Build items for POS
  let reservedItems = [];

    if (res.type === "service") {
    reservedItems = res.selectedServices.map((s) => ({
      id: s.id,
      name: s.name,
      price: s.price,
      qty: 1,
      type: "service",
    }));
  } else if (res.type === "multiple-products") {
    reservedItems = res.items;
  } else {
    // single product
    reservedItems = [
      {
        id: res.productId,
        name: res.productName,
        price: res.price,
        qty: res.quantity,
        type: "product",
      },
    ];
  }

  navigate(
    normalizedRole === "admin" ? "/admin-pos" : "/staff-pos",
    {
      state: {
        fromReservation: true,
        reservationId: res.id,
      customer: {
        customerCode: cust.customerCode || "",
        name: cust.name || res.userName,
        contact: cust.contact || "",
        email: cust.email || res.userEmail,
        lastPlateNumber:
          cust.lastPlateNumber ||
          cust.plateNo ||
          res.plateNumber ||
          "",
        uid: res.userId,
      },

        // ✅ RAW DATA ONLY — NO MAPPING
        reservedItems,
      },
    }
  );
};


  /* ===============================
     UI
  =============================== */
  return (
    <>
      <div className="reservations-container">
        <h1>📅 Reservations</h1>

        <div className="reservation-filter">
          <label>Status:</label>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            <option value="Scheduled">Scheduled</option>
            <option value="Today’s Appointments">Today’s Appointments</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed Services">Completed Services</option>
            <option value="Missed Appointments">Missed Appointments</option>
          </select>
        </div>


        <table className="reservation-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Plate Number</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          

          <tbody>
            {currentItems.length ? (
              currentItems.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{customers[r.userId]?.name || "—"}</td>
                  <td>{r.plateNumber || "—"}</td>
                  <td>{toDate(r.preferredDate).toLocaleDateString()}</td>

                  <td className="actions">
                    <button
                      className="view-btn"
                      onClick={() =>
                        normalizeStatus(r.status) === "Completed"
                          ? openCompletedReceipt(r)
                          : setViewModal(r)
                      }
                    >
                      👁 View
                    </button>

                    {activeTab === "Today’s Appointments" && (
                      <button
                        className="proceed-btn"
                        onClick={() => proceedToService(r)}
                      >
                        ▶ Proceed
                      </button>
                    )}

                    {activeTab === "In Progress" && (
                      <button className="pay-btn" onClick={() => goToPOS(r)}>
                        💳 Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center">
                  No reservations
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

{viewModal &&
  createPortal(
    <div className="modal-overlay" onClick={() => setViewModal(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Reservation Details</h2>
        <p><strong>Reservation ID:</strong> {viewModal.id}</p>
        <p><strong>Customer Name:</strong> {viewModal.userName}</p>
        <p><strong>Email:</strong> {viewModal.userEmail}</p>
        <p><strong>Plate Number:</strong> {viewModal.plateNumber}</p>
        <p><strong>Vehicle:</strong> {viewModal.vehicleBrand} {viewModal.vehicleModel} ({viewModal.vehicleYear})</p>
        <p><strong>Product:</strong> {viewModal.productName}</p>
        <p><strong>Quantity:</strong> {viewModal.quantity}</p>
        <p><strong>Total Price:</strong> ₱{viewModal.totalPrice}</p>
        <p><strong>Payment Method:</strong> {viewModal.paymentMethod}</p>
        <p><strong>Transaction ID:</strong> {viewModal.transactionId}</p>
        <p><strong>Status:</strong> {viewModal.status}</p>
        <p><strong>Preferred Date:</strong> {toDate(viewModal.preferredDate).toLocaleString()}</p>

        {viewModal.note && (
          <p><strong>Note:</strong> {viewModal.note}</p>
        )}

        <button onClick={() => setViewModal(null)}>Close</button>
      </div>
    </div>,
    document.getElementById("modal-root")
  )
}


      <div className="pagination-wrapper">
        <p className="pagination-info">
          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filtered.length)} of {filtered.length} results
        </p>

        <div className="pagination-buttons">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, index) => {
            const page = index + 1;
            return (
              <button
                key={page}
                className={page === currentPage ? "active-page" : ""}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>





      {receiptOpen && activeReceipt && (() => {
  let productTotal = 0;
  let serviceTotal = 0;

  activeReceipt.items?.forEach(item => {
    if (item.type === "service") serviceTotal += item.price * item.qty;
    else productTotal += item.price * item.qty;
  });

  const productVat = productTotal - (productTotal / 1.12);
  const serviceVat = serviceTotal - (serviceTotal / 1.12);

  const isPwd =
    activeReceipt.customerType === "PWD" ||
    activeReceipt.customerType === "Senior";

  const removedVat = isPwd ? serviceVat : 0;
  const serviceBase = isPwd ? serviceTotal / 1.12 : serviceTotal;
  const pwdDiscountCalc = isPwd ? serviceBase * 0.20 : 0;

  return (
    <div className="pos-receipt-modal">
      <div className="pos-receipt-box">
        <h3>Joven Tire Enterprise</h3>
        <p><strong>Receipt #:</strong> {activeReceipt.salesId}</p>
        <p><strong>Customer:</strong> {activeReceipt.customer?.name}</p>
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

        <h3>Total: ₱{activeReceipt.totalAmount.toFixed(2)}</h3>

        <p>Paid via: {activeReceipt.paymentMode}</p>

        {activeReceipt.paymentMode === "Cash" && (
          <p>
            Change: ₱
            {Math.max(
              (activeReceipt.cashReceived || 0) - activeReceipt.totalAmount,
              0
            ).toFixed(2)}
          </p>
        )}

        <div className="pos-receipt-actions no-print">
          <button className="btn-cancel" onClick={() => setReceiptOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
})()}


    </>
  );
};

export default Reservations;
