"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Clock,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  MessageSquare,
  FileText,
  User,
  Plus,
} from "lucide-react";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "detection" | "response" | "investigation" | "containment" | "remediation" | "communication" | "note";
  title: string;
  description: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  status?: "success" | "failed" | "pending";
  artifacts?: {
    id: string;
    type: string;
    name: string;
    url: string;
  }[];
  metadata?: Record<string, any>;
}

interface IncidentTimelineProps {
  events: TimelineEvent[];
  onAddEvent: (event: Omit<TimelineEvent, "id">) => void;
}

export function IncidentTimeline({ events, onAddEvent }: IncidentTimelineProps) {
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({});
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "detection":
        return <AlertTriangle className="h-4 w-4" />;
      case "response":
        return <Shield className="h-4 w-4" />;
      case "investigation":
        return <Search className="h-4 w-4" />;
      case "containment":
        return <Lock className="h-4 w-4" />;
      case "remediation":
        return <Tool className="h-4 w-4" />;
      case "communication":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Cronología del Incidente</h3>
        <Button
          variant="outline"
          onClick={() => setIsAddingEvent(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Añadir Evento
        </Button>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        
        <div className="space-y-4">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`relative pl-10 ${
                index !== events.length - 1 ? "pb-6" : ""
              }`}
            >
              <div className="absolute left-0 p-2 rounded-full bg-background border">
                {getEventIcon(event.type)}
              </div>

              <Card className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{event.type}</Badge>
                      <h4 className="font-medium">{event.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                      <span>•</span>
                      <User className="h-4 w-4" />
                      <span>{event.user.name}</span>
                    </div>
                  </div>
                  {event.status && (
                    <Badge
                      variant={
                        event.status === "success"
                          ? "default"
                          : event.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {event.status}
                    </Badge>
                  )}
                </div>

                <p className="mt-2">{event.description}</p>

                {event.artifacts && event.artifacts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Archivos adjuntos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {event.artifacts.map((artifact) => (
                        <Button
                          key={artifact.id}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                          asChild
                        >
                          <a href={artifact.url} target="_blank" rel="noopener">
                            <FileText className="h-4 w-4" />
                            {artifact.name}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      </div>

      {isAddingEvent && (
        <Card className="p-4">
          <h4 className="font-medium mb-4">Nuevo Evento</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">
                  Tipo de Evento
                </label>
                <Select
                  value={newEvent.type}
                  onValueChange={(value) =>
                    setNewEvent((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detection">Detección</SelectItem>
                    <SelectItem value="response">Respuesta</SelectItem>
                    <SelectItem value="investigation">Investigación</SelectItem>
                    <SelectItem value="containment">Contención</SelectItem>
                    <SelectItem value="remediation">Remediación</SelectItem>
                    <SelectItem value="communication">Comunicación</SelectItem>
                    <SelectItem value="note">Nota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  Estado
                </label>
                <Select
                  value={newEvent.status}
                  onValueChange={(value) =>
                    setNewEvent((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">Exitoso</SelectItem>
                    <SelectItem value="failed">Fallido</SelectItem>
                    <SelectItem value="pending">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">
                Título
              </label>
              <Input
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Título del evento"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">
                Descripción
              </label>
              <Textarea
                value={newEvent.description}
                onChange={(e) =>
                  setNewEvent((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe el evento..."
                className="h-24"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddingEvent(false);
                  setNewEvent({});
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  onAddEvent({
                    ...newEvent,
                    timestamp: new Date().toISOString(),
                    user: {
                      id: "current-user-id",
                      name: "Current User",
                      role: "Investigator",
                    },
                  } as TimelineEvent);
                  setIsAddingEvent(false);
                  setNewEvent({});
                }}
                disabled={!newEvent.type || !newEvent.title || !newEvent.description}
              >
                Añadir Evento
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}