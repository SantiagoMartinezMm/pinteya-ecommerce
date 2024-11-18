"use client";

import { useEffect, useMemo } from 'react';
import { useMetricsStore } from '@/lib/services/metrics/realTimeMetrics';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function RealTimeMetrics() {
  const { connect, disconnect, metrics, isConnected, error } = useMetricsStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  const processedData = useMemo(() => {
    // Agrupar métricas por timestamp para el gráfico
    const groupedData = metrics.reduce((acc, metric) => {
      const timestamp = new Date(metric.timestamp).getTime();
      if (!acc[timestamp]) {
        acc[timestamp] = { timestamp };
      }
      acc[timestamp][metric.name] = metric.value;
      return acc;
    }, {});

    return Object.values(groupedData).sort((a: any, b: any) => a.timestamp - b.timestamp);
  }, [metrics]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Métricas en Tiempo Real</h3>
        <div className="flex items-center space-x-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(timestamp) => new Date(timestamp).toLocaleString()}
          />
          <Legend />
          {metrics
            .filter((m, i, arr) => arr.findIndex(x => x.name === m.name) === i)
            .map((metric) => (
              <Line
                key={metric.name}
                type="monotone"
                dataKey={metric.name}
                stroke={getMetricColor(metric.name)}
                dot={false}
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// Utilidad para asignar colores consistentes a las métricas
const metricColors: Record<string, string> = {
  cpu: '#8884d8',
  memory: '#82ca9d',
  disk: '#ffc658',
  network: '#ff8042',
};

function getMetricColor(metricName: string): string {
  return metricColors[metricName] || '#' + Math.floor(Math.random()*16777215).toString(16);
}