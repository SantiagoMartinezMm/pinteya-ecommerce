"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Download,
  Filter,
  Search,
  Calendar as CalendarIcon,
  Eye,
  FileJson,
  FileText,
} from "lucide-react";

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
  details: {
    ip: string;
    userAgent: string;
    resource: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  };
  status: "success" | "failure" | "warning";
}

export function SecurityAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    category: "",
    status: "",
    search: "",
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.dateRange.from) {
        queryParams.set("from", filters.dateRange.from.toISOString());
      }
      if (filters.dateRange.to) {
        queryParams.set("to", filters.dateRange.to.toISOString());
      }
      if (filters.category) {
        queryParams.set("category", filters.category);
      }
      if (filters.status) {
        queryParams.set("status", filters.status);
      }
      if (filters.search) {
        queryParams.set("search", filters.search);
      }

      const response = await fetch(`/api/admin/security/audit?${queryParams}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async (format: "csv" | "json") => {
    try {
      const response = await fetch(
        `/api/admin/security/audit/export?format=${format}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filters),
        }
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${format === "csv" ? "csv" : "json"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Error exporting logs:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Auditoría de Seguridad</h3>
          <p className="text-sm text-muted-foreground">
            Registros detallados de actividades de seguridad
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportLogs("csv")}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button variant="outline" onClick={() => exportLogs("json")}>
            <FileJson className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en logs..."
                className="pl-8"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
              />
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Fecha
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={filters.dateRange}
                onSelect={(range) =>
                  setFilters((prev) => ({ ...prev, dateRange: range }))
                }
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Select
            value={filters.category}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, category: value }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="auth">Autenticación</SelectItem>
              <SelectItem value="data">Datos</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
              <SelectItem value="security">Seguridad</SelectItem>
            </SelectContent>
          </Select>

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
              <SelectItem value="success">Exitoso</SelectItem>
              <SelectItem value="failure">Fallido</SelectItem>
              <SelectItem value="warning">Advertencia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{log.user.email}</span>
                      <span className="text-sm text-muted-foreground">
                        {log.user.role}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.status === "success"
                          ? "success"
                          : log.status === "failure"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles del Log</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Información Básica</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ID:</span>
                      <span>{selectedLog.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span>
                        {format(
                          new Date(selectedLog.timestamp),
                          "dd/MM/yyyy HH:mm:ss"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Usuario:</span>
                      <span>{selectedLog.user.email}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Detalles Técnicos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IP:</span>
                      <span>{selectedLog.details.ip}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">User Agent:</span>
                      <span className="truncate max-w-[200px]">
                        {selectedLog.details.userAgent}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recurso:</span>
                      <span>{selectedLog.details.resource}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedLog.details.changes && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Cambios</h4>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                    {JSON.stringify(selectedLog.details.changes, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.details.metadata && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Metadata</h4>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
                    {JSON.stringify(selectedLog.details.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}