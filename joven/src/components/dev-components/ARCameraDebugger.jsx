import React, { useEffect, useRef, useState } from "react";

export default function ARCameraDebugger() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cameraOK, setCameraOK] = useState(false);
  const [canvasOK, setCanvasOK] = useState(false);
  const [orientation, setOrientation] = useState("");

  useEffect(() => {
    const detectOrientation = () => {
      setOrientation(
        window.matchMedia("(orientation: portrait)").matches
          ? "Portrait"
          : "Landscape"
      );
    };
    detectOrientation();
    window.addEventListener("orientationchange", detectOrientation);
    return () =>
      window.removeEventListener("orientationchange", detectOrientation);
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        const v = videoRef.current;
        v.crossOrigin = "anonymous";
        v.setAttribute("playsinline", "");
        v.setAttribute("autoplay", "");
        v.setAttribute("muted", "true");
        v.muted = true;

        v.srcObject = stream;
        await v.play();

        setCameraOK(true);
        debugLoop();
      } catch (e) {
        console.error("Camera Error:", e);
      }
    }

    startCamera();
  }, []);

  const debugLoop = () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");

    c.width = 300;
    c.height = 300;

    try {
      ctx.drawImage(v, 0, 0, 300, 300);

      const pixels = ctx.getImageData(0, 0, 10, 10).data;
      let black = true;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0) {
          black = false;
          break;
        }
      }
      setCanvasOK(!black);
    } catch (err) {
      console.error("DRAW ERROR:", err);
      setCanvasOK(false);
    }

    requestAnimationFrame(debugLoop);
  };

  return (
    <div style={{ padding: 20, color: "white", background: "#111", minHeight: "100vh" }}>
      <h2>AR Camera Debugger</h2>

      <p>📱 Orientation: <b>{orientation}</b></p>

      <p>📷 Camera: {cameraOK ? <b style={{ color: "lime" }}>OK</b> : <b style={{ color: "red" }}>NOT WORKING</b>}</p>

      <p>🎨 Canvas Read: {canvasOK ?
        <b style={{ color: "lime" }}>SUCCESS ✔</b> :
        <b style={{ color: "red" }}>BLACK FRAME ❌</b>}
      </p>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <div>
          <p>Camera Preview</p>
          <video
            ref={videoRef}
            style={{
              width: 300,
              height: 300,
              background: "black",
              objectFit: "cover",
            }}
          />
        </div>

        <div>
          <p>Canvas Read Frame</p>
          <canvas
            ref={canvasRef}
            style={{ width: 300, height: 300, border: "2px solid lime" }}
          />
        </div>
      </div>

      <p style={{ marginTop: 20, color: "#aaa" }}>
        If Canvas Read = ❌ BLACK FRAME → Android Chrome blocks drawing camera to canvas.
      </p>
    </div>
  );
}
