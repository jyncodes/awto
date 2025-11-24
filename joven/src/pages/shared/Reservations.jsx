// src/pages/shared/Reservations.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  setDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import "../../styles/shared/Reservations.css";

const Reservations = ({ role }) => {
  const [reservations, setReservations] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [viewModal, setViewModal] = useState(null);
  const [productStocks, setProductStocks] = useState({});

  const normalizedRole = (role || "").toLowerCase();

  // LIVE STOCKS
  useEffect(() => {
    const stocks = {};

    const unsubTires = onSnapshot(collection(db, "products_tires"), (snap) => {
      snap.docs.forEach((docItem) => {
        const data = docItem.data();
        const key = data.model || data.productName || docItem.id;
        stocks[key] = data.stock || 0;
      });
      setProductStocks((prev) => ({ ...prev, ...stocks }));
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), (snap) => {
      snap.docs.forEach((docItem) => {
        const data = docItem.data();
        const key = data.model || data.productName || docItem.id;
        stocks[key] = data.stock || 0;
      });
      setProductStocks((prev) => ({ ...prev, ...stocks }));
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // LOAD RESERVATIONS + AUTO-DECLINE
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservations"), async (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReservations(list);

      const now = new Date();

      for (const r of list) {
        const date = r.preferredDate?.seconds
          ? new Date(r.preferredDate.seconds * 1000)
          : new Date(r.preferredDate);

        if (
          date < now &&
          (
            r.status === "Downpayment Pending" ||
            r.status === "Downpayment Paid" ||
            r.status === "Approved"
          ) &&
          r.status !== "Completed" &&
          r.status !== "Declined"
        ) {
          try {
            await updateDoc(doc(db, "reservations", r.id), {
              status: "Declined",
              declinedAt: serverTimestamp(),
              autoDeclined: true,
            });
          } catch (err) {
            console.error("Auto-decline failed for:", r.id, err);
          }
        }
      }

      // FETCH USER NAMES
      const userIds = [...new Set(list.map((r) => r.userId).filter(Boolean))];
      const nameMap = {};
      for (const uid of userIds) {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            nameMap[uid] = userDoc.data().name || "—";
          }
        } catch (err) {
          console.error("Failed to fetch user:", uid, err);
        }
      }
      setUserNames(nameMap);
    });

    return () => unsub();
  }, []);

  // STATUS CHANGE
  const handleStatusChange = async (id, newStatus) => {
    try {
      const reservationRef = doc(db, "reservations", id);
      const updateData = { status: newStatus };
      const reservation = reservations.find((r) => r.id === id);

      if (newStatus === "Approved") {
        updateData.approvedAt = serverTimestamp();
        if (reservation?.userId) {
          await addDoc(collection(db, "notifications"), {
            userId: reservation.userId,
            message: `Your reservation (${id}) has been approved.`,
            type: "reservation",
            createdAt: Timestamp.now(),
            isRead: false,
          });
        }
      }

      if (newStatus === "Completed") {
        // ⭐ CHANGED price → retail
        await addDoc(collection(db, "sales"), {
          reservationId: id,
          customerName:
            userNames[reservation?.userId] ||
            reservation?.customerName ||
            reservation?.userName ||
            "Unknown",
          items: [
            {
              productName: reservation?.productName || "Unknown Product",
              brand: reservation?.brand || "",
              model: reservation?.model || "",
              type: reservation?.type || "",
              price: reservation?.retail || 0,      // ⭐ UPDATED
              qty: 1,
            },
          ],
          totalAmount: reservation?.retail || 0,     // ⭐ UPDATED
          paymentMode: reservation?.paymentMethod || "Reservation",
          type: "reservation",
          createdAt: Timestamp.now(),
          createdByName: role === "Admin" ? "System" : role,
          createdByRole: role,
          status: "completed",
        });
      }

      await updateDoc(reservationRef, updateData);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // DELETE RESERVATION
  const handleDelete = async (id) => {
    if (normalizedRole !== "admin") return;
    if (!window.confirm("Are you sure you want to delete this reservation?")) return;
    try {
      await deleteDoc(doc(db, "reservations", id));
      const resSnap = await getDocs(collection(db, "reservations"));
      if (resSnap.empty) {
        await setDoc(doc(db, "counters", "reservations"), { lastId: 0 });
      }
    } catch (error) {
      console.error("Error deleting reservation:", error);
    }
  };

  // FILTERS
  const now = new Date();
  const filteredByTab = reservations.filter((r) => {
    const date = r.preferredDate?.seconds
      ? new Date(r.preferredDate.seconds * 1000)
      : new Date(r.preferredDate);

    switch (activeTab) {
      case "Upcoming":
        return date >= now && r.status !== "Completed" && r.status !== "Declined";
      case "Approved":
        return r.status === "Approved";
      case "Declined":
        return r.status === "Declined";
      case "Completed":
        return r.status === "Completed";
      default:
        return true;
    }
  });

  const filtered = filteredByTab.filter((r) =>
    (r.productName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="reservations-container">
      <div className="reservations-header">
        <h1>📅 Reservations</h1>
        <input
          type="text"
          placeholder="Search by product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="reservation-search"
        />
      </div>

      {/* TABS */}
      <div className="reservation-tabs">
        {["All", "Upcoming", "Approved", "Declined", "Completed"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="reservation-table-wrapper">
        <table className="reservation-table">
          <thead>
            <tr>
              <th>Reservation ID</th>
              <th>Schedule Date</th>
              <th>Product</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((res) => {
                const date = res.preferredDate?.seconds
                  ? new Date(res.preferredDate.seconds * 1000)
                  : new Date(res.preferredDate || Date.now());
                const stock =
                  productStocks[res.model] ||
                  productStocks[res.productName] ||
                  "—";

                return (
                  <tr key={res.id}>
                    <td>{res.id}</td>
                    <td>{date.toLocaleDateString()}</td>
                    <td>{res.productName || "—"}</td>
                    <td>{stock}</td>

                    <td>
                      <select
                        className="status-dropdown"
                        value={res.status || "Downpayment Pending"}
                        onChange={(e) => handleStatusChange(res.id, e.target.value)}
                      >
                        <option value="Downpayment Pending">Downpayment Pending</option>
                        <option value="Downpayment Paid">Downpayment Paid</option>
                        <option value="Approved">Approved</option>
                        <option value="Declined">Declined</option>
                        <option value="Completed">Completed</option>
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
      </div>

      {/* VIEW MODAL */}
      {viewModal && (
        <div className="reservation-modal">
          <div className="modal-content">
            <h2>Reservation Details</h2>

            <p><strong>ID:</strong> {viewModal.id}</p>
            <p><strong>Product:</strong> {viewModal.productName}</p>
            <p><strong>Brand:</strong> {viewModal.brand}</p>
            <p><strong>Model:</strong> {viewModal.model}</p>

            {/* ⭐ UPDATED: price → retail */}
            <p><strong>Price:</strong> ₱{viewModal.retail}</p>

            <p>
              <strong>Stock:</strong>{" "}
              {productStocks[viewModal.model] ||
                productStocks[viewModal.productName] ||
                "—"}
            </p>

            <p><strong>Status:</strong> {viewModal.status}</p>
            <p><strong>Customer:</strong> {viewModal.userName}</p>
            <p>
              <strong>Schedule:</strong>{" "}
              {new Date(
                viewModal.preferredDate?.seconds
                  ? viewModal.preferredDate.seconds * 1000
                  : viewModal.preferredDate
              ).toLocaleString()}
            </p>

            <p><strong>Note:</strong> {viewModal.note || "—"}</p>

            <button className="close-btn" onClick={() => setViewModal(null)}>
              Close
            </button>

          </div>
        </div>
      )}
    </div>
  );
};

export default Reservations;
