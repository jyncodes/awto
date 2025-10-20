import React, { useState, useEffect, useRef } from "react";
import "../styles/LandingPage.css";
import Navbar from "../components/Navbar";
import Footer from "../components/user-components/Footer";
import LoginSection from "../components/LoginSection";
import Manual from "../components/user-components/Manual";
import { useNavigate } from "react-router-dom";
import { Wrench, Settings, AlignCenter, Activity } from "lucide-react";

// ✅ Brand images
import arivoImg from "../pages/user-page/images/brands/arivo.png";
import sailunImg from "../pages/user-page/images/brands/sailun.png";
import michelinImg from "../pages/user-page/images/brands/michelin.png";
import goodyearImg from "../pages/user-page/images/brands/goodyear.png";
import bridgestoneImg from "../pages/user-page/images/brands/bridgestone.png";

const LandingPage = () => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const brandScrollRef = useRef(null);
  const navigate = useNavigate();

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

  const topBrands = [
    { name: "ARIVO", image: arivoImg },
    { name: "Sailun", image: sailunImg },
    { name: "Michelin", image: michelinImg },
    { name: "Goodyear", image: goodyearImg },
    { name: "Bridgestone", image: bridgestoneImg },
  ];

  const handleBrandClick = (brandName) => {
    localStorage.setItem("selectedBrand", brandName);
    window.location.href = "/user-dashboard";
  };

  const services = [
    { name: "PMS/Change Oil", icon: <Wrench size={40} /> },
    { name: "Computerized Camber Alignment", icon: <Settings size={40} /> },
    { name: "Computerized Wheel Alignment", icon: <AlignCenter size={40} /> },
    { name: "Underchasis-Free Estimate and Diagnostics", icon: <Activity size={40} /> },
    { name: "Scanning-Reset", icon: <Settings size={40} /> },
    { name: "Dialysis", icon: <AlignCenter size={40} /> },
    { name: "Resurfacing", icon: <Wrench size={40} /> },
  ];

  const handleServiceClick = (serviceName) => {
    localStorage.setItem("selectedService", serviceName);
    navigate("/services", { state: { serviceName } });
  };

  useEffect(() => {
    const sections = document.querySelectorAll(".section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("fade-in");
        });
      },
      { threshold: 0.2 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => sections.forEach((section) => observer.unobserve(section));
  }, []);

  return (
    <>
      <Navbar user={user} onLoginClick={() => setShowLogin(true)} />
      {showLogin && (
        <LoginSection onClose={() => setShowLogin(false)} onLoginSuccess={handleLoginSuccess} />
      )}

      <main className="landing-main">
        <Manual />

        {/* Top Brands */}
        <section id="brand" className="section brand-section">
          <h2>Top Brands</h2>
          <button className="brand-arrow brand-arrow-left" onClick={() => brandScrollRef.current.scrollBy({ left: -300, behavior: "smooth" })}>
            &#8249;
          </button>
          <button className="brand-arrow brand-arrow-right" onClick={() => brandScrollRef.current.scrollBy({ left: 300, behavior: "smooth" })}>
            &#8250;
          </button>
          <div className="brand-scroll-container" ref={brandScrollRef}>
            {topBrands.map((brand) => (
              <div key={brand.name} className="brand-card" onClick={() => handleBrandClick(brand.name)}>
                <img src={brand.image} alt={brand.name} />
                <p>{brand.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Services Section - 7 cards fit in one row, no arrows */}
        <section id="services" className="section services-row-section">
          <h2>Services Offered</h2>
          <div className="services-row">
            {services.map((service) => (
              <div key={service.name} className="service-card" onClick={() => handleServiceClick(service.name)}>
                <div className="service-icon-overlay">{service.icon}</div>
                <p>{service.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="section about-section">
          <h2>About Us</h2>
          <p>
            Welcome to Joven Tire Enterprise — your trusted partner for premium
            tire products and expert care. Our mission is to keep you safe on
            the road with top-quality products and service you can rely on.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LandingPage;
