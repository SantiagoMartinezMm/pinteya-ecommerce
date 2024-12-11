"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  AlertTriangle,
  Bell,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface SecurityAlert {
  id: string;
  type: "intrusion" | "authentication" | "anomaly" | "system";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  timestamp: string;
  status: "new" | "acknowledged" | "resolved";
  metadata: Record<string, any>;
}

export function SecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  useEffect(() => {
    fetchAlerts();
    setupWebSocket();

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, []);

  const fetchAlerts = async () => {
    const response = await fetch("/api/admin/security/alerts");
    const data = await response.json();
    setAlerts(data);
  };

  const setupWebSocket = () => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL + "/security");
    
    ws.onmessage = (event) => {
      const newAlert = JSON.parse(event.data);
      setAlerts((prev) => [newAlert, ...prev]);
    };

    ws.onclose = () => {
      setTimeout(setupWebSocket, 5000); // Reconexión automática
    };

    setWsConnection(ws);
  };

  const handleAlertAction = async (alertId: string, action: "acknowledge" | "resolve") => {
    await fetch(`/api/admin/security/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === alertId
          ? { ...alert, status: action === "acknowledge" ? "acknowledged" : "resolved" }
          : alert
      )
    );
  };

  const getAlertIcon = (type: SecurityAlert["type"]) => {
    switch (type) {
      case "intrusion":
        return <Shield className="h-5 w-5 text-destructive" />;
      case "authentication":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "anomaly":
        return <Bell className="h-5 w-5 text-info" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: SecurityAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Alertas de Seguridad</h3>
          <p className="text-sm text-muted-foreground">
            Monitoreo en tiempo real de eventos de seguridad
          </p>
        </div>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border rounded-lg ${
                alert.status === "new" ? "bg-muted/50" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{alert.title}</h4>
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(alert.timestamp), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {alert.status === "new" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAlertAction(alert.id, "acknowledge")}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Reconocer
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleAlertAction(alert.id, "resolve")}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Resolver
                      </Button>
                    </>
                  )}
                  {alert.status === "acknowledged" && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleAlertAction(alert.id, "resolve")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Resolver
                    </Button>
                  )}
                  {alert.status === "resolved" && (
                    <Badge variant="outline">Resuelto</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}