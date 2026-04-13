import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const FloatingShapes = () => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
      groupRef.current.rotation.x += 0.0005;
    }
  });

  const shapes = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 - 5
      ] as [number, number, number],
      scale: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 2 + 1,
      distort: Math.random() * 0.4 + 0.2,
      color: i % 3 === 0 ? '#6C63FF' : i % 3 === 1 ? '#3B8BEB' : '#00C896'
    }));
  }, []);

  return (
    <group ref={groupRef}>
      {shapes.map((shape, i) => (
        <Float
          key={i}
          speed={shape.speed}
          rotationIntensity={1}
          floatIntensity={2}
          position={shape.position}
        >
          <Sphere args={[1, 32, 32]} scale={shape.scale}>
            <MeshDistortMaterial
              color={shape.color}
              speed={shape.speed}
              distort={shape.distort}
              transparent
              opacity={0.15}
              roughness={0}
              metalness={1}
            />
          </Sphere>
        </Float>
      ))}
    </group>
  );
};

export const FuturisticBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#0F0F1A]">
      <div className="absolute inset-0 bg-mesh opacity-40" />
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} color="#6C63FF" intensity={0.5} />
        <FloatingShapes />
      </Canvas>
    </div>
  );
};
