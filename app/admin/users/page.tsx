import { Metadata } from "next";
import { UsersView } from "@/components/admin/users/UsersView";

export const metadata: Metadata = {
  title: "Gestión de Usuarios | Admin",
  description: "Administración de usuarios y permisos",
};

export default function UsersPage() {
  return <UsersView />;
}