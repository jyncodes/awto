import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

/*
  Roboflow API + model version (publishable/inference key)
  - You already created a model on Roboflow (dslr-w6mrp/2)
  - This code posts camera frames to Roboflow inference endpoint
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
  const lastSentRef = useRef(0);
  const lastDetectionTimeRef = useRef(0); // time of last detection (ms)

  // UI state
  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  // smoothing + targets
  const smoothing = 0.15;
  const targetRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12 });
  const smoothedRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12 });

  /* ---------------------------
     CAMERA START
  --------------------------- */
  useEffect(() => {
    let mounted = true;
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!mounted) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        // initialize lastDetectionTimeRef so we don't immediately show "No wheels"
        lastDetectionTimeRef.current = 0;
        console.log("[AR] Camera started");
      } catch (err) {
        console.error("[AR] Camera error:", err);
      }
    };

    startCam();

    return () => {
      mounted = false;
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  /* ---------------------------
     THREE.JS + GLB LOAD
  --------------------------- */
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

    // Load GLB model from `src` prop (should be the Supabase public URL you determine in ViewProduct)
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.visible = false;
        // default scale; product-specific adjustments should be done in GLB authoring or dynamically
        model.scale.set(0.12, 0.12, 0.12);
        modelRef.current = model;
        scene.add(model);
        setModelLoaded(true);
        console.log("[AR] GLB loaded:", src);
      },
      undefined,
      (err) => {
        console.error("[AR] GLB load error:", err);
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

  /* ---------------------------
     SEND FRAME -> ROBOFLOW
     returns JSON or null
  --------------------------- */
  const sendFrame = async (frameCanvas) => {
    try {
      const blob = await new Promise((res) => frameCanvas.toBlob(res, "image/jpeg", 0.8));
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");

      const r = await fetch(ROBOFLOW_API_URL, { method: "POST", body: formData });
      if (!r.ok) {
        // Roboflow often responds 402 or 403 on limits — log status
        console.warn("[AR] Roboflow responded:", r.status);
        return null;
      }
      const json = await r.json();
      return json;
    } catch (err) {
      console.error("[AR] Roboflow request failed:", err);
      return null;
    }
  };

  /* ---------------------------
     MAIN LOOP
  --------------------------- */
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;
      const dbg = debugCanvasRef.current;

      if (!v || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // choose reasonable downscale while keeping aspect ratio (Roboflow model supports various input sizes)
      // we pick 640px width (keeps good accuracy and not too big)
      const origW = v.videoWidth || 1280;
      const origH = v.videoHeight || 720;
      const targetW = 640;
      const targetH = Math.round((targetW * origH) / origW);

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = targetW;
      frameCanvas.height = targetH;
      const fctx = frameCanvas.getContext("2d");
      fctx.drawImage(v, 0, 0, targetW, targetH);

      const now = performance.now();
      // throttle networking to about 3 FPS - ~350ms
      if (now - lastSentRef.current > 350) {
        lastSentRef.current = now;
        const result = await sendFrame(frameCanvas);

        if (result?.predictions?.length > 0) {
          // update last detection timestamp (used for 5s hide)
          lastDetectionTimeRef.current = Date.now();
          setNoWheel(false);

          // pick largest prediction (area) as primary wheel
          const det = result.predictions
            .slice()
            .sort((a, b) => (b.bbox.width * b.bbox.height) - (a.bbox.width * a.bbox.height))[0];

          // Roboflow returns bbox center (x,y) and width/height in px relative to the image we sent
          const cx = det.bbox.x;
          const cy = det.bbox.y;
          const bw = det.bbox.width;
          // const bh = det.bbox.height;

          // convert to NDC (-1..1)
          const ndcX = (cx / targetW) * 2 - 1;
          const ndcY = -((cy / targetH) * 2 - 1);

          // estimate scale based on bounding width relative to screen width
          const bboxWidthReal = bw; // in frameCanvas pixels
          const relWidth = bboxWidthReal / targetW; // relative in downscaled image
          // map to screen-relative scale factor — you can tweak multiplier
          const scale = clamp(relWidth / 0.25, 0.05, 1.5) * 0.45;

          // depth heuristic: closer/larger wheel => smaller z (closer to camera)
          const z = -2.5 * (1 + (0.5 - relWidth));

          targetRef.current = { x: ndcX * 2, y: ndcY * 1.6, z, scale };
          setIsPlaced(true);
        }
      }

      // Auto-hide logic: if no detection for 5 seconds -> hide model + show "No wheels detected"
      if (lastDetectionTimeRef.current > 0 && Date.now() - lastDetectionTimeRef.current > 5000) {
        setIsPlaced(false);
        setNoWheel(true);
        if (modelRef.current) modelRef.current.visible = false;
      }

      // smoothing
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

      // debug overlay (box or crosshair)
      if (dbg) {
        const ctx = dbg.getContext("2d");
        dbg.width = v.videoWidth;
        dbg.height = v.videoHeight;
        ctx.clearRect(0, 0, dbg.width, dbg.height);

        if (isPlaced && modelRef.current) {
          const cxScr = (s.x / 2 + 0.5) * dbg.width;
          const cyScr = (-s.y / 1.6 + 0.5) * dbg.height;
          ctx.strokeStyle = "lime";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cxScr - 12, cyScr);
          ctx.lineTo(cxScr + 12, cyScr);
          ctx.moveTo(cxScr, cyScr - 12);
          ctx.lineTo(cxScr, cyScr + 12);
          ctx.stroke();
        }
      }

      // render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
    // note: intentionally not listing isPlaced/noWheel here to keep single loop reference
  }, []);

  /* ---------------------------
     RENDER
  --------------------------- */
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

      {/* status area */}
      {!isPlaced && !noWheel && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            width: "100%",
            textAlign: "center",
            color: "white",
            zIndex: 4,
          }}
        >
          Scanning for wheel…
        </div>
      )}

      {noWheel && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            width: "100%",
            textAlign: "center",
            color: "orange",
            fontWeight: "700",
            zIndex: 4,
          }}
        >
          ❌ No wheels detected
        </div>
      )}

      {!modelLoaded && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            color: "white",
            background: "rgba(0,0,0,0.4)",
            padding: "6px 8px",
            borderRadius: 6,
            zIndex: 5,
          }}
        >
          Loading 3D model...
        </div>
      )}
    </div>
  );
};

export default ARSmartViewer;
