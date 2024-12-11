"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActiveSessions } from "./ActiveSessions";
import { SecurityLogs } from "./SecurityLogs";
import { SecuritySettings } from "./SecuritySettings";
import { SecurityAlerts } from "./SecurityAlerts";
import { SecurityMetrics } from "./SecurityMetrics";

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState({
    activeSessions: 0,
    failedLogins: 0,
    blockedIPs: 0,
    securityAlerts: 0
  });

  useEffect(() => {
    fetchSecurityMetrics();
  }, []);

  const fetchSecurityMetrics = async () => {
    const res = await fetch('/api/admin/security/metrics');
    const data = await res.json();
    setMetrics(data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Seguridad</h2>
        <p className="text-muted-foreground">
          Gestiona la seguridad y monitorea la actividad del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SecurityMetrics metrics={metrics} />
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Sesiones Activas</TabsTrigger>
          <TabsTrigger value="logs">Registros</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <ActiveSessions />
        </TabsContent>

        <TabsContent value="logs">
          <SecurityLogs />
        </TabsContent>

        <TabsContent value="settings">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="alerts">
          <SecurityAlerts />
        </TabsContent>
      </Tabs>
    </div>
  );
}