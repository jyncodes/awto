import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

import Navbar from "../../components/Navbar";
import Footer from "../../components/user-components/Footer";
import "../../styles/user-styles/ServicesPage.css";

// Local images
import oilChangeImg from "../../images/services/oil_change.png";
import camberAlignmentImg from "../../images/services/camber_alignment.png";
import wheelAlignmentImg from "../../images/services/wheel_alignment.png";
import underchassisImg from "../../images/services/underchassis_diagnostics.png";
import scanningResetImg from "../../images/services/scanning_reset.png";
import dialysisImg from "../../images/services/dialysis.png";
import resurfacingImg from "../../images/services/resurfacing.png";

// ⭐ FIXED — VERY FLEXIBLE NAME MATCHING
const imageMap = [
  { keywords: ["change oil", "pms"], img: oilChangeImg },
  { keywords: ["camber"], img: camberAlignmentImg },
  { keywords: ["wheel alignment"], img: wheelAlignmentImg },
  { keywords: ["underchassis"], img: underchassisImg },
  { keywords: ["scanning", "reset"], img: scanningResetImg },
  { keywords: ["dialysis", "engine cleaning"], img: dialysisImg },
  { keywords: ["resurfacing", "brake rotor"], img: resurfacingImg },
];

const findImage = (name) => {
  const lower = name.toLowerCase();
  const match = imageMap.find((entry) =>
    entry.keywords.some((k) => lower.includes(k))
  );
  return match ? match.img : null;
};

const ServicesPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [servicesData, setServicesData] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState(null);

  useEffect(() => {
    const fetchServices = async () => {
      const querySnapshot = await getDocs(collection(db, "services"));
      const list = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.active) {
          list.push({
            id: doc.id,
            name: data.name,
            price: data.price || 0,
            description: data.description || "",
            image: findImage(data.name),  // ⭐ FIXED AREA
          });
        }
      });

      setServicesData(list);
      if (list.length > 0) setCurrentService(list[0]);
    };

    fetchServices();
  }, []);

  const handleServiceClick = (serviceName) => {
    setSelectedServices((prev) =>
      prev.includes(serviceName)
        ? prev.filter((s) => s !== serviceName)
        : [...prev, serviceName]
    );

    const svc = servicesData.find((s) => s.name === serviceName);
    if (svc) setCurrentService(svc);
  };

  return (
    <>
      <Navbar user={user} onLoginClick={() => navigate("/login")} />

      <div className="services-wrapper">
        <main className="services-main">
          <section className="services-container">

            {/* LEFT LIST */}
            <aside className="services-sidebar">
              <h2>Service List</h2>
              <p className="service-helper-text">
                All prices shown are LABOR ONLY.
              </p>

              <table className="services-table">
                <tbody>
                  {servicesData.map((service) => (
                    <tr
                      key={service.id}
                      className={
                        selectedServices.includes(service.name)
                          ? "active-row"
                          : ""
                      }
                      onClick={() => handleServiceClick(service.name)}
                    >
                      <td className="service-row">
                        <span className="service-name">{service.name}</span>
                        <span className="service-price-right">
                          ₱{service.price}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* TOTAL */}
              <div className="service-summary-box">
                <p className="summary-total">
                  Total: ₱
                  {selectedServices.reduce((sum, name) => {
                    const svc = servicesData.find((s) => s.name === name);
                    return sum + (svc?.price || 0);
                  }, 0)}
                </p>

                <button
                  className="reserve-small-btn"
                  onClick={() => {
                    if (selectedServices.length === 0) {
                      alert("Please select at least one service before proceeding.");
                      return;
                    }

                    navigate("/reservation/services", {
                      state: {
                        type: "service",
                        selectedServices: selectedServices.map((name) => {
                          const svc = servicesData.find((s) => s.name === name);
                          return {
                            name: svc.name,
                            price: svc.price,
                            description: svc.description,
                          };
                        }),
                        totalServicePrice: selectedServices.reduce((sum, name) => {
                          const svc = servicesData.find((s) => s.name === name);
                          return sum + (svc?.price || 0);
                        }, 0),
                      },
                    });
                  }}
                >
                  Reserve Now
                </button>
              </div>
            </aside>

            {/* RIGHT DETAILS */}
            <div className="service-details">
              {currentService && (
                <>
                  <h1 className="service-title">{currentService.name}</h1>

                  {/* ⭐ FIXED — IMAGE ALWAYS SHOWS IF MATCHES ANY KEYWORD */}
                  {currentService.image && (
                    <img
                      src={currentService.image}
                      alt={currentService.name}
                      className="service-large-image"
                    />
                  )}

                  <p className="service-description">
                    {currentService.description}
                  </p>
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
