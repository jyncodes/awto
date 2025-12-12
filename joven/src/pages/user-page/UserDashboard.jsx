// src/pages/user-page/UserDashboard.jsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

import Navbar from "../../components/Navbar";
import Filter from "../../components/user-components/Filter.jsx";
import CatalogBox from "../../components/user-components/CatalogBox";
import Manual from "../../components/user-components/Manual";
import Footer from "../../components/user-components/Footer"; // ➜ ADDED

import "../../styles/user-styles/UserDashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { size, vehicleLabel } = location.state || {};
  const [filters, setFilters] = useState(size ? { size } : {});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // pagination data that CatalogBox sends up
  const [pageData, setPageData] = useState(null);

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

        {/* Fitment */}
        <div className="fitment-section">
          <Manual />
        </div>

        {/* Vehicle label */}
        {vehicleLabel && size && (
          <div className="vehicle-banner">
            <h2>
              Results for: {vehicleLabel}{" "}
              <span className="tire-size">({size[0]})</span>
            </h2>
          </div>
        )}

        {!vehicleLabel && (
          <p className="dashboard-intro centered-intro">
            Select your vehicle below and browse fitment-matching products.
          </p>
        )}

        {/* MOBILE FILTER BUTTON */}
        <div className="top-controls">
          <Filter
            onChange={setFilters}
            mobileControl={{
              open: mobileFilterOpen,
              setOpen: setMobileFilterOpen,
            }}
          />
        </div>

        {/* MAIN CONTENT */}
        <div className="dashboard-content">

          {/* Left Filter (desktop only) */}
          <div className="filter-panel">
            <div className="filter-desktop-wrapper">
              <Filter onChange={setFilters} />
            </div>
          </div>

          {/* Right Catalog */}
          <div className="catalog-panel">
            <CatalogBox filters={filters} onPageData={setPageData} />

            {/* PAGINATION HERE */}
            {pageData && pageData.totalPages > 1 && (
              <div className="pagination-wrapper">
                <span className="pagination-label">
                  Showing {pageData.showing} of {pageData.totalItems} items
                </span>

                <div className="pagination">
                  {/* PREV */}
                  <button
                    className="page-btn"
                    onClick={() => pageData.setPage(pageData.currentPage - 1)}
                    disabled={pageData.currentPage === 1}
                  >
                    Previous
                  </button>

                  {/* PAGE NUMBERS */}
                  {Array.from({ length: pageData.totalPages }, (_, i) => (
                    <button
                      key={i}
                      className={`page-number ${
                        pageData.currentPage === i + 1 ? "active" : ""
                      }`}
                      onClick={() => pageData.setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}

                  {/* NEXT */}
                  <button
                    className="page-btn"
                    onClick={() => pageData.setPage(pageData.currentPage + 1)}
                    disabled={pageData.currentPage === pageData.totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ➜ FOOTER EXACTLY LIKE LANDING PAGE */}
      <Footer />
    </>
  );
};

export default UserDashboard;
