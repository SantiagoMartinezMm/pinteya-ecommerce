"use client";

import { useEffect, useRef, useState } from 'react';
import { Card } from "@/components/ui/card";
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

export function MetricsGlobe({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <div className="h-[400px] relative">
        <Canvas camera={{ position: [0, 0, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <Globe data={data} />
          <OrbitControls enableZoom={true} />
        </Canvas>
      </div>
    </Card>
  );
}

function Globe({ data }) {
  const meshRef = useRef();

  useFrame((state) => {
    meshRef.current.rotation.y += 0.005;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial
        color="#8884d8"
        opacity={0.7}
        transparent
        wireframe
      />
      {data.points.map((point, index) => (
        <DataPoint
          key={index}
          position={point.position}
          value={point.value}
        />
      ))}
    </mesh>
  );
}

export function Metrics3DBar({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <div className="h-[400px] relative">
        <Canvas camera={{ position: [5, 5, 5] }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <BarChart3D data={data} />
          <OrbitControls enableZoom={true} />
        </Canvas>
      </div>
    </Card>
  );
}

function BarChart3D({ data }) {
  return (
    <group>
      {data.map((item, index) => (
        <AnimatedBar
          key={index}
          position={[index * 1.5, item.value / 2, 0]}
          height={item.value}
          color={item.color}
        />
      ))}
    </group>
  );