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
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <model-viewer
        ref={viewerRef}
        src={src}
        ar
        ar-scale
        ar-modes="webxr"
        camera-controls
        orientation="-90deg 0deg 0deg"
        interaction-prompt="none"
        style={{    
            width: "100%",
            height: "100%",
            backgroundColor: "#000",
        }}
        />


      {/* ✅ CUSTOM AR BUTTON */}
      <button
        onClick={startAR}
        style={{
          position: "absolute",
          bottom: 90,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
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
  );
};

export default ARCore;
