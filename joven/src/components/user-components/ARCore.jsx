import "@google/model-viewer";
import "../../styles/user-styles/ARCore.css";

const ARCore = ({ src }) => {
  return (
    <model-viewer
      src={src}
      ar
      ar-modes="scene-viewer webxr quick-look"
      camera-controls
      exposure="1"
      shadow-intensity="1"
      ar-button
      style={{
        width: "100vw",
        height: "100vh",
      }}
    >
      {/* ✅ THIS IS THE AR BUTTON */}
      <button
        slot="ar-button"
        style={{
          position: "absolute",
          bottom: "90px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "14px 20px",
          borderRadius: "12px",
          border: "none",
          background: "#22c55e",
          color: "#000",
          fontWeight: "700",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        📷 View in your space
      </button>
    </model-viewer>
  );
};

export default ARCore;
