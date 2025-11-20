// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/LandingPage.css";
import Navbar from "../components/Navbar";
import Footer from "../components/user-components/Footer";
import LoginSection from "../components/LoginSection";
import Manual from "../components/user-components/Manual";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  Settings,
  AlignCenter,
  Activity,
  ScanSearch,
  RefreshCw,
} from "lucide-react";

// Brand images (keep your existing assets)
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
    navigate("/user-dashboard");
  };

  const services = [
    { name: "PMS / Change Oil", icon: <Wrench size={36} /> },
    { name: "Computerized Camber Alignment", icon: <Settings size={36} /> },
    { name: "Computerized Wheel Alignment", icon: <AlignCenter size={36} /> },
    { name: "Underchassis Diagnostics", icon: <Activity size={36} /> },
    { name: "Scanning / Reset", icon: <ScanSearch size={36} /> },
    { name: "Engine Cleaning (Dialysis)", icon: <RefreshCw size={36} /> },
    { name: "Brake Rotor Resurfacing", icon: <Wrench size={36} /> },
  ];

  const handleServiceClick = (serviceName) => {
    localStorage.setItem("selectedService", serviceName);
    navigate("/services", { state: { serviceName } });
  };

  // Section fade-in
  useEffect(() => {
    const sections = document.querySelectorAll(".section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("fade-in");
        });
      },
      { threshold: 0.18 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => sections.forEach((s) => observer.unobserve(s));
  }, []);

  return (
    <>
      <Navbar user={user} onLoginClick={() => setShowLogin(true)} />
      {showLogin && (
        <LoginSection
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      <main className="landing-main">
        <Manual />

        {/* HERO */}
        <section className="section hero-section">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 className="hero-title">Premium Tires & Professional Care</h1>
              <p className="hero-sub">
                Joven Tire Enterprise — trusted fitment, expert alignment, and
                comprehensive vehicle services. Quality parts. Honest service.
                Fast turnaround.
              </p>

              <div className="hero-cta">
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/services")}
                >
                  Book a Service
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => document.getElementById("brand")?.scrollIntoView({behavior: "smooth"})}
                >
                  Shop Brands
                </button>
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-card">
                <div className="hero-card-inner">
                  <div className="stat">
                    <div className="stat-number">10k+</div>
                    <div className="stat-label">Satisfied Customers</div>
                  </div>
                  <div className="stat">
                    <div className="stat-number">20+</div>
                    <div className="stat-label">Top Brands</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP BRANDS */}
        <section id="brand" className="section brand-section">
          <div className="section-header">
            <h2 className="section-title">Top Brands</h2>
            <p className="section-sub">Get tires you can trust from leading makers</p>
          </div>

          <button
            className="brand-arrow brand-arrow-left"
            aria-label="scroll left"
            onClick={() =>
              brandScrollRef.current.scrollBy({ left: -360, behavior: "smooth" })
            }
          >
            &#8249;
          </button>

          <button
            className="brand-arrow brand-arrow-right"
            aria-label="scroll right"
            onClick={() =>
              brandScrollRef.current.scrollBy({ left: 360, behavior: "smooth" })
            }
          >
            &#8250;
          </button>

          <div className="brand-scroll-container" ref={brandScrollRef}>
            {topBrands.map((brand) => (
              <div
                key={brand.name}
                className="brand-card"
                role="button"
                tabIndex={0}
                onClick={() => handleBrandClick(brand.name)}
                onKeyDown={(e) => (e.key === "Enter" ? handleBrandClick(brand.name) : null)}
                aria-label={`Open ${brand.name}`}
              >
                <img src={brand.image} alt={brand.name} />
                <div className="brand-overlay">
                  <p>{brand.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="section services-row-section">
          <div className="section-header">
            <h2 className="section-title">Services Offered</h2>
            <p className="section-sub">Reliable service, done right — every time</p>
          </div>

          <div className="services-row">
            {services.map((service) => (
              <div
                key={service.name}
                className="service-card"
                role="button"
                tabIndex={0}
                onClick={() => handleServiceClick(service.name)}
                onKeyDown={(e) => (e.key === "Enter" ? handleServiceClick(service.name) : null)}
              >
                <div className="service-icon-overlay">{service.icon}</div>
                <p>{service.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ABOUT US */}
        <section
          id="about"
          className="section about-section"
          onClick={() => navigate("/about-us")}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" ? navigate("/about-us") : null)}
        >
          <div className="about-inner">
            <div className="about-left">
              <h2 className="section-title">Our Story</h2>
              <p className="about-text">
                Joven Tire Enterprise started with one belief: good service should be
                straightforward. We’ve partnered with trusted brands and invested in
                professional equipment so you get accurate fitment, dependable
                parts, and service that keeps you safe on the road.
              </p>
              <p className="about-learn-more">Click to read our full story & commitments →</p>
            </div>

            <div className="about-right">
              <div className="about-card">
                <h3>Quality Parts</h3>
                <p>We stock trusted brands and perform precise installations.</p>
              </div>
              <div className="about-card">
                <h3>Skilled Technicians</h3>
                <p>Experienced, trained staff with modern diagnostic tools.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LandingPage;
