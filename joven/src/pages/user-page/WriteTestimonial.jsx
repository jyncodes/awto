import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  collection, // ✅ REQUIRED
} from "firebase/firestore";

import "../../styles/user-styles/WriteTestimonial.css";

const WriteTestimonial = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /* =========================
     LOAD & VALIDATE RESERVATION
  ========================= */
  useEffect(() => {
    const loadReservation = async () => {
      try {
        if (!auth.currentUser) {
          navigate("/login");
          return;
        }

        if (!state?.reservationId) {
          navigate("/user-profile?tab=reservations");
          return;
        }

        const ref = doc(db, "reservations", state.reservationId);
        const snap = await getDoc(ref);

        if (
          !snap.exists() ||
          snap.data().userId !== auth.currentUser.uid ||
          snap.data().status !== "Completed"
        ) {
          alert("Unauthorized or invalid reservation");
          navigate("/user-profile?tab=reservations");
          return;
        }

        setReservation({ id: snap.id, ...snap.data() });
        setLoading(false);
      } catch (err) {
        console.error(err);
        alert("Failed to load reservation");
        navigate("/user-profile?tab=reservations");
      }
    };

    loadReservation();
  }, [state, navigate]);

  /* =========================
     SUBMIT TESTIMONIAL
  ========================= */
  const submitTestimonial = async () => {
    if (!message.trim()) {
      alert("Please write your testimonial.");
      return;
    }

    if (!reservation) return;

    setSubmitting(true);

    try {
      await addDoc(collection(db, "testimonials"), {
        reservationId: reservation.id,
        userId: auth.currentUser.uid,
        userName: reservation.userName,
        vehicle: reservation.vehicle || "Customer Vehicle",
        message: message.trim(),
        createdAt: serverTimestamp(),
        approved: true, // ✅ AUTO APPROVE
      });

      await updateDoc(doc(db, "reservations", reservation.id), {
        hasTestimonial: true,
      });

      alert("Thank you for your feedback!");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Failed to submit testimonial. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="testimonial-loading">Loading...</p>;
  }

  return (
    <div className="testimonial-write">
      <h2>Write a Testimonial</h2>

      <textarea
        rows="6"
        placeholder="Share your experience with our service..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={submitting}
      />

      <button onClick={submitTestimonial} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
};

export default WriteTestimonial;
