"use client";

import { useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, MeshDistortMaterial } from "@react-three/drei";

function AnimatedTorus() {
  const meshRef = useRef(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    meshRef.current.rotation.y += 0.01;
    meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.2) * 0.1;
  });

  return (
    <mesh ref={meshRef} scale={2.2}>
      <torusKnotGeometry args={[1, 0.3, 128, 32]} />
      <MeshDistortMaterial
        color="#00D4FF"
        distort={0.4}
        speed={1.5}
        roughness={0.2}
        metalness={0.8}
        emissive="#00D4FF"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-[hsl(190,100%,50%)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Hero3D() {
  useEffect(() => {
    // Debug: track mounts to diagnose disappearing canvas
    // eslint-disable-next-line no-console
    console.log('[Hero3D] mounted');
    return () => {
      // eslint-disable-next-line no-console
      console.log('[Hero3D] unmounted');
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
      <Suspense fallback={<Loader />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          dpr={[1, 2]}
          frameloop="always"
          gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            try { gl.getContext().canvas.style.outline = 'none'; } catch {}
          }}
        >
          {/* Darker background for better contrast */}
          <color attach="background" args={["#0b1220"]} />

          {/* Lighting */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.2} />
          <pointLight position={[-10, -10, -5]} intensity={0.6} color="#9333EA" />

          <AnimatedTorus />

          <Environment preset="city" />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
