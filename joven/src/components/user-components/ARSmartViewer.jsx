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
  const controlsRef = useRef(null);
  const modelRef = useRef(null);

  const rafRef = useRef(null);
  const lastSentRef = useRef(0);

  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const lastDetectionTimeRef = useRef(Date.now());

  const smoothing = 0.15;
  const targetRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12 });
  const smoothedRef = useRef({ x: 0, y: 0, z: -2.5, scale: 0.12 });


  /* ----------------------------------------------------
      CAMERA START
  ---------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    const startCam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!mounted) return;
        videoRef.current.srcObject = stream;

        await videoRef.current.play();
        console.log("[CAM] Camera started.");
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


  /* ----------------------------------------------------
      THREE.JS INITIALIZATION
  ---------------------------------------------------- */
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
      0.1,
      100
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enabled = false;
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 6, 3);
    scene.add(dir);

    // Load GLB
    new GLTFLoader().load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.visible = false;
        model.scale.set(0.12, 0.12, 0.12);
        modelRef.current = model;
        scene.add(model);
        console.log("[GLB] Model loaded:", src);
      },
      undefined,
      (err) => console.error("GLB load error:", err)
    );

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
    };
  }, [src]);


  /* ----------------------------------------------------
        SEND FRAME TO ROBOFLOW
  ---------------------------------------------------- */
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

      const result = await r.json();
      return result;
    } catch (err) {
      console.error("Roboflow error:", err);
      return null;
    }
  };


  /* ----------------------------------------------------
        MAIN LOOP
  ---------------------------------------------------- */
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;
      const dbg = debugCanvasRef.current;

      if (!v || v.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const w = v.videoWidth;
      const h = v.videoHeight;

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = 640;   // keep aspect ratio (no stretch!)
      frameCanvas.height = (640 * h) / w;

      frameCanvas
        .getContext("2d")
        .drawImage(v, 0, 0, frameCanvas.width, frameCanvas.height);

      const now = performance.now();

      if (now - lastSentRef.current > 350) {
        lastSentRef.current = now;

        const result = await sendFrame(frameCanvas);

        if (result?.predictions?.length > 0) {
          lastDetectionTimeRef.current = Date.now();
          setNoWheel(false);

          const det = result.predictions[0]; // biggest wheel

          const cx = det.bbox.x;
          const cy = det.bbox.y;

          const realW = frameCanvas.width;

          const ndcX = (cx / realW) * 2 - 1;
          const ndcY = -((cy / frameCanvas.height) * 2 - 1);

          targetRef.current = {
            x: ndcX * 2,
            y: ndcY * 1.6,
            z: -2.5,
            scale: 0.2,
          };

          setIsPlaced(true);
        }
      }

      // auto hide after 5s
      if (Date.now() - lastDetectionTimeRef.current > 5000) {
        setIsPlaced(false);
        setNoWheel(true);
        if (modelRef.current) modelRef.current.visible = false;
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
        dbg.width = w;
        dbg.height = h;
        const ctx = dbg.getContext("2d");
        ctx.clearRect(0, 0, w, h);

        if (isPlaced) {
          ctx.strokeStyle = "lime";
          ctx.lineWidth = 3;
          ctx.strokeRect(w / 2 - 50, h / 2 - 50, 100, 100);
        }
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);


  /* ----------------------------------------------------
      RENDER UI
  ---------------------------------------------------- */
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

      {/* Status messages */}
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
            color: "red",
            fontWeight: "bold",
            zIndex: 4,
          }}
        >
          ❌ No wheels detected
        </div>
      )}
    </div>
  );
};

export default ARSmartViewer;
