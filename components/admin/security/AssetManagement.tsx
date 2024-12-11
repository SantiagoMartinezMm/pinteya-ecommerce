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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Server,
  Laptop,
  Shield,
  HardDrive,
  Network,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
} from "lucide-react";

interface SecurityAsset {
  id: string;
  name: string;
  type: "hardware" | "software" | "network" | "data" | "cloud";
  category: string;
  status: "active" | "inactive" | "maintenance" | "retired";
  criticality: "critical" | "high" | "medium" | "low";
  owner: {
    id: string;
    name: string;
    department: string;
  };
  location: {
    site: string;
    rack?: string;
    position?: string;
  };
  specifications: {
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    version?: string;
    licenseInfo?: {
      type: string;
      expiryDate: string;
      seats: number;
    };
  };
  security: {
    patches: {
      lastUpdate: string;
      status: string;
    };
    vulnerabilities: {
      count: number;
      critical: number;
    };
    compliance: {
      status: string;
      lastCheck: string;
    };
  };
  maintenance: {
    lastMaintenance: string;
    nextMaintenance: string;
    provider?: string;
    contract?: string;
  };
  dependencies: {
    dependsOn: string[];
    dependedBy: string[];
  };
  documents: {
    id: string;
    type: string;
    name: string;
    url: string;
  }[];
  history: {
    timestamp: string;
    event: string;
    user: string;
  }[];
}

interface AssetMetrics {
  totalAssets: number;
  byType: Record<string, number>;
  byCriticality: Record<string, number>;
  byStatus: Record<string, number>;
  vulnerableAssets: number;
  expiringLicenses: number;
  pendingMaintenance: number;
}

export function AssetManagement() {
  const [assets, setAssets] = useState<SecurityAsset[]>([]);
  const [metrics, setMetrics] = useState<AssetMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<SecurityAsset | null>(null);
  const [showNewAssetDialog, setShowNewAssetDialog] = useState(false);
  const [filters, setFilters] = useState({
    type: "",
    criticality: "",
    status: "",
    search: "",
  });

  const fetchAssetData = useCallback(async () => {
    try {
      const [assetsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/assets/metrics"),
      ]);

      const assetsData = await assetsRes.json();
      const metricsData = await metricsRes.json();

      setAssets(assetsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching asset data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAssetData();
  }, [fetchAssetData]);

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "hardware":
        return <Server className="h-4 w-4" />;
      case "software":
        return <Database className="h-4 w-4" />;
      case "network":
        return <Network className="h-4 w-4" />;
      case "data":
        return <HardDrive className="h-4 w-4" />;
      case "cloud":
        return <Cloud className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (loading || !metrics) {
    return <div>Cargando gestión de activos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Gestión de Activos</h3>
          <p className="text-sm text-muted-foreground">
            Administra y monitorea los activos de seguridad
          </p>
        </div>
        <Button onClick={() => setShowNewAssetDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Activo
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium">Total Activos</h4>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.totalAssets}</p>
        </Card>
        {/* Más métricas... */}
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar activos..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-[300px]"
            />
            {/* Más filtros... */}
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criticidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Propietario</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getAssetIcon(asset.type)}
                    <span>{asset.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{asset.type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      asset.criticality === "critical"
                        ? "destructive"
                        : asset.criticality === "high"
                        ? "warning"
                        : "default"
                    }
                  >
                    {asset.criticality}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      asset.status === "active"
                        ? "success"
                        : asset.status === "maintenance"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {asset.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div>
                    <div>{asset.owner.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {asset.owner.department}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{asset.location.site}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Diálogo de detalles del activo */}
      {selectedAsset && (
        <Dialog
          open={!!selectedAsset}
          onOpenChange={() => setSelectedAsset(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles del Activo</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">General</TabsTrigger>
                <TabsTrigger value="security">Seguridad</TabsTrigger>
                <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
                <TabsTrigger value="documents">Documentos</TabsTrigger>
                <TabsTrigger value="history">Historial</TabsTrigger>
              </TabsList>
              {/* Contenido de las pestañas... */}
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}