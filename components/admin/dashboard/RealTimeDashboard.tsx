"use client";

import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { useWebSocket } from '@/hooks/useWebSocket';
import { MetricsService } from '@/lib/services/metrics-service';
import { DashboardMetrics } from '@/types/dashboard';
import { z } from 'zod';
import { withErrorBoundary } from '@/components/hocs/withErrorBoundary';

const SystemHealthSchema = z.object({
  cpu: z.number().min(0).max(100),
  memory: z.number().min(0).max(100),
  disk: z.number().min(0).max(100)
});

const ResourceUsageSchema = z.array(z.object({
  timestamp: z.string(),
  cpu: z.number().min(0).max(100),
  memory: z.number().min(0).max(100),
  disk: z.number().min(0).max(100)
}));

interface SystemHealthCardProps {
  metrics: z.infer<typeof SystemHealthSchema>;
}

const SystemHealthCardBase: React.FC<SystemHealthCardProps> = ({ metrics }) => {
  const validatedMetrics = SystemHealthSchema.parse(metrics);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium mb-4">Estado del Sistema</h3>
      <div className="space-y-3">
        {Object.entries(validatedMetrics).map(([key, value]) => (
          <MetricIndicator key={key} label={key} value={value} />
        ))}
      </div>
    </Card>
  );
};

export const SystemHealthCard = withErrorBoundary(SystemHealthCardBase);

function ResourceUsageChart({ data }) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium mb-4">Uso de Recursos</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="cpu"
            stackId="1"
            stroke="#8884d8"
            fill="#8884d8"
            name="CPU"
          />
          <Area
            type="monotone"
            dataKey="memory"
            stackId="1"
            stroke="#82ca9d"
            fill="#82ca9d"
            name="Memoria"
          />
          <Area
            type="monotone"
            dataKey="disk"
            stackId="1"
            stroke="#ffc658"
            fill="#ffc658"
            name="Disco"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function UserActivityChart({ data }) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium mb-4">Actividad de Usuarios</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="activeUsers"
            stroke="#8884d8"
            name="Usuarios Activos"
          />
          <Line
            type="monotone"
            dataKey="actions"
            stroke="#82ca9d"
            name="Acciones"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function RecentEventsTable({ events }) {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-medium mb-4">Eventos Recientes</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Timestamp</th>
              <th className="text-left">Usuario</th>
              <th className="text-left">Evento</th>
              <th className="text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event, index) => (
              <tr key={index} className="border-t">
                <td className="py-2">{event.timestamp}</td>
                <td>{event.user}</td>
                <td>{event.action}</td>
                <td>
                  <Badge
                    variant={
                      event.status === "success"
                        ? "success"
                        : event.status === "warning"
                        ? "warning"
                        : "destructive"
                    }
                  >
                    {event.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}