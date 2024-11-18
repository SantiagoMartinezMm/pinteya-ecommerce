"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  CartesianGrid, Legend, Area, AreaChart
} from "recharts";

// Vista de Seguridad
export function SecurityAnalysisView({ securityData }) {
  const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#FF4842'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Intentos de Acceso</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={securityData.loginAttempts}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="success" fill="#00C49F" name="Exitosos" />
            <Bar dataKey="failed" fill="#FF4842" name="Fallidos" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Distribución de Eventos de Seguridad</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={securityData.eventDistribution}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {securityData.eventDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 col-span-full">
        <h4 className="text-sm font-medium mb-4">Alertas de Seguridad</h4>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {securityData.alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
                <Badge
                  variant={
                    alert.severity === "high"
                      ? "destructive"
                      : alert.severity === "medium"
                      ? "warning"
                      : "default"
                  }
                >
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

// Vista de Rendimiento
export function PerformanceAnalysisView({ performanceData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Tiempos de Respuesta</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData.responseTimes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#8884d8"
              name="Promedio"
            />
            <Line
              type="monotone"
              dataKey="p95"
              stroke="#82ca9d"
              name="Percentil 95"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Uso de Recursos</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={performanceData.resourceUsage}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="cpu"
              stackId="1"
              stroke="#8884d8"
              fill="#8884d8"
              name="CPU"
            />
            <Area
              type="monotone"
              dataKey="memory"
              stackId="1"
              stroke="#82ca9d"
              fill="#82ca9d"
              name="Memoria"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 col-span-full">
        <h4 className="text-sm font-medium mb-4">Errores por Endpoint</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performanceData.errorsByEndpoint}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="endpoint" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#FF4842" name="Errores" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// Vista de Usuarios
export function UserBehaviorView({ userData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Actividad por Usuario</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={userData.userActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="user" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="actions" fill="#8884d8" name="Acciones" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Patrones de Acceso</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={userData.accessPatterns}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="weekday"
              stroke="#8884d8"
              name="Entre semana"
            />
            <Line
              type="monotone"
              dataKey="weekend"
              stroke="#82ca9d"
              name="Fin de semana"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 col-span-full">
        <h4 className="text-sm font-medium mb-4">Acciones más Frecuentes</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={userData.topActions}
              dataKey="count"
              nameKey="action"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {userData.topActions.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(${(index * 45) % 360}, 70%, 50%)`}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// Vista de Anomalías
export function AnomaliesView({ anomaliesData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-6 col-span-full">
        <h4 className="text-sm font-medium mb-4">Detección de Anomalías</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={anomaliesData.timeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              name="Actividad"
            />
            <Line
              type="monotone"
              dataKey="threshold"
              stroke="#FF4842"
              strokeDasharray="5 5"
              name="Umbral"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Distribución de Anomalías</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={anomaliesData.distribution}
              dataKey="count"
              nameKey="type"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {anomaliesData.distribution.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(${(index * 45) % 360}, 70%, 50%)`}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6 col-span-full">
        <h4 className="text-sm font-medium mb-4">Alertas de Anomalías</h4>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {anomaliesData.alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Detectado: {alert.timestamp}
                  </p>
                </div>
                <Badge
                  variant={
                    alert.confidence > 0.8
                      ? "destructive"
                      : alert.confidence > 0.6
                      ? "warning"
                      : "default"
                  }
                >
                  {Math.round(alert.confidence * 100)}% confianza
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}