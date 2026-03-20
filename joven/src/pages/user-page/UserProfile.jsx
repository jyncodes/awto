// src/pages/user-page/UserProfile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

import "../../styles/user-styles/UserProfile.css";
import Navbar from "../../components/Navbar";

import MyAccount from "./MyAccount";
import MyReservations from "./MyReservations";

const UserProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("myaccount");

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
      } else {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [navigate]);

  /* ---------------- TAB FROM URL ---------------- */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) setActiveTab(tab);
  }, [location.search]);

  /* ---------------- TAB SWITCH ---------------- */
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    navigate(`/profile?tab=${tab}`);
  };

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = async () => {
    setLogoutLoading(true);
    setTimeout(async () => {
      try {
        await auth.signOut();
      } finally {
        navigate("/");
      }
    }, 1500);
  };

  if (loading || logoutLoading) {
    return <div className="profile-loading">Loading...</div>;
  }

  return (
    <>
      <Navbar />

      <div className="user-profile-page">
        <main className="profile-content">

          {/* 🔥 RENDER SEPARATED COMPONENTS */}
          {activeTab === "myaccount" && <MyAccount />}
          {activeTab === "reservations" && <MyReservations />}

        </main>
      </div>
    </>
  );
};

export default UserProfile;
