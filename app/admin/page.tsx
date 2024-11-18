import { Metadata } from "next";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "Dashboard | PinteYa Admin",
  description: "Panel de administración",
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de administración
        </p>
      </div>
      <Dashboard />
    </div>
  );
}