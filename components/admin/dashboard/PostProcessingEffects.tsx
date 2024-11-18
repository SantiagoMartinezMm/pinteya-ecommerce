"use client";

import { useEffect, useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  DepthOfField,
  Noise,
  Vignette,
  Glitch,
  UnrealBloom
} from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { Vector2 } from 'three';

export function AdvancedPostProcessing({ config }) {
  const composerRef = useRef();
  const chromaticRef = useRef();

  useFrame((state) => {
    // Efecto dinámico de aberración cromática
    if (chromaticRef.current) {
      chromaticRef.current.offset = new Vector2(
        Math.sin(state.clock.elapsedTime) * 0.001,
        Math.cos(state.clock.elapsedTime) * 0.001
      );
    }
  });

  return (
    <EffectComposer ref={composerRef}>
      {/* Bloom avanzado con múltiples capas */}
      <UnrealBloom
        intensity={0.7}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.9}
        height={300}
      />

      {/* Aberración cromática dinámica */}
      <ChromaticAberration
        ref={chromaticRef}
        blendFunction={BlendFunction.NORMAL}
        offset={new Vector2(0.002, 0.002)}
      />

      {/* Profundidad de campo */}
      <DepthOfField
        focusDistance={0}
        focalLength={0.02}
        bokehScale={2}
        height={480}
      />

      {/* Ruido dinámico */}
      <Noise
        opacity={0.02}
        blendFunction={BlendFunction.OVERLAY}
      />

      {/* Viñeta */}
      <Vignette
        offset={0.5}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* Efecto glitch condicional */}
      {config.enableGlitch && (
        <Glitch
          delay={new Vector2(1.5, 3.5)}
          duration={new Vector2(0.6, 1.0)}
          strength={new Vector2(0.3, 1.0)}
          mode={GlitchMode.CONSTANT_WILD}
        />
      )}
    </EffectComposer>
  );
}

export function CustomShaderEffect() {
  const fragmentShader = `
    uniform float time;
    uniform vec2 resolution;
    uniform sampler2D tDiffuse;
    
    varying vec2 vUv;
    
    void main() {
      vec2 uv = vUv;
      
      // Efecto de ondulación
      float wave = sin(uv.y * 10.0 + time) * 0.01;
      uv.x += wave;
      
      // Distorsión de color
      vec4 color = texture2D(tDiffuse, uv);
      color.r = texture2D(tDiffuse, u