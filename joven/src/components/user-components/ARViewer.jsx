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
  const [error, setError] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [isModelPlaced, setIsModelPlaced] = useState(false);
  const animationFrameRef = useRef(null);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const glbModelRef = useRef(null);

  // ✅ Load TensorFlow COCO-SSD model
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const model = await cocoSsd.load();
        setCocoModel(model);
        console.log("✅ TensorFlow model loaded");
      } catch (err) {
        console.error("❌ Failed to load TensorFlow:", err);
        setError(true);
      }
    };
    loadModel();
  }, []);

  // ✅ Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: 1280, height: 720 },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("❌ Camera error:", err);
        setError(true);
      }
    };
    startCamera();

    return () => {
      const tracks = videoRef.current?.srcObject?.getTracks();
      tracks?.forEach((track) => track.stop());
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // ✅ Initialize Three.js
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    camera.position.set(0, 0, 3);
    sceneRef.current = scene;
    cameraRef.current = camera;

    // ✅ OrbitControls (rotate + zoom only)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.6;
    controlsRef.current = controls;

    // ✅ Lighting setup
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x555555, 1.3);
    hemiLight.position.set(0, 50, 0);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(hemiLight, dirLight);

    // ✅ Environment reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new THREE.Scene()).texture;
    scene.environment = envTexture;

    // ✅ Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.12, 0.12, 0.12);
        model.visible = false;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            const baseColor = child.material.color
              ? child.material.color
              : new THREE.Color(0xffffff);
            child.material = new THREE.MeshPhysicalMaterial({
              color: baseColor,
              metalness: 0.8,
              roughness: 0.25,
              reflectivity: 0.9,
              clearcoat: 0.7,
              clearcoatRoughness: 0.05,
              envMap: envTexture,
            });
          }
        });

        scene.add(model);
        glbModelRef.current = model;
        setModelReady(true);
        console.log("✅ GLB model loaded successfully");
      },
      undefined,
      (err) => {
        console.error("❌ Error loading GLB:", err);
        setError(true);
      }
    );

    // ✅ Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [src]);

  // ✅ Detection + Render Loop (only places model once)
  useEffect(() => {
    if (!cocoModel || !rendererRef.current || !controlsRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const detectAndRender = async () => {
      if (videoRef.current?.readyState >= 2 && cocoModel && !isModelPlaced) {
        const predictions = await cocoModel.detect(videoRef.current);
        const cars = predictions.filter(
          (p) => ["car", "truck", "bus"].includes(p.class) && p.score > 0.5
        );

        const model = glbModelRef.current;
        if (model && cars.length > 0) {
          // ✅ Place it once at a fixed position
          const car = cars[0];
          const [x, y, w, h] = car.bbox;
          const centerX = x + w / 2;
          const centerY = y + h / 2;

          // Convert to normalized screen coords (but fixed)
          const offsetX =
            (centerX - videoRef.current.videoWidth / 2) /
            videoRef.current.videoWidth;
          const offsetY =
            (centerY - videoRef.current.videoHeight / 2) /
            videoRef.current.videoHeight;

          model.visible = true;
          model.position.set(offsetX * 1.5, -offsetY * 1.5, -2.5);
          setIsModelPlaced(true); // ✅ stop repositioning
          console.log("📍 Model placed in fixed position");
        }
      }

      // Always render even if detection is done
      controls.update();
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(detectAndRender);
    };

    detectAndRender();
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [cocoModel, isModelPlaced]);

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#000",
          color: "#fff",
        }}
      >
        ❌ AR Viewer Error: Check camera or model link.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* Camera Feed */}
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

      {/* 3D Overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          zIndex: 2,
          pointerEvents: "auto",
          touchAction: "none",
        }}
      />

      {/* Status */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          width: "100%",
          textAlign: "center",
          color: "white",
          fontSize: "16px",
          textShadow: "0 0 5px black",
          zIndex: 3,
        }}
      >
        {cocoModel
          ? modelReady
            ? "🚗 Detected vehicle — you can rotate and zoom the wheel"
            : "📦 Loading 3D model..."
          : "🤖 Loading TensorFlow model..."}
      </div>
    </div>
  );
};

export default ARViewer;
