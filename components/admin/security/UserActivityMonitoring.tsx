"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Activity,
  Users,
  Clock,
  Calendar as CalendarIcon,
  Filter,
  Download,
  AlertTriangle,
  Search,
} from "lucide-react";

interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  status: "success" | "failure" | "warning";
  details?: Record<string, any>;
}

interface ActivityMetrics {
  totalUsers: number;
  activeUsers: number;
  suspiciousActivities: number;
  activityByHour: {
    hour: number;
    count: number;
  }[];
  topActions: {
    action: string;
    count: number;
  }[];
  userStatuses: {
    status: string;
    count: number;
  }[];
}

export function UserActivityMonitoring() {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [metrics, setMetrics] = useState<ActivityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    user: "",
    action: "",
    status: "",
  });

  useEffect(() => {
    fetchActivityData();
    const interval = setInterval(fetchActivityData, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, [filters]);

  const fetchActivityData = async () => {
    try {
      const [activitiesRes, metricsRes] = await Promise.all([
        fetch("/api/admin/security/activity"),
        fetch("/api/admin/security/activity/metrics"),
      ]);

      const activitiesData = await activitiesRes.json();
      const metricsData = await metricsRes.json();

      setActivities(activitiesData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Error fetching activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return <div>Cargando actividad de usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Monitoreo de Actividad</h3>
          <p className="text-sm text-muted-foreground">
            Seguimiento de la actividad de usuarios en tiempo real
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">Usuarios Activos</p>
              <p className="text-2xl font-bold">{metrics.activeUsers}</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">Total de Usuarios</p>
              <p className="text-2xl font-bold">{metrics.totalUsers}</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">Actividades Sospechosas</p>
              <p className="text-2xl font-bold">
                {metrics.suspiciousActivities}
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">Acciones por Hora</p>
              <p className="text-2xl font-bold">
                {metrics.activityByHour.reduce(
                  (acc, curr) => acc + curr.count,
                  0
                )}
              </p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Actividad por Hora</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.activityByHour}>
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h4 className="text-sm font-medium mb-4">Acciones Principales</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.topActions}>
              <XAxis dataKey="action" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-sm font-medium">Registro de Actividad</h4>
          <Input
            placeholder="Buscar actividad..."
            className="max-w-xs"
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{activity.userName}</span>
                    <Badge
                      variant={
                        activity.status === "success"
                          ? "success"
                          : activity.status === "failure"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-sm">
                    {activity.action} - {activity.resource}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      IP: {activity.ip}
                    </div>
                  </div>
                </div>
                {activity.details && (
                  <Button variant="ghost" size="sm">
                    Ver detalles
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}