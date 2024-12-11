"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Lock,
  Key,
  UserCheck,
  Globe,
  Server,
  AlertTriangle,
  Save,
} from "lucide-react";

interface SecurityConfig {
  authentication: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      passwordExpiration: number;
      preventPasswordReuse: number;
    };
    mfa: {
      enabled: boolean;
      methods: string[];
      enforceForRoles: string[];
    };
    session: {
      timeout: number;
      maxConcurrentSessions: number;
      enforceDeviceVerification: boolean;
    };
  };
  network: {
    allowedIPs: string[];
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      timeWindow: number;
    };
    ssl: {
      enforceHttps: boolean;
      minimumTlsVersion: string;
      hsts: boolean;
    };
  };
  monitoring: {
    logRetention: number;
    alertThresholds: {
      failedLogins: number;
      suspiciousActivities: number;
    };
    enableAudit: boolean;
  };
}

export function AdvancedSecurityConfig() {
  const [config, setConfig] = useState<SecurityConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSecurityConfig();
  }, []);

  const fetchSecurityConfig = async () => {
    try {
      const response = await fetch("/api/admin/security/config");
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error("Error fetching security config:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (updatedConfig: SecurityConfig) => {
    setSaving(true);
    try {
      await fetch("/api/admin/security/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
      });
      setConfig(updatedConfig);
    } catch (error) {
      console.error("Error saving security config:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return <div>Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">
            Configuración de Seguridad Avanzada
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona la configuración avanzada de seguridad del sistema
          </p>
        </div>
        <Button onClick={() => saveConfig(config)} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs defaultValue="authentication">
        <TabsList>
          <TabsTrigger value="authentication">Autenticación</TabsTrigger>
          <TabsTrigger value="network">Red</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoreo</TabsTrigger>
          <TabsTrigger value="advanced">Avanzado</TabsTrigger>
        </TabsList>

        <TabsContent value="authentication">
          <Card className="p-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="password-policy">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Política de Contraseñas
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <FormField
                    name="minLength"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitud Mínima</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            min={8}
                            max={32}
                          />
                        </FormControl>
                        <FormDescription>
                          Número mínimo de caracteres requeridos
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="requireUppercase"
                    control={form.control}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Requerir Mayúsculas</FormLabel>
                          <FormDescription>
                            Exigir al menos una letra mayúscula
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

                  {/* Más campos de política de contraseñas... */}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="mfa">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Autenticación de Dos Factores
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Configuración MFA */}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="session">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Gestión de Sesiones
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Configuración de sesiones */}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </TabsContent>

        <TabsContent value="network">
          <Card className="p-6">
            {/* Configuración de red */}
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card className="p-6">
            {/* Configuración de monitoreo */}
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card className="p-6">
            {/* Configuración avanzada */}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}