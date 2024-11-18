import { z } from 'zod';

// Esquema base para métricas
export const MetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
  timestamp: z.string().datetime(),
  type: z.enum(['number', 'percentage', 'currency', 'time']),
  status: z.enum(['normal', 'warning', 'critical']).optional(),
});

// Esquema para configuración de visualizaciones
export const VisualizationSchema = z.object({
  type: z.enum(['funnel', 'heatmap', 'radar', '3d-bars', 'bubble', 'scatter']),
  title: z.string(),
  dataKey: z.string(),
  xAxis: z.string().optional(),
  yAxis: z.string().optional(),
  zAxis: z.string().optional(),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional()
  }).optional(),
  style: z.object({
    colors: z.array(z.string()).optional(),
    animations: z.boolean().optional(),
    opacity: z.number().min(0).max(1).optional(),
  }).optional(),
});

// Esquema para plantillas de dashboard
export const DashboardTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  config: z.object({
    layout: z.array(z.object({
      i: z.string(),
      x: z.number(),
      y: z.number(),
      w: z.number(),
      h: z.number(),
    })),
    visualizations: z.array(VisualizationSchema),
  }),
});

// Tipos derivados
export type Metric = z.infer<typeof MetricSchema>;
export type Visualization = z.infer<typeof VisualizationSchema>;
export type DashboardTemplate = z.infer<typeof DashboardTemplateSchema>;

// Interfaces adicionales
export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
  details?: Record<string, any>;
}

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  stage?: string;
}