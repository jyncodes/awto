import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import "../styles/LoginSection.css";

const LoginSection = ({ onClose, origin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isAllowedEmail = () => {
    const trimmedEmail = email.trim().toLowerCase();
    return trimmedEmail.endsWith('@gmail.com');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!isAllowedEmail()) {
      setError('Enter a valid email.');
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, 'users', user.uid);
      const staffRef = doc(db, 'staff', user.uid);
      const [userSnap, staffSnap] = await Promise.all([getDoc(userRef), getDoc(staffRef)]);

      let userData = null;
      if (userSnap.exists()) userData = userSnap.data();
      else if (staffSnap.exists()) userData = staffSnap.data();
      else {
        setError('User record not found in Firestore.');
        setLoading(false);
        return;
      }

      localStorage.setItem('isOTPVerified', 'true');
      localStorage.setItem('userData', JSON.stringify(userData));

      if (!user.emailVerified) navigate('/verify');
      else if (userData.role === 'Admin') navigate('/admin-dashboard');
      else if (userData.role === 'User') navigate('/');
      else if (userData.role === 'Staff') navigate('/staff-dashboard');
      else setError('Unknown user role.');

      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      setError('Invalid email or password.');
    }

    setLoading(false);
  };

  // ⭐ Forgot Password Handler
  const handleForgotPassword = async () => {
    setError('');

    if (!email) {
      setError("Enter your email to reset password.");
      return;
    }

    if (!isAllowedEmail()) {
      setError("Enter a valid email first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      alert("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error(err);
      setError("Failed to send reset email. Account may not exist.");
    }
  };

  return (
    <div className="login-popup-overlay">
      <div className="login-popup-frame">
        <div className="login-form">
          <button className="close-popup" onClick={onClose}>&times;</button>
          <h2 className="login-title">Sign in to your account</h2>

          {error && <p className="error-text">{error}</p>}

          <form onSubmit={handleLogin}>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />

            {!isAllowedEmail() && email && (
              <p className="error-text small">Please enter a valid email.</p>
            )}

            <label className="form-label mt-3">Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* ⭐ Forgot Password Button */}
            <button
              type="button"
              className="forgot-password-btn"
              onClick={handleForgotPassword}
              disabled={resetSent}
            >
              {resetSent ? "Reset Email Sent ✔" : "Forgot Password?"}
            </button>

            {/* Login Button */}
            <button type="submit" className="explore-button mt-5">
              Login
            </button>
          </form>

          <div className="mt-4">
            <p>Don’t have an account?</p>
            <Link
              to="/register"
              onClick={onClose}
              className="register-link"
            >
              Create an account
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginSection;
