import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import "../../styles/user-styles/Testimonials.css";

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    const loadTestimonials = async () => {
      const q = query(
        collection(db, "testimonials"),
        where("approved", "==", true),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      setTestimonials(snap.docs.map((d) => d.data()));
    };

    loadTestimonials();
  }, []);

  return (
    <section className="section testimonials-section">
      <div className="section-header">
        <h2 className="section-title">What Our Customers Say</h2>
        <p className="section-sub">
          Real feedback from drivers who trust Joven Tire Enterprise
        </p>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((t, i) => (
          <div key={i} className="testimonial-card">
            <p className="testimonial-message">“{t.message}”</p>

            <div className="testimonial-footer">
              <span className="testimonial-name">{t.userName}</span>
              <span className="testimonial-vehicle">{t.vehicle}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
