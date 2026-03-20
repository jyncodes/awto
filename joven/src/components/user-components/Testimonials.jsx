// src/components/user-components/Testimonials.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import "../../styles/user-styles/Testimonials.css";

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "testimonials"),
      where("approved", "==", true),
      where("isSpam", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTestimonials(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading testimonials:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <section className="section testimonials-section">
      <div className="section-header">
        <h2 className="section-title">What Our Customers Say</h2>
        <p className="section-sub">
          Real feedback from drivers who trust Joven Tire Enterprise
        </p>
      </div>

      {loading ? (
        <div className="testimonials-loading">Loading testimonials...</div>
      ) : testimonials.length === 0 ? (
        <div className="testimonials-empty">
          No testimonials available yet.
        </div>
      ) : (
        <div className="testimonials-grid">
          {testimonials.map((t) => (
            <div key={t.id} className="testimonial-card">
              <p className="testimonial-message">
                “{t.message || "No feedback provided."}”
              </p>

              <div className="testimonial-footer">
                <span className="testimonial-name">
                  {t.userName || "Customer"}
                </span>
                <span className="testimonial-vehicle">
                  {t.vehicle || "Vehicle Owner"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Testimonials;