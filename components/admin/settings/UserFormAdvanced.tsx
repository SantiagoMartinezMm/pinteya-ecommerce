"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string;
  module: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  level: number;
  basePermissions: string[];
}

const MODULES = {
  products: "Productos",
  orders: "Pedidos",
  customers: "Clientes",
  marketing: "Marketing",
  settings: "Configuración",
  analytics: "Analíticas",
};

const userFormSchema = z.object({
  name: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre no puede exceder los 50 caracteres"),
  email: z.string()
    .email("Email inválido"),
  role: z.string()
    .min(1, "Debes seleccionar un rol"),
  customPermissions: z.array(z.string()),
  status: z.boolean(),
  twoFactorEnabled: z.boolean(),
  accessRestrictions: z.object({
    ipWhitelist: z.array(z.string()),
    timeRestrictions: z.array(z.object({
      day: z.string(),
      from: z.string(),
      to: z.string(),
    })),
  }).optional(),
});

export function UserFormAdvanced() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showPermissionConflicts, setShowPermissionConflicts] = useState(false);

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
      customPermissions: [],
      status: true,
      twoFactorEnabled: false,
      accessRestrictions: {
        ipWhitelist: [],
        timeRestrictions: [],
      },
    },
  });

  const onRoleChange = (roleId: string) => {
    const role = ROLES.find(r => r.id === roleId);
    setSelectedRole(role || null);
    
    // Actualizar permisos base
    if (role) {
      form.setValue("customPermissions", role.basePermissions);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    const currentPermissions = form.getValues("customPermissions");
    
    if (checked) {
      // Verificar conflictos
      const conflicts = checkPermissionConflicts(
        [...currentPermissions, permission]
      );
      
      if (conflicts.length > 0) {
        setShowPermissionConflicts(true);
        return;
      }
      
      form.setValue("customPermissions", [...currentPermissions, permission]);
    } else {
      form.setValue(
        "customPermissions",
        currentPermissions.filter(p => p !== permission)
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Información básica</TabsTrigger>
            <TabsTrigger value="permissions">Permisos</TabsTrigger>
            <TabsTrigger value="security">Seguridad</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card className="p-6 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        onRoleChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem
                            key={role.id}
                            value={role.id}
                          >
                            <div className="flex items-center gap-2">
                              <span>{role.name}</span>
                              <Badge variant="outline">
                                Nivel {role.level}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      El rol determina los permisos base del usuario
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card className="p-6">
              {selectedRole ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">
                      Permisos del rol {selectedRole.name}
                    </h3>
                    <Badge variant="secondary">
                      {selectedRole.basePermissions.length} permisos base
                    </Badge>
                  </div>

                  <ScrollArea className="h-[400px] pr-4">
                    <Accordion type="single" collapsible>
                      {Object.entries(MODULES).map(([moduleId, moduleName]) => (
                        <AccordionItem key={moduleId} value={moduleId}>
                          <AccordionTrigger>{moduleName}</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2">
                              {permissions
                                .filter(p => p.module === moduleId)
                                .map((permission) => (
                                  <div
                                    key={permission.id}
                                    className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted"
                                  >
                                    <Checkbox
                                      id={permission.id}
                                      checked={form
                                        .getValues("customPermissions")
                                        .includes(permission.code)}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(
                                          permission.code,
                                          checked as boolean
                                        )
                                      }
                                      disabled={selectedRole.basePermissions.includes(
                                        permission.code
                                      )}
                                    />
                                    <div className="space-y-1">
                                      <label
                                        htmlFor={permission.id}
                                        className="font-medium"
                                      >
                                        {permission.name}
                                      </label>
                                      <p className="text-sm text-muted-foreground">
                                        {permission.description}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>

                  {showPermissionConflicts && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Algunos permisos seleccionados están en conflicto
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Selecciona un rol para gestionar los permisos
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="p-6 space-y-6">
              <FormField
                control={form.control}
                name="twoFactorEnabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Autenticación de dos factores
                      </FormLabel>
                      <FormDescription>
                        Aumenta la seguridad requiriendo un segundo factor de autenticación
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Más configuraciones de seguridad... */}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit">
            {user ? "Actualizar" : "Crear"} usuario
          </Button>
        </div>
      </form>
    </Form>
  );
}