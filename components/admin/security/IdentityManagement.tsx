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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  UserPlus,
  Users,
  Key,
  Lock,
  Shield,
  Settings,
  RefreshCw,
  Mail,
  Smartphone,
  AlertTriangle,
} from "lucide-react";

interface Identity {
  id: string;
  username: string;
  email: string;
  fullName: string;
  department: string;
  status: "active" | "inactive" | "locked" | "pending";
  roles: string[];
  lastLogin?: string;
  mfaEnabled: boolean;
  createdAt: string;
  passwordLastChanged: string;
  loginAttempts: number;
  sessions: {
    id: string;
    device: string;
    location: string;
    lastActive: string;
  }[];
}

interface IdentityMetrics {
  totalUsers: number;
  activeUsers: number;
  lockedAccounts: number;
  mfaAdoption: number;
  recentActivities: {
    type: string;
    user: string;
    timestamp: string;
    details: string;
  }[];
}

export function IdentityManagement() {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [metrics, setMetrics] = useState<IdentityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(
    null
  );
  const [showNewIdentityDialog, setShowNewIdentityDialog] = useState(false);

  useEffect(() => {
    fetchIdentityData();
  }, []);

  const fetchIdentityData = async () => {
    try {
      const [identitiesRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/identities"),
        fetch("/api/admin/security/identities/metrics"),
      ]);

      const identitiesData = await identitiesRes.json();
      const metricsData = await metricsRes.json();

      setIdentities(identitiesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching identity data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/security/identities/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchIdentityData();
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando gestión de identidades...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Gestión de Identidades
          </h3>
          <p className="text-sm text-muted-foreground">
            Administra usuarios y sus identidades digitales
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNewIdentityDialog(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configuración
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium">Usuarios Totales</p>
            </div>
            <p className="text-2xl font-bold">{metrics.totalUsers}</p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium">MFA Activado</p>
            </div>
            <p className="text-2xl font-bold">
              {metrics.mfaAdoption}%
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium">Cuentas Bloqueadas</p>
            </div>
            <p className="text-2xl font-bold">
              {metrics.lockedAccounts}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-yellow-500" />
              <p className="text-sm font-medium">Usuarios Activos</p>
            </div>
            <p className="text-2xl font-bold">{metrics.activeUsers}</p>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar usuarios..."
              className="w-[300px]"
            />
            <Select defaultValue="all">
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="locked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Último Acceso</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {identities.map((identity) => (
              <TableRow key={identity.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {identity.fullName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {identity.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      identity.status === "active"
                        ? "success"
                        : identity.status === "locked"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {identity.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {identity.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className="text-xs"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {identity.mfaEnabled ? (
                    <Shield className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </TableCell>
                <TableCell>
                  {identity.lastLogin
                    ? new Date(identity.lastLogin).toLocaleString()
                    : "Nunca"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIdentity(identity)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleStatusChange(
                          identity.id,
                          identity.status === "active"
                            ? "locked"
                            : "active"
                        )
                      }
                    >
                      {identity.status === "active" ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Key className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Diálogo de detalles de identidad */}
      {selectedIdentity && (
        <Dialog
          open={!!selectedIdentity}
          onOpenChange={() => setSelectedIdentity(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles de Usuario</DialogTitle>
            </DialogHeader>
            {/* Contenido del diálogo... */}
          </DialogContent>
        </Dialog>
      )}

      {/* Diálogo de nueva identidad */}
      <Dialog
        open={showNewIdentityDialog}
        onOpenChange={setShowNewIdentityDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>
          {/* Formulario de nueva identidad... */}
        </DialogContent>
      </Dialog>
    </div>
  );
}