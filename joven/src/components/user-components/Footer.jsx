import React from "react";
import "../../styles/Footer.css";
import { Facebook, MapPin, Phone } from "lucide-react";
import { FaTiktok, FaYoutube } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">

        {/* 🏪 Company Info */}
        <div className="footer-section">
          <h4>JOVEN TIRE ENTERPRISE</h4>

          <div className="branch">
            <h5>IMUS BRANCH</h5>
            <p>543 Aguinaldo Hwy, Imus, 4103 Cavite</p>

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
            <p>8W58+PWR, General Trias, Cavite</p>

            <p>
              <a
                href="https://www.waze.com/en/live-map/directions/joven-tire-enterprise-inc-general-trias-arnaldo-hwy?navigate=yes&place=w.79233167.792462743.27873088"
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

            {/* Facebook */}
            <li>
              <a
                href="https://www.facebook.com/joventireenterprise"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook size={16} className="icon-inline" /> Facebook
              </a>
            </li>

            {/* TikTok */}
            <li>
              <a
                href="https://www.tiktok.com/@joventire2022?is_from_webapp=1&sender_device=pc"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaTiktok size={16} className="icon-inline" /> TikTok
              </a>
            </li>

            {/* YouTube */}
            <li>
              <a
                href="https://www.youtube.com/watch?v=jkDENEXLjVo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaYoutube size={16} className="icon-inline" /> YouTube
              </a>
            </li>
          </ul>
        </div>

        {/* 🕒 Shop Hours */}
        <div className="footer-section">
          <h4>SHOP HOURS</h4>

          <h6>Monday – Saturday</h6>
          <p>7:30 AM – 5:30 PM</p>

          <h6>Sunday</h6>
          <p>8:00 AM – 4:00 PM</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 JOVEN TIRE ENTERPRISE. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
