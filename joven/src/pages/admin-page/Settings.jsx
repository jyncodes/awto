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

} from "firebase/auth";
import "../../styles/admin-styles/Settings.css";

// ✅ ADDED IMPORT
import ResetCounterModal from "../../components/admin-components/ResetCounterModal";

const AdminSettings = () => { 
  const [adminData, setAdminData] = useState({ name: "", email: "" });
    // Required for editable admin fields
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

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
  // DOWNPAYMENT SETTINGS
  // =============================
  const [downpayment, setDownpayment] = useState("");
  const [savingDownpayment, setSavingDownpayment] = useState(false);

  // ✅ ADDED STATE FOR RESET COUNTER MODAL
  const [showResetModal, setShowResetModal] = useState(false);

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
  // STAFF FUNCTIONS
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
      alert("Staff account created and email verification sent.");
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
      alert("Staff deleted successfully.");
    } catch (error) {
      console.error("Error deleting staff:", error);
      alert("Failed to delete staff.");
    }
  };

  // =============================
  // SAVE DOWNPAYMENT
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

      alert("Downpayment updated successfully!");
    } catch (error) {
      console.error("Error saving downpayment:", error);
      alert("Failed to update downpayment.");
    } finally {
      setSavingDownpayment(false);
    }
  };

  // =============================
  // RENDER
  // =============================
  return (
    <div className="settings-container">
      <h1 className="settings-title">Admin Settings</h1>

      {/* =================== ADMIN INFO =================== */}
      <div className="settings-section">
        <h2>Admin Info</h2>
        <div className="settings-field">
          <label>Name:</label>
          <input type="text" value={adminData.name || ""} disabled />
        </div>
        <div className="settings-field">
          <label>Email:</label>
          <input type="email" value={adminData.email || ""} disabled />
        </div>

      </div>

      {/* =================== DOWNPAYMENT =================== */}
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

      {/* ============================= */}
      {/* ✅ RESET COUNTER BUTTON */}
      {/* ============================= */}
      <div className="settings-section">
        <h2>System Maintenance</h2>
        <button
          className="settings-button danger"
          onClick={() => setShowResetModal(true)}
        >
          Reset Counter
        </button>
      </div>

      {/* ============================= */}
      {/* ✅ RESET COUNTER MODAL */}
      {/* ============================= */}
      <ResetCounterModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};

export default AdminSettings;
