import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ✅ AR Component
import ARCore from "../../components/user-components/ARCore";

// Navbar
import Navbar from "../../components/Navbar";

// Styles
import "../../styles/user-styles/ARPage.css";

const ARPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // modelUrl passed from ViewProduct.jsx
  const modelUrl = location.state?.modelUrl;

  /* 🔒 Disable scroll & gestures */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  /* ❌ No model safety */
  if (!modelUrl) {
    return (
      <div
        className="ar-page"
        style={{ color: "white", display: "grid", placeItems: "center" }}
      >
        <div style={{ textAlign: "center" }}>
          <p>❌ No 3D model available for AR</p>
          <button onClick={() => navigate(-1)}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ar-page">
      {/* Navbar (overlay only) */}
      <div className="ar-navbar">
        <Navbar />
      </div>

      {/* ✅ ARCore Viewer */}
      <ARCore src={modelUrl} />

      {/* Exit AR Button */}
      <button className="ar-exit-btn" onClick={() => navigate(-1)}>
        ✖ Exit AR
      </button>

      {/* Mode Label */}
      <div className="ar-mode-label">AR Preview</div>
    </div>
  );
};

export default ARPage;
