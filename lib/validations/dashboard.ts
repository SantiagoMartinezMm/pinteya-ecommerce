import { z } from 'zod';

// Esquemas base
const MetricValueSchema = z.object({
  value: z.number(),
  timestamp: z.string().datetime(),
  label: z.string().optional()
});

const VisualizationStyleSchema = z.object({
  colors: z.array(z.string()).optional(),
  animations: z.boolean().optional(),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional()
  }).optional()
});

// Esquemas específicos para cada tipo de visualización
export const ChartConfigSchema = z.object({
  type: z.enum(['line', 'bar', 'pie', 'area', 'scatter', 'radar']),
  title: z.string(),
  dataKey: z.string(),
  style: VisualizationStyleSchema.optional(),
  interactions: z.object({
    zoom: z.boolean().optional(),
    pan: z.boolean().optional(),
    tooltip: z.boolean().optional()
  }).optional()
});

export const MetricsVisualizationSchema = z.object({
  data: z.array(MetricValueSchema),
  config: ChartConfigSchema
});