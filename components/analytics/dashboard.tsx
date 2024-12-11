'use client'

import { useAnalytics } from '@/hooks/useAnalytics'
import { Card } from '@/components/ui/card'
import { DateRange } from '@/app/(dashboard)/analytics/page'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useState, useEffect } from 'react'

interface AnalyticsDashboardProps {
  dateRange: DateRange
}

interface MetricCard {
  title: string
  value: string | number
  description: string
  trend?: number
}

export function AnalyticsDashboard({ dateRange }: AnalyticsDashboardProps) {
  const { getMetrics, getEventsByType, loading } = useAnalytics()
  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      // Obtener métricas generales
      const data = await getMetrics(dateRange)
      
      setMetrics([
        {
          title: 'Visitas Totales',
          value: data.totalVisits,
          description: 'Total de visitas en el período seleccionado',
          trend: data.visitsTrend
        },
        {
          title: 'Tasa de Conversión',
          value: `${data.conversionRate.toFixed(2)}%`,
          description: 'Porcentaje de visitas que resultan en compras',
          trend: data.conversionTrend
        },
        {
          title: 'Valor Promedio de Orden',
          value: `$${data.averageOrderValue.toFixed(2)}`,
          description: 'Valor promedio de las órdenes',
          trend: data.aovTrend
        },
        {
          title: 'Ingresos Totales',
          value: `$${data.totalRevenue.toFixed(2)}`,
          description: 'Ingresos totales en el período',
          trend: data.revenueTrend
        }
      ])

      // Obtener datos para el gráfico
      const events = await getEventsByType(dateRange)
      setChartData(events)
    }

    fetchData()
  }, [dateRange, getMetrics, getEventsByType])

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, i) => (
          <Card key={i} className="p-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </h3>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{metric.value}</p>
                {metric.trend && (
                  <span className={`text-sm ${metric.trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {metric.trend > 0 ? '↑' : '↓'} {Math.abs(metric.trend)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-medium">Eventos por Tipo</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="page_view" stroke="#8884d8" />
              <Line type="monotone" dataKey="product_view" stroke="#82ca9d" />
              <Line type="monotone" dataKey="purchase" stroke="#ffc658" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
