"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Shield,
  Key,
  Lock,
  UserPlus,
  Settings,
  RefreshCw,
  Clock,
} from "lucide-react";

interface AccessRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  users: number;
  lastModified: string;
}

interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  type: "ip" | "time" | "device" | "location";
  conditions: Record<string, any>;
  status: "active" | "inactive";
  lastModified: string;
}

interface AccessRequest {
  id: string;
  userId: string;
  userName: string;
  resourceType: string;
  resourceId: string;
  status: "pending" | "approved" | "rejected";
  requestDate: string;
  approver?: string;
  justification: string;
}

export function AccessManagement() {
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AccessRole | null>(null);

  useEffect(() => {
    fetchAccessData();
  }, []);

  const fetchAccessData = async () => {
    try {
      const [rolesRes, policiesRes, requestsRes] = await Promise.all([
        fetch("/api/admin/security/access/roles"),
        fetch("/api/admin/security/access/policies"),
        fetch("/api/admin/security/access/requests"),
      ]);

      const rolesData = await rolesRes.json();
      const policiesData = await policiesRes.json();
      const requestsData = await requestsRes.json();

      setRoles(rolesData);
      setPolicies(policiesData);
      setRequests(requestsData);
    } catch (error) {
      console.error("Error fetching access data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessRequest = async (requestId: string, status: "approved" | "rejected") => {
    try {
      await fetch(`/api/admin/security/access/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status } : req
        )
      );
    } catch (error) {
      console.error("Error updating access request:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Gestión de Accesos</h3>
          <p className="text-sm text-muted-foreground">
            Administra roles, políticas y solicitudes de acceso
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar
          </Button>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Rol
          </Button>
        </div>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="policies">Políticas</TabsTrigger>
          <TabsTrigger value="requests">Solicitudes</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Usuarios</TableHead>
                  <TableHead>Última Modificación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>{role.description}</TableCell>
                    <TableCell>{role.users}</TableCell>
                    <TableCell>
                      {new Date(role.lastModified).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRole(role)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="p-6">
            <div className="space-y-4">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{policy.name}</span>
                      <Badge variant="outline">{policy.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {policy.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Switch checked={policy.status === "active"} />
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="p-6">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.userName}</span>
                          <Badge
                            variant={
                              request.status === "pending"
                                ? "outline"
                                : request.status === "approved"
                                ? "success"
                                : "destructive"
                            }
                          >
                            {request.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {request.resourceType}: {request.resourceId}
                        </p>
                      </div>
                      {request.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleAccessRequest(request.id, "rejected")
                            }
                          >
                            Rechazar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAccessRequest(request.id, "approved")
                            }
                          >
                            Aprobar
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Justificación:</p>
                      <p className="text-muted-foreground">
                        {request.justification}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Solicitado: {new Date(request.requestDate).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedRole && (
        <Dialog
          open={!!selectedRole}
          onOpenChange={() => setSelectedRole(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar Rol: {selectedRole.name}</DialogTitle>
            </DialogHeader>
            {/* Contenido del diálogo de edición de rol */}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}