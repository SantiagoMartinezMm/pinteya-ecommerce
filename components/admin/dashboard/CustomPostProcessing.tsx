"use client";

import { useRef, useMemo } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import { Vector2, ShaderMaterial, WebGLRenderTarget } from 'three';
import { EffectComposer, ShaderPass } from '@react-three/postprocessing';

// Efecto de distorsión de onda personalizado
class WaveEffect extends Effect {
  constructor({ frequency = 2, amplitude = 0.3 }) {
    super('WaveEffect', `
      uniform float time;
      uniform float frequency;
      uniform float amplitude;
      uniform vec2 resolution;

      void mainUv(inout vec2 uv) {
        vec2 coord = uv * resolution;
        float wave = sin(coord.y * frequency + time) * amplitude;
        uv.x += wave * 0.01;
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        outputColor = inputColor;
        float wave = sin(uv.y * frequency + time) * amplitude;
        outputColor.rgb *= 1.0 + wave * 0.1;
      }
    `, {
      uniforms: new Map([
        ['time', { value: 0 }],
        ['frequency', { value: frequency }],
        ['amplitude', { value: amplitude }],
        ['resolution', { value: new Vector2(1, 1) }]
      ])
    });
  }

  update(renderer, inputBuffer, deltaTime) {
    this.uniforms.get('time').value += deltaTime;
  }
}

// Efecto de pixelación dinámica
class PixelationEffect extends Effect {
  constructor({ pixelSize = 4 }) {
    super('PixelationEffect', `
      uniform float pixelSize;
      uniform vec2 resolution;

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 pixelatedUV = floor(uv * resolution / pixelSize) * pixelSize / resolution;
        outputColor = texture2D(inputBuffer, pixelatedUV);
      }
    `, {
      uniforms: new Map([
        ['pixelSize', { value: pixelSize }],
        ['resolution', { value: new Vector2(1, 1) }]
      ])
    });
  }
}

// Efecto de resplandor de neón
class NeonGlowEffect extends Effect {
  constructor({ intensity = 1.0, color = [1, 0.5, 0.7] }) {
    super('NeonGlowEffect', `
      uniform float intensity;
      uniform vec3 glowColor;
      uniform sampler2D blurTexture;

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 blur = texture2D(blurTexture, uv);
        vec3 glow = blur.rgb * glowColor * intensity;
        outputColor = inputColor + vec4(glow, blur.a);
      }
    `, {
      uniforms: new Map([
        ['intensity', { value: intensity }],
        ['glowColor', { value: color }],
        ['blurTexture', { value: null }]
      ])
    });
  }
}

export function CustomPostProcessingEffects({ config }) {
  const waveRef = useRef();
  const pixelationRef = useRef();
  const neonRef = useRef();

  useFrame((state) => {
    if (waveRef.current) {
      waveRef.current.uniforms.get('time').value = state.clock.elapsedTime;
    }
  });

  return (
    <EffectComposer>
      {config.enableWave && (
        <WaveEffect
          ref={waveRef}
          frequency={config.waveFrequency || 2}
          amplitude={config.waveAmplitude || 0.3}
        />
      )}
      
      {config.enablePixelation && (
        <PixelationEffect
          ref={pixelationRef}
          pixelSize={config.pixelSize || 4}
        />
      )}
      
      {config.enableNeonGlow && (
        <NeonGlowEffect
          ref={neonRef}
          intensity={config.neonIntensity || 1.0}
          color={config.neonColor || [1, 0.5, 0.7]}
        />
      )}
    </EffectComposer>
  );
}