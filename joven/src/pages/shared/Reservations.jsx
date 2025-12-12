// src/pages/shared/Reservations.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "../../styles/shared/Reservations.css";

const Reservations = ({ role }) => {
  const [reservations, setReservations] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [viewModal, setViewModal] = useState(null);
  const [sortType, setSortType] = useState("date-desc");

  const navigate = useNavigate();
  const normalizedRole = (role || "").toLowerCase();

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // ================================
  // LOAD RESERVATIONS + AUTO NO-SHOW
  // ================================
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservations"), async (snapshot) => {
      const now = new Date();

      const list = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      // AUTO UPDATE → NO-SHOW
      for (const r of list) {
        const date = r.preferredDate?.seconds
          ? new Date(r.preferredDate.seconds * 1000)
          : new Date(r.preferredDate);

        const isPast = date < now;
        const needsMark =
          isPast &&
          ["Awaiting Approval", "Approved", "Confirmed"].includes(r.status) &&
          r.status !== "Completed";

        if (needsMark) {
          await updateDoc(doc(db, "reservations", r.id), {
            status: "No-Show",
            markedNoShow: serverTimestamp(),
          });
        }
      }

      setReservations(list);

      // LOAD CUSTOMER DATA
      const userIds = [...new Set(list.map((r) => r.userId).filter(Boolean))];
      const nameMap = {};

      for (const uid of userIds) {
        try {
          const qCust = query(
            collection(db, "customers"),
            where("uid", "==", uid)
          );
          const custSnap = await getDocs(qCust);

          if (!custSnap.empty) {
            const data = custSnap.docs[0].data();
            nameMap[uid] = {
              name: data.name || "—",
              customerCode: data.customerCode || "",
              plateNo: data.lastPlateNumber || "",
              phone: data.contact || "",
              address: data.address || "",
              birthday: data.birthday || "",
              email: data.email || "",
              uid: uid,
            };
            continue;
          }

          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            nameMap[uid] = {
              name: data.name || "—",
              customerCode: "",
              plateNo: "",
              phone: data.contact || "",
              email: data.email || "",
              uid: uid,
            };
          }
        } catch (err) {
          console.error("Customer loading error:", err);
        }
      }

      setUserNames(nameMap);
    });

    return () => unsub();
  }, []);

  // ============================================
  // UPDATE STATUS — SEND TO POS WHEN COMPLETED
  // ============================================
  const handleStatusChange = async (id, newStatus) => {
    try {
      const reservation = reservations.find((r) => r.id === id);

      if (newStatus === "Completed") {
        const isAdmin = normalizedRole === "admin";
        const cust = userNames[reservation.userId] || {};

        navigate(isAdmin ? "/admin-pos" : "/staff-pos", {
          state: {
            fromReservation: true,
            reservationId: id,
            reservedItems: [
              {
                name: reservation.productName || "",
                brand: reservation.brand || "",
                model: reservation.model || "",
                price: reservation.price || reservation.retail || 0,
                qty: reservation.quantity || 1,
                type: "product",
                firestoreId: reservation.productId || reservation.firestoreId || "",
                stock: 1,
              },
            ],
            customer: {
              name: cust.name || reservation.userName || "Customer",
              customerCode: cust.customerCode || "",
              uid: cust.uid || reservation.userId,
              phone: cust.phone || "",
              email: cust.email || reservation.userEmail || "",
              plateNo: reservation.plateNumber || cust.plateNo || "",
              address: cust.address || "",
              birthday: cust.birthday || "",
            },
          },
        });

        return;
      }

      await updateDoc(doc(db, "reservations", id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (normalizedRole !== "admin") return;
    if (!window.confirm("Delete this reservation?")) return;

    try {
      await deleteDoc(doc(db, "reservations", id));
      const resList = await getDocs(collection(db, "reservations"));
      if (resList.empty) {
        await setDoc(doc(db, "counters", "reservations"), { lastId: 0 });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // FILTER TAB
  const filteredByTab = reservations.filter((r) => {
    const status = (r.status || "").toLowerCase();

    if (activeTab === "Pending") return status === "awaiting approval";
    if (activeTab === "Approved") return status === "approved";
    if (activeTab === "Completed") return status === "completed";
    if (activeTab === "No-Show") return status === "no-show";

    return true;
  });

  // SEARCH
  let filtered = filteredByTab.filter((r) =>
    (userNames[r.userId]?.name || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // SORT
  filtered = filtered.sort((a, b) => {
    const dateA = new Date(a.preferredDate?.seconds * 1000 || a.preferredDate);
    const dateB = new Date(b.preferredDate?.seconds * 1000 || b.preferredDate);

    const nameA = (userNames[a.userId]?.name || "").toLowerCase();
    const nameB = (userNames[b.userId]?.name || "").toLowerCase();

    switch (sortType) {
      case "date-asc":
        return dateA - dateB;
      case "date-desc":
        return dateB - dateA;
      case "name-asc":
        return nameA.localeCompare(nameB);
      case "name-desc":
        return nameB.localeCompare(nameA);
      default:
        return 0;
    }
  });

  const paginated = (data) => {
    const total = data.length;
    const start = (page - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, total);
    const totalPages = Math.ceil(total / itemsPerPage);

    return {
      data: data.slice(start, end),
      start: start + 1,
      end,
      total,
      totalPages,
    };
  };

  const pageData = paginated(filtered);

  return (
    <>
      {/* PAGE CONTENT */}
      <div className="reservations-container">
        <div className="reservations-header">
          <h1>📅 Reservations</h1>

          <div className="reservation-controls">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value)}
              className="sort-dropdown"
            >
              <option value="date-desc">Sort: Date ↓</option>
              <option value="date-asc">Sort: Date ↑</option>
              <option value="name-asc">Sort: Name A–Z</option>
              <option value="name-desc">Sort: Name Z–A</option>
            </select>
          </div>
        </div>

        {/* TABS */}
        <div className="reservation-tabs">
          {["All", "Pending", "Approved", "Completed", "No-Show"].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="reservation-table-wrapper">
          <table className="reservation-table">
            <thead>
              <tr>
                <th>Reservation ID</th>
                <th>Customer</th>
                <th>Plate Number</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length ? (
                pageData.data.map((res) => {
                  const date = new Date(
                    res.preferredDate?.seconds * 1000 || res.preferredDate
                  );

                  return (
                    <tr key={res.id}>
                      <td>{res.id}</td>
                      <td>{userNames[res.userId]?.name || "—"}</td>
                      <td>{res.plateNumber || "—"}</td>
                      <td>{date.toLocaleDateString()}</td>

                      <td>
                        <select
                          value={res.status || "Awaiting Approval"}
                          className="status-dropdown"
                          onChange={(e) =>
                            handleStatusChange(res.id, e.target.value)
                          }
                        >
                          <option value="Awaiting Approval">
                            Awaiting Approval
                          </option>
                          <option value="Approved">Approved</option>
                          <option value="Completed">Completed</option>
                          <option value="No-Show">No-Show</option>
                        </select>
                      </td>

                      <td>
                        <button
                          className="view-btn"
                          onClick={() => setViewModal(res)}
                        >
                          👁 View
                        </button>

                        {normalizedRole === "admin" && (
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(res.id)}
                          >
                            🗑 Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">
                    No reservations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* PAGINATION */}
          {pageData.total > 0 && (
            <div className="pagination">
              <p className="pagination-info">
                Showing {pageData.start} to {pageData.end} of {pageData.total}{" "}
                results
              </p>

              <div className="pagination-buttons">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>

                {[...Array(pageData.totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    className={page === i + 1 ? "active-page" : ""}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={page === pageData.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================= */}
      {/*       VIEW MODAL — OUTSIDE        */}
      {/* ================================= */}
      {viewModal && (
        <div className="reservation-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reservation Details</h2>
              <button className="close-x" onClick={() => setViewModal(null)}>
                ×
              </button>
            </div>

            <p>
              <strong>ID:</strong> {viewModal.id}
            </p>
            <p>
              <strong>Customer:</strong>{" "}
              {userNames[viewModal.userId]?.name || "—"}
            </p>
            <p>
              <strong>Plate Number:</strong> {viewModal.plateNumber || "—"}
            </p>

            <p>
              <strong>Scheduled Date:</strong>{" "}
              {new Date(
                viewModal.preferredDate?.seconds * 1000 ||
                  viewModal.preferredDate
              ).toLocaleString()}
            </p>

            <p>
              <strong>Status:</strong> {viewModal.status}
            </p>

            <hr />

            {/* PRODUCT DETAILS */}
            {viewModal.productId && (
              <div>
                <h3>🛞 Product Reserved</h3>
                <p>
                  <strong>Product:</strong> {viewModal.productName}
                </p>
                <p>
                  <strong>Brand:</strong> {viewModal.brand || "—"}
                </p>
                <p>
                  <strong>Model:</strong> {viewModal.model || "—"}
                </p>
                <p>
                  <strong>Quantity:</strong> {viewModal.quantity}
                </p>
                <p>
                  <strong>Price:</strong> ₱
                  {viewModal.price?.toLocaleString()}
                </p>
                <p>
                  <strong>Total Price:</strong> ₱
                  {viewModal.totalPrice?.toLocaleString()}
                </p>
              </div>
            )}

            {/* SERVICE DETAILS */}
            {viewModal.type === "service" && (
              <div>
                <h3>🛠 Selected Services</h3>

                {viewModal.selectedServices?.map((svc, idx) => (
                  <p key={idx}>
                    <strong>{svc.name}</strong> — ₱
                    {svc.price.toLocaleString()}
                  </p>
                ))}

                <p>
                  <strong>Total Service Price:</strong> ₱
                  {viewModal.totalServicePrice?.toLocaleString()}
                </p>
              </div>
            )}

            <hr />

            <p>
              <strong>Payment Method:</strong>{" "}
              {viewModal.paymentMethod || "—"}
            </p>
            <p>
              <strong>Transaction ID:</strong>{" "}
              {viewModal.transactionId || "—"}
            </p>

            <p>
              <strong>Notes:</strong> {viewModal.note || "None"}
            </p>

            <button className="close-btn" onClick={() => setViewModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Reservations;
