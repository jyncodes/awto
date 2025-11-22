// src/pages/user-page/DevTools.jsx
import React, { useState, useEffect } from "react";
import "../../styles/DevTools.css";

// Components
import CarData from "../../components/dev-components/CarData.jsx";
import ARCameraDebugger from "../../components/dev-components/ARCameraDebugger.jsx";
import DebugAR from "../../components/dev-components/DebugAR.jsx";   // ✔ Correct path

export default function DevTools() {
  const [visibleSection, setVisibleSection] = useState("info");
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Shortcut (*) to open devtools
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "*") {
        window.location.href = "/#/devtools"; // ✔ HashRouter safe
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Password submit
  const handlePasswordSubmit = () => {
    if (passwordInput === "capstone") {
      setAuthenticated(true);
    } else {
      alert("Incorrect password.");
    }
  };

  // Enter key = submit
  const handleKeyPress = (e) => {
    if (e.key === "Enter") handlePasswordSubmit();
  };

  return (
    <div className="devtools-container">

      {/* =========================== LOCK SCREEN =========================== */}
      {!authenticated && (
        <div className="password-screen">
          <h2>🔒 Developer Tools Locked</h2>
          <p>Enter password to continue:</p>

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              className="password-input"
              placeholder="Enter password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={handleKeyPress}
              autoComplete="new-password"
            />

            <button
              className="view-btn"
              onClick={() => setShowPassword(!showPassword)}
              type="button"
            >
              {showPassword ? "Hide" : "View"}
            </button>
          </div>

          <button className="action-btn" onClick={handlePasswordSubmit}>
            Unlock
          </button>
        </div>
      )}

      {/* =========================== MAIN DEVTOOLS UI =========================== */}
      {authenticated && (
        <>
          <div className="devtools-header">
            <h1>🛠 Developer Tools</h1>
            <p>⚠️ Internal debugging area — not part of final user system.</p>
          </div>

          {/* Tabs */}
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

          {/* Content */}
          <div className="devtools-content">
            <button
              className="action-btn"
              style={{ marginBottom: "1rem" }}
              onClick={() => (window.location.href = "/#/")}
            >
              ← Back to Home
            </button>

            {/* ---------------- INFO TAB ---------------- */}
            {visibleSection === "info" && (
              <div>
                <h2>System Debug Info</h2>
                <ul>
                  <li>🧭 Test Firebase connection</li>
                  <li>🧪 Test components</li>
                  <li>🧰 Manage vehicle fitments</li>
                  <li>⚠️ Developer-only access</li>
                </ul>
              </div>
            )}

            {/* ---------------- VEHICLE TAB ---------------- */}
            {visibleSection === "vehicle" && (
              <div>
                <h2>Vehicle Fitment Manager</h2>
                <p>Manage tire and wheel fitments for vehicles.</p>
                <CarData />
              </div>
            )}

            {/* ---------------- AR TAB ---------------- */}
            {visibleSection === "ar" && (
              <div>
                <h2>AR Testing</h2>
                <p>Debug the camera, canvas access, and 3D overlay.</p>

                <h3>📸 Camera Debugger</h3>
                <ARCameraDebugger />

                <h3 style={{ marginTop: "2rem" }}>🧪 AR Model Viewer</h3>
                <DebugAR />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
