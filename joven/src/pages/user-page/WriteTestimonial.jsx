import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import "../../styles/user-styles/WriteTestimonial.css";

const WriteTestimonial = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

        const reservationRef = doc(db, "reservations", state.reservationId);
        const reservationSnap = await getDoc(reservationRef);

        if (!reservationSnap.exists()) {
          alert("Reservation not found.");
          navigate("/user-profile?tab=reservations");
          return;
        }

        const reservationData = reservationSnap.data();

        if (
          reservationData.userId !== auth.currentUser.uid ||
          reservationData.status !== "Completed"
        ) {
          alert("Unauthorized or invalid reservation.");
          navigate("/user-profile?tab=reservations");
          return;
        }

        if (reservationData.hasTestimonial) {
          alert("You already submitted a testimonial for this reservation.");
          navigate("/user-profile?tab=reservations");
          return;
        }

        setReservation({
          id: reservationSnap.id,
          ...reservationData,
        });
      } catch (error) {
        console.error("Error loading reservation:", error);
        alert("Failed to load reservation.");
        navigate("/user-profile?tab=reservations");
      } finally {
        setLoading(false);
      }
    };

    loadReservation();
  }, [state, navigate]);

  const submitTestimonial = async () => {
    if (!message.trim()) {
      alert("Please write your testimonial.");
      return;
    }

    if (!reservation || !auth.currentUser) return;

    setSubmitting(true);

    try {
      const testimonialRef = doc(db, "testimonials", reservation.id);

      await setDoc(testimonialRef, {
        testimonialId: reservation.id,
        reservationId: reservation.id,
        userId: auth.currentUser.uid,
        userName:
          reservation.userName ||
          auth.currentUser.displayName ||
          auth.currentUser.email ||
          "Customer",
        vehicle: reservation.vehicle || "Customer Vehicle",
        message: message.trim(),
        approved: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "reservations", reservation.id), {
        hasTestimonial: true,
        updatedAt: serverTimestamp(),
      });

      alert("Thank you for your feedback!");
      navigate("/user-profile?tab=reservations");
    } catch (error) {
      console.error("Error submitting testimonial:", error);
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

      <button
        onClick={submitTestimonial}
        disabled={submitting || !message.trim()}
      >
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </div>
  );
};

export default WriteTestimonial;