// src/components/user-components/ARViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

const ARViewer = ({ src }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cocoModel, setCocoModel] = useState(null);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState(false);

  const animationFrameRef = useRef(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const glbModelRef = useRef(null);

  // stable smoothing using refs
  const smoothXRef = useRef(0);
  const smoothYRef = useRef(0);

  // debug toggle: draws a simple box to confirm threejs output independent of GLB
  const DEBUG_DRAW_TEST_BOX = false;

  /* ------------------------------------------
   * 1. Load TensorFlow model
   ------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    const loadModel = async () => {
      try {
        await tf.ready();
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (cancelled) return;
        setCocoModel(model);
        console.log("✅ TensorFlow model loaded (Lite MobileNet)");
      } catch (err) {
        console.error("❌ Failed to load TensorFlow:", err);
        setError(true);
      }
    };
    loadModel();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ------------------------------------------
   * 2. Start camera
   ------------------------------------------- */
  useEffect(() => {
    let mounted = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // don't block if play() fails — we still render Three scene
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn("Video play() failed but stream is attached:", playErr);
          }
        }
      } catch (err) {
        console.error("❌ Camera error:", err);
        setError(true);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      const tracks = videoRef.current?.srcObject?.getTracks?.();
      tracks?.forEach((track) => track.stop());
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  /* ------------------------------------------
   * 3. Setup Three.js scene
   ------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create renderer using existing canvas
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    // Respect device pixel ratio for crisp rendering
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    // Initially size renderer to canvas client size
    const setRendererSizeToCanvas = () => {
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      renderer.setSize(w, h, false); // false to not update style
    };
    setRendererSizeToCanvas();

    rendererRef.current = renderer;

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      canvas.clientWidth / canvas.clientHeight,
      0.01,
      100
    );
    camera.position.set(0, 0, 3);

    sceneRef.current = scene;
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Lights (keep yours but slightly balanced)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemi);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Optional debug box to verify rendering
    let debugBox = null;
    if (DEBUG_DRAW_TEST_BOX) {
      const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const mat = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.6 });
      debugBox = new THREE.Mesh(geo, mat);
      debugBox.position.set(0, -0.5, -2);
      scene.add(debugBox);
    }

    // Load GLB model
    const loader = new GLTFLoader();
    let loadingCancelled = false;

    loader.load(
      src,
      (gltf) => {
        if (loadingCancelled) return;
        const model = gltf.scene;
        // start with a visible / sensible baseline scale and allow later adjustments
        model.scale.set(0.12, 0.12, 0.12);
        model.visible = false;

        model.traverse((child) => {
          if (child.isMesh) {
            // preserve any original material but fallback to a physical material to look good
            child.material = new THREE.MeshPhysicalMaterial({
              color: child.material?.color ? child.material.color.clone() : new THREE.Color(0xffffff),
              roughness: 0.35,
              metalness: 0.9,
              clearcoat: 0.7,
              clearcoatRoughness: 0.1,
            });
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        glbModelRef.current = model;
        scene.add(model);
        setModelReady(true);

        console.log("✅ GLB model loaded successfully");
      },
      undefined,
      (err) => {
        console.error("❌ Failed to load GLB:", err);
        // don't mark global error right away — GLB may be missing but AR can still run with debug box
        setError(false);
      }
    );

    // Resize handler uses actual canvas size
    const onResize = () => {
      setRendererSizeToCanvas();
      const w = Math.max(1, canvas.clientWidth);
      const h = Math.max(1, canvas.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      loadingCancelled = true;
      window.removeEventListener("resize", onResize);
      if (debugBox) scene.remove(debugBox);
      renderer.dispose();
    };
  }, [src]);

  /* ------------------------------------------
   * 4. Detection + Rendering loop
   ------------------------------------------- */
  useEffect(() => {
    if (!rendererRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const detectLoop = async () => {
      try {
        // Always render (so user sees either camera feed or Three scene)
        // If video is ready we'll draw model positioned according to detection;
        // otherwise we still render the scene (debug/test box or nothing)
        if (videoRef.current?.readyState >= 2 && cocoModel) {
          const predictions = await cocoModel.detect(videoRef.current);
          const cars = predictions.filter(
            (p) => ["car", "truck", "bus"].includes(p.class) && p.score > 0.55
          );

          const model = glbModelRef.current;

          if (model && cars.length > 0) {
            const { bbox } = cars[0];
            const [x, y, w, h] = bbox;

            const videoW = videoRef.current.videoWidth;
            const videoH = videoRef.current.videoHeight;

            // Estimate wheel position
            const wheelX = x + w * 0.25;
            const wheelY = y + h * 0.75;

            let targetX = (wheelX - videoW / 2) / videoW;
            let targetY = (wheelY - videoH / 2) / videoH;

            // Smooth output using refs
            smoothXRef.current = smoothXRef.current * 0.8 + targetX * 0.2;
            smoothYRef.current = smoothYRef.current * 0.8 + targetY * 0.2;

            model.visible = true;
            // adjust multiplier and z-depth to taste
            model.position.set(smoothXRef.current * 1.7, -smoothYRef.current * 1.7, -2.5);
          } else if (glbModelRef.current) {
            glbModelRef.current.visible = false;
          }
        }

        // Update controls and renderer
        controls?.update();

        // Ensure camera aspect matches canvas exactly before render (in case CSS changed)
        const canvas = canvasRef.current;
        if (canvas) {
          const w = Math.max(1, canvas.clientWidth);
          const h = Math.max(1, canvas.clientHeight);
          if (camera.aspect !== w / h) {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h, false);
          }
        }

        renderer.render(scene, camera);
      } catch (err) {
        console.error("Render/detect loop error:", err);
      }

      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };

    detectLoop();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [cocoModel]);

  /* ------------------------------------------
   * 5. Error UI
   ------------------------------------------- */
  if (error) {
    return (
      <div
        style={{
          color: "white",
          background: "black",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        ❌ AR Viewer Error – Check Camera or Model
      </div>
    );
  }

  /* ------------------------------------------
   * Render UI
   ------------------------------------------- */
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        position: "relative",
        background: "transparent",
      }}
    >
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

      {/* Use the provided canvas element (Three will render into this) */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "none", // allow touch events to reach the video if desired
          background: "transparent",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "10px",
          width: "100%",
          textAlign: "center",
          color: "white",
          zIndex: 3,
        }}
      >
        {cocoModel ? (modelReady ? "🚗 Locating vehicle wheel…" : "📦 Loading 3D model…") : "🤖 Loading AI model…"}
      </div>
    </div>
  );
};

export default ARViewer;
