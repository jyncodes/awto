// src/components/user-components/ModelViewer.jsx
import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

// Component to load and auto-fit the GLB model
function Model({ url }) {
  const { scene } = useGLTF(url);
  const { camera } = useThree();

  // Set all meshes to plain white material
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

  // Auto-center and scale the model to fit in view
  useEffect(() => {
    if (!scene) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Center the model
    scene.position.x = -center.x;
    scene.position.y = -center.y;
    scene.position.z = -center.z;

    // Calculate distance to fit model in camera view
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    camera.position.set(0, 0, cameraZ * 1.2); // add padding
    camera.lookAt(0, 0, 0);
  }, [scene, camera]);

  return <primitive object={scene} />;
}

function ModelViewer({ modelUrl }) {
  const containerRef = useRef(null);

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
          <Model url={modelUrl} />
        </Suspense>
        <OrbitControls
          enableZoom={false} // users cannot zoom
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={0}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
}

export default ModelViewer;
