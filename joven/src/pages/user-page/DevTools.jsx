// src/pages/user-page/DevTools.jsx
import React, { useState, useEffect } from "react";
import "../../styles/DevTools.css";
import CarData from "../../components/dev-components/CarData.jsx";

export default function DevTools() {
  const [visibleSection, setVisibleSection] = useState("info");
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Shortcut key listener (*) to open DevTools
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "*") {
        window.location.href = "/devtools";
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle password submit
  const handlePasswordSubmit = () => {
    if (passwordInput === "capstone") {
      setAuthenticated(true);
    } else {
      alert("Incorrect password.");
    }
  };

  // Allow ENTER key to unlock
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handlePasswordSubmit();
    }
  };

  return (
    <div className="devtools-container">

      {/* =========================== PASSWORD SCREEN =========================== */}
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
              autoComplete="new-password"       // ✅ Prevents Google autofill
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

      {/* =========================== DEVTOOLS MAIN UI =========================== */}
      {authenticated && (
        <>
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
        </>
      )}
    </div>
  );
}
