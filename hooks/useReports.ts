import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit } from './useAudit'

export type ReportType = 
  | 'sales'
  | 'inventory'
  | 'customers'
  | 'products'
  | 'performance'
  | 'marketing'

export type TimeFrame = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom'

export type ExportFormat = 'csv' | 'xlsx' | 'pdf'

// Interfaces para el reporte de ventas
export interface CategorySales {
  category_id: string
  category_name: string
  total: number
  percentage: number
}

export interface PaymentMethodSales {
  method: string
  total: number
  percentage: number
}

export interface SalesTrend {
  date: string
  total: number
  orders: number
}

export interface SalesReport {
  total_sales: number
  total_orders: number
  average_order_value: number
  total_tax: number
  total_shipping: number
  total_discounts: number
  net_sales: number
  sales_by_category: CategorySales[]
  sales_by_payment_method: PaymentMethodSales[]
  sales_trend: SalesTrend[]
}

// Interfaces para el reporte de inventario
export interface InventoryReport {
  total_products: number
  total_value: number
  low_stock_items: number
  out_of_stock_items: number
  inventory_value_by_category: Array<{
    category_id: string
    category_name: string
    value: number
    percentage: number
  }>
  top_selling_products: Array<{
    product_id: string
    product_name: string
    quantity_sold: number
    revenue: number
  }>
  slow_moving_products: Array<{
    product_id: string
    product_name: string
    days_in_stock: number
    quantity: number
    value: number
  }>
}

// Interfaces para el reporte de clientes
export interface CustomerReport {
  total_customers: number
  new_customers: number
  active_customers: number
  customer_segments: Array<{
    segment: string
    count: number
    percentage: number
  }>
  average_customer_value: number
  customer_retention_rate: number
  top_customers: Array<{
    customer_id: string
    name: string
    total_orders: number
    total_spent: number
  }>
  customer_acquisition_trend: Array<{
    date: string
    new_customers: number
    total_customers: number
  }>
}

// Interfaces para el reporte de rendimiento
export interface PerformanceReport {
  conversion_rate: number
  cart_abandonment_rate: number
  average_session_duration: number
  page_views: number
  bounce_rate: number
  top_landing_pages: Array<{
    path: string
    views: number
    conversion_rate: number
  }>
  device_distribution: Array<{
    device: string
    sessions: number
    percentage: number
  }>
  performance_metrics: {
    ttfb: number
    fcp: number
    lcp: number
    fid: number
    cls: number
  }
}

// Interfaces para el reporte de marketing
export interface MarketingReport {
  promotion_performance: Array<{
    promotion_id: string
    name: string
    redemptions: number
    revenue_impact: number
    average_discount: number
  }>
  referral_sources: Array<{
    source: string
    visits: number
    conversions: number
    revenue: number
  }>
  email_campaigns: Array<{
    campaign_id: string
    name: string
    sent: number
    opened: number
    clicked: number
    conversions: number
  }>
  search_analytics: {
    total_searches: number
    unique_searches: number
    top_search_terms: Array<{
      term: string
      searches: number
      conversions: number
    }>
    zero_results_searches: Array<{
      term: string
      count: number
    }>
  }
}

export interface ReportFilters {
  timeFrame: TimeFrame
  startDate?: string
  endDate?: string
  categories?: string[]
  products?: string[]
  customerSegments?: string[]
}

export interface TimeFrameDates {
  startDate: Date
  endDate: Date
}

export function useReports() {
  const supabase = createClient()
  const { user } = useAuth()
  const { logAction } = useAudit()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getTimeFrameDates = useCallback((
    timeFrame: TimeFrame,
    startDate?: string,
    endDate?: string
  ): TimeFrameDates => {
    const now = new Date()
    const start = new Date()
    const end = new Date()

    switch (timeFrame) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'yesterday':
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case 'this_week':
        start.setDate(start.getDate() - start.getDay())
        start.setHours(0, 0, 0, 0)
        break
      case 'last_week':
        start.setDate(start.getDate() - start.getDay() - 7)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - end.getDay() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case 'this_month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        break
      case 'last_month':
        start.setMonth(start.getMonth() - 1)
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
        break
      case 'this_year':
        start.setMonth(0, 1)
        start.setHours(0, 0, 0, 0)
        break
      case 'last_year':
        start.setFullYear(start.getFullYear() - 1, 0, 1)
        start.setHours(0, 0, 0, 0)
        end.setFullYear(end.getFullYear() - 1, 11, 31)
        end.setHours(23, 59, 59, 999)
        break
      case 'custom':
        if (startDate && endDate) {
          return {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
          }
        }
        break
    }

    return { startDate: start, endDate: end }
  }, [])

  const getSalesReport = useCallback(async (filters: ReportFilters): Promise<SalesReport | null> => {
    try {
      setLoading(true)
      setError(null)

      const { startDate, endDate } = getTimeFrameDates(filters.timeFrame, filters.startDate, filters.endDate)

      const { data: sales, error: salesError } = await supabase.rpc('get_sales_report', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_categories: filters.categories,
        p_products: filters.products
      })

      if (salesError) throw salesError

      await logAction(
        'report.sales' as any,
        'report',
        {
          time_frame: filters.timeFrame,
          start_date: startDate,
          end_date: endDate,
          filters
        }
      )

      return sales as SalesReport

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [getTimeFrameDates, logAction])

  const getInventoryReport = useCallback(async (filters: ReportFilters): Promise<InventoryReport | null> => {
    try {
      setLoading(true)
      setError(null)

      const { data: inventory, error: inventoryError } = await supabase.rpc('get_inventory_report', {
        p_categories: filters.categories,
        p_products: filters.products
      })

      if (inventoryError) throw inventoryError

      await logAction(
        'report.inventory' as any,
        'report',
        { filters }
      )

      return inventory as InventoryReport

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const getCustomerReport = useCallback(async (filters: ReportFilters): Promise<CustomerReport | null> => {
    try {
      setLoading(true)
      setError(null)

      const { startDate, endDate } = getTimeFrameDates(filters.timeFrame, filters.startDate, filters.endDate)

      const { data: customers, error: customersError } = await supabase.rpc('get_customer_report', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString(),
        p_segments: filters.customerSegments
      })

      if (customersError) throw customersError

      await logAction(
        'report.customers' as any,
        'report',
        {
          time_frame: filters.timeFrame,
          start_date: startDate,
          end_date: endDate,
          segments: filters.customerSegments
        }
      )

      return customers as CustomerReport

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [getTimeFrameDates, logAction])

  const getPerformanceReport = useCallback(async (filters: ReportFilters): Promise<PerformanceReport | null> => {
    try {
      setLoading(true)
      setError(null)

      const { startDate, endDate } = getTimeFrameDates(filters.timeFrame, filters.startDate, filters.endDate)

      const { data: performance, error: performanceError } = await supabase.rpc('get_performance_report', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

      if (performanceError) throw performanceError

      await logAction(
        'report.performance' as any,
        'report',
        {
          time_frame: filters.timeFrame,
          start_date: startDate,
          end_date: endDate
        }
      )

      return performance as PerformanceReport

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [getTimeFrameDates, logAction])

  const getMarketingReport = useCallback(async (filters: ReportFilters): Promise<MarketingReport | null> => {
    try {
      setLoading(true)
      setError(null)

      const { startDate, endDate } = getTimeFrameDates(filters.timeFrame, filters.startDate, filters.endDate)

      const { data: marketing, error: marketingError } = await supabase.rpc('get_marketing_report', {
        p_start_date: startDate.toISOString(),
        p_end_date: endDate.toISOString()
      })

      if (marketingError) throw marketingError

      await logAction(
        'report.marketing' as any,
        'report',
        {
          time_frame: filters.timeFrame,
          start_date: startDate,
          end_date: endDate
        }
      )

      return marketing as MarketingReport

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [getTimeFrameDates, logAction])

  const exportReport = useCallback(async (
    reportType: ReportType,
    filters: ReportFilters,
    format: ExportFormat
  ): Promise<Blob | null> => {
    try {
      setLoading(true)
      setError(null)

      let reportData: unknown = null

      switch (reportType) {
        case 'sales':
          reportData = await getSalesReport(filters)
          break
        case 'inventory':
          reportData = await getInventoryReport(filters)
          break
        case 'customers':
          reportData = await getCustomerReport(filters)
          break
        case 'performance':
          reportData = await getPerformanceReport(filters)
          break
        case 'marketing':
          reportData = await getMarketingReport(filters)
          break
      }

      if (!reportData) throw new Error('Error al generar el reporte')

      await logAction(
        'report.export' as any,
        'report',
        {
          report_type: reportType,
          format,
          filters
        }
      )

      // TODO: Implementar la conversión al formato solicitado
      return new Blob([JSON.stringify(reportData)], { type: 'application/json' })

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [
    getSalesReport,
    getInventoryReport,
    getCustomerReport,
    getPerformanceReport,
    getMarketingReport,
    logAction
  ])

  return {
    loading,
    error,
    getSalesReport,
    getInventoryReport,
    getCustomerReport,
    getPerformanceReport,
    getMarketingReport,
    exportReport
  }
}
