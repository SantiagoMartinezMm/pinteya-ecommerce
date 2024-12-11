"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Network,
  Shield,
  Wifi,
  Globe,
  Lock,
  Users,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";

interface NetworkDevice {
  id: string;
  name: string;
  type: "endpoint" | "server" | "network" | "mobile";
  ip: string;
  mac: string;
  status: "connected" | "disconnected" | "blocked";
  user?: {
    id: string;
    name: string;
    department: string;
  };
  location: string;
  lastSeen: string;
  riskScore: number;
  compliance: {
    status: "compliant" | "non_compliant";
    issues: string[];
  };
  access: {
    level: "full" | "restricted" | "guest";
    policies: string[];
    restrictions: string[];
  };
}

interface NetworkMetrics {
  activeDevices: number;
  blockedDevices: number;
  guestDevices: number;
  riskyDevices: number;
  bandwidthUsage: {
    current: number;
    limit: number;
  };
  recentEvents: {
    timestamp: string;
    event: string;
    device: string;
  }[];
}

export function NetworkAccessControl() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(
    null
  );
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    access: "",
    search: "",
  });

  const fetchNetworkData = useCallback(async () => {
    try {
      const [devicesRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/network/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/network/metrics"),
      ]);

      const devicesData = await devicesRes.json();
      const metricsData = await metricsRes.json();

      setDevices(devicesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching network data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNetworkData();
    const interval = setInterval(fetchNetworkData, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, [fetchNetworkData]);

  const updateDeviceAccess = async (
    deviceId: string,
    accessLevel: string
  ) => {
    try {
      await fetch(`/api/admin/security/network/devices/${deviceId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessLevel }),
      });
      await fetchNetworkData();
    } catch (error) {
      console.error("Error updating device access:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando control de acceso a la red...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Control de Acceso a la Red
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona y monitorea el acceso a la red
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchNetworkData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Política
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Dispositivos Activos</h4>
            <Network className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics.activeDevices}
          </p>
        </Card>
        {/* Más métricas... */}
      </div>

      <Card className="p-6">
        <Tabs defaultValue="devices">
          <TabsList>
            <TabsTrigger value="devices">Dispositivos</TabsTrigger>
            <TabsTrigger value="policies">Políticas</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
          </TabsList>

          <TabsContent value="devices">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <Input
                  placeholder="Buscar dispositivos..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="w-[300px]"
                />
                {/* Más filtros... */}
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nivel de Acceso</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Última Actividad</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {device.type === "endpoint" ? (
                          <Laptop className="h-4 w-4" />
                        ) : device.type === "server" ? (
                          <Server className="h-4 w-4" />
                        ) : (
                          <Network className="h-4 w-4" />
                        )}
                        <div>
                          <div>{device.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {device.mac}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{device.ip}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          device.status === "connected"
                            ? "success"
                            : device.status === "blocked"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {device.user ? (
                        <div>
                          <div>{device.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {device.user.department}
                          </div>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={device.access.level}
                        onValueChange={(value) =>
                          updateDeviceAccess(device.id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Completo</SelectItem>
                          <SelectItem value="restricted">
                            Restringido
                          </SelectItem>
                          <SelectItem value="guest">Invitado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            device.riskScore > 7
                              ? "bg-red-500"
                              : device.riskScore > 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                        />
                        {device.riskScore}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(device.lastSeen).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDevice(device)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="policies">
            {/* Contenido de políticas de red */}
          </TabsContent>

          <TabsContent value="events">
            {/* Contenido de eventos de red */}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}