"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Download, Filter } from "lucide-react";

interface SecurityLog {
  id: string;
  timestamp: string;
  eventType: string;
  severity: "low" | "medium" | "high";
  description: string;
  ip: string;
  userAgent: string;
  userId?: string;
  metadata: Record<string, any>;
}

export function SecurityLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [filters, setFilters] = useState({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    severity: "",
    eventType: "",
    search: "",
  });

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    const queryParams = new URLSearchParams();
    if (filters.dateRange.from) {
      queryParams.set("from", filters.dateRange.from.toISOString());
    }
    if (filters.dateRange.to) {
      queryParams.set("to", filters.dateRange.to.toISOString());
    }
    if (filters.severity) {
      queryParams.set("severity", filters.severity);
    }
    if (filters.eventType) {
      queryParams.set("eventType", filters.eventType);
    }
    if (filters.search) {
      queryParams.set("search", filters.search);
    }

    const response = await fetch(`/api/admin/security/logs?${queryParams}`);
    const data = await response.json();
    setLogs(data);
  };

  const exportLogs = async () => {
    const response = await fetch("/api/admin/security/logs/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(filters),
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getSeverityBadge = (severity: SecurityLog["severity"]) => {
    const variants = {
      low: "default",
      medium: "warning",
      high: "destructive",
    };
    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium">Registros de Seguridad</h3>
          <p className="text-sm text-muted-foreground">
            Monitorea la actividad de seguridad del sistema
          </p>
        </div>
        <Button onClick={exportLogs}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Input
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="max-w-xs"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Fecha
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={filters.dateRange}
              onSelect={(range) =>
                setFilters({
                  ...filters,
                  dateRange: range || { from: undefined, to: undefined },
                })
              }
              locale={es}
            />
          </PopoverContent>
        </Popover>

        <Select
          value={filters.severity}
          onValueChange={(value) => setFilters({ ...filters, severity: value })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[600px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Severidad</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}
                </TableCell>
                <TableCell>{log.eventType}</TableCell>
                <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                <TableCell>{log.ip}</TableCell>
                <TableCell>{log.userId || "Sistema"}</TableCell>
                <TableCell className="max-w-md truncate">
                  {log.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
}