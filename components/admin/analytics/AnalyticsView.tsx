"use client";

import { Card } from "@/components/ui/card";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { SalesChart } from "./SalesChart";
import { MetricsGrid } from "./MetricsGrid";
import { CustomerSegments } from "./CustomerSegments";
import { ProductPerformance } from "./ProductPerformance";

export function AnalyticsView() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Análisis</h2>
          <p className="text-muted-foreground">
            Métricas y análisis de rendimiento
          </p>
        </div>
        <DateRangePicker
          onChange={(range) => {
            console.log("Fecha seleccionada:", range);
          }}
        />
      </div>

      <MetricsGrid />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Ventas</h3>
          <SalesChart />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Segmentos de Clientes</h3>
          <CustomerSegments />
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Rendimiento de Productos</h3>
        <ProductPerformance />
      </Card>
    </div>
  );
}