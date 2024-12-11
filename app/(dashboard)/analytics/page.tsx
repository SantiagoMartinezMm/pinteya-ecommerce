'use client'

import { useAnalytics } from '@/hooks/useAnalytics'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { AnalyticsDashboard } from '@/components/analytics/dashboard'
import { AnalyticsFilters } from '@/components/analytics/filters'
import { useState } from 'react'

export type DateRange = {
  from: Date
  to: Date
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 días
    to: new Date()
  })

  return (
    <RoleGuard requiredPermissions={['can_view_analytics']}>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">
              Visualiza las métricas y el rendimiento de tu tienda
            </p>
          </div>
          <AnalyticsFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>
        <AnalyticsDashboard dateRange={dateRange} />
      </div>
    </RoleGuard>
  )
}
