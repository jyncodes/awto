// src/components/user-components/ARViewer.jsx
import React from "react";
import "@google/model-viewer/dist/model-viewer.min.js";

const ARViewer = ({ src, alt }) => {
  if (!src) return null;

  return (
    <model-viewer
      src={src}
      alt={alt}
      ar
      ar-modes="scene-viewer quick-look webxr"
      camera-controls
      auto-rotate
      style={{
        width: "100%",
        height: "400px",
        background: "#f5f5f5",
        borderRadius: "12px",
      }}
    ></model-viewer>
  );
};

export default ARViewer;
