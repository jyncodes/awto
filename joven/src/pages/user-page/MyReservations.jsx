// src/pages/user-page/MyReservations.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

import "../../styles/user-styles/MyReservations.css";


const formatTimestamp = (ts) => {
  if (!ts?.toDate) return "N/A";
  return ts.toDate().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [sortOption, setSortOption] = useState("newest");
  const [showModal, setShowModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  /* ---------------- FETCH RESERVATIONS ---------------- */
  useEffect(() => {
    const fetchReservations = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, "reservations"),
        where("userId", "==", user.uid)
      );

      const snap = await getDocs(q);
      const arr = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setReservations(arr);
    };

    fetchReservations();
  }, []);

  return (
    <>
      <h2>My Reservations</h2>

      <div className="reservation-sort-box">
        <label>Sort by:</label>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="reservation-sort-select"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="upcoming">Upcoming Date</option>
          <option value="status">Status (A→Z)</option>
          <option value="price-high">Price: High → Low</option>
          <option value="price-low">Price: Low → High</option>
        </select>
      </div>

      {reservations.length === 0 ? (
        <p>No reservations found.</p>
      ) : (
        <div className="orders-list">
          {[...reservations]
            .sort((a, b) => {
              if (sortOption === "newest")
                return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
              if (sortOption === "oldest")
                return (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
              if (sortOption === "upcoming")
                return (a.preferredDate?.toDate?.() || 0) - (b.preferredDate?.toDate?.() || 0);
              if (sortOption === "status")
                return a.status.localeCompare(b.status);
              if (sortOption === "price-high")
                return b.totalPrice - a.totalPrice;
              if (sortOption === "price-low")
                return a.totalPrice - b.totalPrice;
              return 0;
            })
            .map((res) => (
              <div key={res.id} className="order-card">
                <p><strong>Reservation ID:</strong> {res.id}</p>
                <p><strong>Customer:</strong> {res.userName}</p>
                <p><strong>Date Scheduled:</strong> {formatTimestamp(res.preferredDate)}</p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span style={{ color: res.status === "Completed" ? "green" : "orange" }}>
                    {res.status}
                  </span>
                </p>

                <p><strong>Total:</strong> ₱{
                  (res.type === "service"
                    ? res.totalServicePrice
                    : res.totalPrice
                  )?.toLocaleString()
                }</p>

                <button
                  className="receipt-button"
                  onClick={() => {
                    setSelectedReservation(res);
                    setShowModal(true);
                  }}
                >
                  View Receipt
                </button>
              </div>
            ))}
        </div>
      )}

      {showModal && selectedReservation && (
        <div
          className="reservation-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="reservation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Reservation Receipt</h3>

            <div className="receipt-section">
              <h4>Customer Info</h4>
              <p><strong>Name:</strong> {selectedReservation.userName}</p>
              <p><strong>Email:</strong> {selectedReservation.userEmail}</p>
            </div>

            <div className="receipt-section">
              <h4>Reservation Details</h4>
              <p><strong>ID:</strong> {selectedReservation.id}</p>
              <p><strong>Date:</strong> {formatTimestamp(selectedReservation.preferredDate)}</p>
              <p><strong>Status:</strong> {selectedReservation.status}</p>
            </div>

            <div className="modal-buttons">
              <button className="close-modal" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyReservations;
