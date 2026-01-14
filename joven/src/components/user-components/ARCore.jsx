import "@google/model-viewer";
import "../../styles/user-styles/ARCore.css";

const ARCore = ({ src }) => {
  return (
    <model-viewer
      src={src}
      ar
      ar-modes="scene-viewer webxr quick-look"
      camera-controls
      auto-rotate
      exposure="1"
      shadow-intensity="1"
      style={{
        width: "100vw",
        height: "100vh",
      }}
    />
  );
};

export default ARCore;
