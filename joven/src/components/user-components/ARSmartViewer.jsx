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
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);

  const rafRef = useRef(null);
  const lastSentRef = useRef(0);
  const lastDetectionRef = useRef(0);

  const sendDelayRef = useRef(400); // reduce load

  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const target = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });
  const smooth = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });
  const smoothing = 0.15;

  /* ----------------------------------------------
      CAMERA (FORCE LANDSCAPE OUTPUT)
  ------------------------------------------------*/
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

  /* ----------------------------------------------
      Three.js + GLB
  ------------------------------------------------*/
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("[AR] ⚠ WebGL context lost");
    });

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
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(4, 6, 3);
    scene.add(dir);

    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;

        try {
          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);

          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = (1.0 / maxDim) * 0.6;

          model.scale.setScalar(scale);

          const center = new THREE.Vector3();
          bbox.getCenter(center);
          model.position.sub(center.multiplyScalar(scale));
        } catch (e) {
          console.warn("[AR] autoscale failed");
          model.scale.setScalar(0.15);
        }

        model.visible = false;
        modelRef.current = model;
        scene.add(model);
        setModelLoaded(true);
      },
      undefined,
      (err) => {
        console.error("[AR] GLB error:", err);
      }
    );

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
    };
  }, [src]);

  /* ----------------------------------------------
      Send Frame (FIXED TO ALWAYS 640×640)
  ------------------------------------------------*/
  const sendFrame = async (video) => {
    const SIZE = 640;

    const frame = document.createElement("canvas");
    frame.width = SIZE;
    frame.height = SIZE;

    const ctx = frame.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // force landscape for YOLO
    const aspect = vw / vh;

    let drawW = SIZE;
    let drawH = Math.round(SIZE / aspect);

    if (drawH < SIZE) {
      drawH = SIZE;
      drawW = Math.round(SIZE * aspect);
    }

    ctx.drawImage(video, (SIZE - drawW) / 2, (SIZE - drawH) / 2, drawW, drawH);

    try {
      const base64 = frame.toDataURL("image/jpeg", 0.8).split(",")[1];

      const res = await fetch(ROBOFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: base64,
      });

      if (!res.ok) return null;

      return await res.json();
    } catch (err) {
      console.error("[AR] sendFrame error:", err);
      return null;
    }
  };

  /* ----------------------------------------------
      RENDER LOOP (STABLE)
  ------------------------------------------------*/
  useEffect(() => {
    const loop = async () => {
      const video = videoRef.current;
      if (!video || !cameraReady || !modelLoaded) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      // YOLO request limit
      if (now - lastSentRef.current > sendDelayRef.current) {
        lastSentRef.current = now;

        const json = await sendFrame(video);

        if (json?.predictions?.length > 0) {
          const det = json.predictions.sort(
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
          // occasionally log only once every 4 seconds
          if (now - lastDetectionRef.current > 4000) {
            console.debug("[AR] No predictions");
          }
        }
      }

      // hide model after 5 seconds
      if (Date.now() - lastDetectionRef.current > 5000) {
        if (modelRef.current) modelRef.current.visible = false;
        setIsPlaced(false);
        setNoWheel(true);
      }

      // smoothing
      const s = smooth.current;
      const t = target.current;
      s.x += (t.x - s.x) * smoothing;
      s.y += (t.y - s.y) * smoothing;
      s.z += (t.z - s.z) * smoothing;
      s.scale += (t.scale - s.scale) * smoothing;

      if (modelRef.current) {
        modelRef.current.visible = isPlaced && modelLoaded;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.setScalar(s.scale);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraReady, modelLoaded, isPlaced]);

  /* ----------------------------------------------
      UI
  ------------------------------------------------*/
  return (
    <div style={{ position: "relative", height: "100vh", width: "100%" }}>
      {/* ---- VIDEO ---- */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "rotate(0deg)",
          zIndex: 1,
        }}
      />

      {/* ---- 3D ---- */}
      <canvas
        ref={threeCanvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 2,
        }}
      />

      {/* ---- UI ---- */}
      {!cameraReady && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            color: "white",
            background: "rgba(0,0,0,0.5)",
            padding: 8,
            borderRadius: 8,
            zIndex: 5,
          }}
        >
          Initializing camera...
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
            padding: 8,
            borderRadius: 8,
            zIndex: 5,
          }}
        >
          Loading 3D wheel...
        </div>
      )}

      {!isPlaced && !noWheel && cameraReady && modelLoaded && (
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
          Scanning for wheel...
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
