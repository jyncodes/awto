// src/pages/user-page/DevTools.jsx
import React, { useState } from "react";
import "../../styles/DevTools.css";

// Components
import CarData from "../../components/dev-components/CarData.jsx";
import ResetCounterModal from "../../components/admin-components/ResetCounterModal";

export default function DevTools() {
  const [showResetModal, setShowResetModal] = useState(false);

  return (
    <div className="devtools-container">

      <div className="devtools-header">
        <h1>🛠 System Maintenance Tools</h1>
        <p>Admin-only tools for maintaining system configuration and data.</p>
      </div>

      <div className="devtools-content">
        <button
          className="action-btn"
          style={{ marginBottom: "1.5rem" }}
          onClick={() => (window.location.href = "/admin-dashboard/settings")}
        >
          ← Back to Settings
        </button>

        {/* ================= RESET COUNTER ================= */}
        <div className="maintenance-section">
          <h2>🔁 Reset Counter</h2>
          <p>Reset official system counters used by transactions.</p>

          <button
            className="action-btn danger"
            onClick={() => setShowResetModal(true)}
          >
            Reset Counter
          </button>
        </div>

        <hr style={{ margin: "2.5rem 0" }} />

        {/* ================= VEHICLE FITMENT ================= */}
        <div className="maintenance-section">
          <h2>🚗 Vehicle Fitment Manager</h2>
          <p>
            Manage tire and wheel fitment data used by the fitment and AR
            modules.
          </p>

          <CarData />
        </div>
      </div>

      {/* RESET COUNTER MODAL */}
      <ResetCounterModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
}
