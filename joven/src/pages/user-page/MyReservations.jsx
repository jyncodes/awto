// src/pages/user-page/MyReservations.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
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

const formatDateTime = (ts) => {
  if (!ts?.toDate) return "N/A";
  return ts.toDate().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const MyReservations = () => {
  const [reservations, setReservations] = useState([]);
  const [sortOption, setSortOption] = useState("newest");

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const navigate = useNavigate();

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

  const handleViewFeedback = async (reservation) => {
    try {
      setFeedbackLoading(true);
      setSelectedReservation(reservation);
      setSelectedFeedback(null);
      setShowFeedbackModal(true);

      const testimonialRef = doc(db, "testimonials", reservation.id);
      const testimonialSnap = await getDoc(testimonialRef);

      if (!testimonialSnap.exists()) {
        setSelectedFeedback(null);
        return;
      }

      setSelectedFeedback({
        id: testimonialSnap.id,
        ...testimonialSnap.data(),
      });
    } catch (error) {
      console.error("Error loading feedback:", error);
      setSelectedFeedback(null);
    } finally {
      setFeedbackLoading(false);
    }
  };

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
        </select>
      </div>

      {reservations.length === 0 ? (
        <p>No reservations found.</p>
      ) : (
        <div className="orders-list">
          {[...reservations]
            .sort((a, b) => {
              const createdA = a.createdAt?.toDate?.() || new Date(0);
              const createdB = b.createdAt?.toDate?.() || new Date(0);

              if (sortOption === "newest") return createdB - createdA;
              if (sortOption === "oldest") return createdA - createdB;

              return 0;
            })
            .map((res) => (
              <div key={res.id} className="order-card">
                <p><strong>Reservation ID:</strong> {res.id}</p>
                <p><strong>Customer:</strong> {res.userName}</p>
                <p><strong>Date Created:</strong> {formatTimestamp(res.createdAt)}</p>
                <p><strong>Date Scheduled:</strong> {formatTimestamp(res.preferredDate)}</p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span style={{ color: res.status === "Completed" ? "green" : "orange" }}>
                    {res.status}
                  </span>
                </p>

                <p>
                  <strong>Total:</strong> ₱
                  {(
                    res.type === "service"
                      ? res.totalServicePrice
                      : res.totalPrice
                  )?.toLocaleString()}
                </p>

                {res.status === "Completed" && !res.hasTestimonial && (
                  <button
                    className="testimonial-button"
                    onClick={() =>
                      navigate("/write-testimonial", {
                        state: { reservationId: res.id },
                      })
                    }
                  >
                    Leave Testimonial
                  </button>
                )}

                {res.hasTestimonial && (
                  <button
                    className="feedback-button"
                    onClick={() => handleViewFeedback(res)}
                  >
                    View Feedback
                  </button>
                )}

                <button
                  className="receipt-button"
                  onClick={() => {
                    setSelectedReservation(res);
                    setShowReceiptModal(true);
                  }}
                >
                  View Receipt
                </button>
              </div>
            ))}
        </div>
      )}

      {showFeedbackModal && selectedReservation && (
        <div
          className="reservation-modal-overlay"
          onClick={() => {
            setShowFeedbackModal(false);
            setSelectedFeedback(null);
          }}
        >
          <div
            className="reservation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-title">Submitted Feedback</h3>

            {feedbackLoading ? (
              <p>Loading feedback...</p>
            ) : selectedFeedback ? (
              <>
                <div className="receipt-section">
                  <h4>Feedback Details</h4>
                  <p><strong>Reservation ID:</strong> {selectedReservation.id}</p>
                  <p><strong>Name:</strong> {selectedFeedback.userName || "N/A"}</p>
                  <p><strong>Vehicle:</strong> {selectedFeedback.vehicle || "N/A"}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {selectedFeedback.approved ? "Approved" : "Pending Approval"}
                  </p>
                  <p>
                    <strong>Submitted At:</strong>{" "}
                    {formatDateTime(selectedFeedback.createdAt)}
                  </p>
                </div>

                <div className="receipt-section">
                  <h4>Message</h4>
                  <textarea
                    value={selectedFeedback.message || ""}
                    readOnly
                    rows="6"
                    style={{
                      width: "100%",
                      resize: "none",
                      padding: "10px",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              </>
            ) : (
              <p>No feedback found for this reservation.</p>
            )}

            <div className="modal-buttons">
              <button
                className="close-modal"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSelectedFeedback(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && selectedReservation && (
        <div
          className="reservation-modal-overlay"
          onClick={() => setShowReceiptModal(false)}
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
              <p><strong>Plate Number:</strong> {selectedReservation.plateNumber}</p>
            </div>

            <div className="receipt-section">
              <h4>Reservation Details</h4>
              <p><strong>ID:</strong> {selectedReservation.id}</p>
              <p><strong>Status:</strong> {selectedReservation.status}</p>
              <p><strong>Date Created:</strong> {formatTimestamp(selectedReservation.createdAt)}</p>
              <p><strong>Date Scheduled:</strong> {formatTimestamp(selectedReservation.preferredDate)}</p>
              <p><strong>Completed At:</strong> {formatTimestamp(selectedReservation.completedAt)}</p>
              <p><strong>Payment Method:</strong> {selectedReservation.paymentMethod}</p>
              <p><strong>Transaction ID:</strong> {selectedReservation.transactionId}</p>
              <p><strong>Product:</strong> {selectedReservation.productName}</p>
              <p><strong>Quantity:</strong> {selectedReservation.quantity}</p>
              <p><strong>Price Each:</strong> ₱{selectedReservation.price?.toLocaleString()}</p>
              <p><strong>Downpayment:</strong> ₱{selectedReservation.downpayment?.toLocaleString()}</p>
              <p><strong>Total:</strong> ₱{selectedReservation.totalPrice?.toLocaleString()}</p>
              <p><strong>Note:</strong> {selectedReservation.note}</p>
            </div>

            <div className="modal-buttons">
              <button className="close-modal" onClick={() => setShowReceiptModal(false)}>
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