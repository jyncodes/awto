// src/pages/user-page/UserProfile.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import "../../styles/user-styles/UserProfile.css";
import Navbar from "../../components/Navbar";

const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};

const UserProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [userData, setUserData] = useState({});
  const [editedData, setEditedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("myaccount");
  const [reservations, setReservations] = useState([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showModal, setShowModal] = useState(false);
const [selectedReservation, setSelectedReservation] = useState(null);
const [sortOption, setSortOption] = useState("newest");


  const formatTimestamp = (ts) => {
    if (!ts?.toDate) return "N/A";
    return ts.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const fetchUserData = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        setUserData(snap.data());
        setEditedData(snap.data());
      }
    } catch (err) {
      console.error("fetchUserData error:", err);
    }
  };

  const fetchUserReservations = async (uid) => {
    try {
      const q = query(collection(db, "reservations"), where("userId", "==", uid));
      const snap = await getDocs(q);
      const arr = [];

      snap.forEach((d) => {
        const data = d.data();
        arr.push({ id: data.id || d.id, ...data });
      });

      arr.sort((a, b) => {
        const aDate = a.preferredDate?.toDate?.() || 0;
        const bDate = b.preferredDate?.toDate?.() || 0;
        return bDate - aDate;
      });

      setReservations(arr);
    } catch (err) {
      console.error("fetchUserReservations error:", err);
    }
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

  // ⭐ ADDED — Required Tab Switch Handler
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    navigate(`/profile?tab=${tab}`);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  // ⭐ Save to Users + Customers
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.uid), editedData);

      const customerQuery = query(
        collection(db, "customers"),
        where("uid", "==", user.uid)
      );

      const customerSnap = await getDocs(customerQuery);

      if (!customerSnap.empty) {
        const customerDoc = customerSnap.docs[0];
        const customerId = customerDoc.id;

        await updateDoc(doc(db, "customers", customerId), {
          name: editedData.name,
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
      alert("Error saving profile: " + err.message);
    }
  };

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

  useEffect(() => {
    if (newPassword !== "") validatePassword(newPassword);
    else setPasswordErrors([]);
  }, [newPassword]);

  const handlePasswordUpdate = async () => {
    if (passwordErrors.length > 0)
      return alert("Password does not meet requirements.");
    if (newPassword !== confirmPassword)
      return alert("Passwords do not match.");

    try {
      const user = auth.currentUser;
      const cred = EmailAuthProvider.credential(user.email, currentPassword);

      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);

      alert("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors([]);
    } catch (err) {
      console.error("change password error:", err);
      alert("Error changing password: " + err.message);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setTimeout(async () => {
      try {
        await auth.signOut();
      } catch (err) {
        console.error("signout error:", err);
      } finally {
        navigate("/");
      }
    }, 2000);
  };

  if (loading || logoutLoading)
    return <div className="profile-loading">Loading...</div>;

  return (
    <>
      <Navbar />

      {/* ⭐ TOP TABS */}
      <div className="profile-top-tabs">
        <button
          className={activeTab === "myaccount" ? "active" : ""}
          onClick={() => handleTabSwitch("myaccount")}
        >
          My Account
        </button>

        <button
          className={activeTab === "reservations" ? "active" : ""}
          onClick={() => handleTabSwitch("reservations")}
        >
          Reservations
        </button>

      </div>

      <div className="user-profile-page">
        <main className="profile-content">
          {activeTab === "myaccount" && (
            <>
              <div className="profile-details-view">
                <h3>My Account</h3>

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
                  onChange={handleInputChange}
                  placeholder="Name"
                />

                <input type="email" value={editedData.email || ""} readOnly />

                <select
                  name="gender"
                  value={editedData.gender || ""}
                  onChange={handleInputChange}
                  className="gender-select"
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
                  placeholder="Address"
                />

                <input
                  name="contact"
                  value={editedData.contact || ""}
                  onChange={handleInputChange}
                  placeholder="Contact Number (09xxxxxxxxx)"
                  maxLength={11}
                />

                <button onClick={handleSave}>Save Changes</button>
              </div>

              <div className="password-update">
                <h3>Change Password</h3>

                <div className="password-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="password-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      validatePassword(e.target.value);
                    }}
                  />
                </div>

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

                <div className="password-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <label className="show-pass-inline">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword((s) => !s)}
                  />
                  <span>Show Password</span>
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
          )}

          {activeTab === "reservations" && (
            <>
              <h2>My Reservations</h2>

              <div className="reservation-sort-box">
                <label>Sort by: </label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="reservation-sort-select"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="upcoming">Upcoming Date</option>
                  <option value="status">Status (A→Z)</option>
                  <option value="price-high">Price: High → Low</option>
                  <option value="price-low">Price: Low → High</option>
                </select>
              </div>


              {reservations.length === 0 ? (
                <p>No reservations found.</p>
              ) : (
                <div className="orders-list">
                  
                  {[...reservations]
                    .sort((a, b) => {
                      
                      if (sortOption === "newest") {
                        return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0);
                      }

                      if (sortOption === "oldest") {
                        return (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
                      }

                      if (sortOption === "upcoming") {
                        return (a.preferredDate?.toDate?.() || 0) - (b.preferredDate?.toDate?.() || 0);
                      }

                      if (sortOption === "status") {
                        return a.status.localeCompare(b.status);
                      }

                      if (sortOption === "price-high") {
                        return b.totalPrice - a.totalPrice;
                      }

                      if (sortOption === "price-low") {
                        return a.totalPrice - b.totalPrice;
                      }

                      return 0;
                    })
                    .map((res) => (

                      <div key={res.id} className="order-card">
                        
                        <p><strong>Reservation ID:</strong> {res.id}</p>
                        <p><strong>Customer:</strong> {res.userName}</p>
                        <p><strong>Date Scheduled:</strong> {formatTimestamp(res.preferredDate)}</p>

                        <p>
                          <strong>Status:</strong>{" "}
                          <span style={{ color: res.status === "Completed" ? "green" : "orange" }}>
                            {res.status}
                          </span>
                        </p>

                        <br />

                        {res.paymentMethod && (
                          <p><strong>Payment Method:</strong> {res.paymentMethod}</p>
                        )}

                        {res.transactionId && (
                          <p><strong>Transaction ID:</strong> {res.transactionId}</p>
                        )}

                        <p><strong>Total:</strong> ₱{res.totalPrice?.toLocaleString()}</p>

                        <div className="reservation-actions">
                          <button
                            className="receipt-button"
                            onClick={() => {
                              setSelectedReservation(res);
                              setShowModal(true);
                            }}
                          >
                            View Receipt
                          </button>
                        </div>


                      </div>
                    ))}

                </div>
              )}
            </>
          )}

          {showModal && selectedReservation && (
            <div className="reservation-modal-overlay"
            onClick={() => setShowModal(false)}>
              <div className="reservation-modal"
              onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">Reservation Receipt</h3>

                  <div className="receipt-section">
                    <h4>Customer Info</h4>
                    <p><strong>Name:</strong> {selectedReservation.userName}</p>
                    <p><strong>Email:</strong> {selectedReservation.userEmail}</p>
                  </div>

                  <div className="receipt-section">
                    <h4>Reservation Details</h4>
                    <p><strong>Reservation ID:</strong> {selectedReservation.id}</p>
                    <p><strong>Date Scheduled:</strong> {formatTimestamp(selectedReservation.preferredDate)}</p>
                    <p><strong>Status:</strong> {selectedReservation.status}</p>
                  </div>

                  <div className="receipt-section">
                    <h4>Product</h4>
                    <p><strong>Name:</strong> {selectedReservation.productName}</p>
                    <p><strong>Brand:</strong> {selectedReservation.brand}</p>
                    <p><strong>Model:</strong> {selectedReservation.model}</p>
                    <p><strong>Size:</strong> {selectedReservation.size}</p>
                  </div>

                  <div className="receipt-section">
                    <h4>Vehicle</h4>
                    <p>{selectedReservation.vehicleYear} {selectedReservation.vehicleBrand} {selectedReservation.vehicleModel}</p>
                    <p><strong>Plate:</strong> {selectedReservation.plateNumber}</p>
                  </div>

                  <div className="receipt-section">
                    <h4>Payment</h4>
                    <p><strong>Downpayment:</strong> ₱{selectedReservation.downpayment}</p>
                    <p><strong>Total Price:</strong> ₱{selectedReservation.totalPrice?.toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> {selectedReservation.paymentMethod}</p>
                    <p><strong>Transaction ID:</strong> {selectedReservation.transactionId}</p>
                  </div>

                  {selectedReservation.note && (
                    <div className="receipt-section">
                      <h4>Note</h4>
                      <p>{selectedReservation.note}</p>
                    </div>
                  )}


                <div className="modal-buttons">
                  <button className="close-modal" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  );
};

export default UserProfile;
