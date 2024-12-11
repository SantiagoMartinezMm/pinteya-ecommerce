"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Mail,
  Users,
  Bell,
  Send,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
} from "lucide-react";

interface Communication {
  id: string;
  type: "notification" | "update" | "alert" | "report";
  status: "draft" | "sent" | "scheduled";
  priority: "high" | "medium" | "low";
  subject: string;
  content: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  recipients: {
    groups: string[];
    individuals: {
      id: string;
      name: string;
      email: string;
      acknowledged?: boolean;
    }[];
  };
  sentAt?: string;
  scheduledFor?: string;
  metadata: {
    deliveryStatus: {
      sent: number;
      failed: number;
      pending: number;
    };
    acknowledgments: {
      required: boolean;
      received: number;
      pending: number;
    };
  };
  attachments?: {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
  }[];
}

interface Template {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  variables: string[];
}

export function IncidentCommunicationPanel() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newCommunication, setNewCommunication] = useState<Partial<Communication>>({
    type: "update",
    priority: "medium",
    status: "draft",
  });
  const [isCreating, setIsCreating] = useState(false);

  const stakeholderGroups = [
    { id: "executive", name: "Ejecutivos" },
    { id: "technical", name: "Equipo Técnico" },
    { id: "security", name: "Equipo de Seguridad" },
    { id: "legal", name: "Legal y Cumplimiento" },
    { id: "affected", name: "Usuarios Afectados" },
  ];

  const handleTemplateFill = (template: Template) => {
    setNewCommunication(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content,
    }));
    setSelectedTemplate(template);
  };

  const handleSendCommunication = async () => {
    try {
      const response = await fetch("/api/security/incidents/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCommunication),
      });

      if (response.ok) {
        const data = await response.json();
        setCommunications(prev => [...prev, data]);
        setIsCreating(false);
        setNewCommunication({
          type: "update",
          priority: "medium",
          status: "draft",
        });
      }
    } catch (error) {
      console.error("Error sending communication:", error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Comunicaciones del Incidente</h3>
            <p className="text-sm text-muted-foreground">
              Gestión de comunicaciones y notificaciones
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Comunicación
          </Button>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Activas</TabsTrigger>
            <TabsTrigger value="scheduled">Programadas</TabsTrigger>
            <TabsTrigger value="sent">Enviadas</TabsTrigger>
            <TabsTrigger value="templates">Plantillas</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {communications
              .filter(comm => comm.status === "draft")
              .map(comm => (
                <Card key={comm.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            comm.priority === "high"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {comm.priority}
                        </Badge>
                        <h4 className="font-medium">{comm.subject}</h4>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>
                            {comm.recipients.groups.length} grupos,{" "}
                            {comm.recipients.individuals.length} individuos
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>
                            {comm.metadata.acknowledgments.received}/
                            {comm.metadata.acknowledgments.received +
                              comm.metadata.acknowledgments.pending}{" "}
                            confirmaciones
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button size="sm">
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm whitespace-pre-wrap">
                      {comm.content}
                    </p>
                  </div>

                  {comm.attachments && comm.attachments.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">
                        Archivos adjuntos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {comm.attachments.map(attachment => (
                          <Button
                            key={attachment.id}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            asChild
                          >
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileText className="h-4 w-4" />
                              {attachment.name}
                            </a>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
          </TabsContent>

          {/* Diálogo de nueva comunicación */}
          {isCreating && (
            <Dialog
              open={isCreating}
              onOpenChange={setIsCreating}
            >
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Nueva Comunicación</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Tipo
                      </label>
                      <Select
                        value={newCommunication.type}
                        onValueChange={value =>
                          setNewCommunication(prev => ({
                            ...prev,
                            type: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="notification">
                            Notificación
                          </SelectItem>
                          <SelectItem value="update">
                            Actualización
                          </SelectItem>
                          <SelectItem value="alert">Alerta</SelectItem>
                          <SelectItem value="report">Reporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Prioridad
                      </label>
                      <Select
                        value={newCommunication.priority}
                        onValueChange={value =>
                          setNewCommunication(prev => ({
                            ...prev,
                            priority: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="low">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">
                      Asunto
                    </label>
                    <Input
                      value={newCommunication.subject}
                      onChange={e =>
                        setNewCommunication(prev => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      placeholder="Asunto de la comunicación"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">
                      Contenido
                    </label>
                    <Textarea
                      value={newCommunication.content}
                      onChange={e =>
                        setNewCommunication(prev => ({
                          ...prev,
                          content: e.target.value,
                        }))
                      }
                      placeholder="Contenido de la comunicación..."
                      className="h-40"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">
                      Grupos de Destinatarios
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {stakeholderGroups.map(group => (
                        <Button
                          key={group.id}
                          variant="outline"
                          className={
                            newCommunication.recipients?.groups?.includes(
                              group.id
                            )
                              ? "border-primary"
                              : ""
                          }
                          onClick={() =>
                            setNewCommunication(prev => ({
                              ...prev,
                              recipients: {
                                ...prev.recipients,
                                groups: prev.recipients?.groups?.includes(
                                  group.id
                                )
                                  ? prev.recipients.groups.filter(
                                      id => id !== group.id
                                    )
                                  : [...(prev.recipients?.groups || []), group.id],
                              },
                            }))
                          }
                        >
                          {group.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSendCommunication}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </Tabs>
      </Card>
    </div>
  );
}