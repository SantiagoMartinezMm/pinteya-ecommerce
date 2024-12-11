"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  Shield,
  Activity,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Filter,
  Download,
} from "lucide-react";

interface IDSAlert {
  id: string;
  timestamp: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  source: {
    ip: string;
    port: number;
    location?: string;
  };
  target: {
    ip: string;
    port: number;
    service?: string;
  };
  signature: {
    id: string;
    name: string;
    category: string;
  };
  details: Record<string, any>;
  status: "new" | "investigating" | "resolved" | "false_positive";
}

interface IDSMetrics {
  alertsByHour: {
    hour: string;
    count: number;
  }[];
  topAttackers: {
    ip: string;
    count: number;
    location?: string;
  }[];
  topSignatures: {
    name: string;
    count: number;
  }[];
  systemStatus: {
    status: "running" | "stopped" | "error";
    uptime: number;
    lastUpdate: string;
    rulesVersion: string;
    processedPackets: number;
    alertsGenerated: number;
  };
}

export function IntrusionDetection() {
  const [alerts, setAlerts] = useState<IDSAlert[]>([]);
  const [metrics, setMetrics] = useState<IDSMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<IDSAlert | null>(null);

  useEffect(() => {
    fetchIDSData();
    const interval = setInterval(fetchIDSData, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const fetchIDSData = async () => {
    try {
      const [alertsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/ids/alerts"),
        fetch("/api/admin/security/ids/metrics"),
      ]);

      const alertsData = await alertsRes.json();
      const metricsData = await metricsRes.json();

      setAlerts(alertsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching IDS data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIDSStatus = async () => {
    if (!metrics) return;
    
    try {
      const newStatus = metrics.systemStatus.status === "running" ? "stopped" : "running";
      await fetch("/api/admin/security/ids/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchIDSData();
    } catch (error) {
      console.error("Error toggling IDS status:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando sistema de detección de intrusiones...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Sistema de Detección de Intrusiones
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitoreo y detección de actividades maliciosas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={metrics.systemStatus.status === "running" ? "default" : "outline"}
            onClick={toggleIDSStatus}
          >
            {metrics.systemStatus.status === "running" ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Detener
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </>
            )}
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Estado del Sistema</p>
              <Badge
                variant={
                  metrics.systemStatus.status === "running"
                    ? "success"
                    : "destructive"
                }
              >
                {metrics.systemStatus.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {Math.floor(metrics.systemStatus.uptime / 3600)}h
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Paquetes Procesados</p>
            <p className="text-2xl font-bold">
              {metrics.systemStatus.processedPackets.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Alertas Generadas</p>
            <p className="text-2xl font-bold">
              {metrics.systemStatus.alertsGenerated.toLocaleString()}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Versión de Reglas</p>
            <p className="text-2xl font-bold">
              {metrics.systemStatus.rulesVersion}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Alertas por Hora</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.alertsByHour}>
              <XAxis dataKey="hour" />
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

        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">
            Principales Atacantes
          </h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {metrics.topAttackers.map((attacker) => (
                <div
                  key={attacker.ip}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div>
                    <p className="font-medium">{attacker.ip}</p>
                    <p className="text-sm text-muted-foreground">
                      {attacker.location || "Ubicación desconocida"}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {attacker.count} alertas
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-medium">Alertas Recientes</h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          alert.severity === "critical"
                            ? "destructive"
                            : alert.severity === "high"
                            ? "warning"
                            : "default"
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="font-medium">
                        {alert.signature.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.signature.category}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Origen</p>
                    <p>
                      {alert.source.ip}:{alert.source.port}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Destino</p>
                    <p>
                      {alert.target.ip}:{alert.target.port}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                  <Badge variant="outline">{alert.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}