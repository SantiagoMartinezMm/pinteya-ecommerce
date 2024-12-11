"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Shield,
  Globe,
  Activity,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  BarChart2,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ThreatEvent {
  id: string;
  timestamp: Date;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  source: {
    ip: string;
    location?: string;
    type: string;
  };
  target: {
    resource: string;
    type: string;
  };
  details: Record<string, any>;
  status: "active" | "mitigated" | "investigating";
}

interface ThreatMetrics {
  activeThreats: number;
  threatsByType: Record<string, number>;
  threatsBySeverity: Record<string, number>;
  recentActivity: {
    timestamp: Date;
    count: number;
  }[];
  topSources: {
    ip: string;
    location: string;
    count: number;
  }[];
  riskLevel: number;
  trendsData: {
    timestamp: Date;
    value: number;
  }[];
}

export function ThreatMonitoring() {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [metrics, setMetrics] = useState<ThreatMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    initializeWebSocket();
    fetchInitialData();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const initializeWebSocket = () => {
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL + "/security/threats"
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "threat") {
        handleNewThreat(data.payload);
      } else if (data.type === "metrics") {
        updateMetrics(data.payload);
      }
    };

    ws.onclose = () => {
      setTimeout(initializeWebSocket, 5000);
    };

    wsRef.current = ws;
  };

  const fetchInitialData = async () => {
    try {
      const [eventsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/threats/events"),
        fetch("/api/admin/security/threats/metrics"),
      ]);

      const eventsData = await eventsRes.json();
      const metricsData = await metricsRes.json();

      setEvents(eventsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching threat data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewThreat = (threat: ThreatEvent) => {
    setEvents((prev) => [threat, ...prev].slice(0, 100));
  };

  const updateMetrics = (newMetrics: ThreatMetrics) => {
    setMetrics(newMetrics);
  };

  if (loading || !metrics) {
    return <div>Cargando monitoreo de amenazas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Panel Superior de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Amenazas Activas</p>
              <h3 className="text-2xl font-bold">{metrics.activeThreats}</h3>
            </div>
            <AlertTriangle
              className={`h-8 w-8 ${
                metrics.activeThreats > 10
                  ? "text-destructive"
                  : "text-warning"
              }`}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Nivel de Riesgo</p>
              <h3 className="text-2xl font-bold">{metrics.riskLevel}%</h3>
            </div>
            <Activity
              className={`h-8 w-8 ${
                metrics.riskLevel > 75
                  ? "text-destructive"
                  : metrics.riskLevel > 50
                  ? "text-warning"
                  : "text-success"
              }`}
            />
          </div>
        </Card>

        {/* Más métricas... */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de Actividad Reciente */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Actividad Reciente</h4>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metrics.recentActivity}>
              <defs>
                <linearGradient id="colorThreat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ff4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={(time) =>
                  new Date(time).toLocaleTimeString()
                }
              />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#ff4444"
                fillOpacity={1}
                fill="url(#colorThreat)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Mapa de Amenazas */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Origen de Amenazas</h4>
          <div className="h-[300px] relative">
            {/* Aquí iría el componente de mapa */}
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Mapa de amenazas en tiempo real
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de Eventos en Tiempo Real */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-medium">Eventos en Tiempo Real</h4>
          <Badge variant="outline">
            {events.length} eventos detectados
          </Badge>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      event.severity === "critical"
                        ? "bg-destructive/20 text-destructive"
                        : event.severity === "high"
                        ? "bg-warning/20 text-warning"
                        : "bg-muted"
                    }`}
                  >
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{event.type}</p>
                      <Badge
                        variant={
                          event.severity === "critical"
                            ? "destructive"
                            : event.severity === "high"
                            ? "warning"
                            : "default"
                        }
                      >
                        {event.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.source.ip} → {event.target.resource}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <Globe className="h-3 w-3" />
                      <span>{event.source.location || "Desconocido"}</span>
                    </div>
                  </div>
                </div>
                <Badge
                  variant={
                    event.status === "active"
                      ? "destructive"
                      : event.status === "investigating"
                      ? "warning"
                      : "success"
                  }
                >
                  {event.status}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}