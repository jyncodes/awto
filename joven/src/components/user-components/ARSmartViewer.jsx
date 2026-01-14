// src/components/user-components/ARSmartViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const ROBOFLOW_URL =
  `https://serverless.roboflow.com/wheel-segmentation-vf80o/1?api_key=${import.meta.env.VITE_ROBOFLOW_API_KEY}&format=json`;



const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function getMaskCenter(mask) {
  let sx = 0, sy = 0;
  for (const [x, y] of mask) {
    sx += x;
    sy += y;
  }
  return { x: sx / mask.length, y: sy / mask.length };
}

function getMaskDiameter(mask) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const [x, y] of mask) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return Math.max(maxX - minX, maxY - minY);
}


const ARSmartViewer = ({ src }) => {
  // if no src provided, fallback to uploaded test.glb path
  const effectiveSrc = src || "/mnt/data/test.glb";

  const videoRef = useRef(null);
  const threeCanvasRef = useRef(null);
  const debugCanvasRef = useRef(null);

  const wheelRenderTargetRef = useRef(null);
  const wheelCanvasRef = useRef(null);

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
  const smoothing = 0.08;

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

    // 🔹 Render target for wheel replacement
    wheelRenderTargetRef.current = new THREE.WebGLRenderTarget(1024, 1024, {
      format: THREE.RGBAFormat,
      transparent: true,
    });

    // canvas to extract pixels from render target
    wheelCanvasRef.current = document.createElement("canvas");
    wheelCanvasRef.current.width = 1024;
    wheelCanvasRef.current.height = 1024;


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

          m.traverse(child => {
            if (child.isMesh) {
              child.material.depthWrite = true;
              child.material.depthTest = true;
            }
          });

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

          // 🔧 FIX: orient wheel to face camera
          m.rotation.set(0, 0, 0);
          m.rotateY(Math.PI / 2);


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

const applyWheelMask = (video, masks) => {
  const canvas = debugCanvasRef.current;
  if (!canvas || !video || !wheelCanvasRef.current) return;

  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // 1️⃣ Draw camera frame
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // remove original tire area, this is for replacement
  
  masks.forEach(mask => {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();

  mask.forEach(([x, y], i) => {
      const px = (x / 640) * canvas.width;
      const py = (y / 640) * canvas.height;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });

    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3️⃣ Draw rendered wheel INSIDE the tire
    ctx.drawImage(
      wheelCanvasRef.current,
      0,
      0,
      canvas.width,
      canvas.height
    );
  });
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


        const json = await sendToYOLO(frame);

        // convert Roboflow predictions into segmentation object

          const rims = (json?.predictions || [])
          .filter(p => p.class === "rim" && p.mask);

        const tires = (json?.predictions || [])
          .filter(p => p.class === "tire" && p.mask);

          const preds = rims;


          if (tires.length > 0) {
            applyWheelMask(video, tires.map(t => t.mask));
          } else {
            applyWheelMask(video, []);
          }



        // sort by area (largest first)
       preds.sort(
          (a, b) => getMaskDiameter(b.mask) - getMaskDiameter(a.mask)
        );

        if (preds.length >= 2 && !isLocked) {
  // sort wheels from left to right
  const sorted = [...preds].sort(
    (a, b) => getMaskCenter(a.mask).x - getMaskCenter(b.mask).x
  );
  

  const leftDet = sorted[0];
  const rightDet = sorted[1];

  const leftCenter = getMaskCenter(leftDet.mask);
  const rightCenter = getMaskCenter(rightDet.mask);

  const leftDiameter = getMaskDiameter(leftDet.mask);
  const rightDiameter = getMaskDiameter(rightDet.mask);

  const leftNdcX = (leftCenter.x / 640) * 2 - 1;
  const leftNdcY = -((leftCenter.y / 640) * 2 - 1);
  const rightNdcX = (rightCenter.x / 640) * 2 - 1;
  const rightNdcY = -((rightCenter.y / 640) * 2 - 1);

  // const distanceFactor = 1 / Math.sqrt(leftDiameter);
  const rightDistanceFactor = 1 / Math.sqrt(rightDiameter);

  const REFERENCE_DIAMETER = 220;


  targetLeft.current = {
    x: leftNdcX * 1.5,
    y: leftNdcY * 1.2,
    z: -2.5,
 scale: clamp(
    REFERENCE_DIAMETER / leftDiameter,
    0.15,
    0.6
  ),
  rot: 0,
};

targetRight.current = {
  x: rightNdcX * 1.5,
  y: rightNdcY * 1.2,
  z: -2.5,
  scale: clamp(
    REFERENCE_DIAMETER / rightDiameter,
    0.15,
    0.6
  ),
  rot: 0,
};

  lastDetectionRef.current = Date.now();
  setIsPlaced(true);
  setNoWheel(false);

        } else if (preds.length === 1 && !isLocked) {
  const d = preds[0];
  const center = getMaskCenter(d.mask);
  const diameter = getMaskDiameter(d.mask);

  const ndcX = (center.x / 640) * 2 - 1;
  const ndcY = -((center.y / 640) * 2 - 1);

  targetLeft.current = {
    x: ndcX * 1.5,
    y: ndcY * 1.2,
    z: -2.5,
    scale: clamp(diameter / 260, 0.05, 0.4),
    rot: 0,
  };

  targetRight.current = { ...targetRight.current, scale: 0.001 };

  lastDetectionRef.current = Date.now();
  setIsPlaced(true);
  setNoWheel(false);
} else if (!isLocked) {
  if (Date.now() - lastDetectionRef.current > 3000) {
    setIsPlaced(false);
    setNoWheel(true);

    if (leftModelRef.current) leftModelRef.current.visible = false;
    if (rightModelRef.current) rightModelRef.current.visible = false;
  }
  
  console.log("Predictions:", json?.predictions?.length);


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
(baseScaleRef.current || 0.12) * clamp(s.scale * 1.8, 0.01, 3.0);

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
(baseScaleRef.current || 0.12) * clamp(s2.scale * 1.8, 0.01, 3.0);

        rightModelRef.current.visible = isPlaced && appliedRightScale > 0.001;
        rightModelRef.current.position.set(s2.x, -s2.y, s2.z);
        rightModelRef.current.scale.setScalar(appliedRightScale);
        rightModelRef.current.rotation.set(0, 0, s2.rot);
      }

      // render
      try {
        const renderer = rendererRef.current;

        // 1️⃣ Render wheel to texture
          renderer.setRenderTarget(wheelRenderTargetRef.current);
          renderer.clear();
          renderer.render(sceneRef.current, cameraRef.current);

          // 2️⃣ Copy pixels
          const pixels = new Uint8Array(1024 * 1024 * 4);
          renderer.readRenderTargetPixels(
            wheelRenderTargetRef.current,
            0,
            0,
            1024,
            1024,
            pixels
          );

      const ctxWheel = wheelCanvasRef.current.getContext("2d");
      const imageData = ctxWheel.createImageData(1024, 1024);
      imageData.data.set(pixels);
      ctxWheel.putImageData(imageData, 0, 0);

      // 3️⃣ Reset back to screen

        renderer.setRenderTarget(null);
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
    style={{ display: "none" }} // 👈 hide it
  />

      <canvas
        ref={debugCanvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1, // 👈 behind THREE.js
        }}
      />

    <canvas
      ref={threeCanvasRef}
      style={{ display: "block", opacity: 0.01 }}
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
