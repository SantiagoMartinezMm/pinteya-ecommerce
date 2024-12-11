"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lightbulb,
  CheckCircle,
  Clock,
  Shield,
  AlertTriangle,
  Brain,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  History,
  Filter,
} from "lucide-react";

interface Recommendation {
  id: string;
  type: "action" | "playbook" | "resource" | "escalation";
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  confidence: number;
  reasoning: string[];
  suggestedActions: {
    id: string;
    action: string;
    estimatedTime: number;
    requiredResources: string[];
    expectedOutcome: string;
  }[];
  historicalSuccess: {
    rate: number;
    totalApplications: number;
    outcomes: {
      success: number;
      partial: number;
      failed: number;
    };
  };
  context: {
    applicableScenarios: string[];
    prerequisites: string[];
    limitations: string[];
  };
  feedback: {
    positive: number;
    negative: number;
    lastUpdated: string;
  };
}

interface IncidentContext {
  id: string;
  type: string;
  severity: string;
  affectedSystems: string[];
  currentStatus: string;
  timeline: {
    timestamp: string;
    event: string;
  }[];
}

export function ResponseRecommendationSystem() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [incidentContext, setIncidentContext] = useState<IncidentContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "all",
    minConfidence: 0,
    priority: "all",
  });

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const [recResponse, contextResponse] = await Promise.all([
          fetch("/api/security/incidents/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filters, incidentId: "current-incident-id" }),
          }),
          fetch("/api/security/incidents/current-context"),
        ]);

        const recData = await recResponse.json();
        const contextData = await contextResponse.json();

        setRecommendations(recData);
        setIncidentContext(contextData);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [filters]);

  const handleFeedback = async (recommendationId: string, isPositive: boolean) => {
    try {
      await fetch(`/api/security/incidents/recommendations/${recommendationId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPositive }),
      });

      setRecommendations(prevRecs =>
        prevRecs.map(rec =>
          rec.id === recommendationId
            ? {
                ...rec,
                feedback: {
                  ...rec.feedback,
                  positive: isPositive
                    ? rec.feedback.positive + 1
                    : rec.feedback.positive,
                  negative: !isPositive
                    ? rec.feedback.negative + 1
                    : rec.feedback.negative,
                },
              }
            : rec
        )
      );
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recomendaciones de Respuesta</h2>
          <p className="text-muted-foreground">
            Sugerencias basadas en ML para la gestión del incidente
          </p>
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card className="p-6">
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <Card
                    key={rec.id}
                    className="p-4 cursor-pointer hover:border-primary"
                    onClick={() => setSelectedRecommendation(rec)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              rec.priority === "critical"
                                ? "destructive"
                                : rec.priority === "high"
                                ? "warning"
                                : "default"
                            }
                          >
                            {rec.priority}
                          </Badge>
                          <h3 className="font-medium">{rec.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rec.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {rec.confidence}% confianza
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tasa de éxito histórico
                        </span>
                        <span>{rec.historicalSuccess.rate}%</span>
                      </div>
                      <Progress
                        value={rec.historicalSuccess.rate}
                        className="mt-2"
                      />
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          {rec.historicalSuccess.outcomes.success} exitosos
                        </span>
                        <span className="flex items-center gap-1">
                          <History className="h-4 w-4" />
                          {rec.historicalSuccess.totalApplications} aplicaciones
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(rec.id, true);
                          }}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFeedback(rec.id, false);
                          }}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <h3 className="font-medium mb-4">Contexto del Incidente</h3>
            {incidentContext && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{incidentContext.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severidad</p>
                  <Badge
                    variant={
                      incidentContext.severity === "critical"
                        ? "destructive"
                        : incidentContext.severity === "high"
                        ? "warning"
                        : "default"
                    }
                  >
                    {incidentContext.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Sistemas Afectados
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {incidentContext.affectedSystems.map((system) => (
                      <Badge key={system} variant="outline">
                        {system}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Línea de Tiempo
                  </p>
                  <div className="mt-2 space-y-2">
                    {incidentContext.timeline.map((event, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Clock className="h-4 w-4 mt-0.5" />
                        <div>
                          <p className="text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                          <p>{event.event}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {selectedRecommendation && (
        <Dialog
          open={!!selectedRecommendation}
          onOpenChange={() => setSelectedRecommendation(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles de la Recomendación</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Contenido detallado de la recomendación */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}