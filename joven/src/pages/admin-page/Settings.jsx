// src/pages/admin-page/Settings.jsx
import React, { useEffect, useState } from "react";
import { auth, db, secondaryAuth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import "../../styles/admin-styles/Settings.css";

const AdminSettings = () => {
  const [adminData, setAdminData] = useState({ name: "", email: "" });
  const [editName, setEditName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // =============================
  // STAFF MANAGEMENT STATES
  // =============================
  const [staffs, setStaffs] = useState([]);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [staffLoading, setStaffLoading] = useState(false);

  // =============================
  // DOWNPAYMENT SETTINGS STATE
  // =============================
  const [downpayment, setDownpayment] = useState("");
  const [savingDownpayment, setSavingDownpayment] = useState(false);

  // =============================
  // FETCH ADMIN INFO + SETTINGS
  // =============================
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const data = userDoc.data();
          setAdminData({
            name: data.name || user.displayName || "Admin",
            email: data.email || user.email || "",
          });
          setEditName(data.name || "");
        } else {
          setAdminData({
            name: user.displayName || "Admin",
            email: user.email || "",
          });
          setEditName(user.displayName || "");
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      }
    };

    const fetchDownpaymentSetting = async () => {
      try {
        const settingsRef = doc(db, "settings", "payments");
        const snap = await getDoc(settingsRef);

        if (snap.exists()) {
          setDownpayment(snap.data().downpayment || "");
        } else {
          setDownpayment("");
        }
      } catch (error) {
        console.error("Error loading payment settings:", error);
      }
    };

    fetchAdmin();
    fetchStaffs();
    fetchDownpaymentSetting();
  }, []);

  // =============================
  // UPDATE ADMIN NAME
  // =============================
  const handleNameUpdate = async () => {
    if (!editName.trim()) {
      alert("Name cannot be empty.");
      return;
    }

    try {
      setSavingName(true);
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          name: editName.trim(),
        });
        setAdminData((prev) => ({ ...prev, name: editName.trim() }));
        alert("Name updated successfully!");
      }
    } catch (error) {
      console.error("Error updating name:", error);
      alert("Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  // =============================
  // UPDATE PASSWORD
  // =============================
  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      alert("Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const user = auth.currentUser;
      const currentPassword = prompt("Please re-enter your current password:");
      if (!currentPassword) {
        setLoading(false);
        return;
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      await updatePassword(user, newPassword);
      alert("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      alert(error.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  // =============================
  // STAFF MANAGEMENT FUNCTIONS
  // =============================

  const fetchStaffs = async () => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "Staff"));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStaffs(staffList);
    } catch (error) {
      console.error("Error fetching staff:", error);
      alert("Failed to load staff data.");
    }
  };

  const handleStaffInputChange = (e) => {
    const { name, value } = e.target;
    setNewStaff((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newStaff.email,
        newStaff.password
      );
      const newUser = userCredential.user;

      await sendEmailVerification(newUser);

      await setDoc(doc(db, "users", newUser.uid), {
        name: newStaff.name,
        email: newStaff.email,
        role: "Staff",
        createdAt: new Date().toISOString(),
      });

      await fetchStaffs();
      setNewStaff({ name: "", email: "", password: "" });
      alert("✅ Staff account created and email verification sent.");
    } catch (error) {
      console.error("Error creating staff:", error);
      alert(error.message);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleDeleteStaff = async (uid) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this staff?"
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", uid));
      await fetchStaffs();
      alert("✅ Staff deleted successfully.");
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("❌ Failed to delete staff.");
    }
  };

  // =============================
  // SAVE DOWNPAYMENT SETTING
  // =============================
  const handleSaveDownpayment = async () => {
    if (downpayment === "" || isNaN(downpayment)) {
      alert("Please enter a valid numeric value.");
      return;
    }

    try {
      setSavingDownpayment(true);
      await setDoc(doc(db, "settings", "payments"), {
        downpayment: Number(downpayment),
      });

      alert("✅ Downpayment updated successfully!");
    } catch (error) {
      console.error("Error saving downpayment:", error);
      alert("Failed to update downpayment.");
    } finally {
      setSavingDownpayment(false);
    }
  };

  // =============================
  // RENDER SECTION
  // =============================
  return (
    <div className="settings-container">
      <h1 className="settings-title">Admin Settings</h1>

      {/* =================== ADMIN INFO =================== */}
      <div className="settings-section">
        <h2>Admin Info</h2>
        <div className="settings-field">
          <label>Name:</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>
        <div className="settings-field">
          <label>Email:</label>
          <input type="email" value={adminData.email || ""} disabled />
        </div>
        <button
          className="settings-button"
          onClick={handleNameUpdate}
          disabled={savingName}
        >
          {savingName ? "Saving..." : "Update Name"}
        </button>
      </div>

      {/* =================== CHANGE PASSWORD =================== */}
      <div className="settings-section">
        <h2>Change Password</h2>
        <div className="settings-field">
          <label>New Password:</label>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>
        <div className="settings-field">
          <label>Confirm Password:</label>
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <button
          className="settings-button"
          onClick={handlePasswordUpdate}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Password"}
        </button>
      </div>

      {/* =================== RESERVATION DOWNPAYMENT SETTINGS =================== */}
      <div className="settings-section">
        <h2>Reservation Downpayment</h2>

        <div className="settings-field">
          <label>Downpayment Amount (₱):</label>
          <input
            type="number"
            value={downpayment}
            onChange={(e) => setDownpayment(e.target.value)}
            placeholder="Enter amount (e.g. 500)"
          />
        </div>

        <button
          className="settings-button"
          onClick={handleSaveDownpayment}
          disabled={savingDownpayment}
        >
          {savingDownpayment ? "Saving..." : "Save Downpayment"}
        </button>
      </div>

      {/* =================== STAFF MANAGEMENT =================== */}
      <div className="staff-container">
        <div className="staff-header">
          <h2>👥 Staff Management</h2>
        </div>

        <div className="staff-content">
          {/* Form Section */}
          <div className="staff-form-section">
            <h3>Add New Staff</h3>
            <form className="staff-form" onSubmit={handleAddStaff}>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={newStaff.name}
                onChange={handleStaffInputChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={newStaff.email}
                onChange={handleStaffInputChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Temporary Password"
                value={newStaff.password}
                onChange={handleStaffInputChange}
                required
                minLength={6}
              />
              <button type="submit" disabled={staffLoading}>
                {staffLoading ? "Creating..." : "➕ Add Staff"}
              </button>
            </form>
          </div>

          {/* List Section */}
          <div className="staff-list-section">
            <h3>Current Staff</h3>
            {staffs.length === 0 ? (
              <p className="no-staff">No staff registered yet.</p>
            ) : (
              <ul className="staff-list">
                {staffs.map((staff) => (
                  <li key={staff.id} className="staff-item">
                    <div className="staff-avatar">
                      <span>{staff.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="staff-info">
                      <strong>{staff.name}</strong>
                      <small>{staff.email}</small>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteStaff(staff.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li> 
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
