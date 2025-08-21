// src/pages/user-page/UserDashboard.jsx

import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import Navbar from "../../components/Navbar";
import Filter from "../../components/Filter";
import CatalogBox from "../../components/CatalogBox";
import Fitment from "../../components/Fitment"; // ✅ Import Fitment
import "../../styles/UserDashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Pull filters & label from Fitment, or empty object if none
  const { size, vehicleLabel } = location.state || {};
  const [filters, setFilters] = useState(
    size ? { size } : {} // Only prefill filter if size was passed
  );

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
        {/* ✅ Fitment component at the top */}
        <div className="fitment-section">
          <Fitment />
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
            Select your vehicle and browse fitment-matching products.
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
