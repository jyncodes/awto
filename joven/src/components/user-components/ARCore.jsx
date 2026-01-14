import "@google/model-viewer";
import "../../styles/user-styles/ARCore.css";

// ARCore component
// Receives `src` = URL of the .glb 3D model
// `wheelDiameter` = real-world wheel size (inches)
const ARCore = ({ src, wheelDiameter = 17 }) => {

  // Convert wheel diameter from inches to meters
  const diameterInMeters = wheelDiameter * 0.0254;

  // Assume GLB model was authored at ~1 meter diameter
  const BASE_MODEL_DIAMETER = 1;

  // Compute uniform scale
  const scaleValue = diameterInMeters / BASE_MODEL_DIAMETER;
  const scaleString = `${scaleValue} ${scaleValue} ${scaleValue}`;

  return (
    <model-viewer
      src={src}
      ar
      ar-modes="scene-viewer webxr quick-look"
      scale={scaleString}
      disable-zoom
      disable-pan
      exposure="1"
      style={{
        width: "100vw",
        height: "100vh",
      }}
    >
      {/* Google Scene Viewer AR button */}
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
