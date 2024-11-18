"use client";

import { useState, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, Scatter, ScatterChart,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, ComposedChart, Brush
} from "recharts";
import { ChartDataPoint, AdvancedChartConfig } from '@/lib/validations/charts';
import { withErrorBoundary } from '@/components/hocs/withErrorBoundary';

interface AdvancedChartProps {
  data: ChartDataPoint[];
  config: AdvancedChartConfig;
}

const AdvancedChartBase: React.FC<AdvancedChartProps> = ({ data, config }) => {
  const validatedConfig = AdvancedChartConfigSchema.parse(config);
  const validatedData = z.array(ChartDataPointSchema).parse(data);

  const processedData = useMemo(() => {
    return validatedData.map(point => ({
      ...point,
      value: formatValue(point.value, config.metrics.find(m => m.name === point.metric)?.format)
    }));
  }, [validatedData, config.metrics]);

  const renderChart = () => {
    switch (validatedConfig.type) {
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            {validatedConfig.metrics.map((metric, index) => (
              <Scatter
                key={metric.name}
                name={metric.name}
                data={processedData.filter(d => d.metric === metric.name)}
                fill={metric.color}
              />
            ))}
          </ScatterChart>
        );
      // Implementar otros tipos de gráficos...
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">{validatedConfig.title}</h3>
      <ResponsiveContainer
        width={validatedConfig.dimensions.width || "100%"}
        height={validatedConfig.dimensions.height || 400}
      >
        {renderChart()}
      </ResponsiveContainer>
    </Card>
  );
};

export const AdvancedChart = withErrorBoundary(AdvancedChartBase);

export function PerformanceMetricsChart({ data, metrics }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Métricas de Rendimiento</h3>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          {metrics.map((metric, index) => (
            <Scatter
              key={metric.name}
              name={metric.name}
              data={data.filter(d => d.metric === metric.name)}
              fill={metric.color}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function UserActivityHeatmap({ data }) {
  // Implementar heatmap personalizado para actividad de usuarios
}