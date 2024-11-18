import { z } from 'zod';
import { Vector2 } from 'three';

export const PostProcessingConfigSchema = z.object({
  bloom: z.object({
    enabled: z.boolean(),
    intensity: z.number().min(0).max(2),
    threshold: z.number().min(0).max(1),
    smoothing: z.number().min(0).max(1)
  }),
  
  chromatic: z.object({
    enabled: z.boolean(),
    offset: z.number().min(0).max(0.01),
    intensity: z.number().min(0).max(1)
  }),
  
  glitch: z.object({
    enabled: z.boolean(),
    delay: z.tuple([z.number(), z.number()]),
    duration: z.tuple([z.number(), z.number()]),
    strength: z.tuple([z.number(), z.number()])
  }),

  particles: z.object({
    enabled: z.boolean(),
    count: z.number().min(0).max(10000),
    speed: z.number().min(0).max(5)
  })
});

export type PostProcessingConfig = z.infer<typeof PostProcessingConfigSchema>;