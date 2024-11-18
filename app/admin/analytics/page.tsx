import { Metadata } from "next";
import { AnalyticsView } from "@/components/admin/analytics/AnalyticsView";

export const metadata: Metadata = {
  title: "Análisis | Admin",
  description: "Análisis y métricas de la tienda",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}