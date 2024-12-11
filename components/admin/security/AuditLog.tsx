"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  Clock,
  User,
  Activity,
  AlertTriangle,
  FileText,
  Eye,
} from "lucide-react";

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    type: "user" | "system" | "service";
  };
  action: string;
  resource: {
    type: string;
    id: string;
    name: string;
  };
  status: "success" | "failure" | "warning";
  details: Record<string, any>;
  metadata: {
    ip: string;
    userAgent: string;
    location?: string;
  };
}

interface AuditMetrics {
  totalEvents: number;
  eventsByType: {
    type: string;
    count: number;
  }[];
  eventsByHour: {
    hour: string;
    count: number;
  }[];
  topActors: {
    name: string;
    count: number;
  }[];
}

export function AuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(
    null
  );
  const [filters, setFilters] = useState({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    actor: "",
    action: "",
    status: "",
  });

  useEffect(() => {
    fetchAuditData();
  }, [filters]);

  const fetchAuditData = async () => {
    try {
      const [eventsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/audit/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/audit/metrics"),
      ]);

      const eventsData = await eventsRes.json();
      const metricsData = await metricsRes.json();

      setEvents(eventsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching audit data:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportAuditLog = async () => {
    try {
      const response = await fetch("/api/admin/security/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting audit log:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando registro de auditoría...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Registro de Auditoría
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitorea y analiza la actividad del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportAuditLog}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium">Total Eventos</p>
            </div>
            <p className="text-2xl font-bold">
              {metrics.totalEvents}
            </p>
          </div>
        </Card>
...(about 127 lines omitted)...
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium">
                        {event.actor.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.actor.type}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{event.action}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {event.resource.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {event.resource.type}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      event.status === "success"
                        ? "success"
                        : event.status === "failure"
                        ? "destructive"
                        : "warning"
                    }
                  >
                    {event.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      {event.metadata.ip}
                    </div>
                    {event.metadata.location && (
                      <div className="text-sm text-muted-foreground">
                        {event.metadata.location}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selectedEvent && (
        <Dialog
          open={!!selectedEvent}
          onOpenChange={() => setSelectedEvent(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles del Evento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Actor</h4>
                  <p>{selectedEvent.actor.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.actor.type}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Timestamp</h4>
                  <p>
                    {new Date(
                      selectedEvent.timestamp
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium">Detalles</h4>
                <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                  {JSON.stringify(selectedEvent.details, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="text-sm font-medium">Metadata</h4>
                <div className="space-y-2">
                  <p>IP: {selectedEvent.metadata.ip}</p>
                  <p>
                    User Agent: {selectedEvent.metadata.userAgent}
                  </p>
                  {selectedEvent.metadata.location && (
                    <p>
                      Location: {selectedEvent.metadata.location}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}