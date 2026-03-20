import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/admin-styles/TestimonialPage.css";

const TestimonialPage = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const q = query(
      collection(db, "testimonials"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setTestimonials(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching testimonials:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getStatus = (item) => {
    if (item.isSpam === true) return "spam";
    if (item.approved === true) return "approved";
    return "pending";
  };

  const handleStatusUpdate = async (docId, newStatus) => {
    try {
      let updateData = {
        updatedAt: serverTimestamp(),
      };

      if (newStatus === "approved") {
        updateData = {
          ...updateData,
          approved: true,
          isSpam: false,
        };
      } else if (newStatus === "pending") {
        updateData = {
          ...updateData,
          approved: false,
          isSpam: false,
        };
      } else if (newStatus === "spam") {
        updateData = {
          ...updateData,
          approved: false,
          isSpam: true,
        };
      }

      await updateDoc(doc(db, "testimonials", docId), updateData);
    } catch (error) {
      console.error("Error updating testimonial:", error);
      alert("Failed to update testimonial status.");
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "No date";
    if (timestamp?.toDate) return timestamp.toDate().toLocaleString();
    return "Invalid date";
  };

  const filteredTestimonials = useMemo(() => {
    if (statusFilter === "all") return testimonials;

    return testimonials.filter((item) => {
      const status = getStatus(item);
      return statusFilter === status;
    });
  }, [testimonials, statusFilter]);

  return (
    <div className="testimonial-page">
      <div className="testimonial-header">
        <div>
          <h1>Testimonials Management</h1>
          <p>Review and manage customer feedback submissions.</p>
        </div>

        <div className="testimonial-filter">
          <label htmlFor="statusFilter">Filter Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="spam">Spam</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="testimonial-loading">Loading testimonials...</div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="testimonial-empty">No testimonials found.</div>
      ) : (
        <div className="testimonial-grid">
          {filteredTestimonials.map((item) => {
            const status = getStatus(item);

            return (
              <div className="testimonial-card" key={item.id}>
                <div className="testimonial-card-top">
                  <div>
                    <h3 className="testimonial-name">
                      {item.userName || "Customer"}
                    </h3>
                    <p className="testimonial-id">
                      Reservation ID: {item.reservationId || "N/A"}
                    </p>
                    <p className="testimonial-id">
                      Testimonial ID: {item.testimonialId || "N/A"}
                    </p>
                  </div>

                  <span className={`status-badge status-${status}`}>
                    {status}
                  </span>
                </div>

                <div className="testimonial-info">
                  <p>
                    <strong>Created At:</strong> {formatDate(item.createdAt)}
                  </p>
                  <p>
                    <strong>Updated At:</strong> {formatDate(item.updatedAt)}
                  </p>
                </div>

                <div className="testimonial-message-box">
                  <label>Customer Review</label>
                  <p className="testimonial-message">
                    {item.message || "No message submitted."}
                  </p>
                </div>

                <div className="testimonial-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleStatusUpdate(item.id, "approved")}
                  >
                    Approve
                  </button>

                  <button
                    className="btn-pending"
                    onClick={() => handleStatusUpdate(item.id, "pending")}
                  >
                    Pending
                  </button>

                  <button
                    className="btn-spam"
                    onClick={() => handleStatusUpdate(item.id, "spam")}
                  >
                    Spam
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TestimonialPage;