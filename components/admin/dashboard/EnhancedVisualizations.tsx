"use client";

import { useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { motion } from 'framer-motion-3d';
import { MetricsVisualizationSchema } from '@/lib/validations/dashboard';
import { withErrorBoundary } from '@/components/hocs/withErrorBoundary';

interface MetricsVisualizationProps {
  data: z.infer<typeof MetricsVisualizationSchema>;
}

const MetricsVisualizationBase: React.FC<MetricsVisualizationProps> = ({ data }) => {
  // Validar datos
  const validatedData = MetricsVisualizationSchema.parse(data);
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
      const pulse = Math.sin(state.clock.elapsedTime) * 0.1;
      groupRef.current.scale.setScalar(1 + pulse);
    }
  });

  return (
    <group ref={groupRef}>
      {validatedData.data.map((item, index) => (
        <MetricBarGroup
          key={index}
          item={item}
          index={index}
          total={validatedData.data.length}
        />
      ))}
    </group>
  );
};

export const MetricsVisualization = withErrorBoundary(MetricsVisualizationBase);

function MetricBarGroup({ item, index, total }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (hovered) {
      meshRef.current.material.emissiveIntensity = 
        1 + Math.sin(state.clock.elapsedTime * 4) * 0.3;
    }
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1, item.value, 1]} />
      <meshStandardMaterial
        color={item.color}
        metalness={0.8}
        roughness={0.2}
        emissive={item.color}
        emissiveIntensity={hovered ? 2 : 0.5}
      />
    </mesh>
  );
}