"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, FunnelChart, Funnel, LabelList,
  Chord, ChordChart, BubbleChart, Bubble, ZAxis,
  Heatmap, CalendarHeatmap, ParallelCoordinates
} from "recharts";
import { withErrorBoundary } from '@/components/hocs/withErrorBoundary';
import { VisualizationConfig, VisualizationConfigSchema } from '@/types/dashboard';

interface MetricsFunnelProps {
  data: Array<{ name: string; value: number }>;
  config: VisualizationConfig;
}

const MetricsFunnelBase: React.FC<MetricsFunnelProps> = ({ data, config }) => {
  // Validación de props con Zod
  const validatedConfig = VisualizationConfigSchema.parse(config);

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{validatedConfig.title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <FunnelChart>
          <Funnel
            data={data}
            dataKey={validatedConfig.dataKey}
            nameKey="name"
            fill={validatedConfig.style?.colors?.[0] ?? "#8884d8"}
            isAnimationActive={validatedConfig.style?.animations ?? true}
          >
            <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </Card>
  );
};

export const MetricsFunnel = withErrorBoundary(MetricsFunnelBase);

export function MetricsHeatmap({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <CalendarHeatmap
          startDate={new Date(data.startDate)}
          endDate={new Date(data.endDate)}
          values={data.values}
          classForValue={(value) => {
            if (!value) return "color-empty";
            return `color-scale-${Math.ceil(value.count / 2)}`;
          }}
          tooltipDataAttrs={(value) => ({
            'data-tip': `${value.date}: ${value.count} eventos`,
          })}
        />
      </ResponsiveContainer>
    </Card>
  );
}

export function MetricsBubble({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BubbleChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <XAxis dataKey="x" name={config.xAxis} unit={config.xUnit} />
          <YAxis dataKey="y" name={config.yAxis} unit={config.yUnit} />
          <ZAxis
            dataKey="z"
            range={[20, 100]}
            name={config.zAxis}
            unit={config.zUnit}
          />
          <Bubble
            data={data}
            fill="#8884d8"
            fillOpacity={0.6}
            stroke="#8884d8"
          />
        </BubbleChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function MetricsParallelCoordinates({ data, config }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{config.title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ParallelCoordinates
          data={data}
          dimensions={config.dimensions}
          strokeOpacity={0.7}
          stroke="#8884d8"
        />
      </ResponsiveContainer>
    </Card>
  );
}