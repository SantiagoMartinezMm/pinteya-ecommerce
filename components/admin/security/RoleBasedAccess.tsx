"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Shield,
  Users,
  Plus,
  Settings,
  Edit,
  Trash2,
  Copy,
  CheckSquare,
  Square,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  users: number;
  createdAt: string;
  updatedAt: string;
  isSystem: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  dependencies?: string[];
}

interface Resource {
  id: string;
  name: string;
  type: string;
  permissions: string[];
}

export function RoleBasedAccess() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showNewRoleDialog, setShowNewRoleDialog] = useState(false);

  useEffect(() => {
    fetchRBACData();
  }, []);

  const fetchRBACData = async () => {
    try {
      const [rolesRes, permissionsRes, resourcesRes] = await Promise.all([
        fetch("/api/admin/security/rbac/roles"),
        fetch("/api/admin/security/rbac/permissions"),
        fetch("/api/admin/security/rbac/resources"),
      ]);

      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();
      const resourcesData = await resourcesRes.json();

      setRoles(rolesData);
      setPermissions(permissionsData);
      setResources(resourcesData);
    } catch (error) {
      console.error("Error fetching RBAC data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = async (
    roleId: string,
    permissionId: string,
    enabled: boolean
  ) => {
    try {
      await fetch(
        `/api/admin/security/rbac/roles/${roleId}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permissionId,
            enabled,
          }),
        }
      );
      await fetchRBACData();
    } catch (error) {
      console.error("Error updating permission:", error);
    }
  };

  if (loading) {
    return <div>Cargando control de acceso...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Control de Acceso Basado en Roles
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona roles y permisos del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNewRoleDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Rol
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium">Roles Totales</p>
            </div>
            <p className="text-2xl font-bold">{roles.length}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium">Usuarios Asignados</p>
            </div>
            <p className="text-2xl font-bold">
              {roles.reduce((acc, role) => acc + role.users, 0)}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-purple-500" />
              <p className="text-sm font-medium">Permisos</p>
            </div>
            <p className="text-2xl font-bold">
              {permissions.length}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 p-6">
          <h4 className="text-sm font-medium mb-4">Roles</h4>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`p-4 border rounded-lg cursor-pointer ${
                    selectedRole?.id === role.id
                      ? "border-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedRole(role)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.isSystem && (
                          <Badge variant="secondary">Sistema</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {role.description}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={role.isSystem}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {role.users} usuarios
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckSquare className="h-4 w-4" />
                      {role.permissions.length} permisos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="col-span-2 p-6">
          <h4 className="text-sm font-medium mb-4">Permisos</h4>
          {selectedRole ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">
                    {selectedRole.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRole.description}
                  </p>
                </div>
                <Button variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Rol
                </Button>
              </div>

              <div className="space-y-4">
                {Object.entries(
                  permissions.reduce((acc, permission) => {
                    if (!acc[permission.category]) {
                      acc[permission.category] = [];
                    }
                    acc[permission.category].push(permission);
                    return acc;
                  }, {} as Record<string, Permission[]>)
                ).map(([category, categoryPermissions]) => (
                  <div key={category}>
                    <h5 className="text-sm font-medium mb-2">
                      {category}
                    </h5>
                    <div className="space-y-2">
                      {categoryPermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div>
                            <p className="font-medium">
                              {permission.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>
                          <Switch
                            checked={selectedRole.permissions.some(
                              (p) => p.id === permission.id
                            )}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(
                                selectedRole.id,
                                permission.id,
                                checked
                              )
                            }
                            disabled={selectedRole.isSystem}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-muted-foreground">
              Selecciona un rol para ver sus permisos
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}