// src/components/user-components/ARSmartViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const ROBOFLOW_URL =
  "https://serverless.roboflow.com/dslr-w6mrp/2?api_key=y9iNRghfr0ZBlKhhW9LE&format=json";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ARSmartViewer = ({ src }) => {
  const videoRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const debugCanvasRef = useRef(null);

  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const modelRef = useRef(null);

  const rafRef = useRef(null);
  const lastSentRef = useRef(0);
  const lastDetectionRef = useRef(0);
  const sendDelayRef = useRef(350);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const target = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });
  const smooth = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });
  const smoothing = 0.18;

  /* --------------------------------------------------
        CAMERA
  -------------------------------------------------- */
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
        });
        if (!active) return;

        const v = videoRef.current;

        v.setAttribute("playsinline", "");
        v.setAttribute("autoplay", "");
        v.setAttribute("muted", "true");
        v.muted = true;

        v.srcObject = stream;
        await v.play();

        console.log("[AR] Camera ready:", v.videoWidth, v.videoHeight);
        setCameraReady(true);
      } catch (err) {
        console.error("[AR] CAMERA ERROR:", err);
      }
    })();

    return () => {
      active = false;
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  /* --------------------------------------------------
        THREE INITIALIZATION
  -------------------------------------------------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(4, 6, 3);
    scene.add(dir);

    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const m = gltf.scene;

        try {
          const box = new THREE.Box3().setFromObject(m);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);

          const scale = (1 / maxDim) * 0.55;
          m.scale.setScalar(scale);

          const center = new THREE.Vector3();
          box.getCenter(center);
          m.position.sub(center.multiplyScalar(scale));
        } catch {
          m.scale.setScalar(0.15);
        }

        m.visible = false;

        modelRef.current = m;
        scene.add(m);

        setModelLoaded(true);
        console.log("[AR] Model loaded!");
      },
      undefined,
      (err) => console.error("[AR] Model load error:", err)
    );

    return () => renderer.dispose();
  }, [src]);

  /* --------------------------------------------------
        BUILD FRAME (NO ROTATE)
  -------------------------------------------------- */
  const buildFrame = (video) => {
    const SIZE = 640;
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;

    const ctx = c.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (!video || video.videoWidth === 0) return c;

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const aspect = vw / vh;
    let dw, dh;

    if (aspect > 1) {
      dw = SIZE;
      dh = SIZE / aspect;
    } else {
      dh = SIZE;
      dw = SIZE * aspect;
    }

    const ox = (SIZE - dw) / 2;
    const oy = (SIZE - dh) / 2;

    ctx.drawImage(video, ox, oy, dw, dh);

    return c;
  };

  /* --------------------------------------------------
        SEND TO YOLO
  -------------------------------------------------- */
  const sendToYOLO = async (canvas) => {
    try {
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

      const res = await fetch(ROBOFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: base64,
      });

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("[AR] YOLO ERROR:", err);
      return null;
    }
  };

  /* --------------------------------------------------
        MAIN LOOP
  -------------------------------------------------- */
  useEffect(() => {
    const loop = async () => {
      const video = videoRef.current;

      if (!video || !cameraReady || !modelLoaded) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      if (now - lastSentRef.current > sendDelayRef.current) {
        lastSentRef.current = now;

        const frame = buildFrame(video);

        if (debugCanvasRef.current) {
          const ctx = debugCanvasRef.current.getContext("2d");
          ctx.drawImage(frame, 0, 0, 200, 200);
        }

        const json = await sendToYOLO(frame);

        // ⭐ FIX ROBOTFLOW FORMAT → convert to bbox
        const converted = (json?.predictions || []).map((p) => ({
          bbox: {
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height,
          },
        }));

        const preds = converted.filter((p) => p.bbox.width > 0);

        if (preds.length > 0) {
          const det = preds.sort(
            (a, b) =>
              b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height
          )[0];

          const cx = det.bbox.x;
          const cy = det.bbox.y;
          const bw = det.bbox.width;

          const ndcX = (cx / 640) * 2 - 1;
          const ndcY = -((cy / 640) * 2 - 1);

          const scale = clamp(bw / 200, 0.05, 2.0);

          target.current = {
            x: ndcX * 1.5,
            y: ndcY * 1.5,
            z: -2,
            scale,
          };

          lastDetectionRef.current = Date.now();
          setIsPlaced(true);
          setNoWheel(false);
        } else {
          if (Date.now() - lastDetectionRef.current > 3000) {
            setIsPlaced(false);
            setNoWheel(true);
            if (modelRef.current) modelRef.current.visible = false;
          }
        }
      }

      // SMOOTH MOTION
      const s = smooth.current;
      const t = target.current;

      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      s.z += (t.z - s.z) * smoothing;
      s.scale += (t.scale - s.scale) * smoothing;

      if (modelRef.current) {
        modelRef.current.visible = isPlaced;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.setScalar(s.scale);
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraReady, modelLoaded, isPlaced]);

  /* --------------------------------------------------
        UI
  -------------------------------------------------- */
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
      />

      <canvas
        ref={threeCanvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 2,
        }}
      />

      {/* Debug Canvas */}
      <canvas
        ref={debugCanvasRef}
        width={200}
        height={200}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          border: "2px solid lime",
          zIndex: 99,
        }}
      />

      {!cameraReady && (
        <div style={msgStyle}>Initializing camera...</div>
      )}

      {!modelLoaded && (
        <div style={{ ...msgStyle, right: 10, left: "auto" }}>
          Loading wheel model...
        </div>
      )}

      {!isPlaced && !noWheel && cameraReady && modelLoaded && (
        <div style={{ ...msgBottom }}>Scanning for wheels...</div>
      )}

      {noWheel && (
        <div style={{ ...msgBottom, color: "orange", fontWeight: 700 }}>
          ❌ No wheels detected
        </div>
      )}
    </div>
  );
};

const msgStyle = {
  position: "absolute",
  top: 15,
  left: 15,
  padding: 8,
  background: "rgba(0,0,0,0.5)",
  color: "white",
  zIndex: 99,
};

const msgBottom = {
  position: "absolute",
  bottom: 15,
  width: "100%",
  textAlign: "center",
  color: "white",
  zIndex: 99,
};

export default ARSmartViewer;
