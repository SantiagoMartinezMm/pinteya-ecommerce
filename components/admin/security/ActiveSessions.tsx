"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Laptop, 
  Smartphone, 
  Globe, 
  AlertTriangle,
  Shield 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Session {
  id: string;
  userId: string;
  userEmail: string;
  deviceInfo: {
    type: "desktop" | "mobile" | "tablet" | "unknown";
    browser: string;
    os: string;
    ip: string;
    location?: string;
  };
  lastActivity: string;
  createdAt: string;
  suspicious: boolean;
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const res = await fetch('/api/admin/security/sessions');
    const data = await res.json();
    setSessions(data);
    setLoading(false);
  };

  const terminateSession = async (sessionId: string) => {
    await fetch(`/api/admin/security/sessions/${sessionId}`, {
      method: 'DELETE'
    });
    fetchSessions();
  };

  const terminateAllSessions = async () => {
    await fetch('/api/admin/security/sessions', {
      method: 'DELETE'
    });
    fetchSessions();
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'desktop':
        return <Laptop className="h-4 w-4" />;
      case 'mobile':
      case 'tablet':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium">Sesiones Activas</h3>
          <p className="text-sm text-muted-foreground">
            {sessions.length} sesiones activas
          </p>
        </div>
        <Button 
          variant="destructive" 
          onClick={terminateAllSessions}
          disabled={sessions.length === 0}
        >
          Terminar todas las sesiones
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Dispositivo</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Última actividad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{session.userEmail}</span>
                    <span className="text-sm text-muted-foreground">
                      {session.deviceInfo.ip}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getDeviceIcon(session.deviceInfo.type)}
                    <div className="flex flex-col">
                      <span>{session.deviceInfo.browser}</span>
                      <span className="text-sm text-muted-foreground">
                        {session.deviceInfo.os}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{session.deviceInfo.location || "Desconocida"}</TableCell>
                <TableCell>
                  {formatDistanceToNow(new Date(session.lastActivity), {
                    addSuffix: true,
                    locale: es
                  })}
                </TableCell>
                <TableCell>
                  {session.suspicious ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Sospechosa
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Segura
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => terminateSession(session.id)}
                  >
                    Terminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}