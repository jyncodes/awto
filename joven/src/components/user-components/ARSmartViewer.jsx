import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * Roboflow API version
 * Using your Publishable Key + Model Version
 */

const ROBOFLOW_API_URL =
  "https://detect.roboflow.com/dslr-w6mrp/2?api_key=rf_rWKRLxdKTlQmrGvVNvIBCkZYuod2";

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

  const smoothing = 0.15;
  const targetRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12, angle: 0 });
  const smoothedRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12, angle: 0 });

  /* -----------------------------
     CAMERA
  ----------------------------- */
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

  /* -----------------------------
     THREE.js Scene
  ----------------------------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
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

    const resize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
    };
  }, [src]);

  /* -----------------------------
     Send frame to Roboflow API
  ----------------------------- */
  const sendFrame = async (frameCanvas) => {
    try {
      const blob = await new Promise((res) =>
        frameCanvas.toBlob(res, "image/jpeg", 0.8)
      );

      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      const r = await fetch(ROBOFLOW_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!r.ok) return null;

      const json = await r.json();
      return json;
    } catch (err) {
      console.error("Roboflow error:", err);
      return null;
    }
  };

  /* -----------------------------
     Main Loop
  ----------------------------- */
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;
      const dbg = debugCanvasRef.current;

      if (!v || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // downscale to 512 for Roboflow
      const w = 512;
      const h = 512;

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = w;
      frameCanvas.height = h;
      frameCanvas.getContext("2d").drawImage(v, 0, 0, w, h);

      const now = performance.now();

      if (now - lastSentRef.current > 200) {
        lastSentRef.current = now;

        const result = await sendFrame(frameCanvas);

        if (result?.predictions?.length > 0) {
          // Pick the biggest wheel (most important for AR)
          const det = result.predictions.sort(
            (a, b) => b.width * b.height - a.width * a.height
          )[0];

          const x1 = det.x - det.width / 2;
          const y1 = det.y - det.height / 2;
          const x2 = det.x + det.width / 2;
          const y2 = det.y + det.height / 2;

          const cx = det.x;
          const cy = det.y;

          // Convert to real camera resolution
          const scaleX = v.videoWidth / w;
          const scaleY = v.videoHeight / h;

          const realX1 = x1 * scaleX;
          const realY1 = y1 * scaleY;
          const realX2 = x2 * scaleX;
          const realY2 = y2 * scaleY;

          const bboxWidth = Math.abs(realX2 - realX1);
          const relWidth = bboxWidth / v.videoWidth;

          const scale = clamp(relWidth / 0.25, 0.05, 1.5) * 0.4;

          const ndcX = (cx / w) * 2 - 1;
          const ndcY = -((cy / h) * 2 - 1);

          const z = -2.5 * (1 + (0.5 - relWidth));

          targetRef.current = { x: ndcX * 2, y: ndcY * 1.6, z, scale, angle: 0 };
          setIsPlaced(true);
        }
      }

      // Smoothing
      const t = targetRef.current;
      const s = smoothedRef.current;

      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      s.z += (t.z - s.z) * smoothing;
      s.scale += (t.scale - s.scale) * smoothing;

      if (modelRef.current) {
        modelRef.current.visible = isPlaced;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.set(s.scale, s.scale, s.scale);
      }

      // Debug overlay
      if (dbg) {
        dbg.width = v.videoWidth;
        dbg.height = v.videoHeight;
        const ctx = dbg.getContext("2d");
        ctx.clearRect(0, 0, dbg.width, dbg.height);

        if (isPlaced) {
          const cxScr = (s.x / 2 + 0.5) * dbg.width;
          const cyScr = (-s.y / 1.6 + 0.5) * dbg.height;

          ctx.strokeStyle = "lime";
          ctx.lineWidth = 2;
          ctx.strokeRect(cxScr - 20, cyScr - 20, 40, 40);
        }
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      controlsRef.current.update();
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
