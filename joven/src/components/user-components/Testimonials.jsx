import React from "react";
import "../../styles/user-styles/Testimonials.css";

const testimonials = [
  {
    name: "Mark D.",
    vehicle: "Toyota Hilux",
    message:
      "Maayos at mabilis ang serbisyo. From tire replacement to wheel alignment, ramdam mo talaga ang kalidad ng trabaho. Babalik ulit ako.",
  },
  {
    name: "Angela R.",
    vehicle: "Honda City",
    message:
      "Very accommodating staff and malinaw ang explanation ng services. Comfortable pa ang waiting area. Highly recommended!",
  },
  {
    name: "Joseph L.",
    vehicle: "Ford Ranger",
    message:
      "Accurate fitment at professional ang gumawa. Hindi minadali, pulido ang trabaho. Sulit ang bayad.",
  },
];

const Testimonials = () => {
  return (
    <section className="section testimonials-section">
      <div className="section-header">
        <h2 className="section-title">What Our Customers Say</h2>
        <p className="section-sub">
          Real feedback from drivers who trust Joven Tire Enterprise
        </p>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((t, index) => (
          <div key={index} className="testimonial-card">
            <p className="testimonial-message">“{t.message}”</p>

            <div className="testimonial-footer">
              <span className="testimonial-name">{t.name}</span>
              <span className="testimonial-vehicle">{t.vehicle}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
