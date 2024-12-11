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
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Plus,
  Calendar,
} from "lucide-react";

interface SecurityChange {
  id: string;
  title: string;
  description: string;
  type: "policy" | "configuration" | "system" | "access" | "infrastructure";
  priority: "critical" | "high" | "medium" | "low";
  status: "draft" | "pending" | "approved" | "implementing" | "completed" | "rejected";
  requestedBy: {
    id: string;
    name: string;
    department: string;
  };
  approvers: {
    id: string;
    name: string;
    role: string;
    status: "pending" | "approved" | "rejected";
    comments?: string;
  }[];
  schedule: {
    plannedStart: string;
    plannedEnd: string;
    actualStart?: string;
    actualEnd?: string;
  };
  impact: {
    systems: string[];
    users: string[];
    services: string[];
    risk: {
      level: "high" | "medium" | "low";
      description: string;
    };
  };
  implementation: {
    steps: {
      id: string;
      description: string;
      status: "pending" | "completed" | "failed";
      notes?: string;
    }[];
    rollback: {
      steps: string[];
      tested: boolean;
    };
  };
  testing: {
    required: boolean;
    plan?: {
      steps: string[];
      results?: {
        status: "passed" | "failed";
        notes: string;
      };
    };
  };
  documentation: {
    id: string;
    type: string;
    name: string;
    url: string;
  }[];
  history: {
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }[];
}

interface ChangeMetrics {
  totalChanges: number;
  pendingApproval: number;
  inProgress: number;
  completedThisMonth: number;
  successRate: number;
  averageImplementationTime: number;
  changesByType: Record<string, number>;
  changesByStatus: Record<string, number>;
}

export function SecurityChangeManagement() {
  const [changes, setChanges] = useState<SecurityChange[]>([]);
  const [metrics, setMetrics] = useState<ChangeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<SecurityChange | null>(
    null
  );
  const [showNewChangeDialog, setShowNewChangeDialog] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    priority: "",
    search: "",
  });

  const fetchChangeData = useCallback(async () => {
    try {
      const [changesRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/changes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/changes/metrics"),
      ]);

      const changesData = await changesRes.json();
      const metricsData = await metricsRes.json();

      setChanges(changesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching change data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchChangeData();
  }, [fetchChangeData]);

  if (loading || !metrics) {
    return <div>Cargando gestión de cambios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            Gestión de Cambios de Seguridad
          </h2>
          <p className="text-muted-foreground">
            Control y seguimiento de cambios de seguridad
          </p>
        </div>
        <Button onClick={() => setShowNewChangeDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cambio
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Cambios Pendientes</h3>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics.pendingApproval}
          </p>
          <p className="text-sm text-muted-foreground">
            de {metrics.totalChanges} cambios
          </p>
        </Card>
        {/* Más métricas... */}
      </div>

      {/* Lista de cambios */}
      <Card className="p-6">
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">En Proceso</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="completed">Completados</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {changes
                  .filter(
                    (change) =>
                      change.status === "implementing" ||
                      change.status === "approved"
                  )
                  .map((change) => (
                    <Card
                      key={change.id}
                      className="p-4 cursor-pointer hover:border-primary"
                      onClick={() => setSelectedChange(change)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                change.priority === "critical"
                                  ? "destructive"
                                  : change.priority === "high"
                                  ? "warning"
                                  : "default"
                              }
                            >
                              {change.priority}
                            </Badge>
                            <h4 className="font-medium">
                              {change.title}
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {change.description}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {change.status}
                        </Badge>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            Solicitado por
                          </p>
                          <p>{change.requestedBy.name}</p>
                          <p className="text-muted-foreground">
                            {change.requestedBy.department}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Programado para
                          </p>
                          <p>
                            {new Date(
                              change.schedule.plannedStart
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Aprobaciones
                          </p>
                          <div className="flex items-center gap-2">
                            <span>
                              {
                                change.approvers.filter(
                                  (a) => a.status === "approved"
                                ).length
                              }
                            </span>
                            <span>/</span>
                            <span>{change.approvers.length}</span>
                          </div>
                        </div>
                      </div>

                      {change.implementation && (
                        <div className="mt-4">
                          <p className="text-sm text-muted-foreground">
                            Progreso de implementación
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress
                              value={
                                (change.implementation.steps.filter(
                                  (s) => s.status === "completed"
                                ).length /
                                  change.implementation.steps.length) *
                                100
                              }
                            />
                            <span className="text-sm">
                              {(
                                (change.implementation.steps.filter(
                                  (s) => s.status === "completed"
                                ).length /
                                  change.implementation.steps.length) *
                                100
                              ).toFixed(0)}
                              %
                            </span>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Más contenido de pestañas... */}
        </Tabs>
      </Card>

      {/* Diálogo de detalles del cambio */}
      {selectedChange && (
        <Dialog
          open={!!selectedChange}
          onOpenChange={() => setSelectedChange(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles del Cambio</DialogTitle>
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