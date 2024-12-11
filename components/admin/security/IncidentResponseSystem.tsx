"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Clock,
  Users,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Plus,
  Filter,
} from "lucide-react";

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "new" | "investigating" | "containment" | "eradication" | "recovery" | "closed";
  category: "malware" | "phishing" | "data_breach" | "ddos" | "unauthorized_access" | "other";
  reporter: {
    id: string;
    name: string;
    department: string;
    contact: string;
  };
  assignedTeam: {
    id: string;
    name: string;
    members: {
      id: string;
      name: string;
      role: string;
    }[];
  };
  timeline: {
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
    status: string;
    artifacts?: string[];
  }[];
  affectedSystems: {
    id: string;
    name: string;
    type: string;
    impact: "high" | "medium" | "low";
    status: string;
  }[];
  containmentActions: {
    id: string;
    action: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    assignee: string;
    timestamp: string;
    notes?: string;
  }[];
  evidenceCollection: {
    id: string;
    type: string;
    source: string;
    hash: string;
    timestamp: string;
    collector: string;
    location: string;
  }[];
  communications: {
    id: string;
    timestamp: string;
    type: "internal" | "external";
    sender: string;
    recipients: string[];
    subject: string;
    content: string;
    attachments?: string[];
  }[];
  metrics: {
    timeToDetect: number;
    timeToRespond: number;
    timeToContain: number;
    timeToResolve?: number;
    impactScore: number;
    businessImpact: {
      financial?: number;
      operational?: number;
      reputational?: number;
    };
  };
  lessons: {
    id: string;
    category: string;
    description: string;
    recommendations: string[];
    status: "proposed" | "approved" | "implemented";
  }[];
  createdAt: string;
  updatedAt: string;
}

interface IncidentMetrics {
  activeIncidents: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  averageResponseTime: number;
  resolutionRate: number;
  topCategories: {
    category: string;
    count: number;
  }[];
}

export function IncidentResponseSystem() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(
    null
  );
  const [showNewIncidentDialog, setShowNewIncidentDialog] = useState(false);
  const [filters, setFilters] = useState({
    severity: "",
    status: "",
    category: "",
    search: "",
  });

  const fetchIncidentData = useCallback(async () => {
    try {
      const [incidentsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/incidents/response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/incidents/metrics"),
      ]);

      const incidentsData = await incidentsRes.json();
      const metricsData = await metricsRes.json();

      setIncidents(incidentsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching incident data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIncidentData();
    const interval = setInterval(fetchIncidentData, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [fetchIncidentData]);

  const updateIncidentStatus = async (
    incidentId: string,
    newStatus: string
  ) => {
    try {
      await fetch(`/api/admin/security/incidents/${incidentId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchIncidentData();
    } catch (error) {
      console.error("Error updating incident status:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando sistema de respuesta a incidentes...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y controles principales */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            Sistema de Respuesta a Incidentes
          </h2>
          <p className="text-muted-foreground">
            Gestión y respuesta a incidentes de seguridad
          </p>
        </div>
        <Button onClick={() => setShowNewIncidentDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Incidente
        </Button>
      </div>

      {/* Panel de métricas */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Incidentes Activos</h3>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics.activeIncidents}
          </p>
        </Card>
        {/* Más métricas... */}
      </div>

      {/* Lista de incidentes y detalles */}
      <Card className="p-6">
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="closed">Cerrados</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="space-y-4">
              {incidents
                .filter((incident) => incident.status !== "closed")
                .map((incident) => (
                  <div
                    key={incident.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              incident.severity === "critical"
                                ? "destructive"
                                : incident.severity === "high"
                                ? "warning"
                                : "default"
                            }
                          >
                            {incident.severity}
                          </Badge>
                          <h4 className="text-lg font-medium">
                            {incident.title}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {incident.description}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedIncident(incident)}
                      >
                        Ver Detalles
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Estado</p>
                        <Badge variant="outline">
                          {incident.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Categoría</p>
                        <p>{incident.category}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Equipo Asignado
                        </p>
                        <p>{incident.assignedTeam.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          Tiempo de Respuesta
                        </p>
                        <p>{incident.metrics.timeToRespond} min</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateIncidentStatus(
                            incident.id,
                            "investigating"
                          )
                        }
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Investigar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateIncidentStatus(
                            incident.id,
                            "containment"
                          )
                        }
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Contener
                      </Button>
                      {/* Más acciones... */}
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Diálogo de detalles del incidente */}
      {selectedIncident && (
        <Dialog
          open={!!selectedIncident}
          onOpenChange={() => setSelectedIncident(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles del Incidente</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">General</TabsTrigger>
                <TabsTrigger value="timeline">Cronología</TabsTrigger>
                <TabsTrigger value="evidence">Evidencia</TabsTrigger>
                <TabsTrigger value="communication">
                  Comunicación
                </TabsTrigger>
                <TabsTrigger value="lessons">
                  Lecciones Aprendidas
                </TabsTrigger>
              </TabsList>
              {/* Contenido de las pestañas... */}
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}