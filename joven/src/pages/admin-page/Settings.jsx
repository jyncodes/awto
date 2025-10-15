// src/pages/admin-page/Settings.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import {
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
  // FETCH ADMIN INFO FROM FIRESTORE
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
          // fallback to Auth if no Firestore record found
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

    fetchAdmin();
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

      // Reauthenticate before updating password
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
  // DELETE ACCOUNT (DANGER ZONE)
  // =============================
  const handleDeleteAccount = async () => {
    const confirmation = window.confirm(
      "Are you sure you want to delete this admin account? This action is irreversible."
    );
    if (!confirmation) return;

    try {
      await auth.currentUser.delete();
      alert("Admin account deleted.");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account. Reauthenticate and try again.");
    }
  };

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

      {/* =================== DANGER ZONE =================== */}
      <div className="settings-section danger-zone">
        <h2>Danger Zone</h2>
        <p>This action is irreversible.</p>
        <button className="danger-btn" onClick={handleDeleteAccount}>
          Delete Admin Account
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
