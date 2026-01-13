import "@google/model-viewer";

const ARCore = ({ src }) => {
  return (
    <model-viewer
      src={src}
      ar
      ar-modes="scene-viewer webxr quick-look"
      ar-scale="auto"
      ar-placement="floor"
      reveal="interaction"
      camera-controls
      style={{
        width: "100%",
        height: "100vh",
        backgroundColor: "#000",
      }}
    >
      <button
        slot="ar-button"
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          padding: "12px 18px",
          background: "#111",
          color: "#fff",
          borderRadius: "10px",
          border: "1px solid #fff",
          fontWeight: "600",
        }}
      >
        📷 View in your space
      </button>
    </model-viewer>
  );
};

export default ARCore;
