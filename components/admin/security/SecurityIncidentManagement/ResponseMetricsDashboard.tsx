"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  Target,
  Calendar,
  Download,
} from "lucide-react";

interface ResponseMetrics {
  overview: {
    totalIncidents: number;
    activeIncidents: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    mttr: number; // Mean Time To Resolve
    mttd: number; // Mean Time To Detect
    slaCompliance: number;
  };
  trends: {
    incidentsByType: {
      type: string;
      count: number;
      trend: number;
    }[];
    responseTimesTrend: {
      period: string;
      avgTime: number;
      slaTarget: number;
    }[];
    resolutionsByTeam: {
      team: string;
      resolved: number;
      withinSla: number;
    }[];
    severityDistribution: {
      severity: string;
      count: number;
      percentage: number;
    }[];
  };
  performance: {
    teamEfficiency: {
      team: string;
      metrics: {
        responseTime: number;
        resolutionTime: number;
        satisfaction: number;
      };
    }[];
    slaPerformance: {
      category: string;
      met: number;
      missed: number;
      total: number;
    }[];
  };
}

export function ResponseMetricsDashboard() {
  const [metrics, setMetrics] = useState<ResponseMetrics | null>(null);
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch(`/api/security/incidents/metrics?timeRange=${timeRange}`);
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange]);

  if (loading || !metrics) {
    return <div>Cargando métricas...</div>;
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Métricas de Respuesta</h2>
          <p className="text-muted-foreground">
            Análisis del rendimiento en la gestión de incidentes
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
              <SelectItem value="30d">Últimos 30 días</SelectItem>
              <SelectItem value="90d">Últimos 90 días</SelectItem>
              <SelectItem value="1y">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">
                Tiempo Medio de Respuesta
              </p>
              <h3 className="text-2xl font-bold">
                {metrics.overview.avgResponseTime}m
              </h3>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingDown className="h-4 w-4 mr-1 text-green-500" />
            <span className="text-green-500">12%</span>
            <span className="text-muted-foreground ml-1">vs. anterior</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">
                Cumplimiento SLA
              </p>
              <h3 className="text-2xl font-bold">
                {metrics.overview.slaCompliance}%
              </h3>
            </div>
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
            <span className="text-green-500">5%</span>
            <span className="text-muted-foreground ml-1">vs. anterior</span>
          </div>
        </Card>

        {/* Más KPIs... */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-medium mb-4">Tendencia de Tiempos de Respuesta</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.trends.responseTimesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgTime"
                stroke="#8884d8"
                name="Tiempo Promedio"
              />
              <Line
                type="monotone"
                dataKey="slaTarget"
                stroke="#82ca9d"
                strokeDasharray="5 5"
                name="Objetivo SLA"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium mb-4">Distribución por Severidad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.trends.severityDistribution}
                dataKey="count"
                nameKey="severity"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {metrics.trends.severityDistribution.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium mb-4">Rendimiento por Equipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.performance.teamEfficiency}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="metrics.responseTime"
                fill="#8884d8"
                name="Tiempo de Respuesta"
              />
              <Bar
                dataKey="metrics.resolutionTime"
                fill="#82ca9d"
                name="Tiempo de Resolución"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-medium mb-4">Cumplimiento de SLA por Categoría</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.performance.slaPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="met"
                stackId="a"
                fill="#82ca9d"
                name="Cumplido"
              />
              <Bar
                dataKey="missed"
                stackId="a"
                fill="#ff8042"
                name="Incumplido"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed Metrics Table */}
      <Card className="p-6">
        <h3 className="font-medium mb-4">Métricas Detalladas</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Equipo</th>
                <th className="text-left py-2">Incidentes</th>
                <th className="text-left py-2">Tiempo Promedio</th>
                <th className="text-left py-2">SLA</th>
                <th className="text-left py-2">Satisfacción</th>
              </tr>
            </thead>
            <tbody>
              {metrics.performance.teamEfficiency.map((team) => (
                <tr key={team.team} className="border-b">
                  <td className="py-2">{team.team}</td>
                  <td className="py-2">
                    {/* Número de incidentes */}
                  </td>
                  <td className="py-2">
                    {team.metrics.responseTime}m
                  </td>
                  <td className="py-2">
                    <Badge
                      variant={
                        team.metrics.satisfaction > 90
                          ? "default"
                          : "secondary"
                      }
                    >
                      {team.metrics.satisfaction}%
                    </Badge>
                  </td>
                  <td className="py-2">
                    {/* Satisfacción */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}