"use client";

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Effect } from 'postprocessing';
import { Vector2 } from 'three';
import { PostProcessingConfig } from '@/lib/validations/effects';
import { withErrorBoundary } from '@/components/hocs/withErrorBoundary';

interface AdvancedVisualEffectsProps {
  config: PostProcessingConfig;
}

const AdvancedVisualEffectsBase: React.FC<AdvancedVisualEffectsProps> = ({ config }) => {
  const validatedConfig = PostProcessingConfigSchema.parse(config);
  const effectsRef = useRef<Effect[]>([]);

  useFrame((state) => {
    effectsRef.current.forEach(effect => {
      if (effect.uniforms.has('time')) {
        effect.uniforms.get('time').value = state.clock.elapsedTime;
      }
    });
  });

  return (
    <EffectComposer>
      {validatedConfig.bloom.enabled && (
        <UnrealBloom
          intensity={validatedConfig.bloom.intensity}
          luminanceThreshold={validatedConfig.bloom.threshold}
          luminanceSmoothing={validatedConfig.bloom.smoothing}
        />
      )}
      
      {validatedConfig.chromatic.enabled && (
        <ChromaticAberration
          offset={new Vector2(validatedConfig.chromatic.offset)}
          intensity={validatedConfig.chromatic.intensity}
        />
      )}
      
      {validatedConfig.glitch.enabled && (
        <DataGlitchEffect
          ref={(effect) => effect && effectsRef.current.push(effect)}
          delay={new Vector2(...validatedConfig.glitch.delay)}
          duration={new Vector2(...validatedConfig.glitch.duration)}
          strength={new Vector2(...validatedConfig.glitch.strength)}
        />
      )}
      
      {validatedConfig.particles.enabled && (
        <DataParticlesEffect
          ref={(effect) => effect && effectsRef.current.push(effect)}
          particleCount={validatedConfig.particles.count}
          speed={validatedConfig.particles.speed}
        />
      )}
    </EffectComposer>
  );
};

export const AdvancedVisualEffects = withErrorBoundary(AdvancedVisualEffectsBase);