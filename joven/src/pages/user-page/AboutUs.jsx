import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/user-components/Footer";
import "../../styles/user-styles/AboutUs.css";

/* ============================
   IMAGE IMPORTS (REAL PATHS)
============================ */
import storyImg from "../../images/services/about/story-sample.jpg";

import maxxisLogo from "../../images/services/about/maxxis.png";
import toyoLogo from "../../images/services/about/toyo.png";
import cstLogo from "../../images/services/about/cst.png";
import westlakeLogo from "../../images/services/about/westlake.png";
import castrolLogo from "../../images/services/about/castrol.png";

import waitingImg from "../../images/services/about/waiting-area.jpg";

const AboutUs = () => {
  const location = useLocation();

  // ⭐ Needed refs for correct auto-scroll
  const partnersRef = useRef(null);
  const waitingRef = useRef(null);
  const storyRef = useRef(null);

  useEffect(() => {
    if (!location.state || !location.state.section) return;

    const section = location.state.section;

    if (section === "partners" && partnersRef.current) {
      partnersRef.current.scrollIntoView({ behavior: "smooth" });
    } 
    else if (section === "waiting" && waitingRef.current) {
      waitingRef.current.scrollIntoView({ behavior: "smooth" });
    }
    else if (section === "story" && storyRef.current) {
      storyRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [location]);

  return (
    <>
      <Navbar />

      <div className="aboutus-container">

        {/* -------------------------------- */}
        {/*            OUR STORY             */}
        {/* -------------------------------- */}
        <section className="story-section" ref={storyRef}>
          <div className="story-content">

            <div className="story-text">
              <h1>
                A journey of growth <span className="highlight">and trust.</span>
              </h1>

              <p className="story-desc">
                JovenTire Enterprise began from humble roots — a small tire stall founded by
                Jay Baldano in 2000. From a space that could barely hold fifty tires, it has
                grown into a trusted and respected tire and wheel service center.
                <br /><br />
                With dedication, resilience, and a 17-year strong partnership with Maxxis Tires,
                JovenTire has transformed into a modern shop built on trust, integrity, and service.
              </p>

              <a
                href="https://www.youtube.com/watch?v=jkDENEXLjVo&t=35s"
                target="_blank"
                rel="noopener noreferrer"
                className="story-btn"
              >
                🎥 Watch Documentary
              </a>
            </div>

            <div className="story-image">
              <img src={storyImg} alt="Our Story" />
            </div>

          </div>
        </section>

        {/* -------------------------------- */}
        {/*           OUR PARTNERS           */}
        {/* -------------------------------- */}
        <section className="partners-section" ref={partnersRef}>
          <h2>Available brands</h2>

          <div className="logo-slider">
            <div className="logo-track">

              <img src={maxxisLogo} alt="Maxxis" />
              <img src={toyoLogo} alt="Toyo Tires" />
              <img src={cstLogo} alt="CST Tires" />
              <img src={westlakeLogo} alt="Westlake" />
              <img src={castrolLogo} alt="Castrol Oil" />

              {/* duplicate for infinite loop */}
              <img src={maxxisLogo} alt="Maxxis" />
              <img src={toyoLogo} alt="Toyo Tires" />
              <img src={cstLogo} alt="CST Tires" />
              <img src={westlakeLogo} alt="Westlake" />
              <img src={castrolLogo} alt="Castrol Oil" />

            </div>
          </div>
        </section>

        {/* -------------------------------- */}
        {/*           WAITING AREA           */}
        {/* -------------------------------- */}
        <section className="waiting-section" ref={waitingRef}>
          <div className="waiting-content">

            <div className="waiting-image">
              <img src={waitingImg} alt="Waiting Area" />
            </div>

            <div className="waiting-text">
              <h2>Waiting Area</h2>
              <p>
                Our waiting area is built to give customers a relaxing and enjoyable experience
                while their vehicle is being serviced.
                <br /><br />
                ✔ Air-conditioned  
                <br />
                ✔ Free Wi-Fi  
                <br />
                ✔ Comfortable seats  
                <br />
                ✔ Clean Bathroom 
                <br /><br />
                We believe excellent service should feel excellent too.
              </p>
            </div>

          </div>
        </section>

      </div>

      <Footer />
    </>
  );
};

export default AboutUs;
