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
            By creating an account and using the services of{" "}
            <strong>JovenTire Enterprise</strong>, you agree to comply with and be
            bound by these Terms & Conditions. These terms are established to
            protect both the users and the business, ensuring a secure and fair
            reservation and service system.
          </p>

          <h3>1. Eligibility & Account Registration</h3>
          <ul>
            <li>
              Users must be <strong>18 years old or above</strong> to register.
            </li>
            <li>
              All information provided during registration must be accurate,
              complete, and truthful.
            </li>
            <li>
              Users are responsible for maintaining the confidentiality of their
              account credentials.
            </li>
            <li>
              Any false information, misuse, or suspicious activity may result in
              account suspension or termination.
            </li>
          </ul>

          <h3>2. Personal Data & Privacy</h3>
          <p>
            The system collects personal information such as name, email address,
            contact number, gender, birthday, and address strictly for operational
            purposes.
          </p>
          <ul>
            <li>Account creation and user identification</li>
            <li>Reservation scheduling and verification</li>
            <li>Service notifications and transaction records</li>
            <li>Security monitoring and system improvements</li>
          </ul>

          <p>
            JovenTire Enterprise is committed to protecting user data. Personal
            information will <strong>not be sold, rented, or shared</strong> with
            third parties without user consent, except when required by law.
          </p>

          <h3>3. Reservations, Bookings & No-Show Policy</h3>
          <ul>
            <li>
              All reservations are subject to availability and confirmation.
            </li>
            <li>
              Users must select the correct service, product, date, and time
              during reservation.
            </li>
            <li>
              Failure to arrive on the scheduled date and time without prior
              notice will be considered a <strong>no-show</strong>.
            </li>
            <li>
              <strong>No-show reservations are strictly non-refundable.</strong>
            </li>
          </ul>

          <h3>4. Payments & Transactions (If Applicable)</h3>
          <ul>
            <li>
              All displayed prices are subject to change without prior notice.
            </li>
            <li>
              Payments processed through the system are handled securely using
              approved payment providers.
            </li>
            <li>
              The business reserves the right to refuse service in cases of
              fraudulent transactions.
            </li>
          </ul>

          <h3>5. System Usage & Prohibited Activities</h3>
          <ul>
            <li>Providing false or misleading information</li>
            <li>Attempting to bypass system security or restrictions</li>
            <li>Abusing staff, services, or system features</li>
            <li>Engaging in fraudulent or malicious activities</li>
          </ul>

          <p>
            Any violation of these rules may lead to account suspension,
            termination, or legal action if necessary.
          </p>

          <h3>6. System Availability & Limitation of Liability</h3>
          <p>
            The system is provided on an <strong>“as is”</strong> basis. While
            reasonable efforts are made to ensure system availability, JovenTire
            Enterprise shall not be held liable for:
          </p>
          <ul>
            <li>Temporary system downtime or technical issues</li>
            <li>User errors during registration or reservation</li>
            <li>Delays caused by network or third-party service providers</li>
          </ul>

          <h3>7. Changes to Terms</h3>
          <p>
            JovenTire Enterprise reserves the right to update or modify these Terms
            & Conditions at any time. Continued use of the system after changes
            indicates acceptance of the revised terms.
          </p>

          <h3>8. Acceptance of Terms</h3>
          <p>
            By registering an account and using this system, you confirm that you
            have read, understood, and agreed to these Terms & Conditions.
          </p>
        </div>
      </div>
    </>
  );
};

export default Terms;
