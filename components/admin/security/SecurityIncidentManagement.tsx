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
  Shield,
  Clock,
  Users,
  FileText,
  MessageSquare,
  Activity,
  Plus,
  Filter,
  Search,
} from "lucide-react";

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "new" | "investigating" | "contained" | "resolved" | "closed";
  type: "breach" | "malware" | "phishing" | "ddos" | "unauthorized_access" | "other";
  reporter: {
    id: string;
    name: string;
    department: string;
  };
  assignee?: {
    id: string;
    name: string;
    role: string;
  };
  detectedAt: string;
  lastUpdated: string;
  affectedSystems: string[];
  timeline: {
    id: string;
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }[];
  metrics: {
    timeToDetect: number;
    timeToRespond: number;
    timeToResolve?: number;
  };
}

export function SecurityIncidentManagement() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: "",
    status: "",
    type: "",
    dateRange: "all",
  });

  const fetchIncidents = useCallback(async () => {
    try {
      const response = await fetch("/api/security/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const data = await response.json();
      setIncidents(data);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleStatusUpdate = async (incidentId: string, newStatus: string) => {
    try {
      await fetch(`/api/security/incidents/${incidentId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchIncidents();
    } catch (error) {
      console.error("Error updating incident status:", error);
    }
  };

  if (loading) {
    return <div>Cargando incidentes de seguridad...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Incidentes</h2>
          <p className="text-muted-foreground">
            Monitoreo y respuesta a incidentes de seguridad
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Incidente
        </Button>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="investigating">En Investigación</TabsTrigger>
            <TabsTrigger value="resolved">Resueltos</TabsTrigger>
            <TabsTrigger value="all">Todos</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {incidents
                  .filter((incident) => 
                    ["new", "investigating", "contained"].includes(incident.status)
                  )
                  .map((incident) => (
                    <Card
                      key={incident.id}
                      className="p-4 cursor-pointer hover:border-primary"
                      onClick={() => setSelectedIncident(incident)}
                    >
                      {/* Contenido del incidente */}
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>

      {selectedIncident && (
        <Dialog
          open={!!selectedIncident}
          onOpenChange={() => setSelectedIncident(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles del Incidente</DialogTitle>
            </DialogHeader>
            {/* Contenido del diálogo */}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}