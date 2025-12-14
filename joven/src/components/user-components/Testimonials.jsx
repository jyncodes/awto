import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import Navbar from "../../components/Navbar";

const WriteTestimonial = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReservation = async () => {
      if (!state?.reservationId) {
        navigate("/profile?tab=reservations");
        return;
      }

      const ref = doc(db, "reservations", state.reservationId);
      const snap = await getDoc(ref);

      if (
        !snap.exists() ||
        snap.data().userId !== auth.currentUser.uid ||
        snap.data().status !== "Completed" ||
        !snap.data().transactionId
      ) {
        alert("You are not allowed to write feedback for this reservation.");
        navigate("/profile?tab=reservations");
        return;
      }

      setReservation({ id: snap.id, ...snap.data() });
      setLoading(false);
    };

    loadReservation();
  }, [state, navigate]);

  const submitReview = async () => {
    if (!message.trim()) return;

    await addDoc(collection(db, "testimonials"), {
      reservationId: reservation.id,
      userId: auth.currentUser.uid,
      name: reservation.userName,
      vehicle: `${reservation.vehicleYear} ${reservation.vehicleBrand} ${reservation.vehicleModel}`,
      message,
      status: "Pending",
      createdAt: serverTimestamp(),
    });

    alert("Thank you! Your feedback is pending approval.");
    navigate("/profile?tab=reservations");
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <>
      <Navbar />
      <div className="write-testimonial-page">
        <h2>Leave Your Feedback</h2>

        <p><strong>Reservation ID:</strong> {reservation.id}</p>

        <textarea
          placeholder="Share your experience with our service..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
        />

        <button onClick={submitReview}>Submit Feedback</button>
      </div>
    </>
  );
};

export default WriteTestimonial;
