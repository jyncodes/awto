import React from "react";
import "../../styles/Footer.css";
import { Facebook, Instagram, MapPin, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        {/* 🏪 Company Info */}
        <div className="footer-section">
          <h4>JOVEN TIRE ENTERPRISE</h4>

          <div className="branch">
            <h5>IMUS BRANCH</h5>
            <p>
              543 Aguinaldo Hwy, Imus, 4103 Cavite
            </p>
            <p>
              <a
                href="https://ul.waze.com/ul?place=ChIJ4XceVXbTlzMRmD8_sKj5bX4&ll=14.38159970%2C120.93912070&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location"
                target="_blank"
                rel="noopener noreferrer"
                className="map-link"
              >
                <MapPin size={15} className="icon-inline" /> View on Waze
              </a>
            </p>
            <p className="phone-link">
              <Phone size={15} className="icon-inline" /> (046) 875-2181
            </p>
          </div>

          <div className="branch">
            <h5>GENERAL TRIAS BRANCH</h5>
            <p>
              8W58+PWR, General Trias, Cavite
            </p>
            <p>
              <a
                href="https://www.waze.com/en/live-map/directions/joven-tire-enterprise-inc-general-trias-arnaldo-hwy?navigate=yes&place=w.79233167.792462743.27873088&utm_campaign=default&utm_medium=lm_share_location&utm_source=waze_website"
                target="_blank"
                rel="noopener noreferrer"
                className="map-link"
              >
                <MapPin size={15} className="icon-inline" /> View on Waze
              </a>
            </p>
            <p className="phone-link">
              <Phone size={15} className="icon-inline" /> 0919-592-5504
            </p>
          </div>
        </div>

        {/* 🔗 Social Links */}
        <div className="footer-section">
          <h4>FOLLOW US</h4>
          <ul className="social-links">
            <li>
              <a
                href="https://www.facebook.com/joventireenterprise"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={16} className="icon-inline" /> Facebook
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={16} className="icon-inline" /> Instagram
              </a>
            </li>
            <li>
              <a
                href="https://www.youtube.com/@MaxxisTiresPhilippines"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={16} className="icon-inline" /> YouTube
              </a>
            </li>
          </ul>
        </div>

        {/* 🕒 Shop Hours */}
        <div className="footer-section">
          <h4>SHOP HOURS</h4>
          <h6>Monday - Saturday</h6>
          <p>08:00 AM – 5:00 PM</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 JOVEN TIRE ENTERPRISE. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
