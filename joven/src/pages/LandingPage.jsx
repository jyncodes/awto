import React, { useState, useEffect } from 'react';
import '../styles/LandingPage.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LoginSection from '../components/LoginSection';
import Manual from '../components/Manual';  // ⬅️ Replaced Fitment with Manual

// ✅ Brand images (local)
import arivoImg from '../pages/user-page/images/brands/arivo.png';
import sailunImg from '../pages/user-page/images/brands/sailun.png';
import michelinImg from '../pages/user-page/images/brands/michelin.png';
import goodyearImg from '../pages/user-page/images/brands/goodyear.png';
import bridgestoneImg from '../pages/user-page/images/brands/bridgestone.png';

const LandingPage = () => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const sections = document.querySelectorAll('.section');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.2 }
    );

    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setShowLogin(false);
  };

  const topBrands = [
    { name: 'ARIVO', image: arivoImg },
    { name: 'Sailun', image: sailunImg },
    { name: 'Michelin', image: michelinImg },
    { name: 'Goodyear', image: goodyearImg },
    { name: 'Bridgestone', image: bridgestoneImg },
  ];

  const handleBrandClick = (brandName) => {
    localStorage.setItem('selectedBrand', brandName);
    window.location.href = '/user-dashboard';
  };

  return (
    <>
      <Navbar user={user} onLoginClick={() => setShowLogin(true)} />
      {showLogin && (
        <LoginSection
          onClose={() => setShowLogin(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      <main className="main-content">
        {/* ✅ Replaced Fitment with Manual */}
        <Manual />

        {/* ✅ Top Brands Section */}
        <section id="brand" className="section brand-section">
          <h2>Top Brands</h2>
          <div className="brand-catalog">
            {topBrands.map((brand) => (
              <div
                key={brand.name}
                className="brand-card"
                onClick={() => handleBrandClick(brand.name)}
              >
                <img
                  src={brand.image}
                  alt={brand.name}
                  style={{ width: '130px', height: 'auto' }}
                />
                <p>{brand.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="section services-section">
          <h2>Services</h2>
          <p>We offer tire installation, wheel alignment, balancing, and more.</p>
        </section>

        {/* About Us Section */}
        <section id="about" className="section about-section">
          <h2>About Us</h2>
          <p>
            Welcome to Joven Tire Enterprise – your trusted partner for premium tire
            products and expert service. Our mission is to keep you safely on the road
            with the best value and professional care.
          </p>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LandingPage;
