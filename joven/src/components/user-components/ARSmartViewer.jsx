// src/components/user-components/ARSmartViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const ROBOFLOW_URL =
  "https://serverless.roboflow.com/dslr-w6mrp/2?api_key=y9iNRghfr0ZBlKhhW9LE&format=json";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ARSmartViewer = ({ src }) => {
  // if no src provided, fallback to uploaded test.glb path
  const effectiveSrc = src || "/mnt/data/test.glb";

  const videoRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const debugCanvasRef = useRef(null);

  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const baseModelRef = useRef(null); // original loaded model (used to clone)
  const leftModelRef = useRef(null);
  const rightModelRef = useRef(null);
  const baseScaleRef = useRef(1); // store computed base scale

  const rafRef = useRef(null);
  const lastSentRef = useRef(0);
  const lastDetectionRef = useRef(0);
  const sendDelayRef = useRef(350);

  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [isPlaced, setIsPlaced] = useState(false);
  const [noWheel, setNoWheel] = useState(false);

  const [isLocked, setIsLocked] = useState(false);


  // target positions for each model
  const targetLeft = useRef({ x: 0, y: 0, z: -2.2, scale: 0.12, rot: 0 });
  const targetRight = useRef({ x: 0, y: 0, z: -2.2, scale: 0.12, rot: 0 });

  // smoothing states
  const smoothLeft = useRef({ x: 0, y: 0, z: -2.2, scale: 0.12, rot: 0 });
  const smoothRight = useRef({ x: 0, y: 0, z: -2.2, scale: 0.12, rot: 0 });
  const smoothing = 0.18;

  /* ---------------- CAMERA ---------------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 30 },
          },
        });
        if (!active) return;

        const v = videoRef.current;
        v.setAttribute("playsinline", "");
        v.setAttribute("autoplay", "");
        v.setAttribute("muted", "true");
        v.muted = true;

        v.srcObject = stream;
        await v.play();

        console.log("[AR] Camera ready:", v.videoWidth, v.videoHeight);
        setCameraReady(true);
      } catch (err) {
        console.error("[AR] CAMERA ERROR:", err);
      }
    })();

    return () => {
      active = false;
      const tracks = videoRef.current?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  /* ---------------- THREE INITIALIZE ---------------- */
  useEffect(() => {
    const canvas = threeCanvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    renderer.setPixelRatio(window.devicePixelRatio || 1);
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
    // move camera a bit back so models don't dominate view
    camera.position.set(0, 0, 4);
    cameraRef.current = camera;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(4, 6, 3);
    scene.add(dir);

    // handle resize
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    /* ---- LOAD GLB ---- */
    const loader = new GLTFLoader();
    loader.load(
      effectiveSrc,
      (gltf) => {
        const m = gltf.scene;

        try {
          // safe scaling and centering
          const box = new THREE.Box3().setFromObject(m);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z) || 1;

          // ====== IMPORTANT FIX: normalize to realistic wheel diameter ======
          // Choose a target diameter in scene units (approx wheel diameter)
          const TARGET_DIAMETER = 0.8; // adjust if you want larger/smaller wheels
          let baseScale = TARGET_DIAMETER / maxDim; // exact normalization
          // keep baseScale in a safe range
          baseScale = clamp(baseScale, 0.01, 1.0);
          baseScaleRef.current = baseScale;

          m.scale.setScalar(baseScale);

          // recenter model geometry (move pivot to center)
          const center = new THREE.Vector3();
          box.getCenter(center);
          m.position.sub(center.multiplyScalar(baseScale));

          // reset rotation
          m.rotation.set(0, 0, 0);
        } catch (err) {
          // fallback
          m.scale.setScalar(0.12);
          baseScaleRef.current = 0.12;
        }

        m.visible = false;

        // store base model (not added directly to scene)
        baseModelRef.current = m;

        // instantiate left and right clones (two overlays)
        const left = m.clone(true);
        const right = m.clone(true);

        // ensure clones update and have independent matrices
        left.matrixAutoUpdate = true;
        right.matrixAutoUpdate = true;

        left.visible = false;
        right.visible = false;

        leftModelRef.current = left;
        rightModelRef.current = right;

        scene.add(left);
        scene.add(right);

        setModelLoaded(true);
        console.log(
          "[AR] Model loaded and clones created! baseScale:",
          baseScaleRef.current
        );
      },
      undefined,
      (err) => console.error("[AR] Model load error:", err)
    );

    return () => {
      // cleanup
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      try {
        renderer.dispose();
      } catch {}
    };
  }, [effectiveSrc]);

  /* ---------------- BUILD FRAME ---------------- */
  const buildFrame = (video) => {
    const SIZE = 640;
    const c = document.createElement("canvas");
    c.width = SIZE;
    c.height = SIZE;

    const ctx = c.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (!video || video.videoWidth === 0) return c;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const aspect = vw / vh;

    let dw, dh;
    if (aspect > 1) {
      dw = SIZE;
      dh = SIZE / aspect;
    } else {
      dh = SIZE;
      dw = SIZE * aspect;
    }

    ctx.drawImage(video, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
    return c;
  };

  /* ---------------- SEND TO YOLO ---------------- */
  const sendToYOLO = async (canvas) => {
    try {
      const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];

      const res = await fetch(ROBOFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: base64,
      });

      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.error("[AR] YOLO ERROR:", err);
      return null;
    }
  };

  /* ---------------- MAIN LOOP ---------------- */
  useEffect(() => {
    const loop = async () => {
      const video = videoRef.current;

      if (!video || !cameraReady || !modelLoaded) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const now = performance.now();

      if (!isLocked && now - lastSentRef.current > sendDelayRef.current) {

        lastSentRef.current = now;

        const frame = buildFrame(video);

        if (debugCanvasRef.current) {
          debugCanvasRef.current
            .getContext("2d")
            .drawImage(frame, 0, 0, 200, 200);
        }

        const json = await sendToYOLO(frame);

        // convert Roboflow predictions into bbox objects if present
        const preds = (json?.predictions || []).map((p) => ({
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          confidence: p.confidence ?? 0,
        }));

        // sort by area (largest first)
        preds.sort((a, b) => b.width * b.height - a.width * a.height);

        // We'll use up to two detections for left/right overlay (Level 2)
        const bestLeftRight = [];

        if (preds.length > 0) {
          if (preds.length >= 2) {
            const firstTwo = preds.slice(0, 4);
            const top2 = firstTwo.slice(0, 2);
            top2.sort((a, b) => a.x - b.x);
            bestLeftRight.push(...top2);
          } else {
            bestLeftRight.push(preds[0]);
          }
        }

        if (bestLeftRight.length > 0 && !isLocked) {
          if (bestLeftRight.length === 2) {
            const leftDet = bestLeftRight[0];
            const rightDet = bestLeftRight[1];

            const leftNdcX = (leftDet.x / 640) * 2 - 1;
            const leftNdcY = -((leftDet.y / 640) * 2 - 1);
            const rightNdcX = (rightDet.x / 640) * 2 - 1;
            const rightNdcY = -((rightDet.y / 640) * 2 - 1);

            // detection-driven scale (multiplies baseScale)
            const leftScaleRel = clamp(leftDet.width / 220, 0.04, 0.35);
            const rightScaleRel = clamp(rightDet.width / 220, 0.04, 0.35);

            // compute final z (depth) mapping
            const leftZ = -clamp(2.8 - leftDet.width / 300, 1.0, 4.0);
            const rightZ = -clamp(2.8 - rightDet.width / 300, 1.0, 4.0);

            const leftTilt = clamp(
              (leftDet.height / leftDet.width - 1) * 0.8,
              -0.6,
              0.6
            );
            const rightTilt = clamp(
              (rightDet.height / rightDet.width - 1) * 0.8,
              -0.6,
              0.6
            );

            // NOTE: store *relative* scale; we'll multiply by baseScaleRef when applying
            targetLeft.current = {
              x: leftNdcX * 1.5,
              y: leftNdcY * 1.2,
              z: leftZ,
              scale: leftScaleRel,
              rot: leftTilt,
            };
            targetRight.current = {
              x: rightNdcX * 1.5,
              y: rightNdcY * 1.2,
              z: rightZ,
              scale: rightScaleRel,
              rot: rightTilt,
            };

            lastDetectionRef.current = Date.now();
            setIsPlaced(true);
            setNoWheel(false);
          } else {
            const d = bestLeftRight[0];
            const ndcX = (d.x / 640) * 2 - 1;
            const ndcY = -((d.y / 640) * 2 - 1);
            const scaleRel = clamp(d.width / 220, 0.04, 0.35);
            const z = -clamp(2.8 - d.width / 300, 1.0, 4.0);
            const tilt = clamp((d.height / d.width - 1) * 0.8, -0.6, 0.6);

            targetLeft.current = {
              x: ndcX * 1.5,
              y: ndcY * 1.2,
              z,
              scale: scaleRel,
              rot: tilt,
            };
            targetRight.current = { ...targetRight.current, scale: 0.001 };
            lastDetectionRef.current = Date.now();
            setIsPlaced(true);
            setNoWheel(false);
          }
        } else if (!isLocked) {
          if (Date.now() - lastDetectionRef.current > 3000) {
            setIsPlaced(false);
            setNoWheel(true);
            if (leftModelRef.current) leftModelRef.current.visible = false;
            if (rightModelRef.current) rightModelRef.current.visible = false;
          }
        }
      }

      // Apply smoothing to both models and update scene transforms
      const lerp = (a, b, t) => a + (b - a) * t;

      // LEFT model smoothing & apply
      if (leftModelRef.current) {
        const s = smoothLeft.current;
        const t = targetLeft.current;
        s.x = lerp(s.x, t.x, smoothing);
        s.y = lerp(s.y, t.y, smoothing);
        s.z = lerp(s.z, t.z, smoothing);
        s.scale = lerp(s.scale, t.scale, smoothing);
        s.rot = lerp(s.rot, t.rot || 0, smoothing);

        // final applied scale = baseScale * relativeScale
        const appliedLeftScale =
          (baseScaleRef.current || 0.12) * clamp(s.scale, 0.01, 2.0);

        leftModelRef.current.visible = isPlaced && appliedLeftScale > 0.001;
        leftModelRef.current.position.set(s.x, -s.y, s.z);
        leftModelRef.current.scale.setScalar(appliedLeftScale);
        leftModelRef.current.rotation.set(0, 0, s.rot);
      }

      // RIGHT model smoothing & apply
      if (rightModelRef.current) {
        const s2 = smoothRight.current;
        const t2 = targetRight.current;
        s2.x = lerp(s2.x, t2.x, smoothing);
        s2.y = lerp(s2.y, t2.y, smoothing);
        s2.z = lerp(s2.z, t2.z, smoothing);
        s2.scale = lerp(s2.scale, t2.scale, smoothing);
        s2.rot = lerp(s2.rot, t2.rot || 0, smoothing);

        const appliedRightScale =
          (baseScaleRef.current || 0.12) * clamp(s2.scale, 0.01, 2.0);

        rightModelRef.current.visible = isPlaced && appliedRightScale > 0.001;
        rightModelRef.current.position.set(s2.x, -s2.y, s2.z);
        rightModelRef.current.scale.setScalar(appliedRightScale);
        rightModelRef.current.rotation.set(0, 0, s2.rot);
      }

      // render
      try {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      } catch (err) {
        console.warn("[AR] render error:", err);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [cameraReady, modelLoaded, isPlaced]);

  /* ---------------- UI ---------------- */
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      {isPlaced && !isLocked && (
  <button
    style={{
      position: "absolute",
      bottom: 80,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      padding: "12px 18px",
      background: "rgba(0,0,0,0.7)",
      color: "white",
      borderRadius: 10,
      border: "1px solid rgba(255,255,255,0.4)",
      fontWeight: 600,
    }}
    onClick={() => { setIsLocked(true);
        // freeze targets at current smooth position
  targetLeft.current = { ...smoothLeft.current };
  targetRight.current = { ...smoothRight.current };
    }}
  >
    ✔ Lock Wheels
  </button>
)}


      <video
        ref={videoRef}
        autoPlay
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
        width={200}
        height={200}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          border: "2px solid lime",
          zIndex: 99,
        }}
      />

      {!cameraReady && <div style={msgStyle}>Initializing camera...</div>}

      {!modelLoaded && (
        <div style={{ ...msgStyle, right: 10, left: "auto" }}>
          Loading wheel model...
        </div>
      )}

      {!isPlaced && !noWheel && cameraReady && modelLoaded && (
        <div style={{ ...msgBottom }}>Scanning for wheels...</div>
      )}

      {noWheel && (
        <div style={{ ...msgBottom, color: "orange", fontWeight: 700 }}>
          ❌ No wheels detected
        </div>
      )}
    </div>
  );
};

const msgStyle = {
  position: "absolute",
  top: 15,
  left: 15,
  padding: 8,
  background: "rgba(0,0,0,0.5)",
  color: "white",
  zIndex: 99,
};

const msgBottom = {
  position: "absolute",
  bottom: 15,
  width: "100%",
  textAlign: "center",
  color: "white",
  zIndex: 99,
};

export default ARSmartViewer;
