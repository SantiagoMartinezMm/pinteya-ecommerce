"use client";

import { useEffect, useState } from 'react';
import { AlertSystem } from '@/lib/services/alert-system';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Shield, AlertTriangle } from "lucide-react";
import { SystemAlert, AlertPriority } from '@/types';

export function AlertsDisplay() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const alertSystem = AlertSystem.getInstance();

  useEffect(() => {
    const updateAlerts = () => {
      setAlerts(alertSystem.getActiveAlerts());
    };

    // Actualizar cada 30 segundos
    const interval = setInterval(updateAlerts, 30000);
    updateAlerts();

    return () => clearInterval(interval);
  }, []);

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case AlertPriority.HIGH:
        return "destructive";
      case AlertPriority.MEDIUM:
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center gap-3">
              {alert.type === "security" ? (
                <Shield className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
              <div>
                <h4 className="font-medium">{alert.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {alert.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getPriorityColor(alert.priority)}>
                {alert.priority}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => alert.onAction?.()}
              >
                Revisar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}