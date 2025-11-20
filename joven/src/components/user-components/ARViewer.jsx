import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * ARViewer.jsx (YOLOv8 Segmentation Version)
 * Backend endpoint: http://localhost:8000/infer
 */

const YOLO_API_URL = "http://localhost:8000/infer"; // ⬅️ backend server

const ARViewer = ({ src }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [error, setError] = useState(false);
  const [isModelPlaced, setIsModelPlaced] = useState(false);

  // three.js refs
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const glbModelRef = useRef(null);

  const animationRef = useRef(null);

  // ---------------------------------------------------------
  // CAMERA START
  // ---------------------------------------------------------
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
      tracks?.forEach((t) => t.stop());
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // ---------------------------------------------------------
  // THREE.js SCENE SETUP
  // ---------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    // scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // camera
    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.enablePan = false;
    controlsRef.current = controls;

    // lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(hemiLight, dirLight);

    // GLB loader
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(0.12, 0.12, 0.12);
        model.visible = false;
        glbModelRef.current = model;
        scene.add(model);
      },
      undefined,
      (err) => {
        console.error("❌ GLB load error:", err);
        setError(true);
      }
    );

    // resize handler
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [src]);

  // ---------------------------------------------------------
  // YOLO CALL + RENDER LOOP
  // ---------------------------------------------------------
  useEffect(() => {
    const detectLoop = async () => {
      if (!videoRef.current || !rendererRef.current) {
        animationRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Send frame to YOLO server if model not yet placed
      if (!isModelPlaced) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0);

        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg")
        );

        const formData = new FormData();
        formData.append("file", blob, "frame.jpg");

        try {
          const res = await fetch(YOLO_API_URL, {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (data.detections && data.detections.length > 0) {
            const wheel = data.detections[0]; // first detection

            // bbox = [x1, y1, x2, y2]
            const [x1, y1, x2, y2] = wheel.bbox;

            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;

            const model = glbModelRef.current;
            if (model) {
              const normX =
                (cx - videoRef.current.videoWidth / 2) /
                videoRef.current.videoWidth;
              const normY =
                (cy - videoRef.current.videoHeight / 2) /
                videoRef.current.videoHeight;

              model.visible = true;
              model.position.set(normX * 2, -normY * 2, -2.5);

              setIsModelPlaced(true);
            }
          }
        } catch (err) {
          console.log("YOLO error:", err);
        }
      }

      // Always render Three.js
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      controlsRef.current.update();

      animationRef.current = requestAnimationFrame(detectLoop);
    };

    detectLoop();
    return () => cancelAnimationFrame(animationRef.current);
  }, [isModelPlaced]);

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          background: "#000",
          color: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        ❌ AR Viewer Error — check camera or backend
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        background: "#000",
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

      {!isModelPlaced && (
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            width: "100%",
            textAlign: "center",
            color: "#fff",
            fontSize: "18px",
            textShadow: "0 0 5px black",
            zIndex: 3,
          }}
        >
          🤖 Detecting wheel using YOLO…
        </div>
      )}
    </div>
  );
};

export default ARViewer;
