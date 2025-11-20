import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * ARSmartViewer.jsx
 * - Receives `src` from ViewProduct.jsx (Supabase GLB URL)
 * - Sends frames to YOLOv8 backend (http://127.0.0.1:8000/infer)
 * - Auto-place, auto-scale, auto-rotate using PCA angle
 * - Smooth transitions (EMA)
 * - Debug overlay
 */

const YOLO_API_URL = "https://awto.onrender.com/infer";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ARSmartViewer = ({ src }) => {
  const videoRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const debugCanvasRef = useRef(null);

  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null);
  const rafRef = useRef(null);

  const [isPlaced, setIsPlaced] = useState(false);
  const lastSentRef = useRef(0);

  // smoothing
  const smoothing = 0.15;
  const targetRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12, angle: 0 });
  const smoothedRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12, angle: 0 });

  // -----------------------------
  // Camera
  // -----------------------------
  useEffect(() => {
    let mounted = true;
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 1280, height: 720 },
          audio: false,
        });
        if (!mounted) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    startCam();

    return () => {
      mounted = false;
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  // -----------------------------
  // THREE.js Scene
  // -----------------------------
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enabled = false;
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 6, 3);
    scene.add(hemi, dir);

    // Load GLB Model (SRC comes from ViewProduct)
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.visible = false;
        model.scale.set(0.12, 0.12, 0.12);
        modelRef.current = model;
        scene.add(model);
      },
      undefined,
      (e) => console.error("GLB load error:", e)
    );

    const onResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [src]);

  // -----------------------------
  // Compute wheel rotation using PCA of Sobel edges
  // -----------------------------
  const computeOrientation = (imageData, bbox) => {
    const [x1, y1, x2, y2] = bbox.map((v) => Math.round(v));
    const w = x2 - x1;
    const h = y2 - y1;
    if (w < 5 || h < 5) return 0;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, -x1, -y1);

    const data = ctx.getImageData(0, 0, w, h).data;
    const gray = new Float32Array(w * h);

    for (let i = 0; i < w * h; i++) {
      gray[i] =
        0.299 * data[i * 4] +
        0.587 * data[i * 4 + 1] +
        0.114 * data[i * 4 + 2];
    }

    const gx = new Float32Array(w * h);
    const gy = new Float32Array(w * h);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;

        const sx =
          -gray[i - w - 1] -
          2 * gray[i - 1] -
          gray[i + w - 1] +
          gray[i - w + 1] +
          2 * gray[i + 1] +
          gray[i + w + 1];

        const sy =
          -gray[i - w - 1] -
          2 * gray[i - w] -
          gray[i - w + 1] +
          gray[i + w - 1] +
          2 * gray[i + w] +
          gray[i + w + 1];

        gx[i] = sx;
        gy[i] = sy;
      }
    }

    const edges = [];
    for (let i = 0; i < w * h; i++) {
      if (Math.hypot(gx[i], gy[i]) > 60) {
        edges.push([i % w, Math.floor(i / w)]);
      }
    }

    if (edges.length < 5) return 0;

    let mx = 0,
      my = 0;
    edges.forEach(([x, y]) => {
      mx += x;
      my += y;
    });
    mx /= edges.length;
    my /= edges.length;

    let cxx = 0,
      cyy = 0,
      cxy = 0;

    edges.forEach(([x, y]) => {
      const dx = x - mx;
      const dy = y - my;
      cxx += dx * dx;
      cyy += dy * dy;
      cxy += dx * dy;
    });

    cxx /= edges.length;
    cyy /= edges.length;
    cxy /= edges.length;

    return 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  };

  // -----------------------------
  // Send frame to YOLO
  // -----------------------------
  const sendFrame = async (frameCanvas) => {
    try {
      const blob = await new Promise((res) =>
        frameCanvas.toBlob(res, "image/jpeg", 0.8)
      );
      const fd = new FormData();
      fd.append("file", blob, "frame.jpg");

      const r = await fetch(YOLO_API_URL, { method: "POST", body: fd });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };

  // -----------------------------
  // Main Loop
  // -----------------------------
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;
      const dbg = debugCanvasRef.current;

      if (!v || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const w = Math.max(320, v.videoWidth * 0.5);
      const h = Math.max(240, v.videoHeight * 0.5);

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = w;
      frameCanvas.height = h;
      frameCanvas.getContext("2d").drawImage(v, 0, 0, w, h);

      const now = performance.now();

      if (now - lastSentRef.current > 160) {
        lastSentRef.current = now;
        const result = await sendFrame(frameCanvas);

        if (result && result.detections?.length > 0) {
          const det = result.detections[0];

          // rescaled bbox
          const scaled = det.bbox.map((val, i) =>
            i % 2 === 0 ? val * (v.videoWidth / w) : val * (v.videoHeight / h)
          );

          const [x1, y1, x2, y2] = scaled;
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;

          const fullCanvas = document.createElement("canvas");
          fullCanvas.width = v.videoWidth;
          fullCanvas.height = v.videoHeight;
          fullCanvas.getContext("2d").drawImage(v, 0, 0);
          const imageData = fullCanvas
            .getContext("2d")
            .getImageData(0, 0, v.videoWidth, v.videoHeight);

          const angle = computeOrientation(imageData, scaled);

          const bboxWidth = Math.abs(x2 - x1);
          const relWidth = bboxWidth / v.videoWidth;

          const scale = clamp(relWidth / 0.25, 0.05, 1.5) * 0.4;

          const ndcX = (cx / v.videoWidth) * 2 - 1;
          const ndcY = -((cy / v.videoHeight) * 2 - 1);

          const z = -2.5 * (1 + (0.5 - relWidth));

          targetRef.current = { x: ndcX * 2, y: ndcY * 1.6, z, scale, angle };
          setIsPlaced(true);
        }
      }

      // smoothing
      const t = targetRef.current;
      const s = smoothedRef.current;

      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      s.z += (t.z - s.z) * smoothing;
      s.scale += (t.scale - s.scale) * smoothing;

      const da = (t.angle - s.angle + Math.PI) % (Math.PI * 2) - Math.PI;
      s.angle += da * smoothing;

      if (modelRef.current) {
        modelRef.current.visible = isPlaced;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.set(s.scale, s.scale, s.scale);
        modelRef.current.rotation.set(0, 0, -s.angle);
      }

      // debug draw
      if (dbg) {
        const ctx = dbg.getContext("2d");
        dbg.width = v.videoWidth;
        dbg.height = v.videoHeight;
        ctx.clearRect(0, 0, dbg.width, dbg.height);

        if (isPlaced) {
          const cxScr = (s.x / 2 + 0.5) * dbg.width;
          const cyScr = (-s.y / 1.6 + 0.5) * dbg.height;

          ctx.strokeStyle = "lime";
          ctx.lineWidth = 2;

          ctx.beginPath();
          ctx.moveTo(cxScr - 10, cyScr);
          ctx.lineTo(cxScr + 10, cyScr);
          ctx.moveTo(cxScr, cyScr - 10);
          ctx.lineTo(cxScr, cyScr + 10);
          ctx.stroke();

          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(10, 10, 180, 50);
          ctx.fillStyle = "white";
          ctx.font = "14px Arial";
          ctx.fillText(`Scale: ${s.scale.toFixed(2)}`, 18, 30);
          ctx.fillText(`Angle: ${(s.angle * 180 / Math.PI).toFixed(0)}°`, 18, 48);
        }
      }

      if (rendererRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        controlsRef.current.update();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaced]);

  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      <video
        ref={videoRef}
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

      <canvas
        ref={debugCanvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 3,
        }}
      />

      {!isPlaced && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            width: "100%",
            color: "white",
            textAlign: "center",
            zIndex: 4,
          }}
        >
          Scanning for wheel...
        </div>
      )}
    </div>
  );
};

export default ARSmartViewer;
