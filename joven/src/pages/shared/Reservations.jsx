// 📄 src/pages/shared/Reservations.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selected, setSelected] = useState([]);

  const normalizedRole = (role || "").toLowerCase();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reservations"), (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReservations(list);
    });
    return () => unsub();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const reservationRef = doc(db, "reservations", id);
      const updateData = { status: newStatus };
      const reservation = reservations.find((r) => r.id === id);

      // ✅ When Approved: Send notification
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

      // ✅ When Completed: Auto-record to Sales collection
      if (newStatus === "Completed") {
        await addDoc(collection(db, "sales"), {
          reservationId: id,
          customerName: reservation?.customerName || "Unknown",
          service: reservation?.serviceType || reservation?.service || "Service",
          totalAmount: reservation?.estimatedCost || 0,
          createdAt: Timestamp.now(),
          type: "service",
          status: "completed",
          createdBy: role,
        });
      }

      await updateDoc(reservationRef, updateData);
    } catch (error) {
      console.error("Error updating status or sending notification:", error);
    }
  };

  const handleDelete = async (id) => {
    if (normalizedRole !== "admin") return;
    if (window.confirm("Are you sure you want to delete this reservation?")) {
      try {
        await deleteDoc(doc(db, "reservations", id));
        const resSnap = await getDocs(collection(db, "reservations"));
        if (resSnap.empty) {
          await resetReservationCounter();
        }
      } catch (error) {
        console.error("Error deleting reservation:", error);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (normalizedRole !== "admin") return;
    if (selected.length === 0) return alert("No reservations selected.");
    if (!window.confirm(`Delete ${selected.length} selected reservation(s)?`)) return;

    try {
      for (let id of selected) {
        await deleteDoc(doc(db, "reservations", id));
      }

      const resSnap = await getDocs(collection(db, "reservations"));
      if (resSnap.empty) {
        await resetReservationCounter();
      }

      setSelected([]);
      alert("Selected reservations deleted.");
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert("Failed to delete some reservations.");
    }
  };

  const resetReservationCounter = async () => {
    if (normalizedRole !== "admin") return;
    try {
      await setDoc(doc(db, "counters", "reservations"), { lastId: 0 });
      alert("Reservation counter reset to 0.");
    } catch (error) {
      console.error("Error resetting counter:", error);
    }
  };

  const toggleSelection = (id) => {
    if (normalizedRole !== "admin") return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (normalizedRole !== "admin") return;
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((r) => r.id));
    }
  };

  const filtered = reservations.filter((r) => {
    return `${r.customerName || ""} ${r.plateNumber || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  return (
    <div className="reservations-container">
      <div className="reservations-header">
        <h1>📅 Reservations</h1>

        <div className="reservation-controls">
          <input
            type="text"
            placeholder="Search by name or plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="reservation-search"
          />

          {normalizedRole === "admin" && filtered.length > 0 && (
            <button className="bulk-delete-btn" onClick={handleBulkDelete}>
              🗑 Delete Selected ({selected.length})
            </button>
          )}

          {normalizedRole === "admin" && reservations.length === 0 && (
            <button className="reset-btn" onClick={resetReservationCounter}>
              🔄 Reset Reservation Counter
            </button>
          )}
        </div>
      </div>

      <div className="reservation-table-wrapper">
        <table className="reservation-table">
          <thead>
            <tr>
              {normalizedRole === "admin" && (
                <th>
                  <input
                    type="checkbox"
                    checked={
                      selected.length === filtered.length && filtered.length > 0
                    }
                    onChange={toggleSelectAll}
                  />
                </th>
              )}
              <th>Reservation ID</th>
              <th>Posted</th>
              <th>Approved</th>
              <th>Scheduled</th>
              <th>Customer</th>
              <th>Service</th>
              <th>Vehicle Info</th>
              <th>Notes</th>
              <th>Status</th>
              {normalizedRole === "admin" && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((res) => {
              const scheduledDate =
                res.preferredDateTime instanceof Timestamp
                  ? res.preferredDateTime.toDate()
                  : new Date(res.preferredDateTime);

              const isPast = scheduledDate < new Date();

              return (
                <tr
                  key={res.id}
                  className={`reservation-row ${isPast ? "past-reservation" : ""}`}
                >
                  {normalizedRole === "admin" && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(res.id)}
                        onChange={() => toggleSelection(res.id)}
                      />
                    </td>
                  )}
                  <td>{res.id}</td>
                  <td>
                    {res.createdAt?.toDate
                      ? res.createdAt.toDate().toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    {res.approvedAt?.toDate
                      ? res.approvedAt.toDate().toLocaleString()
                      : "—"}
                  </td>
                  <td>{scheduledDate.toLocaleString() || "—"}</td>
                  <td>{res.customerName || "—"}</td>
                  <td>{res.serviceType || res.service || "—"}</td>
                  <td>
                    {res.vehicleBrand} {res.vehicleModel} {res.vehicleYear}
                    <br />
                    <small>{res.plateNumber}</small>
                  </td>
                  <td>{res.note || "—"}</td>
                  <td>
                    <select
                      className="status-dropdown"
                      value={res.status || "Pending"}
                      onChange={(e) => handleStatusChange(res.id, e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="Declined">Declined</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </td>
                  {normalizedRole === "admin" && (
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(res.id)}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={normalizedRole === "admin" ? "11" : "10"}
                  className="text-center"
                >
                  No reservations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reservations;
