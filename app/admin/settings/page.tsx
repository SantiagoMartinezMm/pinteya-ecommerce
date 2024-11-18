import { Metadata } from "next";
import { SettingsView } from "@/components/admin/settings/SettingsView";

export const metadata: Metadata = {
  title: "Configuración | Admin",
  description: "Configuración general del sistema",
};

export default function SettingsPage() {
  return <SettingsView />;
}