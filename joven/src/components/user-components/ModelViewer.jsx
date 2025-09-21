import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";

// Component to load the GLB model
function Model({ url }) {
  const { scene } = useGLTF(url); // Load model from Firebase Storage or local
  return <primitive object={scene} scale={1.5} />;
}

function ModelViewer({ modelUrl }) {
  return (
    <div style={{ width: "100%", height: "500px" }}>
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        {/* Load model inside suspense (waits for model to load) */}
        <Suspense fallback={null}>
          <Model url={modelUrl} />
          <Environment preset="city" />
        </Suspense>

        {/* Allow rotate, zoom, pan */}
        <OrbitControls enableZoom={true} />
      </Canvas>
    </div>
  );
}

export default ModelViewer;
