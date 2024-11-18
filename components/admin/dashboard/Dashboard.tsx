"use client";

import { Card } from "@/components/ui/card";

export function Dashboard() {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Total Usuarios</h3>
        <p className="text-2xl font-bold">0</p>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Total Productos</h3>
        <p className="text-2xl font-bold">0</p>
      </Card>
      
      <Card className="p-6">
        <h3 className="text-sm font-medium text-muted-foreground">Total Ventas</h3>
        <p className="text-2xl font-bold">$0</p>
      </Card>
    </div>
  );
}