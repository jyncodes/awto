import "@google/model-viewer";
import { useRef } from "react";

const ARCore = ({ src }) => {
  const viewerRef = useRef(null);

  const startAR = () => {
    if (viewerRef.current) {
      viewerRef.current.activateAR();
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0 }}>
      
      {/* AR Layer (NO POINTER EVENTS) */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none" }}>
        <model-viewer
          ref={viewerRef}
          src={src}
          ar
          ar-modes="scene-viewer webxr quick-look"
          camera-controls
          style={{ width: "100vw", height: "100vh" }}
        />
      </div>

      {/* UI Layer (POINTER EVENTS ENABLED) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "auto",
          zIndex: 9999,
        }}
      >
        <button
          onClick={startAR}
          style={{
            position: "absolute",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            background: "#22c55e",
            color: "#000",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          📷 View in your space
        </button>
      </div>
    </div>
  );
};

export default ARCore;
