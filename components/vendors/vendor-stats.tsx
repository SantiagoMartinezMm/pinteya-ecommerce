'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { VendorStats as VendorStatsType } from '@/types/vendor'
import { Card } from '@/components/ui/card'
import { Icons } from '@/components/ui/icons'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function VendorStats() {
  const supabase = createClient()
  const [stats, setStats] = useState<VendorStatsType>({
    total_products: 0,
    active_products: 0,
    total_orders: 0,
    total_revenue: 0,
    commission_earned: 0,
    average_rating: 0,
    sales_by_month: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // En un caso real, esto vendría de una vista materializada o una función en la base de datos
        const { data: vendors, error } = await supabase
          .from('vendor_profiles')
          .select('*')

        if (error) throw error

        // Calcular estadísticas
        const totalVendors = vendors.length
        const activeVendors = vendors.filter(v => v.status === 'active').length
        const totalRevenue = vendors.reduce((sum, v) => sum + v.total_sales, 0)
        const avgRating = vendors.reduce((sum, v) => sum + v.rating, 0) / totalVendors

        setStats({
          total_products: 0, // Esto vendría de una consulta a productos
          active_products: 0,
          total_orders: 0, // Esto vendría de una consulta a órdenes
          total_revenue: totalRevenue,
          commission_earned: totalRevenue * 0.1, // Ejemplo: 10% de comisión
          average_rating: avgRating,
          sales_by_month: [], // Esto vendría de una consulta agregada por mes
        })
      } catch (error) {
        console.error('Error fetching vendor stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div>Cargando estadísticas...</div>
  }

  const cards = [
    {
      title: 'Vendedores Activos',
      value: stats.active_products,
      icon: Icons.users,
    },
    {
      title: 'Ingresos Totales',
      value: `$${stats.total_revenue.toFixed(2)}`,
      icon: Icons.dollarSign,
    },
    {
      title: 'Comisiones Ganadas',
      value: `$${stats.commission_earned.toFixed(2)}`,
      icon: Icons.percent,
    },
    {
      title: 'Calificación Promedio',
      value: stats.average_rating.toFixed(1),
      icon: Icons.star,
    },
  ]

  return (
    <div className="space-y-8">
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

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">Ventas por Mes</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.sales_by_month}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#8884d8"
                name="Ventas"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#82ca9d"
                name="Ingresos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
