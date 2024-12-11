"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Lock,
  Activity,
  FileText,
  Download,
  Calendar,
} from "lucide-react";

interface SecurityMetrics {
  overview: {
    totalIncidents: number;
    resolvedIncidents: number;
    activeThreats: number;
    vulnerabilities: number;
    averageResponseTime: number;
    complianceRate: number;
  };
  trends: {
    incidents: {
      period: string;
      count: number;
      severity: Record<string, number>;
    }[];
    threats: {
      period: string;
      detected: number;
      blocked: number;
    }[];
    vulnerabilities: {
      period: string;
      high: number;
      medium: number;
      low: number;
    }[];
  };
  compliance: {
    frameworks: {
      name: string;
      score: number;
      requirements: number;
      compliant: number;
    }[];
    controls: {
      category: string;
      implemented: number;
      total: number;
    }[];
  };
  performance: {
    detection: {
      averageTime: number;
      trend: number;
    };
    response: {
      averageTime: number;
      trend: number;
    };
    resolution: {
      averageTime: number;
      trend: number;
    };
    availability: {
      uptime: number;
      downtime: number;
    };
  };
  assets: {
    total: number;
    byRisk: Record<string, number>;
    byCompliance: Record<string, number>;
    byStatus: Record<string, number>;
  };
  users: {
    total: number;
    active: number;
    training: {
      completed: number;
      pending: number;
    };
    incidents: {
      reported: number;
      involved: number;
    };
  };
}

interface MetricsDashboard {
  timeRange: "day" | "week" | "month" | "quarter" | "year";
  metrics: SecurityMetrics;
  loading: boolean;
}

export function SecurityMetrics() {
  const [dashboard, setDashboard] = useState<MetricsDashboard>({
    timeRange: "month",
    metrics: {} as SecurityMetrics,
    loading: true,
  });

  const fetchMetricsData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/security/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeRange: dashboard.timeRange }),
      });

      const data = await response.json();
      setDashboard((prev) => ({ ...prev, metrics: data, loading: false }));
    } catch (error) {
      console.error("Error fetching security metrics:", error);
    }
  }, [dashboard.timeRange]);

  useEffect(() => {
    fetchMetricsData();
    const interval = setInterval(fetchMetricsData, 300000); // Actualizar cada 5 minutos
    return () => clearInterval(interval);
  }, [fetchMetricsData]);

  if (dashboard.loading) {
    return <div>Cargando métricas de seguridad...</div>;
  }

  const { metrics } = dashboard;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Métricas de Seguridad</h2>
          <p className="text-muted-foreground">
            Panel de control de métricas de seguridad
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => /* exportar datos */ {}}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => fetchMetricsData()}>Actualizar</Button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium">Incidentes Activos</h3>
              <p className="text-2xl font-bold mt-2">
                {metrics.overview.totalIncidents -
                  metrics.overview.resolvedIncidents}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Resueltos</span>
              <span>{metrics.overview.resolvedIncidents}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>Total</span>
              <span>{metrics.overview.totalIncidents}</span>
            </div>
          </div>
        </Card>

        {/* Más tarjetas de métricas... */}
      </div>

      {/* Gráficos y análisis detallado */}
      <Card className="p-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">General</TabsTrigger>
            <TabsTrigger value="incidents">Incidentes</TabsTrigger>
            <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="assets">Activos</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-6">
              {/* Gráfico de tendencias de incidentes */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-4">
                  Tendencias de Incidentes
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.trends.incidents}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#8884d8"
                      name="Total"
                    />
                    <Line
                      type="monotone"
                      dataKey="severity.high"
                      stroke="#ff4d4f"
                      name="Alta"
                    />
                    <Line
                      type="monotone"
                      dataKey="severity.medium"
                      stroke="#faad14"
                      name="Media"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              {/* Gráfico de cumplimiento */}
              <Card className="p-4">
                <h4 className="text-sm font-medium mb-4">
                  Estado de Cumplimiento
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.compliance.frameworks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="score"
                      fill="#8884d8"
                      name="Puntuación"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </TabsContent>

          {/* Más contenido de pestañas... */}
        </Tabs>
      </Card>

      {/* Métricas detalladas */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">
            Rendimiento de Seguridad
          </h3>
          <div className="space-y-4">
            {Object.entries(metrics.performance).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">
                    {key.replace("_", " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {typeof value === "object" && "averageTime" in value
                      ? `${value.averageTime} min`
                      : typeof value === "object" && "uptime" in value
                      ? `${value.uptime}%`
                      : value}
                  </p>
                </div>
                {typeof value === "object" && "trend" in value && (
                  <div
                    className={`flex items-center ${
                      value.trend > 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {value.trend > 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {Math.abs(value.trend)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Más secciones de métricas... */}
      </div>
    </div>
  );
}