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

  // Smoothing state
  let smoothX = 0;
  let smoothY = 0;

  /* ------------------------------------------
   * 1. Load TensorFlow model
   ------------------------------------------- */
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        // Faster model
        const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
        setCocoModel(model);
        console.log("✅ TensorFlow model loaded (Lite MobileNet)");
      } catch (err) {
        console.error("❌ Failed to load TensorFlow:", err);
        setError(true);
      }
    };
    loadModel();
  }, []);

  /* ------------------------------------------
   * 2. Start camera
   ------------------------------------------- */
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
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

  /* ------------------------------------------
   * 3. Setup Three.js scene
   ------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // Scene + Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
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

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.12, 0.12, 0.12);
        model.visible = false;

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshPhysicalMaterial({
              color: 0xffffff,
              roughness: 0.35,
              metalness: 0.9,
              clearcoat: 0.7,
              clearcoatRoughness: 0.1,
            });
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
        setError(true);
      }
    );

    // Resize handler
    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, [src]);

  /* ------------------------------------------
   * 4. Detection + Rendering loop
   ------------------------------------------- */
  useEffect(() => {
    if (!cocoModel || !rendererRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const detectLoop = async () => {
      if (videoRef.current?.readyState >= 2) {
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

          // Estimate front wheel position (defense-ready technique)
          const wheelX = x + w * 0.25;
          const wheelY = y + h * 0.75;

          let targetX = (wheelX - videoW / 2) / videoW;
          let targetY = (wheelY - videoH / 2) / videoH;

          // Smooth output
          smoothX = smoothX * 0.8 + targetX * 0.2;
          smoothY = smoothY * 0.8 + targetY * 0.2;

          model.visible = true;
          model.position.set(smoothX * 1.7, -smoothY * 1.7, -2.5);
        } else if (model) {
          model.visible = false;
        }

        controls.update();
        renderer.render(scene, camera);
      }

      animationFrameRef.current = requestAnimationFrame(detectLoop);
    };

    detectLoop();
    return () => cancelAnimationFrame(animationFrameRef.current);
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
        background: "black",
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

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          zIndex: 2,
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
        {cocoModel
          ? modelReady
            ? "🚗 Locating vehicle wheel…"
            : "📦 Loading 3D model…"
          : "🤖 Loading AI model…"}
      </div>
    </div>
  );
};

export default ARViewer;
