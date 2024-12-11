"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

const securitySettingsSchema = z.object({
  maxLoginAttempts: z.number().min(1).max(10),
  sessionTimeout: z.number().min(5).max(60),
  requireTwoFactor: z.boolean(),
  passwordExpiration: z.number().min(30).max(90),
  ipWhitelist: z.string().optional(),
  allowMultipleSessions: z.boolean(),
  enforceStrongPasswords: z.boolean(),
});

export function SecuritySettings() {
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof securitySettingsSchema>>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      maxLoginAttempts: 5,
      sessionTimeout: 30,
      requireTwoFactor: false,
      passwordExpiration: 90,
      allowMultipleSessions: true,
      enforceStrongPasswords: true,
    },
  });

  const onSubmit = async (data: z.infer<typeof securitySettingsSchema>) => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/security/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Error al guardar la configuración");

      toast({
        title: "Configuración actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la configuración.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Configuración de Seguridad</h3>
          <p className="text-sm text-muted-foreground">
            Configura los parámetros de seguridad del sistema
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="maxLoginAttempts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Intentos máximos de login</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  Número de intentos antes de bloquear la cuenta
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sessionTimeout"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiempo de sesión (minutos)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormDescription>
                  Tiempo de inactividad antes de cerrar sesión
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requireTwoFactor"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Requerir autenticación de dos factores
                  </FormLabel>
                  <FormDescription>
                    Obligatorio para todos los usuarios
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

          <FormField
            control={form.control}
            name="enforceStrongPasswords"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Forzar contraseñas seguras
                  </FormLabel>
                  <FormDescription>
                    Requerir mayúsculas, números y caracteres especiales
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
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </Form>
  );
}