// src/components/user-components/ModelViewer.jsx
import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

function Model({ url }) {
  const { scene } = useGLTF(url);
  const { camera } = useThree();

  scene.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.9,
      });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    scene.position.x = -center.x;
    scene.position.y = -center.y;
    scene.position.z = -center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    camera.position.set(0, 0, cameraZ * 1.2);
    camera.lookAt(0, 0, 0);
  }, [scene, camera]);

  return <primitive object={scene} />;
}

function ModelViewer({ modelUrl }) {
  const containerRef = useRef(null);
  const [validUrl, setValidUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkUrl = async () => {
      if (!modelUrl) return setError(true);
      try {
        const res = await fetch(modelUrl, { method: "HEAD" });
        if (res.ok) setValidUrl(modelUrl);
        else setError(true);
      } catch (err) {
        console.error("Model URL check failed:", err);
        setError(true);
      }
    };
    checkUrl();
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
      <Canvas style={{ width: "100%", height: "100%" }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Model url={validUrl} />
        </Suspense>
        <OrbitControls
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

export default ModelViewer;
