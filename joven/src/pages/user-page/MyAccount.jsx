// src/pages/user-page/MyAccount.jsx
import React, { useEffect, useState, useMemo } from "react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import "../../styles/user-styles/MyAccount.css";

const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};

const MyAccount = () => {
  const [userData, setUserData] = useState({});
  const [editedData, setEditedData] = useState({});
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  /* ---------------- FETCH USER DATA ---------------- */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchUserData = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        setUserData(snap.data());
        setEditedData(snap.data());
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  /* ---------------- FORM HANDLERS ---------------- */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  const isValidName = (name) => {
  const trimmed = name.trim();
  const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;
  return nameRegex.test(trimmed);
};

const handleNameChange = (e) => {
  let value = e.target.value;

  // ❌ Block leading spaces
  if (value.startsWith(" ")) return;

  // ❌ Allow letters and spaces only
  if (!/^[A-Za-z ]*$/.test(value)) return;

  setEditedData((prev) => ({
    ...prev,
    name: value,
  }));
};



  /* ---------------- SAVE PROFILE (WITH VALIDATION) ---------------- */
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!editedData.name) {
    return alert("Name is required.");
    }

    if (!isValidName(editedData.name)) {
    return alert("Name must contain letters only and cannot start with a space.");
    }


    if (!editedData.gender) {
      return alert("Please select your gender.");
    }

    if (!editedData.birthday) {
      return alert("Birthday is required.");
    }

    if (!editedData.contact) {
      return alert("Contact number is required.");
    }

    if (!/^09\d{9}$/.test(editedData.contact)) {
      return alert("Contact number must be 11 digits and start with 09.");
    }

    try {
        await updateDoc(doc(db, "users", user.uid), {
        ...editedData,
        name: editedData.name.trim(),
        });


      const customerQuery = query(
        collection(db, "customers"),
        where("uid", "==", user.uid)
      );
      const customerSnap = await getDocs(customerQuery);

      if (!customerSnap.empty) {
        await updateDoc(doc(db, "customers", customerSnap.docs[0].id), {
          name: editedData.name.trim(),
          email: editedData.email,
          address: editedData.address,
          gender: editedData.gender,
          birthday: editedData.birthday,
          contact: editedData.contact,
        });
      }

      setUserData(editedData);
      alert("Profile updated!");
    } catch (err) {
      console.error("save error:", err);
      alert("Error saving profile");
    }
  };

  /* ---------------- PASSWORD VALIDATION ---------------- */
  const validatePassword = (value) => {
    const errs = [];
    if (value.length < PASSWORD_RULES.minLength)
      errs.push(`At least ${PASSWORD_RULES.minLength} characters`);
    if (!PASSWORD_RULES.uppercase.test(value))
      errs.push("At least 1 uppercase letter");
    if (!PASSWORD_RULES.special.test(value))
      errs.push("At least 1 special character");
    setPasswordErrors(errs);
  };

  /* ⭐ SAME LOGIC AS OLD UserProfile.jsx */
  useEffect(() => {
    if (newPassword !== "") validatePassword(newPassword);
    else setPasswordErrors([]);
  }, [newPassword]);

  const passwordStrength = useMemo(() => {
    let score = 0;
    if (newPassword.length >= PASSWORD_RULES.minLength) score++;
    if (PASSWORD_RULES.uppercase.test(newPassword)) score++;
    if (PASSWORD_RULES.special.test(newPassword)) score++;
    if (newPassword.length >= 12) score++;

    if (score <= 1) return "weak";
    if (score === 2 || score === 3) return "medium";
    return "strong";
  }, [newPassword]);

  /* ---------------- PASSWORD UPDATE ---------------- */
  const handlePasswordUpdate = async () => {
    if (!currentPassword) {
      return alert("Please enter your current password.");
    }

    if (!newPassword) {
      return alert("New password is required.");
    }

    if (passwordErrors.length > 0) {
      return alert("Password does not meet requirements.");
    }

    if (newPassword !== confirmPassword) {
      return alert("Passwords do not match.");
    }

    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);

      alert("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors([]);
    } catch (err) {
      console.error("change password error:", err);
      alert("Error changing password");
    }
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <>
      <h2>My Account</h2>

      <div className="profile-details-view">
        <p><strong>Name:</strong> {userData.name}</p>
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Gender:</strong> {userData.gender}</p>
        <p><strong>Birthday:</strong> {userData.birthday}</p>
        <p><strong>Address:</strong> {userData.address}</p>
        <p><strong>Contact:</strong> {userData.contact}</p>
      </div>

      <div className="profile-form">
        <h3>Edit Information</h3>

        <input
        name="name"
        value={editedData.name || ""}
        onChange={handleNameChange}
        placeholder="Full Name"
        />


        <input type="email" value={editedData.email || ""} readOnly />

        <select
          name="gender"
          value={editedData.gender || ""}
          onChange={handleInputChange}
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <input
          type="date"
          name="birthday"
          value={editedData.birthday || ""}
          onChange={handleInputChange}
        />

        <input
          name="address"
          value={editedData.address || ""}
          onChange={handleInputChange}
        />

        <input
          name="contact"
          value={editedData.contact || ""}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            setEditedData((prev) => ({ ...prev, contact: value }));
          }}
          placeholder="Contact Number (09xxxxxxxxx)"
          maxLength={11}
        />

        <button onClick={handleSave}>Save Changes</button>
      </div>

      <div className="password-update">
        <h3>Change Password</h3>

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />

        <input
          type={showPassword ? "text" : "password"}
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <div className="pwd-meter">
          <div className={`meter-bar ${passwordStrength}`}></div>
          <div className="meter-label">Strength: {passwordStrength}</div>
        </div>

        {passwordErrors.length > 0 && (
          <ul className="password-errors">
            {passwordErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <label className="show-pass-inline">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={() => setShowPassword((s) => !s)}
          />
          Show Password
        </label>

        <button
          className={
            passwordErrors.length > 0 ||
            newPassword === "" ||
            newPassword !== confirmPassword
              ? "disabled-btn"
              : ""
          }
          disabled={
            passwordErrors.length > 0 ||
            newPassword === "" ||
            newPassword !== confirmPassword
          }
          onClick={handlePasswordUpdate}
        >
          Update Password
        </button>
      </div>
    </>
  );
};

export default MyAccount;
