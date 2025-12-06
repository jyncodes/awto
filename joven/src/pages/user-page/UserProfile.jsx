// src/pages/user-page/UserProfile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db, storage } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import "../../styles/user-styles/UserProfile.css";

// ⭐ ADD THIS ✔
import Navbar from "../../components/Navbar";

const UserProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData] = useState({});
  const [photoURL, setPhotoURL] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [reservations, setReservations] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const formatTimestamp = (ts) => {
    if (!ts?.toDate) return "N/A";
    return ts.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const fetchUserData = async (uid) => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      setUserData(data);
      setPhotoURL(data.photoURL || "");
    }
  };

  const fetchUserReservations = async (uid) => {
    const q = query(collection(db, "reservations"), where("userId", "==", uid));
    const snap = await getDocs(q);

    const arr = [];
    snap.forEach((docItem) => arr.push({ id: docItem.id, ...docItem.data() }));

    arr.sort((a, b) => {
      const aDate = a.preferredDate?.toDate?.() || 0;
      const bDate = b.preferredDate?.toDate?.() || 0;
      return bDate - aDate;
    });

    setReservations(arr);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserData(user.uid);
        await fetchUserReservations(user.uid);
        setLoading(false);
      } else {
        navigate("/login");
      }
    });

    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, [location.search]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    navigate(`/profile?tab=${tab}`);
    setSidebarVisible(false);
  };

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);

    try {
      if (selectedFile) {
        const imageRef = ref(storage, `profilePictures/${user.uid}`);
        await uploadBytes(imageRef, selectedFile);
        const url = await getDownloadURL(imageRef);
        setPhotoURL(url);

        await updateDoc(userRef, { ...userData, photoURL: url });
      } else {
        await updateDoc(userRef, userData);
      }
      alert("Profile updated!");
    } catch (error) {
      alert("Error saving profile: " + error.message);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword)
      return alert("Fill in all fields");

    if (newPassword.length < 6) return alert("Password too short");
    if (newPassword !== confirmPassword) return alert("Passwords don't match");

    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
      alert("Password updated!");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      alert("Error changing password: " + error.message);
    }
  };

  if (loading) return <div className="profile-loading">Loading...</div>;

  return (
    <>
      {/* ⭐ Navbar added correctly */}
      <Navbar />

      <div className="user-profile-page">
        {/* Mobile sidebar button */}
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarVisible(!sidebarVisible)}
        >
          ☰
        </button>

        <aside className={`profile-sidebar ${sidebarVisible ? "show" : ""}`}>
          <button className="back-home" onClick={() => navigate("/")}>
            ← Back to Home
          </button>

          <h2>My Account</h2>
          <ul>
            <li className={activeTab === "profile" ? "active" : ""}
              onClick={() => handleTabSwitch("profile")}
            >
              Profile
            </li>

            <li className={activeTab === "reservations" ? "active" : ""}
              onClick={() => handleTabSwitch("reservations")}
            >
              Reservations
            </li>

            <li className={activeTab === "settings" ? "active" : ""}
              onClick={() => handleTabSwitch("settings")}
            >
              Settings
            </li>

            <li onClick={() => auth.signOut()}>Logout</li>
          </ul>
        </aside>

        <main className="profile-content">
          {activeTab === "profile" && (
            <>
              <h2>Profile Information</h2>
              <div className="profile-photo-section">
                <img src={photoURL || "/default-profile.png"} alt="Profile" />
              </div>

              <div className="profile-details-view">
                <p><strong>Name:</strong> {userData.name}</p>
                <p><strong>Email:</strong> {userData.email}</p>
                <p><strong>Gender:</strong> {userData.gender}</p>
                <p><strong>Birthday:</strong> {userData.birthday}</p>
                <p><strong>Address:</strong> {userData.address}</p>
              </div>
            </>
          )}

          {activeTab === "reservations" && (
            <>
              <h2>My Reservations</h2>
              {reservations.length === 0 ? (
                <p>No reservations found.</p>
              ) : (
                <div className="orders-list">
                  {reservations.map((res) => (
                    <div key={res.id} className="order-card">
                      <p><strong>Product:</strong> {res.productName}</p>
                      <p><strong>Brand:</strong> {res.brand}</p>
                      <p><strong>Size:</strong> {res.size}</p>
                      <p><strong>Date:</strong> {formatTimestamp(res.preferredDate)}</p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span style={{ color: res.status === "Paid" ? "green" : "orange" }}>
                          {res.status}
                        </span>
                      </p>

                      {res.paymentStatus === "paid" ? (
                        <button className="receipt-button" onClick={() => navigate(`/receipt/${res.id}`)}>
                          View Receipt
                        </button>
                      ) : (
                        <button className="pay-button" onClick={() => navigate(`/payment/${res.id}`)}>
                          Proceed to Payment
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "settings" && (
            <>
              <h2>Account Settings</h2>

              <div className="profile-photo-section">
                <img src={photoURL || "/default-profile.png"} alt="Profile" />
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="profile-form">
                <input name="name" value={userData.name || ""} onChange={handleInputChange} placeholder="Name" />
                <input type="email" value={userData.email || ""} readOnly />
                <input name="gender" value={userData.gender || ""} onChange={handleInputChange} placeholder="Gender" />
                <input type="date" name="birthday" value={userData.birthday || ""} onChange={handleInputChange} />
                <input name="address" value={userData.address || ""} onChange={handleInputChange} placeholder="Address" />

                <button onClick={handleSave}>Save Changes</button>
              </div>

              <div className="password-update">
                <h3>Change Password</h3>

                <input type="password" placeholder="Current Password"
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />

                <input type="password" placeholder="New Password"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />

                <input type="password" placeholder="Confirm New Password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

                <button onClick={handlePasswordUpdate}>Update Password</button>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default UserProfile;
