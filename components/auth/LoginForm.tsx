"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const redirectToAdmin = () => {
    try {
      console.log("Intentando redirección a /admin...");
      window.location.replace("/admin");
    } catch (e) {
      console.error("Error en redirección:", e);
      // Fallback
      window.location.href = "/admin";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus("Iniciando login...");
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      setStatus(`Respuesta: ${JSON.stringify(data)}`);

      if (response.ok) {
        setStatus("Login exitoso, redirigiendo...");
        // Esperar un momento antes de redirigir
        setTimeout(() => {
          setStatus("Ejecutando redirección...");
          redirectToAdmin();
        }, 1000);
      } else {
        setError(data.error || "Error al iniciar sesión");
        setStatus("Error en login");
      }
    } catch (err) {
      console.error("Error:", err);
      setError("Error al conectar con el servidor");
      setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {status && (
        <div className="p-3 text-sm bg-blue-50 text-blue-600 rounded mb-4">
          {status}
        </div>
      )}
      
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          disabled={isLoading}
          required
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          disabled={isLoading}
          required
        />
        <Button 
          type="submit" 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
        
        <Button
          type="button"
          onClick={redirectToAdmin}
          className="w-full"
          variant="outline"
        >
          Ir a Admin (Debug)
        </Button>
      </div>
    </form>
  );
}