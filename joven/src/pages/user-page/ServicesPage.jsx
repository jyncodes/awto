import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/user-components/Footer";
import "../../styles/user-styles/ServicesPage.css";

// Import service images
import oilChangeImg from "../../images/services/oil_change.png";
import camberAlignmentImg from "../../images/services/camber_alignment.png";
import wheelAlignmentImg from "../../images/services/wheel_alignment.png";
import underchassisImg from "../../images/services/underchassis_diagnostics.png";
import scanningResetImg from "../../images/services/scanning_reset.png";
import dialysisImg from "../../images/services/dialysis.png";
import resurfacingImg from "../../images/services/resurfacing.png";

const ServicesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedService, setSelectedService] = useState("");

  // Services Data
  const servicesData = [
    {
      label: "PMS / Change Oil",
      name: "PMS / Change Oil",
      description:
        "Complete preventive maintenance service including oil change, filter replacement, and general inspection.",
      image: oilChangeImg,
    },
    {
      label: "Computerized Camber Alignment",
      name: "Computerized Camber Alignment",
      description:
        "Precise adjustment of camber angles using advanced computerized systems for better handling and tire life.",
      image: camberAlignmentImg,
    },
    {
      label: "Computerized Wheel Alignment",
      name: "Computerized Wheel Alignment",
      description:
        "Ensures your wheels are aligned correctly for safety, reduced tire wear, and smooth driving.",
      image: wheelAlignmentImg,
    },
    {
      label: "Underchassis Diagnostics",
      name: "Underchassis Diagnostics",
      description:
        "Full underchassis inspection with diagnostics and free cost estimation.",
      image: underchassisImg,
    },
    {
      label: "Scanning / Reset",
      name: "Scanning / Reset",
      description:
        "Electronic system scanning and resetting for all compatible vehicles.",
      image: scanningResetImg,
    },
    {
      label: "Engine Cleaning / Dialysis",
      name: "Engine Cleaning (Dialysis)",
      description:
        "Engine fluid and filtration cleaning service to maintain engine performance.",
      image: dialysisImg,
    },
    {
      label: "Brake Rotor Resurfacing",
      name: "Brake Rotor Resurfacing",
      description:
        "Resurfacing service for brake rotors and drums to restore smooth braking.",
      image: resurfacingImg,
    },
  ];

  // Set default service
  useEffect(() => {
    const serviceFromState =
      location.state?.serviceName || servicesData[0].name;
    setSelectedService(serviceFromState);
  }, [location]);

  const handleServiceClick = (serviceName) => {
    setSelectedService(serviceName);
  };

  const currentService = servicesData.find(
    (service) => service.name === selectedService
  );

  return (
    <>
      <Navbar user={user} onLoginClick={() => navigate("/login")} />

      {/* FULL PAGE WRAPPER */}
      <div className="services-wrapper">

        <main className="services-main">
          <section className="services-container">

            {/* LEFT TABLE SIDEBAR */}
            <aside className="services-sidebar">
              <h2>Service List</h2>

              <table className="services-table">
                <tbody>
                  {servicesData.map((service) => (
                    <tr
                      key={service.name}
                      className={
                        selectedService === service.name ? "active-row" : ""
                      }
                      onClick={() => handleServiceClick(service.name)}
                    >
                      <td>{service.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </aside>

            {/* RIGHT DETAILS SECTION */}
            <div className="service-details">
              {currentService && (
                <>
                  <h1 className="service-title">{currentService.name}</h1>

                  <img
                    src={currentService.image}
                    alt={currentService.name}
                    className="service-large-image"
                  />

                  <p className="service-description">
                    {currentService.description}
                  </p>

                  {/* Facebook Inquiry Message */}
                  <div className="inquiry-box">
                    <p>For more inquiries, message us on our Facebook page.</p>
                    <a
                      href="https://www.facebook.com/joventireenterprise"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fb-button"
                    >
                      Message Us on Facebook
                    </a>
                  </div>
                </>
              )}
            </div>

          </section>
        </main>

      </div>

      <Footer />
    </>
  );
};

export default ServicesPage;
