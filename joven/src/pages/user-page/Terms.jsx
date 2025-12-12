import React from "react";
import Navbar from "../../components/Navbar";
import "../../styles/user-styles/Terms.css";



const Terms = () => {
  return (
    <>
      <Navbar />

      <div className="terms-page-container">
        <div className="terms-box">
          <h2>Terms & Conditions</h2>

          <p>
            By creating an account with <strong>JovenTire Enterprise</strong>, you
            agree to the following Terms & Conditions. These ensure a safe,
            secure, and transparent experience for all our users.
          </p>

          <h3>1. Account Registration</h3>
          <ul>
            <li>You must provide accurate and truthful personal information.</li>
            <li>You must be at least 18 years old to create an account.</li>
            <li>
              You are responsible for keeping your login credentials confidential.
            </li>
            <li>
              Any suspicious, fraudulent, or misleading information may lead to
              account suspension.
            </li>
          </ul>

          <h3>2. Use of Personal Information</h3>
          <p>
            By registering, you allow us to store and process your information for:
          </p>
          <ul>
            <li>Reservation scheduling and verification</li>
            <li>Customer identification</li>
            <li>Booking confirmations and alerts</li>
            <li>Internal record-keeping and security purposes</li>
          </ul>

          <p>
            We do <strong>NOT</strong> sell, trade, or share your information with
            third parties.
          </p>

          <h3>3. Reservation Policy</h3>
          <ul>
            <li>
              Users must follow the correct reservation procedure to ensure
              availability.
            </li>
            <li>
              Cancellations and changes may follow additional guidelines depending
              on shop policy.
            </li>
            <li>
              Misuse of reservation features may lead to blocked access or
              suspension.
            </li>
          </ul>

          <h3>4. System Communication</h3>
          <ul>
            <li>
              You agree to receive email notifications regarding verification,
              updates, and reservation status.
            </li>
            <li>
              You may unsubscribe from promotional emails, but essential updates
              cannot be disabled.
            </li>
          </ul>

          <h3>5. Security & Misuse</h3>
          <ul>
            <li>
              Any attempt to misuse the system or manipulate reservations will not
              be tolerated.
            </li>
            <li>
              The system automatically logs activities for safety and fraud
              prevention.
            </li>
          </ul>

          <h3>6. Agreement</h3>
          <p>
            By registering and using this system, you acknowledge that you have
            read, understood, and agreed to these Terms & Conditions.
          </p>
        </div>
      </div>
    </>
  );
};

export default Terms;
