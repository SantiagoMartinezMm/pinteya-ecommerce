"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  Shield,
  Server,
  Database,
  Network,
  Lock,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  RotateCcw,
} from "lucide-react";

interface SecurityConfig {
  id: string;
  category: "network" | "system" | "application" | "access" | "encryption";
  name: string;
  description: string;
  status: "active" | "inactive" | "pending" | "deprecated";
  value: string | number | boolean | object;
  defaultValue: string | number | boolean | object;
  type: "string" | "number" | "boolean" | "json" | "array";
  validation?: {
    required: boolean;
    pattern?: string;
    min?: number;
    max?: number;
    options?: string[];
  };
  sensitivity: "high" | "medium" | "low";
  lastModified: string;
  modifiedBy: {
    id: string;
    name: string;
    role: string;
  };
  appliesTo: {
    systems: string[];
    environments: string[];
  };
  dependencies?: string[];
  history: {
    timestamp: string;
    value: string | number | boolean | object;
    user: string;
    reason: string;
  }[];
  compliance: {
    standards: string[];
    requirements: string[];
  };
  documentation: {
    description: string;
    impact: string;
    notes: string;
  };
}

interface ConfigMetrics {
  totalConfigs: number;
  activeConfigs: number;
  recentChanges: number;
  complianceRate: number;
  configsByCategory: Record<string, number>;
  configsByStatus: Record<string, number>;
  changeFrequency: {
    period: string;
    changes: number;
  }[];
}

export function SecurityConfigManagement() {
  const [configs, setConfigs] = useState<SecurityConfig[]>([]);
  const [metrics, setMetrics] = useState<ConfigMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<SecurityConfig | null>(
    null
  );
  const [editMode, setEditMode] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    sensitivity: "",
    search: "",
  });

  const fetchConfigData = useCallback(async () => {
    try {
      const [configsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/configs/metrics"),
      ]);

      const configsData = await configsRes.json();
      const metricsData = await metricsRes.json();

      setConfigs(configsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching config data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchConfigData();
  }, [fetchConfigData]);

  const handleConfigUpdate = async (configId: string, newValue: any) => {
    try {
      await fetch(`/api/admin/security/configs/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newValue }),
      });
      await fetchConfigData();
      setEditMode(false);
    } catch (error) {
      console.error("Error updating config:", error);
    }
  };

  const handleConfigReset = async (configId: string) => {
    try {
      await fetch(`/api/admin/security/configs/${configId}/reset`, {
        method: "POST",
      });
      await fetchConfigData();
    } catch (error) {
      console.error("Error resetting config:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando configuraciones de seguridad...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y contenido principal... */}
      <Card className="p-6">
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="network">Red</TabsTrigger>
            <TabsTrigger value="system">Sistema</TabsTrigger>
            <TabsTrigger value="application">Aplicación</TabsTrigger>
            <TabsTrigger value="access">Acceso</TabsTrigger>
            <TabsTrigger value="encryption">Cifrado</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {configs.map((config) => (
                  <Card
                    key={config.id}
                    className="p-4 cursor-pointer hover:border-primary"
                    onClick={() => setSelectedConfig(config)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {config.category}
                          </Badge>
                          <h4 className="font-medium">{config.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {config.description}
                        </p>
                      </div>
                      <Badge
                        variant={
                          config.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {config.status}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Valor Actual
                        </p>
                        <pre className="text-sm mt-1 bg-muted p-2 rounded">
                          {JSON.stringify(config.value, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Última Modificación
                        </p>
                        <div className="text-sm mt-1">
                          <p>
                            {new Date(
                              config.lastModified
                            ).toLocaleString()}
                          </p>
                          <p className="text-muted-foreground">
                            por {config.modifiedBy.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {config.compliance && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">
                          Cumplimiento
                        </p>
                        <div className="flex gap-2 mt-1">
                          {config.compliance.standards.map(
                            (standard) => (
                              <Badge
                                key={standard}
                                variant="outline"
                              >
                                {standard}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Diálogo de detalles de configuración */}
      {selectedConfig && (
        <Dialog
          open={!!selectedConfig}
          onOpenChange={() => {
            setSelectedConfig(null);
            setEditMode(false);
          }}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Detalles de Configuración
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Contenido del diálogo... */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}