"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
  Legend,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SecurityMetrics {
  timeSeriesData: {
    timestamp: string;
    loginAttempts: number;
    failedLogins: number;
    suspiciousActivities: number;
  }[];
  threatDistribution: {
    type: string;
    count: number;
  }[];
  locationData: {
    country: string;
    attempts: number;
    blocked: number;
  }[];
  riskAssessment: {
    category: string;
    score: number;
    trend: "up" | "down" | "stable";
  }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function SecurityAnalytics() {
  const [timeRange, setTimeRange] = useState("24h");
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityMetrics();
  }, [timeRange]);

  const fetchSecurityMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/security/analytics?timeRange=${timeRange}`
      );
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error("Error fetching security metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!metrics || loading) {
    return <div>Cargando análisis de seguridad...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Análisis de Seguridad</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24 horas</SelectItem>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="90d">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Actividad en el Tiempo */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Actividad de Seguridad</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.timeSeriesData}>
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="loginAttempts"
                stroke="#0088FE"
                name="Intentos de Login"
              />
              <Line
                type="monotone"
                dataKey="failedLogins"
                stroke="#FF8042"
                name="Logins Fallidos"
              />
              <Line
                type="monotone"
                dataKey="suspiciousActivities"
                stroke="#FFBB28"
                name="Actividades Sospechosas"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribución de Amenazas */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Distribución de Amenazas</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.threatDistribution}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {metrics.threatDistribution.map((entry, index) => (
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

        {/* Datos Geográficos */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Actividad por Ubicación</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.locationData}>
              <XAxis dataKey="country" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attempts" fill="#0088FE" name="Intentos" />
              <Bar dataKey="blocked" fill="#FF8042" name="Bloqueados" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Evaluación de Riesgos */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Evaluación de Riesgos</h4>
          <div className="space-y-4">
            {metrics.riskAssessment.map((risk, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{risk.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${risk.score}%` }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {risk.score}%
                    </span>
                  </div>
                </div>
                <div
                  className={`text-sm ${
                    risk.trend === "up"
                      ? "text-destructive"
                      : risk.trend === "down"
                      ? "text-green-500"
                      : "text-muted-foreground"
                  }`}
                >
                  {risk.trend === "up" ? "↑" : risk.trend === "down" ? "↓" : "→"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}