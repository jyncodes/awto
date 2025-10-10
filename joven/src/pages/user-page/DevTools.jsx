import React, { useState, useEffect } from "react";
import "../../styles/DevTools.css";

export default function DevTools() {
  const [visibleSection, setVisibleSection] = useState("info");

  // ✅ Shortcut key listener (Shift + D)
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
          className={`tab-btn ${visibleSection === "3d" ? "active" : ""}`}
          onClick={() => setVisibleSection("3d")}
        >
          3D Tools
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
        {visibleSection === "info" && (
          <div>
            <h2>System Debug Info</h2>
            <ul>
              <li>🧭 Check Firebase connection</li>
              <li>🧪 Test components</li>
              <li>🧰 Generate 3D objects and preview</li>
              <li>⚠️ Accessible only via shortcut or URL</li>
            </ul>
          </div>
        )}

        {visibleSection === "3d" && (
          <div>
            <h2>3D Model Testing</h2>
            <p>Place your Three.js or GLB export functions here.</p>
            <button
              onClick={() => alert("3D function triggered")}
              className="action-btn"
            >
              Run 3D Export
            </button>
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
