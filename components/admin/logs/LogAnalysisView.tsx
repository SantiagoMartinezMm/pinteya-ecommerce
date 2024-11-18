"use client";

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { LogAnalyzer } from '@/lib/services/log-analyzer';
import { LogEntry, LogAnalysis } from '@/types';

export function LogAnalysisView({ logs }: { logs: LogEntry[] }) {
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const analyzer = LogAnalyzer.getInstance();

  useEffect(() => {
    const performAnalysis = async () => {
      setIsLoading(true);
      try {
        const result = await analyzer.analyzeLogs(logs);
        setAnalysis(result);
      } catch (error) {
        console.error('Error analyzing logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    performAnalysis();
  }, [logs]);

  if (isLoading) {
    return <div>Analizando logs...</div>;
  }

  if (!analysis) {
    return <div>No hay datos para analizar</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalías</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Distribución de Actividad</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analysis.timeBasedAnalysis.activityTrends}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Patrones de Seguridad</h3>
            {/* Implementar visualización de seguridad */}
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Métricas de Rendimiento</h3>
            {/* Implementar visualización de rendimiento */}
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Comportamiento de Usuarios</h3>
            {/* Implementar visualización de usuarios */}
          </Card>
        </TabsContent>

        <TabsContent value="anomalies">
          <Card className="p-6">
            <h3 className="text-lg font-medium mb-4">Detección de Anomalías</h3>
            {/* Implementar visualización de anomalías */}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}