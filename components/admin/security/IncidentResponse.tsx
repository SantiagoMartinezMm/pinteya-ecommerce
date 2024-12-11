"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineSeparator,
} from "@/components/ui/timeline";
import {
  AlertTriangle,
  Shield,
  Clock,
  Users,
  MessageSquare,
  FileText,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react";

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "new" | "investigating" | "contained" | "resolved" | "closed";
  type: string;
  reporter: {
    id: string;
    name: string;
    role: string;
  };
  assignee?: {
    id: string;
    name: string;
    role: string;
  };
  timeline: {
    id: string;
    timestamp: string;
    type: string;
    description: string;
    user: string;
    metadata?: Record<string, any>;
  }[];
  affectedSystems: string[];
  indicators: {
    type: string;
    value: string;
    confidence: number;
  }[];
  artifacts: {
    id: string;
    type: string;
    name: string;
    size: number;
    uploadedBy: string;
    timestamp: string;
  }[];
  metrics: {
    timeToDetect: number;
    timeToRespond: number;
    timeToResolve?: number;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export function IncidentResponse() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(
    null
  );
  const [showNewIncidentDialog, setShowNewIncidentDialog] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const response = await fetch("/api/admin/security/incidents");
      const data = await response.json();
      setIncidents(data);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

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
      await fetchIncidents();
    } catch (error) {
      console.error("Error updating incident status:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "warning";
      case "medium":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return <div>Cargando sistema de respuesta a incidentes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Respuesta a Incidentes
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona y responde a incidentes de seguridad
          </p>
        </div>
        <Button
          onClick={() => setShowNewIncidentDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Incidente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 p-6">
          <h4 className="text-sm font-medium mb-4">Incidentes Activos</h4>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedIncident?.id === incident.id
                      ? "border-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedIncident(incident)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getSeverityColor(incident.severity)}
                        >
                          {incident.severity}
                        </Badge>
                        <span className="font-medium">
                          {incident.title}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {incident.type}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {incident.status}
                    </Badge>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(incident.createdAt).toLocaleString()}
                    </div>
                    {incident.assignee && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {incident.assignee.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="col-span-2 p-6">
          {selectedIncident ? (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="timeline">Cronología</TabsTrigger>
                <TabsTrigger value="artifacts">Artefactos</TabsTrigger>
                <TabsTrigger value="indicators">Indicadores</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium">
                      {selectedIncident.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedIncident.description}
                    </p>
                  </div>
                  <Select
                    value={selectedIncident.status}
                    onValueChange={(value) =>
                      updateIncidentStatus(selectedIncident.id, value)
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Nuevo</SelectItem>
                      <SelectItem value="investigating">
                        Investigando
                      </SelectItem>
                      <SelectItem value="contained">
                        Contenido
                      </SelectItem>
                      <SelectItem value="resolved">
                        Resuelto
                      </SelectItem>
                      <SelectItem value="closed">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Sistemas Afectados
                    </h4>
                    <div className="space-y-2">
                      {selectedIncident.affectedSystems.map(
                        (system) => (
                          <Badge key={system} variant="outline">
                            {system}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Métricas
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Tiempo de detección
                        </p>
                        <p>
                          {selectedIncident.metrics.timeToDetect} min
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Tiempo de respuesta
                        </p>
                        <p>
                          {selectedIncident.metrics.timeToRespond} min
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <Timeline>
                  {selectedIncident.timeline.map((event, index) => (
                    <TimelineItem key={event.id}>
                      <TimelineSeparator>
                        <TimelineDot />
                        {index <
                          selectedIncident.timeline.length - 1 && (
                          <TimelineConnector />
                        )}
                      </TimelineSeparator>
                      <TimelineContent>
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {event.type}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(
                                event.timestamp
                              ).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm">
                            {event.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Por: {event.user}
                          </p>
                        </div>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </TabsContent>

              {/* Más contenido de pestañas... */}
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              Selecciona un incidente para ver sus detalles
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}