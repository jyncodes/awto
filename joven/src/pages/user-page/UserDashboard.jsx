// src/pages/user-page/UserDashboard.jsx

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import Navbar from "../../components/Navbar";
import Filter from "../../components/user-components/Filter";
import CatalogBox from "../../components/user-components/CatalogBox";
import Manual from "../../components/user-components/Manual"; // ✅ Replaced Fitment with Manual
import "../../styles/user-styles/UserDashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Pull filters & label from Manual or previous state
  const { size, vehicleLabel } = location.state || {};
  const [filters, setFilters] = useState(size ? { size } : {}); // Prefill filter if size was passed

  // ✅ Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      <Navbar
        hideCreateAccount={true}
        showLogout={true}
        handleLogout={handleLogout}
      />

      <div className="user-dashboard-container">
        {/* ✅ Manual fitment selector at the top */}
        <div className="fitment-section">
          <Manual />
        </div>

        {vehicleLabel && size && (
          <div className="vehicle-banner">
            <h2>
              Results for: {vehicleLabel}{" "}
              <span className="tire-size">({size[0]})</span>
            </h2>
          </div>
        )}

        {!vehicleLabel && (
          <p className="dashboard-intro">
            Select your vehicle below and browse fitment-matching products.
          </p>
        )}

        <div className="dashboard-content">
          <div className="filter-panel">
            <Filter onChange={setFilters} />
          </div>

          <div className="catalog-panel">
            <CatalogBox filters={filters} />
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboard;
