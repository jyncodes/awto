import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import "../styles/Register.css";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    address: "",
    gender: "",
    birthday: "",
    terms: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // PASSWORD CHECKLIST STATE
  const [passwordChecklist, setPasswordChecklist] = useState({
    show: false,
    length: false,
    uppercase: false,
    special: false,
  });

  // Auto-limit birthday picker to 18 years old
  const getMinAgeDate = () => {
    const today = new Date();
    today.setFullYear(today.getFullYear() - 18);
    return today.toISOString().split("T")[0];
  };

  // LIVE VALIDATION HANDLER
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({ ...prev, [name]: "" }));

    // NAME VALIDATION (letters only + cannot start with space)
    if (name === "name" && value !== "") {
      if (!/^[A-Za-z][A-Za-z ]*$/.test(value)) {
        setErrors((prev) => ({
          ...prev,
          name: "Name must contain letters only and cannot start with a space.",
        }));
      }
    }

    // EMAIL VALIDATION
    if (name === "email" && value !== "") {
      const emailRegex = /^[^\s@]+@gmail\.com$/;
      if (!emailRegex.test(value)) {
        setErrors((prev) => ({
          ...prev,
          email: "Email must end with @gmail.com",
        }));
      }
    }

    // PASSWORD LIVE CHECKLIST
    if (name === "password") {
      const lengthOK = value.length >= 8;
      const upperOK = /[A-Z]/.test(value);
      const specialOK = /[!@#$%^&*(),.?":{}|<>]/.test(value);

      setPasswordChecklist({
        show: value !== "",
        length: lengthOK,
        uppercase: upperOK,
        special: specialOK,
      });

      if (lengthOK && upperOK && specialOK) {
        setErrors((prev) => ({ ...prev, password: "" }));
      }
    }

    // CONFIRM PASSWORD VALIDATION
    if (name === "confirmPassword" && value !== "") {
      if (value !== formData.password) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match.",
        }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
    }

    // AGE VALIDATION (18+)
    if (name === "birthday" && value !== "") {
      const birthDate = new Date(value);
      const today = new Date();

      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      const is18 =
        age > 18 ||
        (age === 18 && monthDiff >= 0) ||
        (age === 18 && monthDiff === 0 && today.getDate() >= birthDate.getDate());

      if (!is18) {
        setErrors((prev) => ({
          ...prev,
          birthday: "You must be 18 years old or above.",
        }));
      }
    }
  };

  // FINAL FORM VALIDATION
  const validateForm = () => {
    const {
      name,
      email,
      password,
      confirmPassword,
      address,
      gender,
      birthday,
      terms,
    } = formData;
    let tempErrors = {};

    if (!name) tempErrors.name = "Name is required.";
    if (!email) tempErrors.email = "Email is required.";
    if (!password) tempErrors.password = "Password is required.";
    if (!confirmPassword)
      tempErrors.confirmPassword = "Please confirm your password.";
    if (!address) tempErrors.address = "Address is required.";
    if (!gender) tempErrors.gender = "Gender is required.";
    if (!birthday) tempErrors.birthday = "Birthday is required.";
    if (!terms)
      tempErrors.terms = "You must accept the Terms & Conditions.";

    // FINAL EMAIL CHECK
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (email && !emailRegex.test(email)) {
      tempErrors.email = "Please use a valid Gmail address.";
    }

    // FINAL PASSWORD CHECK
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (password && !passwordRegex.test(password)) {
      tempErrors.password =
        "Password must have 8 chars, 1 uppercase, 1 special character.";
    }

    // FINAL CONFIRM MATCH
    if (password !== confirmPassword) {
      tempErrors.confirmPassword = "Passwords do not match.";
    }

    // FINAL AGE CHECK
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    const is18 =
      age > 18 ||
      (age === 18 && monthDiff >= 0) ||
      (age === 18 && monthDiff === 0 && today.getDate() >= birthDate.getDate());

    if (birthday && !is18) {
      tempErrors.birthday = "You must be 18 years old or above.";
    }

    setErrors(tempErrors);

    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await sendEmailVerification(user);

      // 1️⃣ Save to `users` collection linked to UID
      await setDoc(doc(db, "users", user.uid), {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        gender: formData.gender,
        birthday: formData.birthday,
        role: "User",
        createdAt: serverTimestamp(),
      });

      // 2️⃣ Generate Incrementing Customer Code
      const counterRef = doc(db, "counters", "customerCounter");

      let customerCode = "";

      await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);

      // If the counter doc doesn't exist yet, create it
      let lastId = 0;
      if (!counterSnap.exists()) {
        transaction.set(counterRef, { lastId: 0 });
      } else {
        lastId = counterSnap.data().lastId;
      }

      // Increment
      lastId += 1;

      // Generate formatted code
      customerCode = `CU-${String(lastId).padStart(5, "0")}`;

      // Save new ID back to Firestore
      transaction.set(counterRef, { lastId }, { merge: true });
    });


      // 3️⃣ Store as customer profile
      await setDoc(doc(db, "customers", customerCode), {
        uid: user.uid, // 🔗 connection
        customerCode,
        name: formData.name,
        email: formData.email,
        address: formData.address,
        gender: formData.gender,
        birthday: formData.birthday,
        registeredAt: serverTimestamp(),
      });

      // 4️⃣ Optional: 2FA placeholder
      await setDoc(doc(db, "2fa", user.uid), {
        enabled: false,
        lastOTP: null,
        expiresAt: null,
      });

      navigate("/verify");

    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
      <Navbar />

      <div className="login-form">
        <h2>Create an Account</h2>

        <form onSubmit={handleRegister}>
          {/* NAME */}
          <label>Name:</label>
          {errors.name && <p className="error-text">{errors.name}</p>}
          <input
            id="name"
            className={`form-input ${errors.name ? "input-error" : ""}`}
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />

          {/* EMAIL */}
          <label>Email (Gmail only):</label>
          {errors.email && <p className="error-text">{errors.email}</p>}
          <input
            id="email"
            className={`form-input ${errors.email ? "input-error" : ""}`}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your Gmail address"
            required
          />

          {/* PASSWORD */}
          <label>Password:</label>
          {errors.password && <p className="error-text">{errors.password}</p>}

          <input
            id="password"
            className={`form-input ${errors.password ? "input-error" : ""}`}
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            onFocus={() =>
              setPasswordChecklist((prev) => ({ ...prev, show: true }))
            }
            placeholder="Create a strong password"
            required
          />

          {/* CHECKLIST WITH CHECK ICONS */}
          {passwordChecklist.show && (
            <ul className="password-checklist">
              <li style={{ color: passwordChecklist.length ? "green" : "red" }}>
                {passwordChecklist.length ? "✔" : "✖"} At least 8 characters
              </li>
              <li style={{ color: passwordChecklist.uppercase ? "green" : "red" }}>
                {passwordChecklist.uppercase ? "✔" : "✖"} At least 1 uppercase letter
              </li>
              <li style={{ color: passwordChecklist.special ? "green" : "red" }}>
                {passwordChecklist.special ? "✔" : "✖"} At least 1 special character
              </li>
            </ul>
          )}

          {/* CONFIRM PASSWORD */}
          <label>Confirm Password:</label>
          {errors.confirmPassword && (
            <p className="error-text">{errors.confirmPassword}</p>
          )}

          <input
            id="confirmPassword"
            className={`form-input ${
              errors.confirmPassword ? "input-error" : ""
            }`}
            type={showPassword ? "text" : "password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            onFocus={() =>
              setPasswordChecklist((prev) => ({ ...prev, show: true }))
            }
            placeholder="Confirm your password"
            required
          />

          {/* SHOW PASSWORD CHECKBOX */}
          <div className="show-password">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
              id="showpass"
            />
            <label htmlFor="showpass">Show password</label>
          </div>

          {/* ADDRESS */}
          <label>Address:</label>
          {errors.address && <p className="error-text">{errors.address}</p>}
          <input
            id="address"
            className={`form-input ${errors.address ? "input-error" : ""}`}
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter your address"
            required
          />

          {/* GENDER */}
          <label>Gender:</label>
          {errors.gender && <p className="error-text">{errors.gender}</p>}
          <select
            id="gender"
            className={`form-input ${errors.gender ? "input-error" : ""}`}
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          {/* BIRTHDAY (AUTO-LIMITED TO 18 YEARS) */}
          <label>Birthday:</label>
          {errors.birthday && <p className="error-text">{errors.birthday}</p>}
          <input
            id="birthday"
            className={`form-input ${errors.birthday ? "input-error" : ""}`}
            type="date"
            name="birthday"
            max={getMinAgeDate()}
            value={formData.birthday}
            onChange={handleChange}
            required
          />

          {/* TERMS */}
          <div>
            <input
              type="checkbox"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
              id="terms"
            />{" "}
            <label htmlFor="terms">I accept the Terms & Conditions</label>
            {errors.terms && <p className="error-text">{errors.terms}</p>}
          </div>

          {/* SUBMIT */}
          <button
            className="register-button"
            type="submit"
            disabled={!formData.terms}
          >
            Register
          </button>
        </form>
      </div>
    </>
  );
};

export default Register;
