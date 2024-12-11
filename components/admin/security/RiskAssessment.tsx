"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  BarChart2,
  FileText,
  Plus,
  Filter,
  Download,
} from "lucide-react";

interface Risk {
  id: string;
  name: string;
  description: string;
  category: string;
  likelihood: "very_high" | "high" | "medium" | "low" | "very_low";
  impact: "critical" | "high" | "medium" | "low" | "negligible";
  status: "active" | "mitigated" | "accepted" | "transferred";
  owner: {
    id: string;
    name: string;
    department: string;
  };
  assets: {
    id: string;
    name: string;
    type: string;
  }[];
  controls: {
    id: string;
    name: string;
    type: string;
    effectiveness: number;
    status: string;
  }[];
  threatSources: string[];
  vulnerabilities: string[];
  riskScore: number;
  residualRisk: number;
  trends: {
    period: string;
    score: number;
  }[];
  treatments: {
    id: string;
    type: "mitigate" | "accept" | "transfer" | "avoid";
    description: string;
    status: "proposed" | "approved" | "in_progress" | "completed";
    cost: number;
    effectiveness: number;
    deadline?: string;
  }[];
  reviews: {
    id: string;
    date: string;
    reviewer: string;
    comments: string;
    changes: string[];
  }[];
  metrics: {
    controlEffectiveness: number;
    riskReduction: number;
    costEfficiency: number;
  };
}

interface RiskMetrics {
  totalRisks: number;
  highRisks: number;
  mitigatedRisks: number;
  acceptedRisks: number;
  averageRiskScore: number;
  risksByCategory: {
    category: string;
    count: number;
    averageScore: number;
  }[];
  trends: {
    period: string;
    averageScore: number;
  }[];
}

export function RiskAssessment() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    level: "",
    search: "",
  });

  const fetchRiskData = useCallback(async () => {
    try {
      const [risksRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/risks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        }),
        fetch("/api/admin/security/risks/metrics"),
      ]);

      const risksData = await risksRes.json();
      const metricsData = await metricsRes.json();

      setRisks(risksData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching risk data:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRiskData();
  }, [fetchRiskData]);

  const calculateRiskLevel = (score: number) => {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    if (score >= 20) return "low";
    return "very_low";
  };

  if (loading || !metrics) {
    return <div>Cargando evaluación de riesgos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y controles principales */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Evaluación de Riesgos</h2>
          <p className="text-muted-foreground">
            Análisis y gestión de riesgos de seguridad
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Informe
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Riesgo
          </Button>
        </div>
      </div>

      {/* Panel de métricas */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Riesgos Totales</h3>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{metrics.totalRisks}</p>
          <Progress
            value={(metrics.mitigatedRisks / metrics.totalRisks) * 100}
            className="mt-2"
          />
        </Card>
        {/* Más métricas... */}
      </div>

      {/* Matriz de riesgos */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Matriz de Riesgos</h3>
        <div className="grid grid-cols-5 gap-4">
          {risks.map((risk) => (
            <div
              key={risk.id}
              className={`p-4 border rounded-lg cursor-pointer hover:border-primary ${
                selectedRisk?.id === risk.id ? "border-primary" : ""
              }`}
              onClick={() => setSelectedRisk(risk)}
            >
              <div className="flex justify-between items-start">
                <Badge
                  variant={
                    calculateRiskLevel(risk.riskScore) === "critical"
                      ? "destructive"
                      : calculateRiskLevel(risk.riskScore) === "high"
                      ? "warning"
                      : "default"
                  }
                >
                  {risk.riskScore}
                </Badge>
                <Badge variant="outline">{risk.status}</Badge>
              </div>
              <h4 className="font-medium mt-2">{risk.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {risk.description}
              </p>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>
                    Control: {risk.metrics.controlEffectiveness}%
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  {risk.trends[risk.trends.length - 1].score >
                  risk.trends[risk.trends.length - 2].score ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                  <span>
                    Tendencia:{" "}
                    {(
                      ((risk.trends[risk.trends.length - 1].score -
                        risk.trends[risk.trends.length - 2].score) /
                        risk.trends[risk.trends.length - 2].score) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Detalles del riesgo seleccionado */}
      {selectedRisk && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-medium">{selectedRisk.name}</h3>
              <p className="text-muted-foreground">
                {selectedRisk.description}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Editar</Button>
              <Button variant="destructive">Eliminar</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Detalles del Riesgo</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Probabilidad
                  </p>
                  <p className="font-medium">{selectedRisk.likelihood}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Impacto
                  </p>
                  <p className="font-medium">{selectedRisk.impact}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Puntuación
                  </p>
                  <p className="font-medium">{selectedRisk.riskScore}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Riesgo Residual
                  </p>
                  <p className="font-medium">
                    {selectedRisk.residualRisk}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Controles</h4>
              <div className="space-y-2">
                {selectedRisk.controls.map((control) => (
                  <div
                    key={control.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{control.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {control.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {control.effectiveness}%
                      </p>
                      <Badge variant="outline">
                        {control.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Más detalles del riesgo... */}
        </Card>
      )}
    </div>
  );
}