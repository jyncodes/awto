// src/components/user-components/ARViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import * as tf from "@tensorflow/tfjs";

const ARViewer = ({ src }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [cocoModel, setCocoModel] = useState(null);
  const [error, setError] = useState(false);

  const animationFrameRef = useRef(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const glbModelRef = useRef(null);
  const shadeRef = useRef(null);

  const lastPinchDistanceRef = useRef(null);
  const lastTouchXRef = useRef(null);
  const lastTouchYRef = useRef(null);

  /* Load COCO */
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

  /* Start Camera */
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

  /* Scene Setup */
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

    /* ⭐ Brighter rendering */
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMappingExposure = 1.4;

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

    /* Better lighting */
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 1.4));

    const dir = new THREE.DirectionalLight(0xffffff, 1.45);
    dir.position.set(5, 10, 5);
    dir.castShadow = false;
    scene.add(dir);

    /* Load GLB */
    const loader = new GLTFLoader();
    let cancelled = false;

    loader.load(
      src,
      (gltf) => {
        if (cancelled) return;

        const model = gltf.scene;

        // Auto scale
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 1.2 / maxDim;
        model.scale.setScalar(scaleFactor);

        // Center the model
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.sub(center);

        // ⭐ START EXACTLY AT THE CENTER (not bottom)
        model.position.set(0, 0, -2.2);

        model.visible = false;

        /* ⭐ Brighten model materials */
        model.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.color.multiplyScalar(1.4);
            child.material.metalness = 0.35;
            child.material.roughness = 0.25;
            child.material.needsUpdate = true;
          }
        });

        glbModelRef.current = model;
        scene.add(model);

        /* Shade overlay */
        const shade = new THREE.Mesh(
          new THREE.CircleGeometry(1.2, 64),
          new THREE.MeshBasicMaterial({
            color: 0x000000,
            opacity: 0.85,
            transparent: true,
          })
        );
        shade.position.set(0, 0, -2.25);
        shade.rotation.x = Math.PI;
        shade.visible = false;
        shadeRef.current = shade;
        scene.add(shade);
      },
      undefined,
      (err) => console.error("GLB Error:", err)
    );

    /* TOUCH CONTROLS */
    const handleTouchMoveRotate = (e) => {
      if (!glbModelRef.current) return;

      if (e.touches.length === 1) {
        const t = e.touches[0];

        if (lastTouchXRef.current == null) lastTouchXRef.current = t.clientX;
        const dx = t.clientX - lastTouchXRef.current;
        glbModelRef.current.rotation.y += dx * 0.01;
        lastTouchXRef.current = t.clientX;

        if (lastTouchYRef.current == null) lastTouchYRef.current = t.clientY;
        const dy = t.clientY - lastTouchYRef.current;
        glbModelRef.current.position.y -= dy * 0.005;
        if (shadeRef.current) shadeRef.current.position.y -= dy * 0.005;
        lastTouchYRef.current = t.clientY;
      }
    };

    const handleTouchEndRotate = () => {
      lastTouchXRef.current = null;
      lastTouchYRef.current = null;
    };

    const handleTouchMoveScale = (e) => {
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
      const scaleAmount = 1 + delta * 0.003;

      glbModelRef.current.scale.multiplyScalar(scaleAmount);
      if (shadeRef.current) shadeRef.current.scale.multiplyScalar(scaleAmount);

      lastPinchDistanceRef.current = dist;
    };

    canvas.addEventListener("touchmove", handleTouchMoveRotate, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMoveScale, { passive: false });
    canvas.addEventListener("touchend", handleTouchEndRotate);

    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("touchmove", handleTouchMoveRotate);
      canvas.removeEventListener("touchmove", handleTouchMoveScale);
      canvas.removeEventListener("touchend", handleTouchEndRotate);
      renderer.dispose();
    };
  }, [src]);

  /* Detection Loop */
  useEffect(() => {
    if (!rendererRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    const loop = async () => {
      if (
        videoRef.current?.readyState >= 2 &&
        cocoModel &&
        glbModelRef.current
      ) {
        const predictions = await cocoModel.detect(videoRef.current);

        const vehicles = predictions.filter((p) =>
          ["car", "truck", "bus"].includes(p.class)
        );

        const show = vehicles.length > 0;
        glbModelRef.current.visible = show;

        if (shadeRef.current) shadeRef.current.visible = show;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [cocoModel]);

  if (error) {
    return (
      <div style={{ height: "100vh", color: "white", background: "black" }}>
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
          pointerEvents: "auto",
          background: "transparent",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "50px",
          width: "100%",
          color: "white",
          textAlign: "center",
          fontSize: "17px",
          fontWeight: "600",
          textShadow: "0 0 6px black",
          zIndex: 9999,
          padding: "10px",
        }}
      >
        🔄 Rotate: Swipe Left/Right • ↕ Move: Swipe Up/Down • 📏 Scale: Pinch
      </div>
    </div>
  );
}; W

export default ARViewer;
