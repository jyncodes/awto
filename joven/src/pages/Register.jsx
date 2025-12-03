import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Navbar from '../components/Navbar';
import '../styles/LandingPage.css';
import { Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    gender: '',
    birthday: '',
    terms: false,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword, address, gender, birthday, terms } = formData;
    let tempErrors = {};

    if (!name) tempErrors.name = 'Name is required.';
    if (!email) tempErrors.email = 'Email is required.';
    if (!password) tempErrors.password = 'Password is required.';
    if (!confirmPassword) tempErrors.confirmPassword = 'Please confirm your password.';
    if (!address) tempErrors.address = 'Address is required.';
    if (!gender) tempErrors.gender = 'Gender is required.';
    if (!birthday) tempErrors.birthday = 'Birthday is required.';
    if (!terms) tempErrors.terms = 'You must accept the Terms & Conditions.';

    // Gmail only
    const emailRegex = /^[^\s@]+@gmail\.com$/;
    if (email && !emailRegex.test(email)) tempErrors.email = 'Please use a valid Gmail address.';

    // Strong password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|:;"'<>,.?/]).{8,}$/;
    if (password && !passwordRegex.test(password)) {
      tempErrors.password = 'Password is not strong enough.';
      tempErrors.confirmPassword = 'Password is not strong enough.';
    }

    // Confirm password match
    if (password && confirmPassword && password !== confirmPassword) {
      tempErrors.confirmPassword = 'Passwords do not match.';
    }

    // Birthday check
    const birthDate = new Date(birthday);
    const today = new Date();
    if (birthday && birthDate > today) tempErrors.birthday = 'Birthday cannot be in the future.';

    setErrors(tempErrors);

    return Object.keys(tempErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await sendEmailVerification(user);
      navigate('/verify');

      await setDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        gender: formData.gender,
        birthday: formData.birthday,
        role: 'User',
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, '2fa', user.uid), {
        enabled: false,
        lastOTP: null,
        expiresAt: null,
      });
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message);
    }
  };

  return (
    <>
      <Navbar />
      <div className="login-form" style={{ maxWidth: '500px', margin: '4rem auto' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Create an Account</h2>
        <form onSubmit={handleRegister}>
          {/* Name */}
          <label className="form-label" htmlFor="name">Name:</label>
          {errors.name && <p className="error-text">{errors.name}</p>}
          <input
            id="name"
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            required
          />

          {/* Email */}
          <label className="form-label" htmlFor="email">Email (Gmail only):</label>
          {errors.email && <p className="error-text">{errors.email}</p>}
          <input
            id="email"
            className={`form-input ${errors.email ? 'input-error' : ''}`}
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your Gmail address"
            required
          />

          {/* Password */}
          <label className="form-label" htmlFor="password">Password:</label>
          {errors.password && <p className="error-text">{errors.password}</p>}
          <div className="password-wrapper">
            <input
              id="password"
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              required
            />
            <div
              className="password-toggle"
              onMouseDown={() => setShowPassword(true)}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </div>
          </div>

          {/* Confirm Password */}
          <label className="form-label" htmlFor="confirmPassword">Confirm Password:</label>
          {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
          <div className="password-wrapper">
            <input
              id="confirmPassword"
              className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
              type={showConfirm ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
            <div
              className="password-toggle"
              onMouseDown={() => setShowConfirm(true)}
              onMouseUp={() => setShowConfirm(false)}
              onMouseLeave={() => setShowConfirm(false)}
            >
              {showConfirm ? <EyeOff /> : <Eye />}
            </div>
          </div>

          {/* Address */}
          <label className="form-label" htmlFor="address">Address:</label>
          {errors.address && <p className="error-text">{errors.address}</p>}
          <input
            id="address"
            className={`form-input ${errors.address ? 'input-error' : ''}`}
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Enter your address"
            required
          />

          {/* Gender */}
          <label className="form-label" htmlFor="gender">Gender:</label>
          {errors.gender && <p className="error-text">{errors.gender}</p>}
          <select
            id="gender"
            className={`form-input ${errors.gender ? 'input-error' : ''}`}
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

          {/* Birthday */}
          <label className="form-label" htmlFor="birthday">Birthday:</label>
          {errors.birthday && <p className="error-text">{errors.birthday}</p>}
          <input
            id="birthday"
            className={`form-input ${errors.birthday ? 'input-error' : ''}`}
            type="date"
            name="birthday"
            value={formData.birthday}
            onChange={handleChange}
            required
          />

          {/* Terms & Conditions */}
          <div style={{ margin: '1rem 0' }}>
            <input
              type="checkbox"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
              id="terms"
            />{' '}
            <label htmlFor="terms">I accept the Terms & Conditions</label>
            {errors.terms && <p className="error-text">{errors.terms}</p>}
          </div>

          <button
            className="register-button"
            type="submit"
            disabled={!formData.terms}
            style={{ marginTop: '1rem' }}
          >
            Register
          </button>
        </form>
      </div>
    </>
  );
};

export default Register;
