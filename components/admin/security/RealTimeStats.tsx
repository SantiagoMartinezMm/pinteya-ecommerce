"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  Shield,
  Users,
  Globe,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface RealTimeMetric {
  id: string;
  timestamp: Date;
  type: string;
  value: number;
  change: number;
  status: "normal" | "warning" | "critical";
}

interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
  location?: string;
}

export function RealTimeStats() {
  const [metrics, setMetrics] = useState<RealTimeMetric[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    setupWebSocket();
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const setupWebSocket = () => {
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL + "/security/realtime"
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "metric") {
        updateMetrics(data.payload);
      } else if (data.type === "event") {
        updateEvents(data.payload);
      }
    };

    ws.onclose = () => {
      setTimeout(setupWebSocket, 5000);
    };

    setWsConnection(ws);
  };

  const updateMetrics = (newMetric: RealTimeMetric) => {
    setMetrics((prev) => {
      const updated = [...prev];
      const index = updated.findIndex((m) => m.type === newMetric.type);
      if (index !== -1) {
        updated[index] = newMetric;
      } else {
        updated.push(newMetric);
      }
      return updated.slice(-10); // Mantener solo los últimos 10 registros
    });
  };

  const updateEvents = (newEvent: SecurityEvent) => {
    setEvents((prev) => [newEvent, ...prev].slice(0, 50)); // Mantener solo los últimos 50 eventos
  };

  const getMetricIcon = (type: string) => {
    switch (type) {
      case "active_users":
        return <Users className="h-5 w-5" />;
      case "requests":
        return <Activity className="h-5 w-5" />;
      case "blocked_attempts":
        return <Shield className="h-5 w-5" />;
      case "locations":
        return <Globe className="h-5 w-5" />;
      default:
        return <Lock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: RealTimeMetric["status"]) => {
    switch (status) {
      case "critical":
        return "text-destructive";
      case "warning":
        return "text-yellow-500";
      default:
        return "text-green-500";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Métricas en Tiempo Real */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Métricas en Tiempo Real</h3>
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.id}
              className="p-4 border rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {getMetricIcon(metric.type)}
                <div>
                  <p className="text-sm font-medium">{metric.type}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
              </div>
              <div
                className={`text-sm ${getStatusColor(metric.status)} flex items-center`}
              >
                {metric.change > 0 ? "↑" : "↓"} {Math.abs(metric.change)}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Eventos en Tiempo Real */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Eventos en Tiempo Real</h3>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 border rounded-lg flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`h-4 w-4 ${
                        event.severity === "high"
                          ? "text-destructive"
                          : event.severity === "medium"
                          ? "text-yellow-500"
                          : "text-blue-500"
                      }`}
                    />
                    <p className="font-medium">{event.type}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.description}
                  </p>
                  {event.location && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                </div>
                <Badge
                  variant={
                    event.severity === "high"
                      ? "destructive"
                      : event.severity === "medium"
                      ? "warning"
                      : "default"
                  }
                >
                  {event.severity}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}