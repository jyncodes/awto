import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

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
  const modelRef = useRef(null);
  const rafRef = useRef(null);

  const lastSentRef = useRef(0);
  const lastDetectionRef = useRef(Date.now());

  const [isPlaced, setIsPlaced] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const smoothing = 0.18;
  const target = useRef({ x: 0, y: 0, z: -2.5, scale: 0.15 });
  const smooth = useRef({ x: 0, y: 0, z: -2.5, scale: 0.15 });

  /* ---------------------------
     CAMERA INIT
  --------------------------- */
  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (!mounted) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    start();
    return () => {
      mounted = false;
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  /* ---------------------------
     THREE + GLB INIT
  --------------------------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(2, 6, 3);
    scene.add(dir);

    new GLTFLoader().load(
      src,
      (gltf) => {
        modelRef.current = gltf.scene;
        modelRef.current.visible = false;
        modelRef.current.scale.set(0.15, 0.15, 0.15);
        scene.add(modelRef.current);
        setModelLoaded(true);
        console.log("[GLB Loaded]", src);
      },
      undefined,
      (err) => console.error("GLB load error", err)
    );

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", resize);

    return () => {
      renderer.dispose();
      window.removeEventListener("resize", resize);
    };
  }, [src]);

  /* ---------------------------
     SEND FRAME TO ROBOFLOW
  --------------------------- */
  const sendFrame = async (canvas) => {
    try {
      const blob = await new Promise((res) =>
        canvas.toBlob(res, "image/jpeg", 0.8)
      );
      const fd = new FormData();
      fd.append("file", blob, "frame.jpg");
      const r = await fetch(ROBOFLOW_API_URL, { method: "POST", body: fd });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      console.error("Roboflow error", e);
      return null;
    }
  };

  /* ---------------------------
     MAIN AR LOOP
  --------------------------- */
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;

      if (!v || v.readyState < 2 || v.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // downscale frame
      const W = 640;
      const H = Math.round((W * v.videoHeight) / v.videoWidth);

      const frame = document.createElement("canvas");
      frame.width = W;
      frame.height = H;
      frame.getContext("2d").drawImage(v, 0, 0, W, H);

      // throttle calls
      if (performance.now() - lastSentRef.current > 300) {
        lastSentRef.current = performance.now();

        const rf = await sendFrame(frame);

        if (rf?.predictions?.length > 0) {
          const det = rf.predictions
            .slice()
            .sort(
              (a, b) =>
                b.bbox.width * b.bbox.height - a.bbox.width * a.bbox.height
            )[0];

          const cx = det.bbox.x;
          const cy = det.bbox.y;
          const bw = det.bbox.width;

          lastDetectionRef.current = Date.now();
          setNoWheel(false);

          const ndcX = (cx / W) * 2 - 1;
          const ndcY = -((cy / H) * 2 - 1);

          const rel = bw / W;
          const scale = clamp(rel / 0.25, 0.05, 2.0) * 0.5;
          const z = -2.2 * (1 + (0.5 - rel));

          target.current = { x: ndcX * 2, y: ndcY * 1.7, z, scale };
          setIsPlaced(true);
        }
      }

      // hide after 5 seconds
      if (Date.now() - lastDetectionRef.current > 5000) {
        setIsPlaced(false);
        setNoWheel(true);
        if (modelRef.current) modelRef.current.visible = false;
      }

      // smoothing
      const t = target.current;
      const s = smooth.current;
      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      s.z += (t.z - s.z) * smoothing;
      s.scale += (t.scale - s.scale) * smoothing;

      // update model
      if (modelRef.current) {
        modelRef.current.visible = isPlaced && modelLoaded;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.set(s.scale, s.scale, s.scale);
      }

      // render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ---------------------------
     UI
  --------------------------- */
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          position: "absolute",
          zIndex: 1,
        }}
      />

      <canvas
        ref={threeCanvasRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          zIndex: 2,
        }}
      />

      {!modelLoaded && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            color: "white",
            zIndex: 5,
          }}
        >
          Loading 3D Model...
        </div>
      )}

      {!isPlaced && !noWheel && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            width: "100%",
            textAlign: "center",
            color: "white",
            zIndex: 5,
          }}
        >
          Scanning for wheels…
        </div>
      )}

      {noWheel && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            width: "100%",
            textAlign: "center",
            color: "red",
            fontWeight: "bold",
            zIndex: 5,
          }}
        >
          ❌ No wheels detected
        </div>
      )}
    </div>
  );
};

export default ARSmartViewer;
