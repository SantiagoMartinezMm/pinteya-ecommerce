"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Shield,
  Clock,
  User,
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface SecurityIncident {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "new" | "investigating" | "mitigated" | "resolved" | "closed";
  type: string;
  affectedSystems: string[];
  detectedAt: string;
  assignedTo?: string;
  timeline: {
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }[];
  responses: {
    id: string;
    type: string;
    status: string;
    timestamp: string;
    details: string;
  }[];
}

export function IncidentManagement() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "",
    severity: "",
    type: "",
  });

  useEffect(() => {
    fetchIncidents();
  }, [filters]);

  const fetchIncidents = async () => {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(
        `/api/admin/security/incidents?${queryParams.toString()}`
      );
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
    status: SecurityIncident["status"]
  ) => {
    try {
      await fetch(`/api/admin/security/incidents/${incidentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      
      setIncidents((prev) =>
        prev.map((incident) =>
          incident.id === incidentId ? { ...incident, status } : incident
        )
      );
    } catch (error) {
      console.error("Error updating incident status:", error);
    }
  };

  const addIncidentResponse = async (
    incidentId: string,
    response: Omit<SecurityIncident["responses"][0], "id" | "timestamp">
  ) => {
    try {
      const result = await fetch(
        `/api/admin/security/incidents/${incidentId}/responses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        }
      );
      const newResponse = await result.json();

      setIncidents((prev) =>
        prev.map((incident) =>
          incident.id === incidentId
            ? {
                ...incident,
                responses: [...incident.responses, newResponse],
              }
            : incident
        )
      );
    } catch (error) {
      console.error("Error adding incident response:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Gestión de Incidentes</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona y responde a incidentes de seguridad
          </p>
        </div>
        <Button>Nuevo Incidente</Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Buscar incidentes..."
            className="max-w-xs"
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
          <Select
            value={filters.status}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="new">Nuevo</SelectItem>
              <SelectItem value="investigating">Investigando</SelectItem>
              <SelectItem value="mitigated">Mitigado</SelectItem>
              <SelectItem value="resolved">Resuelto</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>
          {/* Más filtros... */}
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Detectado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell>{incident.id}</TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link">{incident.title}</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>{incident.title}</DialogTitle>
                        <DialogDescription>
                          Detalles del incidente
                        </DialogDescription>
                      </DialogHeader>
                      <IncidentDetails incident={incident} />
                    </DialogContent>
                  </Dialog>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      incident.severity === "critical"
                        ? "destructive"
                        : incident.severity === "high"
                        ? "destructive"
                        : incident.severity === "medium"
                        ? "warning"
                        : "default"
                    }
                  >
                    {incident.severity}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      incident.status === "new"
                        ? "default"
                        : incident.status === "investigating"
                        ? "warning"
                        : incident.status === "mitigated"
                        ? "default"
                        : "success"
                    }
                  >
                    {incident.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(incident.detectedAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    Ver detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selectedIncident && (
        <Dialog
          open={!!selectedIncident}
          onOpenChange={() => setSelectedIncident(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedIncident.title}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
                <TabsTrigger value="responses">Respuestas</TabsTrigger>
              </TabsList>
              {/* Contenido de las pestañas... */}
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}