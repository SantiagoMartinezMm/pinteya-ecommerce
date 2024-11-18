import { Metadata } from "next";
import { LogsView } from "@/components/admin/logs/LogsView";

export const metadata: Metadata = {
  title: "Logs del Sistema | Admin",
  description: "Registro de actividades y eventos del sistema",
};

export default function LogsPage() {
  return <LogsView />;
}