"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Shield, Target } from "lucide-react";

interface TriageAssessment {
  impactLevel: "critical" | "high" | "medium" | "low";
  urgencyLevel: "critical" | "high" | "medium" | "low";
  scope: string[];
  initialFindings: string;
  recommendedActions: string[];
  assignedTeam?: string;
  priority: "p1" | "p2" | "p3" | "p4";
}

interface IncidentTriageProps {
  incident: SecurityIncident;
  onTriageComplete: (assessment: TriageAssessment) => void;
}

export function IncidentTriage({ incident, onTriageComplete }: IncidentTriageProps) {
  const [assessment, setAssessment] = useState<TriageAssessment>({
    impactLevel: "medium",
    urgencyLevel: "medium",
    scope: [],
    initialFindings: "",
    recommendedActions: [],
    priority: "p2",
  });

  const calculatePriority = (impact: string, urgency: string): "p1" | "p2" | "p3" | "p4" => {
    const levels = { critical: 4, high: 3, medium: 2, low: 1 };
    const score = levels[impact as keyof typeof levels] + levels[urgency as keyof typeof levels];
    if (score >= 7) return "p1";
    if (score >= 5) return "p2";
    if (score >= 3) return "p3";
    return "p4";
  };

  const handleImpactChange = (value: string) => {
    setAssessment(prev => ({
      ...prev,
      impactLevel: value as TriageAssessment["impactLevel"],
      priority: calculatePriority(value, assessment.urgencyLevel)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-4">Evaluación de Impacto</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">
                Nivel de Impacto
              </label>
              <Select
                value={assessment.impactLevel}
                onValueChange={handleImpactChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">
                Alcance del Incidente
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {["Datos", "Sistemas", "Usuarios", "Red", "Servicios"].map((scope) => (
                  <Button
                    key={scope}
                    variant={assessment.scope.includes(scope) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setAssessment(prev => ({
                        ...prev,
                        scope: prev.scope.includes(scope)
                          ? prev.scope.filter(s => s !== scope)
                          : [...prev.scope, scope]
                      }));
                    }}
                  >
                    {scope}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium mb-4">Hallazgos Iniciales</h3>
          <Textarea
            placeholder="Describe los hallazgos iniciales del incidente..."
            value={assessment.initialFindings}
            onChange={(e) => 
              setAssessment(prev => ({
                ...prev,
                initialFindings: e.target.value
              }))
            }
            className="h-[150px]"
          />
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-4">Acciones Recomendadas</h3>
        <div className="space-y-4">
          {assessment.recommendedActions.map((action, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={action}
                onChange={(e) => {
                  const newActions = [...assessment.recommendedActions];
                  newActions[index] = e.target.value;
                  setAssessment(prev => ({
                    ...prev,
                    recommendedActions: newActions
                  }));
                }}
                className="flex-1 p-2 border rounded"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAssessment(prev => ({
                    ...prev,
                    recommendedActions: prev.recommendedActions.filter((_, i) => i !== index)
                  }));
                }}
              >
                Eliminar
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              setAssessment(prev => ({
                ...prev,
                recommendedActions: [...prev.recommendedActions, ""]
              }));
            }}
          >
            Añadir Acción
          </Button>
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <div>
          <Badge
            variant={
              assessment.priority === "p1"
                ? "destructive"
                : assessment.priority === "p2"
                ? "warning"
                : "default"
            }
          >
            Prioridad: {assessment.priority.toUpperCase()}
          </Badge>
        </div>
        <div className="space-x-2">
          <Button variant="outline">Cancelar</Button>
          <Button
            onClick={() => onTriageComplete(assessment)}
            disabled={!assessment.initialFindings || assessment.scope.length === 0}
          >
            Completar Triaje
          </Button>
        </div>
      </div>
    </div>
  );
}