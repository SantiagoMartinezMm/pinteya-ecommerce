'use client'

import { useState } from 'react'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { OrderList } from '@/components/orders/order-list'
import { OrderFilters } from '@/components/orders/order-filters'
import { OrderSummaryCards } from '@/components/orders/order-summary-cards'
import { OrderStatus, PaymentStatus } from '@/types/order'

interface OrderFilters {
  search: string
  status: OrderStatus | ''
  paymentStatus: PaymentStatus | ''
  dateRange: {
    from: Date | null
    to: Date | null
  }
}

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: '',
    paymentStatus: '',
    dateRange: {
      from: null,
      to: null,
    },
  })

  return (
    <RoleGuard requiredPermissions={['can_manage_orders']}>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Órdenes</h2>
          <p className="text-muted-foreground">
            Gestiona y da seguimiento a los pedidos de tu tienda
          </p>
        </div>

        <OrderSummaryCards />
        <OrderFilters filters={filters} onFiltersChange={setFilters} />
        <OrderList filters={filters} />
      </div>
    </RoleGuard>
  )
}
