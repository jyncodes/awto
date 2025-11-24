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

  // pinch scaling ref
  const lastPinchDistanceRef = useRef(null);

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
        if (!cancelled) setCocoModel(model);
      } catch (err) {
        console.error(err);
        setError(true);
      }
    };

    loadModel();
    return () => (cancelled = true);
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
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error(err);
        setError(true);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      const tracks = videoRef.current?.srcObject?.getTracks();
      tracks?.forEach((t) => t.stop());
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  /* ------------------------------------------
   * 3. Setup Three.js Scene
   ------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });

    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      70,
      canvas.clientWidth / canvas.clientHeight,
      0.01,
      100
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 10, 5);
    scene.add(dir);

    let debugBox = null;
    if (DEBUG_DRAW_TEST_BOX) {
      debugBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial()
      );
      scene.add(debugBox);
    }

    // Load GLB model
    const loader = new GLTFLoader();
    let cancelLoad = false;

    loader.load(
      src,
      (gltf) => {
        if (cancelLoad) return;
        const model = gltf.scene;

        model.scale.set(0.12, 0.12, 0.12);
        model.position.set(0, 0, -2.5); // Fixed position (no auto movement)
        model.visible = true;

        glbModelRef.current = model;
        scene.add(model);
        setModelReady(true);
      },
      undefined,
      (err) => console.error("GLB load error:", err)
    );

    // PINCH-TO-SCALE
    const handleTouchMove = (e) => {
      if (!glbModelRef.current) return;
      if (e.touches.length !== 2) {
        lastPinchDistanceRef.current = null;
        return;
      }

      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastPinchDistanceRef.current === null) {
        lastPinchDistanceRef.current = dist;
        return;
      }

      const delta = dist - lastPinchDistanceRef.current;
      const scaleFactor = 1 + delta * 0.003;

      glbModelRef.current.scale.multiplyScalar(scaleFactor);

      lastPinchDistanceRef.current = dist;
    };

    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    // Resize
    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelLoad = true;
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("touchmove", handleTouchMove);
      renderer.dispose();
    };
  }, [src]);

  /* ------------------------------------------
   * 4. SIMPLE STATIC RENDER LOOP (no auto move)
   ------------------------------------------- */
  useEffect(() => {
    if (!rendererRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  /* ------------------------------------------
   * Render UI
   ------------------------------------------- */
  if (error) {
    return (
      <div style={{ color: "white", background: "black", height: "100vh" }}>
        ❌ AR Viewer Error
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
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
        ref={canvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "auto",   // IMPORTANT for pinch scaling
          background: "transparent",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "10px",
          width: "100%",
          color: "white",
          textAlign: "center",
          zIndex: 3,
        }}
      >
        📏 Pinch to Scale the Wheel
      </div>
    </div>
  );
};

export default ARViewer;
