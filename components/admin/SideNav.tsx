import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  BarChart,
  FileText,
  Settings,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Productos",
    href: "/admin/products",
    icon: ShoppingBag,
  },
  {
    title: "Usuarios",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Análisis",
    href: "/admin/analytics",
    icon: BarChart,
  },
  {
    title: "Logs",
    href: "/admin/logs",
    icon: FileText,
  },
  {
    title: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 border-r bg-white h-screen">
      <div className="p-6">
        <Link href="/admin" className="flex items-center space-x-2">
          <span className="text-xl font-bold">PinteYa Admin</span>
        </Link>
      </div>
      <div className="space-y-1 px-3">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
                ${isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
                }
              `}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}