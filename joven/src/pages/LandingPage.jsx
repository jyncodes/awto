// src/pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from "react";
import "../styles/LandingPage.css";
import Navbar from "../components/Navbar";
import Footer from "../components/user-components/Footer";
import LoginSection from "../components/LoginSection";
import Manual from "../components/user-components/Manual";
import Testimonials from "../components/user-components/Testimonials";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

import {
  Wrench,
  Settings,
  AlignCenter,
  Activity,
  ScanSearch,
  RefreshCw,
} from "lucide-react";

// Brand images
import arivoImg from "../pages/user-page/images/brands/arivo.png";
import sailunImg from "../pages/user-page/images/brands/sailun.png";
import michelinImg from "../pages/user-page/images/brands/michelin.png";
import goodyearImg from "../pages/user-page/images/brands/goodyear.png";
import bridgestoneImg from "../pages/user-page/images/brands/bridgestone.png";


const toTitleCase = (str = "") =>
  str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");


const LandingPage = () => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const brandScrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const openLoginHandler = () => setShowLogin(true);
    window.addEventListener("open-login", openLoginHandler);
    return () => window.removeEventListener("open-login", openLoginHandler);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

    const topBrands = [
      { name: "Maxxis", image: arivoImg },
      { name: "Westlake", image: sailunImg },
      { name: "CST", image: michelinImg },
      { name: "Bridgestone", image: goodyearImg },
      { name: "Arivo", image: bridgestoneImg },
    ];



  const guardNavigation = (callback) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    callback();
  };

  const handleBrandClick = (brandName) => {
    guardNavigation(() => {
      localStorage.setItem("selectedBrand", brandName);
      localStorage.setItem("fromLanding", "true");
      navigate("/user-dashboard");
    });
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
    guardNavigation(() => {
      localStorage.setItem("selectedService", serviceName);
      navigate("/services", { state: { serviceName } });
    });
  };

  const goToServices = () => {
    guardNavigation(() => navigate("/services"));
  };

  const scrollToBrands = () => {
    guardNavigation(() => {
        navigate("/user-dashboard");

    });
  };

  const goToAbout = () => {
    guardNavigation(() => navigate("/about-us"));
  };

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
        {/* FITMENT TOOL */}
        <Manual />

        {/* HERO */}
        <section className="section hero-section">
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 className="hero-title">Premium Tires & Professional Care</h1>

              <p className="hero-sub">
                Joven Tire Enterprise — delivering trusted fitment, precise alignment,
                and complete vehicle care.
              </p>

              <div className="hero-cta">
                <button className="btn btn-primary" onClick={goToServices}>
                  Book Service
                </button>

                <button className="btn btn-outline" onClick={scrollToBrands}>
                  Reserve Product
                </button>
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-card">
                <div className="hero-card-inner"></div>
              </div>
            </div>
          </div>
        </section>

        {/* TOP BRANDS */}
        <section id="brand" className="section brand-section">
          <div className="section-header">
            <h2 className="section-title">Top Brands</h2>
            <p className="section-sub">Get tires you can trust</p>
          </div>

          <div className="brand-row">
            {topBrands.map((brand) => (
              <div
                key={brand.name}
                className="brand-card"
                role="button"
                tabIndex={0}
                onClick={() => handleBrandClick(brand.name)}
              >
                <img src={brand.image} alt={brand.name} />
                <div className="brand-overlay">
                  <p>{toTitleCase(brand.name)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="section services-row-section">
          <div className="section-header">
            <h2 className="section-title">Services Offered</h2>
            <p className="section-sub">Reliable service, done right</p>
          </div>

          <div className="services-row">
            {services.map((service) => (
              <div
                key={service.name}
                className="service-card"
                role="button"
                tabIndex={0}
                onClick={() => handleServiceClick(service.name)}
              >
                <div className="service-icon-overlay">{service.icon}</div>
                <p>{service.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ⭐ TESTIMONIALS */}
        <Testimonials />

        {/* ⭐⭐⭐ ABOUT US (REVISED) ⭐⭐⭐ */}
        <section
          id="about"
          className="section about-section"
          onClick={goToAbout}
          role="link"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" ? goToAbout() : null)}
        >
          <div className="about-inner">

            {/* LEFT — STORY */}
            <div className="about-left">
              <h2 className="section-title">Our Story</h2>

              <p className="about-text">
                  From a humble 50-tire stall in 2000, JovenTire Enterprise has grown into one of
                  Cavite’s most trusted tire and wheel service centers — built on resilience,
                  dedication, and a strong 17-year partnership with Maxxis Tires. What began as a
                  small operation has evolved into a modern facility committed to quality work and
                  genuine customer care.
              </p>

              {/* ⭐ UPDATED PART */}
              <p
                className="about-learn-more"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/about-us", { state: { section: "story" } });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter"
                    ? (e.stopPropagation(),
                      navigate("/about-us", { state: { section: "story" } }))
                    : null
                }
              >
                Click to read our full journey →
              </p>
            </div>

            {/* RIGHT — PARTNERS + WAITING AREA */}
            <div className="about-right">

              <div
                className="about-card"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/about-us", { state: { section: "partners" } });
                }}
                onKeyDown={(e) =>
                  e.key === "Enter"
                    ? (e.stopPropagation(),
                      navigate("/about-us", { state: { section: "partners" } }))
                    : null
                }
              >
                <h3> Available brands</h3>
                <p>World-class brands that power our quality and service.</p>
              </div>

              <div
                className="about-card"
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/about-us", { state: { section: "waiting" } });
                }}
                onKeyDown={(e) =>
                  e. key === "Enter"
                    ? (e.stopPropagation(),
                      navigate("/about-us", { state: { section: "waiting" } }))
                    : null
                }
              >
                <h3>Waiting Area</h3>
                <p>A comfortable space while your vehicle is being serviced.</p>
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
