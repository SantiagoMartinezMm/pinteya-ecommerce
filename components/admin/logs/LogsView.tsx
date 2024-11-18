"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogsTable } from "./LogsTable";
import { LogAnalytics } from "./LogAnalytics";
import { SystemHealth } from "./SystemHealth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function LogsView() {
  const [activeTab, setActiveTab] = useState("activity");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Logs del Sistema</h2>
        <p className="text-muted-foreground">
          Monitoreo y análisis de actividades
        </p>
      </div>

      <ErrorBoundary>
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="border-b px-6 py-2">
              <TabsTrigger value="activity">Actividad</TabsTrigger>
              <TabsTrigger value="analytics">Análisis</TabsTrigger>
              <TabsTrigger value="health">Estado del Sistema</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="p-6">
              <LogsTable />
            </TabsContent>

            <TabsContent value="analytics" className="p-6">
              <LogAnalytics />
            </TabsContent>

            <TabsContent value="health" className="p-6">
              <SystemHealth />
            </TabsContent>
          </Tabs>
        </Card>
      </ErrorBoundary>
    </div>
  );
}