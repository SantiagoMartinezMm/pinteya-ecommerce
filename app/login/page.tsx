"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al iniciar sesión");
      }

      if (result.requiresTwoFactor) {
        // Manejar 2FA si está habilitado
        router.push(`/login/2fa?token=${result.tempToken}`);
        return;
      }

      // Redirigir al dashboard en caso de éxito
      router.push("/dashboard");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">PinteYa Admin</h1>
          <p className="text-muted-foreground">Accede a tu cuenta</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <input
                {...form.register("email")}
                type="email"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="admin@pinteya.com"
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Contraseña
              </label>
              <input
                {...form.register("password")}
                type="password"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
              {form.formState.errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-black py-2 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}