import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/user-components/Footer";
import "../../styles/user-styles/ServicesPage.css";

const ServicesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const listRef = useRef(null);

  // All services (text-only)
  const services = [
    "PMS/Change Oil",
    "Computerized Camber Alignment",
    "Computerized Wheel Alignment",
    "Underchasis-Free Estimate and Diagnostics",
    "Scanning-Reset",
    "Dialysis",
    "Resurfacing",
  ];

  // Scroll to the selected service if clicked from LandingPage
  useEffect(() => {
    const selectedService =
      location.state?.serviceName || localStorage.getItem("selectedService");
    if (selectedService && listRef.current) {
      const element = document.getElementById(selectedService);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        element.classList.add("highlight-text");
        setTimeout(() => element.classList.remove("highlight-text"), 2000);
      }
      localStorage.removeItem("selectedService");
    }
  }, [location]);

  return (
    <>
      <Navbar user={user} onLoginClick={() => navigate("/login")} />

      <main className="services-main">
        <section className="services-section" ref={listRef}>
          <h2 className="services-title">Our Services</h2>
          <ul className="services-list">
            {services.map((service) => (
              <li key={service} id={service} className="service-item">
                {service}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default ServicesPage;
