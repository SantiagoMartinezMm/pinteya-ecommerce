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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Pause,
  StopCircle,
  RefreshCw,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Download,
} from "lucide-react";

interface ScanResult {
  id: string;
  type: "vulnerability" | "configuration" | "compliance" | "malware";
  target: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  startTime: string;
  endTime?: string;
  findings: {
    high: number;
    medium: number;
    low: number;
  };
  details: {
    description: string;
    impact: string;
    recommendation: string;
  }[];
}

interface ScannerConfig {
  id: string;
  name: string;
  description: string;
  type: string;
  schedule?: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    lastRun?: string;
    nextRun?: string;
  };
  targets: string[];
  enabled: boolean;
}

export function SecurityScanner() {
  const [activeScans, setActiveScans] = useState<ScanResult[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [scanConfigs, setScanConfigs] = useState<ScannerConfig[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScannerData();
    const interval = setInterval(updateActiveScans, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchScannerData = async () => {
    try {
      const [activeRes, historyRes, configsRes] = await Promise.all([
        fetch("/api/admin/security/scanner/active"),
        fetch("/api/admin/security/scanner/history"),
        fetch("/api/admin/security/scanner/configs"),
      ]);

      const activeData = await activeRes.json();
      const historyData = await historyRes.json();
      const configsData = await configsRes.json();

      setActiveScans(activeData);
      setScanHistory(historyData);
      setScanConfigs(configsData);
    } catch (error) {
      console.error("Error fetching scanner data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startScan = async (configId: string) => {
    try {
      const response = await fetch("/api/admin/security/scanner/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });
      const newScan = await response.json();
      setActiveScans((prev) => [...prev, newScan]);
    } catch (error) {
      console.error("Error starting scan:", error);
    }
  };

  const stopScan = async (scanId: string) => {
    try {
      await fetch(`/api/admin/security/scanner/${scanId}/stop`, {
        method: "POST",
      });
      setActiveScans((prev) =>
        prev.filter((scan) => scan.id !== scanId)
      );
    } catch (error) {
      console.error("Error stopping scan:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Escáner de Seguridad</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona y ejecuta escaneos de seguridad
          </p>
        </div>
        <Button onClick={() => startScan("quick-scan")}>
          <Play className="h-4 w-4 mr-2" />
          Escaneo Rápido
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Escaneos Activos */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Escaneos Activos</h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {activeScans.map((scan) => (
                <div
                  key={scan.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{scan.type}</Badge>
                      <span className="font-medium">{scan.target}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => stopScan(scan.id)}
                    >
                      <StopCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span>{scan.progress}%</span>
                    </div>
                    <Progress value={scan.progress} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Iniciado: {new Date(scan.startTime).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Configuraciones de Escaneo */}
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Configuraciones</h4>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {scanConfigs.map((config) => (
                <div
                  key={config.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">{config.name}</h5>
                      <p className="text-sm text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startScan(config.id)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Ejecutar
                    </Button>
                  </div>
                  {config.schedule && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>
                        Próximo escaneo:{" "}
                        {new Date(config.schedule.nextRun!).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Historial de Escaneos */}
      <Card className="p-6">
        <h4 className="text-sm font-medium mb-4">Historial de Escaneos</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Objetivo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Hallazgos</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scanHistory.map((scan) => (
              <TableRow key={scan.id}>
                <TableCell>
                  <Badge variant="outline">{scan.type}</Badge>
                </TableCell>
                <TableCell>{scan.target}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      scan.status === "completed"
                        ? "success"
                        : scan.status === "failed"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {scan.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Badge variant="destructive">
                      {scan.findings.high} altos
                    </Badge>
                    <Badge variant="warning">
                      {scan.findings.medium} medios
                    </Badge>
                    <Badge variant="default">
                      {scan.findings.low} bajos
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(scan.endTime!).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedScan(scan)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}