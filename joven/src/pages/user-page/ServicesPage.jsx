import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

import Navbar from "../../components/Navbar";
import Footer from "../../components/user-components/Footer";
import "../../styles/user-styles/ServicesPage.css";

// Local images mapped by name
import oilChangeImg from "../../images/services/oil_change.png";
import camberAlignmentImg from "../../images/services/camber_alignment.png";
import wheelAlignmentImg from "../../images/services/wheel_alignment.png";
import underchassisImg from "../../images/services/underchassis_diagnostics.png";
import scanningResetImg from "../../images/services/scanning_reset.png";
import dialysisImg from "../../images/services/dialysis.png";
import resurfacingImg from "../../images/services/resurfacing.png";

const imageMap = {
  "PMS / Change Oil": oilChangeImg,
  "Computerized Camber Alignment": camberAlignmentImg,
  "Computerized Wheel Alignment": wheelAlignmentImg,
  "Underchassis Diagnostics": underchassisImg,
  "Scanning / Reset": scanningResetImg,
  "Engine Cleaning (Dialysis)": dialysisImg,
  "Resurfacing": resurfacingImg,
  "Brake Rotor Resurfacing": resurfacingImg,
};

const ServicesPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const [servicesData, setServicesData] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState(null);

  // Fetch services from Firestore
  useEffect(() => {
    const fetchServices = async () => {
      const querySnapshot = await getDocs(collection(db, "services"));
      const servicesList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.active) {
          servicesList.push({
            id: doc.id,
            name: data.name,
            price: data.price || 0,
            description: data.description || "",
            image: imageMap[data.name] || null,
          });
        }
      });

      setServicesData(servicesList);

      if (servicesList.length > 0) {
        setCurrentService(servicesList[0]);
      }
    };

    fetchServices();
  }, []);

  // Toggle multi-selection
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
            
            {/* LEFT SERVICE LIST */}
            <aside className="services-sidebar">
              <h2>Service List</h2>

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
                      <td>{service.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </aside>

            {/* RIGHT DETAILS SECTION */}
            <div className="service-details">

              {/* HORIZONTAL SELECTED LIST */}
              {selectedServices.length > 0 && (
                <div className="selected-services-horizontal">
                  {selectedServices.map((name) => {
                    const svc = servicesData.find((s) => s.name === name);
                    if (!svc) return null;
                    return (
                      <div key={name} className="selected-service-box">
                        <p className="svc-name">{svc.name}</p>
                        <p className="svc-price">₱{svc.price}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CURRENT SERVICE DETAILS */}
              {currentService && (
                <>
                  <h1 className="service-title">{currentService.name}</h1>

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

                  {/* Reserve Now Button */}
                  {selectedServices.length > 0 && (
                    <button
                      className="reserve-button"
                      onClick={() =>
                        navigate("/reserve-service", {
                          state: { selectedServices },
                        })
                      }
                    >
                      Reserve Now
                    </button>
                  )}

                  {/* FB Message Box */}
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
