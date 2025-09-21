import React from "react";
import "../../styles/Footer.css"; 
import { FaFacebookF, FaYoutube } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-top">
        <div className="newsletter">
          <h4>LET'S STAY CONNECTED</h4>
          <p>Keep up to date with Joven Tire Enterprise. Join our newsletter.</p>
          <input type="email" placeholder="Enter your email" />
          <p>
            Your personal info is protected. View our{" "}
            <a href="#" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>.
          </p>
          <div className="social-icons">
            <a
              href="https://www.facebook.com/joventireenterprise"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaFacebookF />
            </a>
            <a
              href="https://www.youtube.com/watch?v=jkDENEXLjVo&ab_channel=MaxxisTiresPhilippines"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaYoutube />
            </a>
          </div>
        </div>

        <div className="footer-links">
          <div>
            <h5>Information</h5>
            <ul>
              <li><a href="#">Company Story</a></li>
              <li><a href="#">Catalog</a></li>
              <li><a href="#">News</a></li>
              <li><a href="#">Careers</a></li>
            </ul>
          </div>
          <div>
            <h5>Support</h5>
            <ul>
              <li><a href="#">Warranty</a></li>
              <li><a href="#">Returns</a></li>
              <li><a href="#">Wheel Care</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>
          <div>
            <h5>Dealers</h5>
            <ul>
              <li><a href="#">Find a Dealer</a></li>
              <li><a href="#">Become a Dealer</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>COPYRIGHT © 2025 Joven Tire Enterprise</p>
        <div className="footer-policies">
          <a href="#" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <a href="#" target="_blank" rel="noopener noreferrer">Terms</a>
          <a href="#" target="_blank" rel="noopener noreferrer">Accessibility</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
