import "@google/model-viewer";
import { useRef, useEffect } from "react";

const ARCore = ({ src }) => {
  const viewerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      viewerRef.current?.activateAR();
    }, 600); // slight delay so model-viewer is ready

    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <model-viewer
        ref={viewerRef}
        src={src}
        ar
        ar-modes="scene-viewer webxr quick-look"
        ar-placement="fixed"
        camera-controls
        disable-pan
        scale="0.65 0.65 0.65"
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#000",
        }}
      />
    </div>
  );
};

export default ARCore;
