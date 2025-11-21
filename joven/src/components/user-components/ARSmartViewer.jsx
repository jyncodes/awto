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
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);

  const rafRef = useRef(null);
  const lastSentRef = useRef(0);
  const lastDetectionRef = useRef(0);

  const sendDelayRef = useRef(500);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const target = useRef({ x: 0, y: 0, z: -2.5, scale: 0.25 });
  const smooth = useRef({ x: 0, y: 0, z: -2.5, scale: 0.25 });
  const smoothing = 0.18;

  /* --------------------------------------------------
        CAMERA
  -------------------------------------------------- */
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const v = videoRef.current;
        v.srcObject = stream;

        await new Promise((resolve) => {
          const loaded = () => {
            v.removeEventListener("loadedmetadata", loaded);
            resolve();
          };
          v.addEventListener("loadedmetadata", loaded);
        });

        await v.play();
        setCameraReady(true);

        console.log(`[AR] Camera ready: ${v.videoWidth}x${v.videoHeight}`);
      } catch (err) {
        console.error("[AR] Camera error:", err);
      }
    })();

    return () => {
      active = false;
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  /* --------------------------------------------------
        THREE.JS + GLB
  -------------------------------------------------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });

    // FIX #1 — Avoid context loss by disabling high DPI
    renderer.setPixelRatio(1); 
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.domElement.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
        console.warn("⚠ WebGL context lost (auto prevented)");
      },
      { passive: true } // FIX #2
    );

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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dl = new THREE.DirectionalLight(0xffffff, 1.0);
    dl.position.set(4, 6, 3);
    scene.add(dl);

    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const m = gltf.scene;

        try {
          const box = new THREE.Box3().setFromObject(m);
          const size = new THREE.Vector3();
          box.getSize(size);

          const maxSize = Math.max(size.x, size.y, size.z);
          const scale = (1.0 / maxSize) * 0.55;

          m.scale.setScalar(scale);

          const center = new THREE.Vector3();
          box.getCenter(center);
          m.position.sub(center.multiplyScalar(scale));
        } catch (e) {
          m.scale.setScalar(0.15);
        }

        m.visible = false;
        modelRef.current = m;
        scene.add(m);
        setModelLoaded(true);
      },
      undefined,
      (err) => console.error("[AR] Model load error:", err)
    );

    return () => {
      renderer.dispose();
    };
  }, [src]);

  /* --------------------------------------------------
      SEND FRAME (SAFE PARSING)
  -------------------------------------------------- */
  const sendToYOLO = async (video) => {
    const SIZE = 640;

    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;

    const ctx = c.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const aspect = vw / vh;

    let drawW = SIZE;
    let drawH = Math.round(SIZE / aspect);

    if (drawH < SIZE) {
      drawH = SIZE;
      drawW = Math.round(SIZE * aspect);
    }

    ctx.drawImage(video, (SIZE - drawW) / 2, (SIZE - drawH) / 2, drawW, drawH);

    try {
      const base64 = c.toDataURL("image/jpeg", 0.8).split(",")[1];

      const res = await fetch(ROBOFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: base64,
      });

      if (!res.ok) return null;

      return await res.json();
    } catch (err) {
      console.error("[AR] YOLO send error:", err);
      return null;
    }
  };

  /* --------------------------------------------------
      LOOP — NO CRASH EVER
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

        const json = await sendToYOLO(video);

        const preds = (json?.predictions || [])
          .filter((p) => p && p.bbox && typeof p.bbox.x === "number"); // FIX #3

        if (preds.length > 0) {
          const det = preds.sort(
            (a, b) =>
              b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height
          )[0];

          const cx = det.bbox.x / 640;
          const cy = det.bbox.y / 640;
          const bw = det.bbox.width / 640;

          const ndcX = cx * 2 - 1;
          const ndcY = -(cy * 2 - 1);

          const scale = clamp(bw / 0.25, 0.05, 2.0) * 0.45;
          const z = -2.2 * (1 + (0.5 - bw));

          target.current = { x: ndcX * 2, y: ndcY * 1.7, z, scale };

          lastDetectionRef.current = Date.now();
          setIsPlaced(true);
          setNoWheel(false);
        } else {
          if (Date.now() - lastDetectionRef.current > 3000) {
            setIsPlaced(false);
            setNoWheel(true);
            modelRef.current.visible = false;
          }
        }
      }

      // Smooth motion
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

      rendererRef.current?.render(sceneRef.current, cameraRef.current);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraReady, modelLoaded, isPlaced]);

  /* --------------------------------------------------
      UI
  -------------------------------------------------- */
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

      {!cameraReady && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            color: "white",
            background: "rgba(0,0,0,0.5)",
            padding: "8px 12px",
            borderRadius: 6,
            zIndex: 3,
          }}
        >
          Initializing camera…
        </div>
      )}

      {!modelLoaded && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            color: "white",
            background: "rgba(0,0,0,0.5)",
            padding: "8px 12px",
            borderRadius: 6,
            zIndex: 3,
          }}
        >
          Loading wheel model…
        </div>
      )}

      {!isPlaced && !noWheel && cameraReady && modelLoaded && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            width: "100%",
            color: "white",
            textAlign: "center",
            zIndex: 3,
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
            color: "orange",
            fontWeight: "bold",
            textAlign: "center",
            zIndex: 3,
          }}
        >
          ❌ No wheels detected
        </div>
      )}
    </div>
  );
};

export default ARSmartViewer;
