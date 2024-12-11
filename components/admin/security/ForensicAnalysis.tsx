"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  Play,
  Pause,
  Eye,
} from "lucide-react";

interface ForensicEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  source: {
    ip: string;
    user?: string;
    location?: string;
  };
  details: Record<string, any>;
  evidence: {
    type: string;
    path: string;
    size: number;
    hash: string;
  }[];
  status: "new" | "analyzing" | "reviewed" | "archived";
  tags: string[];
}

interface ForensicAnalysis {
  id: string;
  eventId: string;
  startTime: string;
  endTime?: string;
  status: "running" | "completed" | "failed";
  findings: {
    type: string;
    description: string;
    severity: string;
    confidence: number;
  }[];
  artifacts: {
    type: string;
    location: string;
    metadata: Record<string, any>;
  }[];
}

export function ForensicAnalysis() {
  const [events, setEvents] = useState<ForensicEvent[]>([]);
  const [analyses, setAnalyses] = useState<ForensicAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ForensicEvent | null>(
    null
  );
  const [filters, setFilters] = useState({
    severity: "",
    status: "",
    dateRange: {
      from: undefined,
      to: undefined,
    },
  });

  useEffect(() => {
    fetchForensicData();
  }, [filters]);

  const fetchForensicData = async () => {
    try {
      const [eventsRes, analysesRes] = await Promise.all([
        fetch("/api/admin/security/forensic/events"),
        fetch("/api/admin/security/forensic/analyses"),
      ]);

      const eventsData = await eventsRes.json();
      const analysesData = await analysesRes.json();

      setEvents(eventsData);
      setAnalyses(analysesData);
    } catch (error) {
      console.error("Error fetching forensic data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async (eventId: string) => {
    try {
      const response = await fetch(
        "/api/admin/security/forensic/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId }),
        }
      );
      const newAnalysis = await response.json();
      setAnalyses((prev) => [...prev, newAnalysis]);
    } catch (error) {
      console.error("Error starting analysis:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Análisis Forense</h3>
          <p className="text-sm text-muted-foreground">
            Investigación y análisis de eventos de seguridad
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Eventos Críticos</p>
            <p className="text-2xl font-bold">
              {
                events.filter(
                  (event) => event.severity === "critical"
                ).length
              }
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Análisis en Curso</p>
            <p className="text-2xl font-bold">
              {
                analyses.filter(
                  (analysis) => analysis.status === "running"
                ).length
              }
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Evidencias Recolectadas</p>
            <p className="text-2xl font-bold">
              {events.reduce(
                (acc, event) => acc + event.evidence.length,
                0
              )}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="analyses">Análisis</TabsTrigger>
            <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <div className="space-y-4">
              <div className="flex justify-between">
                <Input
                  placeholder="Buscar eventos..."
                  className="max-w-sm"
                />
                <Select>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="low">Bajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        {new Date(event.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{event.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            event.severity === "critical"
                              ? "destructive"
                              : event.severity === "high"
                              ? "warning"
                              : "default"
                          }
                        >
                          {event.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{event.source.ip}</div>
                          {event.source.user && (
                            <div className="text-sm text-muted-foreground">
                              {event.source.user}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {event.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startAnalysis(event.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="analyses">
            {/* Contenido de análisis */}
          </TabsContent>

          <TabsContent value="timeline">
            {/* Línea de tiempo de eventos */}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}