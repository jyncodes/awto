// src/pages/user-page/DevTools.jsx
import React, { useState, useEffect } from "react";
import "../../styles/DevTools.css";
import CarData from "../../components/dev-components/CarData.jsx"; // ✅ Import CarData

export default function DevTools() {
  const [visibleSection, setVisibleSection] = useState("info");

  // Shortcut key listener (Shift + D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && (e.key === "D" || e.key === "d")) {
        window.location.href = "/devtools";
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="devtools-container">
      {/* Header */}
      <div className="devtools-header">
        <h1>🛠 Developer Tools</h1>
        <p>⚠️ Internal testing only — Not part of the final system.</p>
      </div>

      {/* Menu Tabs */}
      <div className="devtools-tabs">
        <button
          className={`tab-btn ${visibleSection === "info" ? "active" : ""}`}
          onClick={() => setVisibleSection("info")}
        >
          Info
        </button>
        <button
          className={`tab-btn ${visibleSection === "vehicle" ? "active" : ""}`}
          onClick={() => setVisibleSection("vehicle")}
        >
          Vehicle Fitment
        </button>
        <button
          className={`tab-btn ${visibleSection === "ar" ? "active" : ""}`}
          onClick={() => setVisibleSection("ar")}
        >
          AR Testing
        </button>
      </div>

      {/* Content Area */}
      <div className="devtools-content">
        {/* Back to Home Button */}
        <button
          className="action-btn"
          style={{ marginBottom: "1rem" }}
          onClick={() => (window.location.href = "/")}
        >
          ← Back to Home
        </button>

        {visibleSection === "info" && (
          <div>
            <h2>System Debug Info</h2>
            <ul>
              <li>🧭 Check Firebase connection</li>
              <li>🧪 Test components</li>
              <li>🧰 Manage vehicle fitments</li>
              <li>⚠️ Accessible only via shortcut or URL</li>
            </ul>
          </div>
        )}

        {visibleSection === "vehicle" && (
          <div>
            <h2>Vehicle Fitment Manager</h2>
            <p>Manage tire and wheel fitments for vehicles.</p>
            <CarData />
          </div>
        )}

        {visibleSection === "ar" && (
          <div>
            <h2>AR Testing</h2>
            <p>Test WebXR or AR integration here.</p>
            <div className="ar-preview">[AR preview or script goes here]</div>
          </div>
        )}
      </div>
    </div>
  );
}
