import React from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/user-components/Footer";
import "../../styles/user-styles/AboutUs.css";

const AboutUs = () => {
  return (
    <>
      <Navbar />

      <div className="aboutus-container">

        {/* Our Mission */}
        <section className="aboutus-section">
          <div className="aboutus-content">
            <div className="aboutus-text">
              <h2>Our Mission</h2>
              <p>
                At Joven Tire Interprice, our mission is to provide top-quality tires and wheel solutions
                while delivering exceptional customer care. We believe in growing responsibly, with
                integrity, and putting our clients’ safety and satisfaction first.
              </p>
            </div>
            <div className="aboutus-image">
              <div className="image-placeholder">
                <p>Image Here</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="aboutus-section">
          <div className="aboutus-content reverse">
            <div className="aboutus-image">
              <div className="image-placeholder">
                <p>Story Image/Video</p>
              </div>
            </div>
            <div className="aboutus-text">
              <h2>Our Story</h2>
              <p>
                Joven Tire Interprice started with the vision of making vehicle maintenance
                safer, smoother, and more reliable. With years of expertise in tires and wheels,
                we’ve helped countless customers achieve optimal performance and safety.
              </p>
            </div>
          </div>
        </section>

        {/* Our Partner */}
        <section className="aboutus-section">
          <div className="aboutus-content">
            <div className="aboutus-text">
              <h2>Our Partner</h2>
              <p>
                We collaborate with top brands like Maxxis to provide our clients with
                reliable and high-quality products. Our partnerships ensure that every
                tire and wheel meets strict performance and safety standards.
              </p>
            </div>
            <div className="aboutus-image">
              <div className="image-placeholder">
                <p>Partner Logos Here</p>
              </div>
            </div>
          </div>
        </section>

        {/* Important Section 1 */}
        <section className="aboutus-section">
          <div className="aboutus-content reverse">
            <div className="aboutus-image">
              <div className="image-placeholder">
                <p>Important Image 1</p>
              </div>
            </div>
            <div className="aboutus-text">
              <h2>Quality Assurance</h2>
              <p>
                Our dedicated team inspects every product and service to ensure
                the highest level of quality. Customer safety and satisfaction
                are our top priorities.
              </p>
            </div>
          </div>
        </section>

        {/* Important Section 2 */}
        <section className="aboutus-section">
          <div className="aboutus-content">
            <div className="aboutus-text">
              <h2>Customer Commitment</h2>
              <p>
                We are committed to building long-term relationships with our
                customers by delivering dependable service, expert advice,
                and products you can trust.
              </p>
            </div>
            <div className="aboutus-image">
              <div className="image-placeholder">
                <p>Important Image 2</p>
              </div>
            </div>
          </div>
        </section>

      </div>

      <Footer />
    </>
  );
};

export default AboutUs;
