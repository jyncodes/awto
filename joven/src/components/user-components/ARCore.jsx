import "@google/model-viewer";

const ARModelViewer = ({ src }) => {
  return (
    <model-viewer
      src={src}
      ar
      ar-modes="scene-viewer webxr quick-look"
      camera-controls
      auto-rotate
      style={{
        width: "100%",
        height: "100vh",
        background: "#000",
      }}
    />
  );
};

export default ARCore;
