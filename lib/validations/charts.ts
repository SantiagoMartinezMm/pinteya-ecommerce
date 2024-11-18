import { z } from 'zod';

export const ChartDataPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
  metric: z.string(),
  category: z.string().optional()
});

export const ChartMetricSchema = z.object({
  name: z.string(),
  color: z.string(),
  format: z.enum(['number', 'percentage', 'bytes', 'time']).optional(),
  aggregation: z.enum(['sum', 'average', 'max', 'min']).optional()
});

export const AdvancedChartConfigSchema = z.object({
  type: z.enum(['scatter', 'bubble', 'radar', 'funnel', 'heatmap']),
  metrics: z.array(ChartMetricSchema),
  dimensions: z.object({
    width: z.number().optional(),
    height: z.number().optional()
  }),
  interactions: z.object({
    zoom: z.boolean(),
    pan: z.boolean(),
    tooltip: z.boolean(),
    brush: z.boolean()
  }),
  animation: z.object({
    enabled: z.boolean(),
    duration: z.number(),
    easing: z.string()
  })
});

export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;
export type ChartMetric = z.infer<typeof ChartMetricSchema>;
export type AdvancedChartConfig = z.infer<typeof AdvancedChartConfigSchema>;