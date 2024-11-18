"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Download, Filter, Search, Calendar as CalendarIcon } from "lucide-react";

interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  severity: "info" | "warning" | "error";
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    dateRange: {
      from: undefined,
      to: undefined,
    },
    severity: "",
    entity: "",
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/admin/activity-logs");
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (filters.search) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.userName.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.details.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.dateRange.from) {
      filtered = filtered.filter(log =>
        new Date(log.timestamp) >= filters.dateRange.from!
      );
    }

    if (filters.dateRange.to) {
      filtered = filtered.filter(log =>
        new Date(log.timestamp) <= filters.dateRange.to!
      );
    }

    if (filters.severity) {
      filtered = filtered.filter(log =>
        log.severity === filters.severity
      );
    }

    if (filters.entity) {
      filtered = filtered.filter(log =>
        log.entity === filters.entity
      );
    }

    setFilteredLogs(filtered);
  };

  const exportLogs = () => {
    const csv = [
      ["Fecha", "Usuario", "Acción", "Entidad", "Detalles", "IP", "Severidad"],
      ...filteredLogs.map(log => [
        format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss"),
        log.userName,
        log.action,
        log.entity,
        log.details,
        log.ipAddress,
        log.severity,
      ]),
    ]
      .map(row => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar en los logs..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-8"
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
                selected={{
                  from: filters.dateRange.from,
                  to: filters.dateRange.to,
                }}
                onSelect={(range) =>
                  setFilters({
                    ...filters,
                    dateRange: {
                      from: range?.from,
                      to: range?.to,
                    },
                  })
                }
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Select
            value={filters.severity}
            onValueChange={(value) =>
              setFilters({ ...filters, severity: value })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Detalles</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Severidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}
                </TableCell>
                <TableCell>{log.userName}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.entity}</TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {log.details}
                </TableCell>
                <TableCell>{log.ipAddress}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      log.severity === "error"
                        ? "destructive"
                        : log.severity === "warning"
                        ? "warning"
                        : "default"
                    }
                  >
                    {log.severity}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}