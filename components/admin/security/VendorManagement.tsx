"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Shield,
  FileText,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Download,
} from "lucide-react";

interface SecurityVendor {
  id: string;
  name: string;
  category: "software" | "hardware" | "service" | "consulting";
  status: "active" | "inactive" | "pending" | "terminated";
  services: {
    id: string;
    name: string;
    description: string;
    type: string;
    status: string;
  }[];
  contracts: {
    id: string;
    type: string;
    startDate: string;
    endDate: string;
    value: number;
    status: string;
    documents: string[];
  }[];
  compliance: {
    certifications: {
      name: string;
      issuer: string;
      validUntil: string;
      status: string;
    }[];
    audits: {
      date: string;
      type: string;
      result: string;
      findings: string[];
    }[];
    sla: {
      metric: string;
      target: number;
      actual: number;
    }[];
  };
  incidents: {
    id: string;
    date: string;
    type: string;
    severity: string;
    resolution: string;
    impact: string;
  }[];
  contacts: {
    name: string;
    role: string;
    email: string;
    phone: string;
    primary: boolean;
  }[];
  performance: {
    reliability: number;
    responseTime: number;
    qualityScore: number;
    costEfficiency: number;
  };
  documents: {
    id: string;
    type: string;
    name: string;
    date: string;
    url: string;
  }[];
  costs: {
    period: string;
    amount: number;
    category: string;
    status: string;
  }[];
}

interface VendorMetrics {
  totalVendors: number;
  activeVendors: number;
  totalSpend: number;
  averagePerformance: number;
  complianceRate: number;
  incidentRate: number;
  topVendors: {
    vendorId: string;
    name: string;
    score: number;
  }[];
  spendingTrend: {
    period: string;
    amount: number;
  }[];
}

export function VendorManagement() {
  const [vendors, setVendors] = useState<SecurityVendor[]>([]);
  const [metrics, setMetrics] = useState<VendorMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState<SecurityVendor | null>(
    null
  );
  const [showNewVendorDialog, setShowNewVendorDialog] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    search: "",
  });

  const fetchVendorData = useCallback(async () => {
    try {
      const [vendorsRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/vendors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/vendors/metrics"),
      ]);

      const vendorsData = await vendorsRes.json();
      const metricsData = await metricsRes.json();

      setVendors(vendorsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching vendor data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  if (loading || !metrics) {
    return <div>Cargando gestión de proveedores...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            Gestión de Proveedores
          </h2>
          <p className="text-muted-foreground">
            Administración de proveedores de seguridad
          </p>
        </div>
        <Button onClick={() => setShowNewVendorDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Proveedores Activos</h3>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">
            {metrics.activeVendors}
          </p>
          <p className="text-sm text-muted-foreground">
            de {metrics.totalVendors} proveedores
          </p>
        </Card>
        {/* Más métricas... */}
      </div>

      {/* Lista de proveedores */}
      <Card className="p-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">General</TabsTrigger>
            <TabsTrigger value="performance">Rendimiento</TabsTrigger>
            <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="incidents">Incidentes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {vendors.map((vendor) => (
                  <Card
                    key={vendor.id}
                    className="p-4 cursor-pointer hover:border-primary"
                    onClick={() => setSelectedVendor(vendor)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{vendor.name}</h4>
                          <Badge variant="outline">
                            {vendor.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {vendor.services.length} servicios activos
                        </p>
                      </div>
                      <Badge
                        variant={
                          vendor.status === "active"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {vendor.status}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Rendimiento
                        </p>
                        <Progress
                          value={vendor.performance.qualityScore}
                          className="mt-1"
                        />
                        <div className="flex justify-between text-sm mt-1">
                          <span>Calidad</span>
                          <span>{vendor.performance.qualityScore}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Cumplimiento
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {vendor.compliance.certifications.map(
                            (cert) => (
                              <Badge
                                key={cert.name}
                                variant="outline"
                              >
                                {cert.name}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Último incidente:{" "}
                          {vendor.incidents.length > 0
                            ? new Date(
                                vendor.incidents[0].date
                              ).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          Gasto total: $
                          {vendor.costs
                            .reduce(
                              (acc, cost) => acc + cost.amount,
                              0
                            )
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Más contenido de pestañas... */}
        </Tabs>
      </Card>

      {/* Diálogos y modales */}
      {/* ... */}
    </div>
  );
}