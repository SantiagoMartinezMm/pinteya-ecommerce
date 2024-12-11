'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { OrderSummary } from '@/types/order'
import { Card } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'

export function OrderSummaryCards() {
  const supabase = createClient()
  const [summary, setSummary] = useState<OrderSummary>({
    total_orders: 0,
    total_revenue: 0,
    average_order_value: 0,
    orders_by_status: {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // Obtener resumen de órdenes
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')

        if (error) throw error

        const summary: OrderSummary = {
          total_orders: orders.length,
          total_revenue: orders.reduce((sum, order) => sum + order.total, 0),
          average_order_value:
            orders.length > 0
              ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
              : 0,
          orders_by_status: orders.reduce(
            (acc, order) => ({
              ...acc,
              [order.status]: (acc[order.status] || 0) + 1,
            }),
            {
              pending: 0,
              processing: 0,
              shipped: 0,
              delivered: 0,
              cancelled: 0,
            }
          ),
        }

        setSummary(summary)
      } catch (error) {
        console.error('Error fetching order summary:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  if (loading) {
    return <div>Cargando resumen...</div>
  }

  const cards = [
    {
      title: 'Total de Órdenes',
      value: summary.total_orders,
      icon: Icons.shoppingCart,
    },
    {
      title: 'Ingresos Totales',
      value: `$${summary.total_revenue.toFixed(2)}`,
      icon: Icons.dollarSign,
    },
    {
      title: 'Valor Promedio',
      value: `$${summary.average_order_value.toFixed(2)}`,
      icon: Icons.trendingUp,
    },
    {
      title: 'Órdenes Pendientes',
      value: summary.orders_by_status.pending,
      icon: Icons.clock,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
