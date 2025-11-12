// src/components/user-components/ModelViewer.jsx
import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

function Model({ url }) {
  const { scene } = useGLTF(url);
  const { camera } = useThree();

  useEffect(() => {
    if (!scene) return;

    // ✅ Keep the model's original materials (no overwrite)
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // ✅ Auto-center model
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    scene.position.sub(center);

    // ✅ Adjust camera distance dynamically
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    camera.position.set(0, 0, cameraZ * 2);
    camera.lookAt(0, 0, 0);
  }, [scene, camera]);

  return <primitive object={scene} />;
}

function ModelViewer({ modelUrl }) {
  const containerRef = useRef(null);
  const [validUrl, setValidUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const checkUrl = async () => {
      if (!modelUrl) {
        if (isMounted) setError(true);
        return;
      }
      try {
        const res = await fetch(modelUrl, { method: "HEAD" });
        if (isMounted) {
          if (res.ok) setValidUrl(modelUrl);
          else setError(true);
        }
      } catch (err) {
        console.error("Model URL check failed:", err);
        if (isMounted) setError(true);
      }
    };
    checkUrl();
    return () => {
      isMounted = false;
    };
  }, [modelUrl]);

  if (error || !validUrl) {
    return (
      <div
        style={{
          width: "100%",
          aspectRatio: "1",
          border: "2px solid #ddd",
          borderRadius: "10px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f9f9f9",
          color: "#666",
          fontSize: "14px",
          textAlign: "center",
          padding: "0.5rem",
        }}
      >
        ❌ Model not available
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        aspectRatio: "1",
        border: "2px solid #ddd",
        borderRadius: "10px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        backgroundColor: "#ffffff",
      }}
    >
      <Canvas
        shadows
        style={{ width: "100%", height: "100%" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#ffffff");
          gl.toneMapping = THREE.ACESFilmicToneMapping; // ✅ same as model-viewer
          gl.outputEncoding = THREE.sRGBEncoding; // ✅ correct color space
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <Suspense fallback={null}>
          <Environment preset="studio" background={false} /> {/* ✅ adds soft reflection */}
          <Model url={validUrl} />
        </Suspense>
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

export default ModelViewer;
