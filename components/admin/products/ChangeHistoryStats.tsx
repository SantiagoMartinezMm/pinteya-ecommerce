"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface ChangeHistoryStatsProps {
  changes: Change[];
  timeRange?: number; // días
}

export function ChangeHistoryStats({ 
  changes,
  timeRange = 30 
}: ChangeHistoryStatsProps) {
  const [stats, setStats] = useState({
    changesByDate: [],
    changesByUser: [],
    changesByField: [],
    changesByType: [],
  });

  useEffect(() => {
    calculateStats();
  }, [changes, timeRange]);

  const calculateStats = () => {
    const startDate = startOfDay(subDays(new Date(), timeRange));
    const endDate = endOfDay(new Date());

    // Cambios por fecha
    const changesByDate = Array.from({ length: timeRange }, (_, i) => {
      const date = subDays(new Date(), i);
      const count = changes.filter(
        (change) =>
          new Date(change.timestamp) >= startOfDay(date) &&
          new Date(change.timestamp) < endOfDay(date)
      ).length;
      return {
        date: format(date, "dd/MM", { locale: es }),
        count,
      };
    }).reverse();

    // Cambios por usuario
    const userChanges = changes.reduce((acc, change) => {
      acc[change.userName] = (acc[change.userName] || 0) + 1;
      return acc;
    }, {});

    const changesByUser = Object.entries(userChanges)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Cambios por campo
    const fieldChanges = changes.reduce((acc, change) => {
      change.changes.forEach((c) => {
        acc[c.field] = (acc[c.field] || 0) + 1;
      });
      return acc;
    }, {});

    const changesByField = Object.entries(fieldChanges)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    // Tipos de cambios
    const typeChanges = changes.reduce((acc, change) => {
      change.changes.forEach((c) => {
        const type = getChangeType(c.oldValue, c.newValue);
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {});

    const changesByType = Object.entries(typeChanges)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    setStats({
      changesByDate,
      changesByUser,
      changesByField,
      changesByType,
    });
  };

  const getChangeType = (oldValue: any, newValue: any) => {
    if (oldValue === null || oldValue === undefined) return "Creación";
    if (newValue === null || newValue === undefined) return "Eliminación";
    if (typeof oldValue === "number" && typeof newValue === "number") {
      return newValue > oldValue ? "Incremento" : "Decremento";
    }
    return "Modificación";
  };

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

  return (
    <div className="space-y-6">
      {/* Gráfico de línea temporal */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Cambios en el tiempo</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.changesByDate}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Gráfico de barras por usuario */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Cambios por usuario</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.changesByUser}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Gráfico circular por campo */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Cambios por campo</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.changesByField}
                  dataKey="count"
                  nameKey="field"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {stats.changesByField.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Resumen de estadísticas */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Resumen de cambios</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              title: "Total de cambios",
              value: changes.length,
            },
            {
              title: "Usuarios únicos",
              value: stats.changesByUser.length,
            },
            {
              title: "Campos modificados",
              value: stats.changesByField.length,
            },
            {
              title: "Promedio diario",
              value: (
                changes.length / timeRange
              ).toFixed(1),
            },
          ].map((stat, index) => (
            <Card key={index} className="p-4">
              <p className="text-sm text-muted-foreground">{stat.title}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}