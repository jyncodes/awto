import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/**
 * ARSmartViewer.jsx (Roboflow inference)
 *
 * Features:
 * - Sends downscaled frames to Roboflow Detect API
 * - Picks the largest detected wheel and places the GLB there
 * - Smooth movements (EMA smoothing)
 * - Auto-hide GLB after 5s of no detection and show fallback text "No wheels detected"
 * - Debug overlay (bounding box + simple indicator)
 *
 * IMPORTANT:
 * - Replace ROBOFLOW_API_URL with your Roboflow model detect endpoint (publishable key shown here).
 * - `src` should be a public GLB URL (your Supabase file link) — ViewProduct.jsx already resolves it.
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

  const [modelLoaded, setModelLoaded] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [fallbackText, setFallbackText] = useState("Scanning for wheel...");
  const lastSentRef = useRef(0);
  const lastDetectionTimeRef = useRef(0);

  const smoothing = 0.18;
  const targetRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12 });
  const smoothedRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12 });

  /* -----------------------------
     Camera
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
        setFallbackText("Camera access denied");
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
     THREE.js scene and GLB loader
  ----------------------------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enabled = false;
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 6, 3);
    scene.add(dir);

    // Load GLB
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.visible = false;
        // default scale: if your GLB looks too big/small, tune this baseScale
        const baseScale = 0.12;
        model.scale.set(baseScale, baseScale, baseScale);
        modelRef.current = model;
        scene.add(model);
        setModelLoaded(true);
      },
      undefined,
      (err) => {
        console.error("GLB load error:", err);
        setFallbackText("Failed to load 3D model");
        setModelLoaded(false);
      }
    );

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.dispose();
    };
  }, [src]);

  /* -----------------------------
     Send frame to Roboflow
     - Roboflow expects small images (we use 512x512)
  ----------------------------- */
  const sendFrame = async (frameCanvas) => {
    try {
      const blob = await new Promise((resolve) => frameCanvas.toBlob(resolve, "image/jpeg", 0.8));
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      const r = await fetch(ROBOFLOW_API_URL, { method: "POST", body: formData });
      if (!r.ok) {
        // handle rate limit / unauthorized etc
        console.warn("Roboflow response not ok:", r.status);
        return null;
      }
      const json = await r.json();
      return json;
    } catch (err) {
      console.error("Roboflow error:", err);
      return null;
    }
  };

  /* -----------------------------
     Main loop - detection + placement + auto-hide fallback
  ----------------------------- */
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;
      const dbg = debugCanvasRef.current;

      if (!v || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Roboflow recommended sizes often 512x512 — keep aspect by stretching center crop
      const w = 512;
      const h = 512;

      // Draw video into downscale canvas
      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = w;
      frameCanvas.height = h;
      const fctx = frameCanvas.getContext("2d");
      // center-crop to avoid stretching too much
      const srcW = v.videoWidth;
      const srcH = v.videoHeight;
      const srcRatio = srcW / srcH;
      const dstRatio = w / h;

      if (srcRatio > dstRatio) {
        // video is wider than dst — crop sides
        const cropW = Math.round(srcH * dstRatio);
        const cropX = Math.round((srcW - cropW) / 2);
        fctx.drawImage(v, cropX, 0, cropW, srcH, 0, 0, w, h);
      } else {
        // video is taller — crop top/bottom
        const cropH = Math.round(srcW / dstRatio);
        const cropY = Math.round((srcH - cropH) / 2);
        fctx.drawImage(v, 0, cropY, srcW, cropH, 0, 0, w, h);
      }

      const now = performance.now();

      // throttle requests (~200ms)
      if (now - lastSentRef.current > 200) {
        lastSentRef.current = now;
        const result = await sendFrame(frameCanvas);

        if (result?.predictions?.length > 0) {
          // mark detection time
          lastDetectionTimeRef.current = Date.now();
          setFallbackText(""); // clear fallback

          // choose largest predicted bbox (area)
          const det = result.predictions
            .slice()
            .sort((a, b) => b.width * b.height - a.width * a.height)[0];

          // Roboflow predictions: x,y are center in pixels of the 512 canvas
          const cx = det.x;
          const cy = det.y;
          const bw = det.width;
          const bh = det.height;

          // Convert bbox center from 512-space to actual video resolution
          // note: we used a center-crop above; compute scale accordingly
          // Determine the crop used, to compute correct scaling
          const srcW2 = v.videoWidth;
          const srcH2 = v.videoHeight;
          const srcRatio2 = srcW2 / srcH2;

          let cropW, cropH, cropX, cropY;
          if (srcRatio2 > dstRatio) {
            cropH = srcH2;
            cropW = Math.round(srcH2 * dstRatio);
            cropX = Math.round((srcW2 - cropW) / 2);
            cropY = 0;
          } else {
            cropW = srcW2;
            cropH = Math.round(srcW2 / dstRatio);
            cropX = 0;
            cropY = Math.round((srcH2 - cropH) / 2);
          }

          const scaleX = cropW / w;
          const scaleY = cropH / h;

          // real center on original video
          const realCx = cropX + cx * scaleX;
          const realCy = cropY + cy * scaleY;
          const realBw = bw * scaleX;
          const relWidth = realBw / v.videoWidth;

          // compute position in NDC (-1..1)
          const ndcX = (realCx / v.videoWidth) * 2 - 1;
          const ndcY = -((realCy / v.videoHeight) * 2 - 1);

          const z = -2.5 * (1 + (0.5 - relWidth));
          const scale = clamp(relWidth / 0.25, 0.05, 1.5) * 0.4;

          targetRef.current = { x: ndcX * 2, y: ndcY * 1.6, z, scale };

          setIsPlaced(true);

          // For debug: attach last detection bbox to canvas context
          if (dbg) {
            dbg.width = v.videoWidth;
            dbg.height = v.videoHeight;
            const dctx = dbg.getContext("2d");
            dctx.clearRect(0, 0, dbg.width, dbg.height);
            const cxScr = (targetRef.current.x / 2 + 0.5) * dbg.width;
            const cyScr = (-targetRef.current.y / 1.6 + 0.5) * dbg.height;
            const bwScr = (realBw / v.videoWidth) * dbg.width;
            const bhScr = ( (bh * scaleY) / v.videoHeight ) * dbg.height; // approximate

            dctx.strokeStyle = "lime";
            dctx.lineWidth = 3;
            dctx.strokeRect(cxScr - bwScr / 2, cyScr - bhScr / 2, bwScr, bhScr);
          }
        } else {
          // no predictions returned
          // do not immediately hide, use timeout logic below
        }
      }

      // Auto-hide if no detection for > 5 seconds
      const timeSince = Date.now() - lastDetectionTimeRef.current;
      if (timeSince > 5000) {
        // hide model and display fallback
        if (isPlaced) {
          setIsPlaced(false);
          if (modelRef.current) modelRef.current.visible = false;
        }
        setFallbackText("No wheels detected");
      }

      // Smoothing and apply transform
      const t = targetRef.current;
      const s = smoothedRef.current;
      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      s.z += (t.z - s.z) * smoothing;
      s.scale += (t.scale - s.scale) * smoothing;

      if (modelRef.current) {
        modelRef.current.visible = isPlaced && modelLoaded;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.set(s.scale, s.scale, s.scale);
      }

      // Render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      controlsRef.current.update();

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelLoaded, isPlaced]);

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

      {/* Fallback / status overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          width: "100%",
          textAlign: "center",
          color: "white",
          zIndex: 4,
          fontSize: 16,
          textShadow: "0 0 6px rgba(0,0,0,0.7)",
        }}
      >
        {fallbackText}
      </div>
    </div>
  );
};

export default ARSmartViewer;
