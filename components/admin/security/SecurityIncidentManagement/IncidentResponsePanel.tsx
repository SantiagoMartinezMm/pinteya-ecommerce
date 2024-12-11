"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  FileText,
} from "lucide-react";

interface ResponseAction {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  assignee?: {
    id: string;
    name: string;
    role: string;
  };
  startTime?: string;
  completionTime?: string;
  dependencies?: string[];
  notes: string[];
  artifacts?: {
    id: string;
    type: string;
    name: string;
    url: string;
  }[];
}

interface Playbook {
  id: string;
  name: string;
  description: string;
  type: "containment" | "eradication" | "recovery";
  steps: {
    id: string;
    order: number;
    action: string;
    description: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    assignee?: string;
    estimatedTime?: number;
  }[];
  prerequisites: string[];
  recommendations: string[];
}

interface IncidentResponsePanelProps {
  incidentId: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
  onStatusUpdate: (status: string) => void;
}

export function IncidentResponsePanel({
  incidentId,
  severity,
  status,
  onStatusUpdate,
}: IncidentResponsePanelProps) {
  const [actions, setActions] = useState<ResponseAction[]>([]);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [activePlaybook, setActivePlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResponseData = async () => {
      try {
        const [actionsRes, playbooksRes] = await Promise.all([
          fetch(`/api/security/incidents/${incidentId}/actions`),
          fetch(`/api/security/incidents/${incidentId}/playbooks`),
        ]);

        const actionsData = await actionsRes.json();
        const playbooksData = await playbooksRes.json();

        setActions(actionsData);
        setPlaybooks(playbooksData);
      } catch (error) {
        console.error("Error fetching response data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResponseData();
  }, [incidentId]);

  const handleActionStatusUpdate = async (actionId: string, newStatus: string) => {
    try {
      await fetch(`/api/security/incidents/${incidentId}/actions/${actionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      setActions(prevActions =>
        prevActions.map(action =>
          action.id === actionId
            ? { ...action, status: newStatus }
            : action
        )
      );
    } catch (error) {
      console.error("Error updating action status:", error);
    }
  };

  const calculatePlaybookProgress = (playbook: Playbook) => {
    const completedSteps = playbook.steps.filter(
      step => step.status === "completed"
    ).length;
    return (completedSteps / playbook.steps.length) * 100;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Panel de Respuesta</h3>
            <p className="text-sm text-muted-foreground">
              Gestión y coordinación de la respuesta al incidente
            </p>
          </div>
          <Badge
            variant={
              severity === "critical"
                ? "destructive"
                : severity === "high"
                ? "warning"
                : "default"
            }
          >
            {severity.toUpperCase()}
          </Badge>
        </div>

        <Tabs defaultValue="actions">
          <TabsList>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
            <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
            <TabsTrigger value="team">Equipo</TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Acciones de Respuesta</h4>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Nueva Acción
              </Button>
            </div>

            {actions.map(action => (
              <Card key={action.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          action.priority === "critical"
                            ? "destructive"
                            : action.priority === "high"
                            ? "warning"
                            : "default"
                        }
                      >
                        {action.priority}
                      </Badge>
                      <h5 className="font-medium">{action.title}</h5>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {action.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleActionStatusUpdate(
                          action.id,
                          action.status === "in_progress" ? "completed" : "in_progress"
                        )
                      }
                    >
                      {action.status === "in_progress" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {action.assignee && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>{action.assignee.name}</span>
                    <span className="text-muted-foreground">
                      ({action.assignee.role})
                    </span>
                  </div>
                )}

                {action.notes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Notas
                    </p>
                    <div className="space-y-2">
                      {action.notes.map((note, index) => (
                        <div
                          key={index}
                          className="text-sm bg-muted p-2 rounded"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="playbooks" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {playbooks.map(playbook => (
                <Card
                  key={playbook.id}
                  className="p-4 cursor-pointer hover:border-primary"
                  onClick={() => setActivePlaybook(playbook)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{playbook.name}</h5>
                      <p className="text-sm text-muted-foreground">
                        {playbook.description}
                      </p>
                    </div>
                    <Badge variant="outline">{playbook.type}</Badge>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progreso</span>
                      <span>{calculatePlaybookProgress(playbook).toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={calculatePlaybookProgress(playbook)}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="team">
            {/* Contenido del equipo de respuesta */}
          </TabsContent>
        </Tabs>
      </Card>

      {activePlaybook && (
        <Dialog
          open={!!activePlaybook}
          onOpenChange={() => setActivePlaybook(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{activePlaybook.name}</DialogTitle>
            </DialogHeader>
            {/* Contenido detallado del playbook */}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}