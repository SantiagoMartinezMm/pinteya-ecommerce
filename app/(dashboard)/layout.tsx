'use client'

import { RoleGuard } from '@/components/auth/RoleGuard'
import { DashboardNav } from '@/components/dashboard/nav'
import { usePermissions } from '@/hooks/usePermissions'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userProfile, permissions } = usePermissions()

  // Determinar los elementos de navegación basados en los permisos
  const getNavItems = () => {
    const items = [
      {
        title: 'Inicio',
        href: '/dashboard',
        icon: 'home',
      },
    ]

    if (permissions?.can_manage_products) {
      items.push({
        title: 'Productos',
        href: '/dashboard/products',
        icon: 'package',
      })
    }

    if (permissions?.can_manage_orders) {
      items.push({
        title: 'Órdenes',
        href: '/dashboard/orders',
        icon: 'shoppingCart',
      })
    }

    if (permissions?.can_view_analytics) {
      items.push({
        title: 'Análisis',
        href: '/dashboard/analytics',
        icon: 'barChart',
      })
    }

    if (permissions?.can_manage_users) {
      items.push({
        title: 'Usuarios',
        href: '/dashboard/users',
        icon: 'users',
      })
    }

    return items
  }

  return (
    <RoleGuard allowedRoles={['admin', 'vendor']}>
      <div className="flex min-h-screen flex-col space-y-6">
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="container flex h-16 items-center justify-between py-4">
            <div className="flex gap-6 md:gap-10">
              <h1 className="text-xl font-bold">PinteYa Dashboard</h1>
            </div>
          </div>
        </header>
        <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr]">
          <aside className="hidden w-[200px] flex-col md:flex">
            <DashboardNav items={getNavItems()} />
          </aside>
          <main className="flex w-full flex-1 flex-col overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  )
}
