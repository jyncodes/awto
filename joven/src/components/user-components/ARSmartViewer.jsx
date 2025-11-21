import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const ROBOFLOW_API_URL =
  "https://detect.roboflow.com/dslr-w6mrp/2?api_key=y9iNRghfr0ZBlKhhW9LE";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ARSmartViewer = ({ src }) => {
  const videoRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const debugCanvasRef = useRef(null);

  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);

  const rafRef = useRef(null);
  const lastSentRef = useRef(0);
  const lastDetectionRef = useRef(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const target = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });
  const smooth = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });

  const smoothing = 0.18;

  /* -------------------------
     CAMERA INIT
  ------------------------- */
  useEffect(() => {
    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        const v = videoRef.current;
        v.srcObject = stream;

        await new Promise((resolve) => {
          v.onloadedmetadata = () => resolve();
        });

        await v.play();
        setCameraReady(true);

        console.log("[AR] Camera ready", v.videoWidth, v.videoHeight);
      } catch (err) {
        console.error("[AR] Camera error:", err);
      }
    };

    startCam();

    return () => {
      const tracks = videoRef.current?.srcObject?.getTracks() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  /* -------------------------
     THREE + MODEL
  ------------------------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
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
    camera.position.z = 3;
    cameraRef.current = camera;

    // lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(3, 6, 3);
    scene.add(dl);

    // Load GLB
    new GLTFLoader().load(
      src,
      (gltf) => {
        const model = gltf.scene;

        // auto-scale
        try {
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = (1 / maxDim) * 0.6;
          model.scale.setScalar(scale);

          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center.multiplyScalar(scale));
        } catch {}

        model.visible = false;
        modelRef.current = model;
        scene.add(model);
        setModelLoaded(true);

        console.log("[AR] Model ready");
      },
      undefined,
      (err) => console.error("GLB error:", err)
    );
  }, [src]);

  /* -------------------------
     SEND FRAME TO ROBOFLOW
  ------------------------- */
  const sendFrame = async (canvas) => {
    try {
      const blob = await new Promise((res) =>
        canvas.toBlob(res, "image/jpeg", 0.8)
      );

      const form = new FormData();
      form.append("file", blob, "frame.jpg");

      const r = await fetch(ROBOFLOW_API_URL, {
        method: "POST",
        body: form,
      });

      if (!r.ok) return null;

      return await r.json();
    } catch {
      return null;
    }
  };

  /* -------------------------
     MAIN LOOP
  ------------------------- */
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;

      if (!cameraReady || v.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const W = 512;
      const H = Math.round((W * v.videoHeight) / v.videoWidth);

      const frame = document.createElement("canvas");
      frame.width = W;
      frame.height = H;
      frame.getContext("2d").drawImage(v, 0, 0, W, H);

      if (performance.now() - lastSentRef.current > 330) {
        lastSentRef.current = performance.now();
        const json = await sendFrame(frame);

        if (json?.predictions?.length > 0) {
          const det = json.predictions.sort(
            (a, b) =>
              b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height
          )[0];

          const cx = det.bbox.x;
          const cy = det.bbox.y;

          const ndcX = (cx / W) * 2 - 1;
          const ndcY = -((cy / H) * 2 - 1);

          const rel = det.bbox.width / W;

          target.current = {
            x: ndcX * 2,
            y: ndcY * 1.7,
            z: -2.2 * (1 + (0.5 - rel)),
            scale: clamp(rel / 0.25, 0.1, 2.0),
          };

          setIsPlaced(true);
          setNoWheel(false);
          lastDetectionRef.current = Date.now();
        }
      }

      if (Date.now() - lastDetectionRef.current > 5000) {
        setIsPlaced(false);
        setNoWheel(true);
        if (modelRef.current) modelRef.current.visible = false;
      }

      // smooth movement
      const t = target.current;
      const s = smooth.current;
      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      s.z += (t.z - s.z) * smoothing;
      s.scale += (t.scale - s.scale) * smoothing;

      if (modelRef.current) {
        modelRef.current.visible = isPlaced && modelLoaded;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.setScalar(s.scale);
      }

      // render
      rendererRef.current.render(sceneRef.current, cameraRef.current);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraReady, modelLoaded]);

  /* -------------------------
     UI
  ------------------------- */
  return (
    <div style={{ position: "relative", height: "100vh" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
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
        <div style={hintBox}>Waiting for camera…</div>
      )}

      {!modelLoaded && (
        <div style={{ ...hintBox, top: 60 }}>Loading 3D model…</div>
      )}

      {!isPlaced && !noWheel && cameraReady && modelLoaded && (
        <div style={scanBox}>Scanning for wheels…</div>
      )}

      {noWheel && (
        <div style={noWheelBox}>❌ No wheels detected</div>
      )}
    </div>
  );
};

/* UI styles */
const hintBox = {
  position: "absolute",
  top: 20,
  left: 20,
  color: "white",
  background: "rgba(0,0,0,0.6)",
  padding: "8px 12px",
  borderRadius: 6,
  zIndex: 5,
};

const scanBox = {
  position: "absolute",
  bottom: 20,
  width: "100%",
  textAlign: "center",
  color: "white",
  zIndex: 5,
};

const noWheelBox = {
  position: "absolute",
  bottom: 20,
  width: "100%",
  textAlign: "center",
  fontWeight: 700,
  color: "orange",
  zIndex: 5,
};

export default ARSmartViewer;
