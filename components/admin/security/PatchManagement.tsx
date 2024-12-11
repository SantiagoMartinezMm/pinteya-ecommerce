"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Shield,
  Download,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Calendar,
} from "lucide-react";

interface SecurityPatch {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "installing" | "installed" | "failed";
  releaseDate: string;
  installDate?: string;
  size: number;
  affectedSystems: string[];
  dependencies: string[];
  changelog: string;
  vendor: string;
  version: string;
  progress?: number;
}

interface PatchingMetrics {
  installedPatches: number;
  pendingPatches: number;
  failedPatches: number;
  systemsNeedingPatches: number;
  lastScan: string;
  nextScheduledPatching: string;
  complianceScore: number;
}

export function PatchManagement() {
  const [patches, setPatches] = useState<SecurityPatch[]>([]);
  const [metrics, setMetrics] = useState<PatchingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPatch, setSelectedPatch] = useState<SecurityPatch | null>(
    null
  );

  useEffect(() => {
    fetchPatchData();
    const interval = setInterval(updatePatchProgress, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPatchData = async () => {
    try {
      const [patchesRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/patches"),
        fetch("/api/admin/security/patches/metrics"),
      ]);

      const patchesData = await patchesRes.json();
      const metricsData = await metricsRes.json();

      setPatches(patchesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching patch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePatchProgress = async () => {
    const installingPatches = patches.filter(
      (patch) => patch.status === "installing"
    );
    if (installingPatches.length > 0) {
      try {
        const updates = await Promise.all(
          installingPatches.map((patch) =>
            fetch(`/api/admin/security/patches/${patch.id}/progress`)
          )
        );
        const updatedPatches = await Promise.all(
          updates.map((res) => res.json())
        );
        setPatches((prev) =>
          prev.map((patch) => {
            const update = updatedPatches.find((u) => u.id === patch.id);
            return update ? { ...patch, ...update } : patch;
          })
        );
      } catch (error) {
        console.error("Error updating patch progress:", error);
      }
    }
  };

  const installPatch = async (patchId: string) => {
    try {
      const response = await fetch(
        `/api/admin/security/patches/${patchId}/install`,
        {
          method: "POST",
        }
      );
      const updatedPatch = await response.json();
      setPatches((prev) =>
        prev.map((patch) =>
          patch.id === patchId ? { ...patch, ...updatedPatch } : patch
        )
      );
    } catch (error) {
      console.error("Error installing patch:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando gestión de parches...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Gestión de Parches de Seguridad
          </h3>
          <p className="text-sm text-muted-foreground">
            Administra y despliega parches de seguridad
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Buscar Actualizaciones
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Parches Pendientes</p>
            <p className="text-2xl font-bold">
              {metrics.pendingPatches}
            </p>
            <Progress
              value={
                (metrics.installedPatches /
                  (metrics.installedPatches + metrics.pendingPatches)) *
                100
              }
              className="h-2"
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Sistemas Afectados</p>
            <p className="text-2xl font-bold">
              {metrics.systemsNeedingPatches}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Nivel de Cumplimiento</p>
            <p className="text-2xl font-bold">
              {metrics.complianceScore}%
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Próximo Parcheo</p>
            <p className="text-sm">
              {new Date(
                metrics.nextScheduledPatching
              ).toLocaleDateString()}
            </p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
            <TabsTrigger value="installed">Instalados</TabsTrigger>
            <TabsTrigger value="failed">Fallidos</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {patches
                  .filter((patch) => patch.status === "pending")
                  .map((patch) => (
                    <div
                      key={patch.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {patch.name}
                            </span>
                            <Badge
                              variant={
                                patch.severity === "critical"
                                  ? "destructive"
                                  : patch.severity === "high"
                                  ? "warning"
                                  : "default"
                              }
                            >
                              {patch.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {patch.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => installPatch(patch.id)}
                          disabled={patch.status === "installing"}
                        >
                          {patch.status === "installing" ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="ml-2">
                            {patch.status === "installing"
                              ? "Instalando..."
                              : "Instalar"}
                          </span>
                        </Button>
                      </div>

                      {patch.status === "installing" &&
                        patch.progress && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progreso</span>
                              <span>{patch.progress}%</span>
                            </div>
                            <Progress value={patch.progress} />
                          </div>
                        )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            Versión
                          </p>
                          <p>{patch.version}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Proveedor
                          </p>
                          <p>{patch.vendor}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Publicado:{" "}
                          {new Date(
                            patch.releaseDate
                          ).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4" />
                          {patch.affectedSystems.length} sistemas
                          afectados
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="installed">
            {/* Lista de parches instalados */}
          </TabsContent>

          <TabsContent value="failed">
            {/* Lista de parches fallidos */}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}