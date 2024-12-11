"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  code: z.string().optional()
});

export function LoginForm() {
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState<string>();
  const [error, setError] = useState<string>();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      if (requires2FA) {
        const res = await fetch("/api/auth/verify-2fa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: data.code,
            tempToken
          })
        });
        const result = await res.json();
        
        if (!result.success) {
          setError(result.error);
          return;
        }
        
        window.location.href = "/dashboard";
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password
        })
      });

      const result = await res.json();
      
      if (result.requiresTwoFactor) {
        setRequires2FA(true);
        setTempToken(result.tempToken);
        return;
      }

      if (!result.success) {
        setError(result.error);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError("Error al intentar iniciar sesión");
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Iniciar Sesión</h1>
        <p className="text-muted-foreground">
          {requires2FA 
            ? "Ingresa el código de verificación" 
            : "Ingresa tus credenciales"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!requires2FA ? (
            <>
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código 2FA</FormLabel>
                  <FormControl>
                    <Input {...field} type="text" maxLength={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button type="submit" className="w-full">
            {requires2FA ? "Verificar" : "Iniciar Sesión"}
          </Button>
        </form>
      </Form>
    </div>
  );
}