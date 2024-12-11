"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Shield,
  Calendar,
  Activity,
  Target,
  RefreshCw,
  Info,
} from "lucide-react";

interface PredictiveAnalysis {
  riskPredictions: {
    category: string;
    probability: number;
    impact: number;
    riskScore: number;
    trend: "increasing" | "decreasing" | "stable";
    contributingFactors: {
      factor: string;
      weight: number;
    }[];
    recommendedActions: {
      id: string;
      action: string;
      priority: "high" | "medium" | "low";
      effectiveness: number;
    }[];
  }[];
  trends: {
    historical: {
      period: string;
      incidents: number;
      predictedIncidents: number;
    }[];
    seasonal: {
      pattern: string;
      confidence: number;
      peakPeriods: string[];
    }[];
  };
  vulnerabilityAssessment: {
    category: string;
    currentScore: number;
    predictedScore: number;
    confidence: number;
    recommendations: string[];
  }[];
  anomalyDetection: {
    timestamp: string;
    metric: string;
    value: number;
    expected: number;
    deviation: number;
    severity: "critical" | "high" | "medium" | "low";
  }[];
}

export function PredictiveAnalysisPanel() {
  const [analysis, setAnalysis] = useState<PredictiveAnalysis | null>(null);
  const [timeHorizon, setTimeHorizon] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [selectedRiskCategory, setSelectedRiskCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch(
          `/api/security/incidents/predictive-analysis?timeHorizon=${timeHorizon}`
        );
        const data = await response.json();
        setAnalysis(data);
      } catch (error) {
        console.error("Error fetching predictive analysis:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [timeHorizon]);

  if (loading || !analysis) {
    return <div>Cargando análisis predictivo...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Análisis Predictivo</h2>
          <p className="text-muted-foreground">
            Predicción y prevención de incidentes de seguridad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar Análisis
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {analysis.riskPredictions.slice(0, 3).map((prediction) => (
          <Card
            key={prediction.category}
            className="p-4 cursor-pointer hover:border-primary"
            onClick={() => setSelectedRiskCategory(prediction.category)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{prediction.category}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      prediction.riskScore > 75
                        ? "destructive"
                        : prediction.riskScore > 50
                        ? "warning"
                        : "default"
                    }
                  >
                    Riesgo: {prediction.riskScore}%
                  </Badge>
                  {prediction.trend === "increasing" ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : prediction.trend === "decreasing" ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Probabilidad</p>
                <p className="text-lg font-medium">
                  {prediction.probability}%
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Factores Contribuyentes
              </p>
              <div className="space-y-2">
                {prediction.contributingFactors.map((factor) => (
                  <div key={factor.factor} className="flex items-center gap-2">
                    <Progress value={factor.weight} className="flex-1" />
                    <span className="text-sm">{factor.factor}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <Tabs defaultValue="trends">
          <TabsList>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalías</TabsTrigger>
            <TabsTrigger value="vulnerabilities">Vulnerabilidades</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <div className="mt-4">
              <h3 className="font-medium mb-4">Predicción de Incidentes</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={analysis.trends.historical}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Incidentes Reales"
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedIncidents"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                    name="Incidentes Predichos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6">
              <h3 className="font-medium mb-4">Patrones Estacionales</h3>
              <div className="grid grid-cols-2 gap-4">
                {analysis.trends.seasonal.map((pattern) => (
                  <Card key={pattern.pattern} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{pattern.pattern}</h4>
                        <p className="text-sm text-muted-foreground">
                          Confianza: {pattern.confidence}%
                        </p>
                      </div>
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">
                        Períodos Pico
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {pattern.peakPeriods.map((period) => (
                          <Badge key={period} variant="outline">
                            {period}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="anomalies">
            <div className="mt-4 space-y-4">
              {analysis.anomalyDetection.map((anomaly) => (
                <Card key={anomaly.timestamp} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            anomaly.severity === "critical"
                              ? "destructive"
                              : anomaly.severity === "high"
                              ? "warning"
                              : "default"
                          }
                        >
                          {anomaly.severity}
                        </Badge>
                        <h4 className="font-medium">{anomaly.metric}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Desviación: {anomaly.deviation}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Valor Actual vs. Esperado
                      </p>
                      <p className="font-medium">
                        {anomaly.value} / {anomaly.expected}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vulnerabilities">
            <div className="mt-4 grid grid-cols-2 gap-4">
              {analysis.vulnerabilityAssessment.map((assessment) => (
                <Card key={assessment.category} className="p-4">
                  <h4 className="font-medium">{assessment.category}</h4>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Puntuación Actual</span>
                        <span>{assessment.currentScore}</span>
                      </div>
                      <Progress
                        value={assessment.currentScore}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Puntuación Predicha</span>
                        <span>{assessment.predictedScore}</span>
                      </div>
                      <Progress
                        value={assessment.predictedScore}
                        className="h-2"
                      />
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Recomendaciones
                      </p>
                      <ul className="space-y-2">
                        {assessment.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}