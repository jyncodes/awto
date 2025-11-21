// src/components/user-components/ARSmartViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

/* Roboflow serverless endpoint (use your inference key) */
const ROBOFLOW_BASE = "https://serverless.roboflow.com";
const ROBOFLOW_MODEL = "dslr-w6mrp/2";
const ROBOFLOW_KEY = "y9iNRghfr0ZBlKhhW9LE"; // your private inference key (keep secret)
const ROBOFLOW_URL = `${ROBOFLOW_BASE}/${ROBOFLOW_MODEL}?api_key=${ROBOFLOW_KEY}&format=json`;

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
  const sendDelayRef = useRef(350); // ms between sends, will grow on errors (simple backoff)

  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const target = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });
  const smooth = useRef({ x: 0, y: 0, z: -2.5, scale: 0.2 });
  const smoothing = 0.18;

  /* --------- Camera --------- */
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

        // wait loadedmetadata so videoWidth/videoHeight are available
        await new Promise((resolve) => {
          const onLoaded = () => {
            v.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          };
          v.addEventListener("loadedmetadata", onLoaded);
          if (v.readyState >= 1) {
            v.removeEventListener("loadedmetadata", onLoaded);
            resolve();
          }
        });

        await v.play();
        setCameraReady(true);
        console.log("[AR] Camera ready:", v.videoWidth, "x", v.videoHeight);
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

  /* --------- Three + GLB --------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    // context lost handler (log it)
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      console.warn("[AR] WebGL context lost", e);
    });

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 6, 3);
    scene.add(dir);

    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        // try to autoscale and center
        try {
          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const desired = 1.0;
          const scu = (desired / maxDim) * 0.6;
          model.scale.setScalar(scu);

          const center = new THREE.Vector3();
          bbox.getCenter(center);
          model.position.sub(center.multiplyScalar(scu));
        } catch (e) {
          console.warn("[AR] auto-scale failed:", e);
          model.scale.set(0.15, 0.15, 0.15);
        }

        model.visible = false;
        modelRef.current = model;
        scene.add(model);
        setModelLoaded(true);
        console.log("[AR] GLB MODEL LOADED:", src);
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

  /* --------- sendFrame (serverless Roboflow) --------- */
  const sendFrame = async (frameCanvas) => {
    // frameCanvas must be a valid canvas element
    try {
      const base64 = frameCanvas.toDataURL("image/jpeg", 0.8);
      const payload = base64.split(",")[1]; // strip data prefix

      // POST to serverless endpoint — body is base64 string.
      const resp = await fetch(ROBOFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payload,
      });

      if (!resp.ok) {
        console.warn("[AR] Roboflow error:", resp.status);
        // adjust backoff on 5xx / 4xx to avoid spamming their API
        if (resp.status >= 500) sendDelayRef.current = Math.min(2000, sendDelayRef.current * 1.5);
        if (resp.status === 402 || resp.status === 403) {
          // rate/permission issues: pause a little longer
          sendDelayRef.current = Math.min(5000, sendDelayRef.current * 2);
        }
        return null;
      }

      // successful -> reset delay
      sendDelayRef.current = 350;
      const json = await resp.json();
      return json;
    } catch (err) {
      console.error("[AR] sendFrame() network error:", err);
      // increase delay a bit
      sendDelayRef.current = Math.min(2000, sendDelayRef.current * 1.5);
      return null;
    }
  };

  /* --------- Main loop --------- */
  useEffect(() => {
    const loop = async () => {
      const v = videoRef.current;
      const dbg = debugCanvasRef.current;

      // wait camera + model ready
      if (!v || !cameraReady || !modelLoaded) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // ensure video providing dimensions
      if (v.readyState < 2 || v.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // build a downscaled frame (keep aspect)
      const targetW = 640;
      const targetH = Math.round((targetW * v.videoHeight) / v.videoWidth);
      const frame = document.createElement("canvas");
      frame.width = targetW;
      frame.height = targetH;
      frame.getContext("2d").drawImage(v, 0, 0, targetW, targetH);

      const now = performance.now();
      if (now - lastSentRef.current > sendDelayRef.current) {
        lastSentRef.current = now;
        const json = await sendFrame(frame);

        if (json?.predictions?.length > 0) {
          // defensive: filter predictions with bbox
          const valid = (json.predictions || []).filter((p) => p && p.bbox && typeof p.bbox.x === "number");
          console.log("[AR] Roboflow predictions:", valid);
          if (valid.length > 0) {
            // choose largest by area
            const det = valid
              .slice()
              .sort((a, b) => (b.bbox.width * b.bbox.height) - (a.bbox.width * a.bbox.height))[0];

            const cx = det.bbox.x;
            const cy = det.bbox.y;
            const bw = det.bbox.width;

            // convert to NDC -1..1
            const ndcX = (cx / targetW) * 2 - 1;
            const ndcY = -((cy / targetH) * 2 - 1);

            const relWidth = bw / targetW;
            const scale = clamp(relWidth / 0.25, 0.05, 2.0) * 0.5;
            const z = -2.2 * (1 + (0.5 - relWidth));

            target.current = { x: ndcX * 2, y: ndcY * 1.6, z, scale };

            setIsPlaced(true);
            setNoWheel(false);
            lastDetectionRef.current = Date.now();
          } else {
            console.log("[AR] Roboflow returned predictions but none valid.");
          }
        } else {
          // no detections — don't spam console, but occasionally log
          // (only log every few seconds)
          if (Math.random() < 0.02) console.debug("[AR] no predictions this frame");
        }
      }

      // auto-hide after 5s no detection
      if (lastDetectionRef.current > 0 && Date.now() - lastDetectionRef.current > 5000) {
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

      // update model transform + visible only when both placed & loaded
      if (modelRef.current) {
        modelRef.current.visible = isPlaced && modelLoaded;
        modelRef.current.position.set(s.x, -s.y, s.z);
        modelRef.current.scale.set(s.scale, s.scale, s.scale);
      }

      // debug overlay (simple cross)
      if (dbg) {
        dbg.width = v.videoWidth;
        dbg.height = v.videoHeight;
        const ctx = dbg.getContext("2d");
        ctx.clearRect(0, 0, dbg.width, dbg.height);
        if (isPlaced) {
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
    return () => cancelAnimationFrame(rafRef.current);
    // cameraReady & modelLoaded are used inside: keep them in deps to restart loop after ready states
  }, [cameraReady, modelLoaded]);

  /* --------- UI --------- */
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
          background: "black",
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

      {/* Status / hints */}
      {!cameraReady && (
        <div style={{ position: "absolute", top: 12, left: 12, color: "white", background: "rgba(0,0,0,0.5)", padding: 8, borderRadius: 6, zIndex: 5 }}>
          Waiting for camera...
        </div>
      )}

      {!modelLoaded && (
        <div style={{ position: "absolute", top: 12, right: 12, color: "white", background: "rgba(0,0,0,0.5)", padding: 8, borderRadius: 6, zIndex: 5 }}>
          Loading 3D model...
        </div>
      )}

      {!isPlaced && !noWheel && cameraReady && modelLoaded && (
        <div style={{ position: "absolute", bottom: 20, width: "100%", textAlign: "center", color: "white", zIndex: 5 }}>
          Scanning for wheels...
        </div>
      )}

      {noWheel && (
        <div style={{ position: "absolute", bottom: 20, width: "100%", textAlign: "center", color: "orange", fontWeight: 700, zIndex: 5 }}>
          ❌ No wheels detected
        </div>
      )}
    </div>
  );
};

export default ARSmartViewer;
