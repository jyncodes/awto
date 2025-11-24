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

  const lastPinchDistanceRef = useRef(null);

  const DEBUG_DRAW_TEST_BOX = false;

  /* ------------------------------------------
   * Load COCO model
   ------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await tf.ready();
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        if (!cancelled) setCocoModel(model);
      } catch (err) {
        console.error(err);
        setError(true);
      }
    })();

    return () => (cancelled = true);
  }, []);

  /* ------------------------------------------
   * Start camera
   ------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (!mounted) return;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error(err);
        setError(true);
      }
    })();

    return () => {
      mounted = false;
      videoRef.current?.srcObject?.getTracks()?.forEach((t) => t.stop());
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  /* ------------------------------------------
   * Setup Scene
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

    // Load GLB
    const loader = new GLTFLoader();
    let cancelled = false;

    loader.load(
      src,
      (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;

        model.scale.set(0.12, 0.12, 0.12);
        model.position.set(0, 0, -2.5);
        model.visible = false;

        glbModelRef.current = model;
        scene.add(model);
        setModelReady(true);
      },
      undefined,
      (err) => console.error("GLB Error:", err)
    );

    /* Pinch scaling */
    const handleTouchMove = (e) => {
      if (!glbModelRef.current) return;

      if (e.touches.length !== 2) {
        lastPinchDistanceRef.current = null;
        return;
      }

      const [t1, t2] = e.touches;
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!lastPinchDistanceRef.current) {
        lastPinchDistanceRef.current = dist;
        return;
      }

      const delta = dist - lastPinchDistanceRef.current;
      glbModelRef.current.scale.multiplyScalar(1 + delta * 0.003);
      lastPinchDistanceRef.current = dist;
    };

    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("touchmove", handleTouchMove);
      renderer.dispose();
    };
  }, [src]);

  /* ------------------------------------------
   * Detection → Show/Hide GLB
   ------------------------------------------- */
  useEffect(() => {
    if (!rendererRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    const loop = async () => {
      if (videoRef.current?.readyState >= 2 && cocoModel && glbModelRef.current) {
        const predictions = await cocoModel.detect(videoRef.current);

        const vehicles = predictions.filter((p) =>
          ["car", "truck", "bus"].includes(p.class)
        );

        glbModelRef.current.visible = vehicles.length > 0;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [cocoModel]);

  /* ------------------------------------------
   * UI
   ------------------------------------------- */
  if (error) {
    return (
      <div style={{ height: "100vh", color: "white", background: "black" }}>
        ❌ AR Viewer Error
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>

      {/* Camera feed */}
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

      {/* AR Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "auto",
          background: "transparent",
        }}
      />

      {/* ⭐ FIXED MESSAGE — now visible on MOBILE */}
      <div
        style={{
          position: "absolute",
          bottom: "60px",   // ⬅ moved higher for phones
          width: "100%",
          color: "white",
          textAlign: "center",
          fontSize: "18px",
          fontWeight: "600",
          textShadow: "0 0 6px black",
          zIndex: 9999,    // ⬅ ensures visible
          padding: "10px",
        }}
      >
        📏 Pinch to Scale — GLB Appears Only When Vehicle is Detected
      </div>

    </div>
  );
};

export default ARViewer;
