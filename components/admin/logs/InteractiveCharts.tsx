"use client";

import { useState, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, Legend, Brush, ReferenceLine
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChartProps {
  data: any[];
  type: 'line' | 'bar' | 'pie';
  config: ChartConfig;
}

interface ChartConfig {
  xAxis: string;
  yAxis?: string[];
  metrics: string[];
  title: string;
  colors?: string[];
}

export function InteractiveChart({ data, type, config }: ChartProps) {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedMetrics, setSelectedMetrics] = useState(config.metrics);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleMetricToggle = useCallback((metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  }, []);

  const filteredData = useCallback(() => {
    const now = new Date();
    const timeRangeMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    return data.filter(item => {
      const itemDate = new Date(item[config.xAxis]);
      return now.getTime() - itemDate.getTime() <= timeRangeMap[timeRange];
    });
  }, [data, timeRange, config.xAxis]);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-medium">{config.title}</h4>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsZoomed(!isZoomed)}
          >
            {isZoomed ? 'Reducir' : 'Ampliar'}
          </Button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={isZoomed ? 500 : 300}>
        {type === 'line' ? (
          <LineChart data={filteredData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxis} />
            <YAxis />
            <Tooltip />
            <Legend
              onClick={(e) => handleMetricToggle(e.dataKey)}
              wrapperStyle={{ cursor: 'pointer' }}
            />
            <Brush dataKey={config.xAxis} height={30} stroke="#8884d8" />
            {selectedMetrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={config.colors?.[index] || `hsl(${index * 45}, 70%, 50%)`}
                dot={false}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        ) : type === 'bar' ? (
          <BarChart data={filteredData()}>
            {/* Implementación similar para BarChart */}
          </BarChart>
        ) : (
          <PieChart>
            {/* Implementación similar para PieChart */}
          </PieChart>
        )}
      </ResponsiveContainer>
    </Card>
  );
}