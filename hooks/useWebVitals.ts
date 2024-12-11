import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const webVitalMetricSchema = z.object({
  id: z.string().uuid(),
  name: z.enum([
    'FCP',    // First Contentful Paint
    'LCP',    // Largest Contentful Paint
    'FID',    // First Input Delay
    'CLS',    // Cumulative Layout Shift
    'TTFB',   // Time to First Byte
    'INP',    // Interaction to Next Paint
    'TBT'     // Total Blocking Time
  ]),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  path: z.string(),
  user_agent: z.string(),
  device_type: z.enum(['mobile', 'tablet', 'desktop']),
  connection_type: z.string().optional(),
  timestamp: z.string().datetime(),
  navigation_type: z.enum(['navigate', 'reload', 'back_forward', 'prerender']).optional()
})

const webVitalThresholdSchema = z.object({
  metric: webVitalMetricSchema.shape.name,
  good: z.number(),
  poor: z.number()
})

const webVitalReportSchema = z.object({
  id: z.string().uuid(),
  path: z.string(),
  date: z.string().datetime(),
  metrics: z.record(z.object({
    median: z.number(),
    p75: z.number(),
    p95: z.number(),
    samples: z.number()
  })),
  device_breakdown: z.record(z.number()),
  connection_breakdown: z.record(z.number()).optional()
})

export type WebVitalMetric = z.infer<typeof webVitalMetricSchema>
export type WebVitalThreshold = z.infer<typeof webVitalThresholdSchema>
export type WebVitalReport = z.infer<typeof webVitalReportSchema>

export interface WebVitalsError extends BaseError {
  code: 'WEB_VITALS_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    metric_id?: string
    path?: string
    originalError?: unknown
  }
}

export interface WebVitalsHookReturn {
  metrics: WebVitalMetric[]
  thresholds: WebVitalThreshold[]
  reports: WebVitalReport[]
  isLoading: boolean
  reportWebVital: (metric: Omit<WebVitalMetric, 'id' | 'timestamp' | 'rating'>) => Promise<WebVitalMetric>
  getMetrics: (path: string) => Promise<WebVitalMetric[]>
  getReport: (path: string, startDate: Date, endDate: Date) => Promise<WebVitalReport>
  generateReport: (path: string, startDate: Date, endDate: Date) => Promise<WebVitalReport>
  updateThreshold: (metric: WebVitalThreshold['metric'], updates: Partial<WebVitalThreshold>) => Promise<WebVitalThreshold>
  analyzePerformance: (path: string) => Promise<{
    score: number
    recommendations: string[]
  }>
  getMetricRating: (name: WebVitalMetric['name'], value: number) => WebVitalMetric['rating']
  trackWebVitals: (path: string) => () => void
  exportMetrics: (format: 'csv' | 'json') => Promise<string>
  clearMetrics: (olderThan: Date) => Promise<void>
}

const DEFAULT_THRESHOLDS: WebVitalThreshold[] = [
  { metric: 'LCP', good: 2500, poor: 4000 },
  { metric: 'FID', good: 100, poor: 300 },
  { metric: 'CLS', good: 0.1, poor: 0.25 },
  { metric: 'FCP', good: 1800, poor: 3000 },
  { metric: 'TTFB', good: 800, poor: 1800 },
  { metric: 'INP', good: 200, poor: 500 },
  { metric: 'TBT', good: 200, poor: 600 }
]

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

export function useWebVitals(): WebVitalsHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()
  const [observers, setObservers] = useState<PerformanceObserver[]>([])

  // Cache para métricas y reportes
  const {
    data: webVitalsState,
    setData: setWebVitalsState
  } = useCache<{
    metrics: WebVitalMetric[]
    thresholds: WebVitalThreshold[]
    reports: WebVitalReport[]
  }>({
    key: 'web-vitals-state',
    ttl: CACHE_TTL,
    initialData: {
      metrics: [],
      thresholds: DEFAULT_THRESHOLDS,
      reports: []
    }
  })

  const handleWebVitalsError = (
    error: unknown,
    type: WebVitalsError['details']['type'],
    details?: Omit<WebVitalsError['details'], 'type' | 'originalError'>
  ): never => {
    throw new BaseError('Error en Web Vitals', {
      code: 'WEB_VITALS_ERROR',
      details: {
        type,
        ...details,
        originalError: error
      }
    })
  }

  // Obtener calificación de métrica
  const getMetricRating = useCallback((
    name: WebVitalMetric['name'],
    value: number
  ): WebVitalMetric['rating'] => {
    const threshold = webVitalsState?.thresholds.find(t => t.metric === name)
    if (!threshold) return 'needs-improvement'

    if (value <= threshold.good) return 'good'
    if (value >= threshold.poor) return 'poor'
    return 'needs-improvement'
  }, [webVitalsState?.thresholds])

  // Reportar métrica
  const reportWebVital = useCallback(async (
    metric: Omit<WebVitalMetric, 'id' | 'timestamp' | 'rating'>
  ): Promise<WebVitalMetric> => {
    try {
      startLoading()

      const rating = getMetricRating(metric.name, metric.value)
      const timestamp = new Date().toISOString()

      const { data: newMetric, error } = await executeWithRetry(() =>
        supabase
          .from('web_vitals')
          .insert({
            ...metric,
            rating,
            timestamp
          })
          .select()
          .single()
      )

      if (error) {
        handleWebVitalsError(error, 'SERVER_ERROR')
      }

      setWebVitalsState(prev => ({
        ...prev,
        metrics: [...prev.metrics, newMetric]
      }))

      return newMetric
    } catch (err) {
      throw new BaseError('Error al reportar métrica', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, getMetricRating, startLoading, stopLoading])

  // Obtener métricas
  const getMetrics = useCallback(async (path: string): Promise<WebVitalMetric[]> => {
    try {
      startLoading()

      const { data: metrics, error } = await executeWithRetry(() =>
        supabase
          .from('web_vitals')
          .select()
          .eq('path', path)
          .order('timestamp', { ascending: false })
      )

      if (error) {
        handleWebVitalsError(error, 'SERVER_ERROR', { path })
      }

      return metrics
    } catch (err) {
      throw new BaseError('Error al obtener métricas', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener reporte
  const getReport = useCallback(async (
    path: string,
    startDate: Date,
    endDate: Date
  ): Promise<WebVitalReport> => {
    try {
      startLoading()

      const { data: report, error } = await executeWithRetry(() =>
        supabase
          .from('web_vitals_reports')
          .select()
          .eq('path', path)
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString())
          .single()
      )

      if (error) {
        handleWebVitalsError(error, 'NOT_FOUND', { path })
      }

      return report
    } catch (err) {
      throw new BaseError('Error al obtener reporte', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Generar reporte
  const generateReport = useCallback(async (
    path: string,
    startDate: Date,
    endDate: Date
  ): Promise<WebVitalReport> => {
    try {
      startLoading()

      const metrics = await getMetrics(path)
      const filteredMetrics = metrics.filter(m => {
        const date = new Date(m.timestamp)
        return date >= startDate && date <= endDate
      })

      const metricsByName = filteredMetrics.reduce((acc, metric) => {
        if (!acc[metric.name]) acc[metric.name] = []
        acc[metric.name].push(metric.value)
        return acc
      }, {} as Record<WebVitalMetric['name'], number[]>)

      const report: Omit<WebVitalReport, 'id'> = {
        path,
        date: new Date().toISOString(),
        metrics: {},
        device_breakdown: {},
        connection_breakdown: {}
      }

      // Calcular estadísticas para cada métrica
      Object.entries(metricsByName).forEach(([name, values]) => {
        const sorted = values.sort((a, b) => a - b)
        const len = sorted.length
        report.metrics[name] = {
          median: sorted[Math.floor(len / 2)],
          p75: sorted[Math.floor(len * 0.75)],
          p95: sorted[Math.floor(len * 0.95)],
          samples: len
        }
      })

      // Calcular distribución por dispositivo
      const deviceCounts = filteredMetrics.reduce((acc, metric) => {
        acc[metric.device_type] = (acc[metric.device_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const totalDevices = Object.values(deviceCounts).reduce((a, b) => a + b, 0)
      report.device_breakdown = Object.entries(deviceCounts).reduce((acc, [device, count]) => {
        acc[device] = count / totalDevices
        return acc
      }, {} as Record<string, number>)

      // Calcular distribución por tipo de conexión
      const connectionMetrics = filteredMetrics.filter(m => m.connection_type)
      if (connectionMetrics.length > 0) {
        const connectionCounts = connectionMetrics.reduce((acc, metric) => {
          if (metric.connection_type) {
            acc[metric.connection_type] = (acc[metric.connection_type] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)

        const totalConnections = Object.values(connectionCounts).reduce((a, b) => a + b, 0)
        report.connection_breakdown = Object.entries(connectionCounts).reduce((acc, [conn, count]) => {
          acc[conn] = count / totalConnections
          return acc
        }, {} as Record<string, number>)
      }

      const { data: savedReport, error } = await executeWithRetry(() =>
        supabase
          .from('web_vitals_reports')
          .insert(report)
          .select()
          .single()
      )

      if (error) {
        handleWebVitalsError(error, 'SERVER_ERROR', { path })
      }

      setWebVitalsState(prev => ({
        ...prev,
        reports: [...prev.reports, savedReport]
      }))

      return savedReport
    } catch (err) {
      throw new BaseError('Error al generar reporte', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, getMetrics, startLoading, stopLoading])

  // Actualizar umbral
  const updateThreshold = useCallback(async (
    metric: WebVitalThreshold['metric'],
    updates: Partial<WebVitalThreshold>
  ): Promise<WebVitalThreshold> => {
    if (!user) {
      handleWebVitalsError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: threshold, error } = await executeWithRetry(() =>
        supabase
          .from('web_vitals_thresholds')
          .update(updates)
          .eq('metric', metric)
          .select()
          .single()
      )

      if (error) {
        handleWebVitalsError(error, 'SERVER_ERROR')
      }

      setWebVitalsState(prev => ({
        ...prev,
        thresholds: prev.thresholds.map(t => t.metric === metric ? threshold : t)
      }))

      return threshold
    } catch (err) {
      throw new BaseError('Error al actualizar umbral', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Analizar rendimiento
  const analyzePerformance = useCallback(async (path: string): Promise<{
    score: number
    recommendations: string[]
  }> => {
    try {
      const metrics = await getMetrics(path)
      const recommendations: string[] = []
      let totalScore = 0
      let metricCount = 0

      // Analizar cada métrica
      metrics.forEach(metric => {
        const threshold = webVitalsState?.thresholds.find(t => t.metric === metric.name)
        if (!threshold) return

        let score = 0
        if (metric.rating === 'good') score = 1
        else if (metric.rating === 'needs-improvement') score = 0.5

        totalScore += score
        metricCount++

        // Generar recomendaciones basadas en métricas pobres
        if (metric.rating === 'poor') {
          switch (metric.name) {
            case 'LCP':
              recommendations.push('Optimizar imágenes y recursos principales')
              recommendations.push('Implementar lazy loading para contenido no crítico')
              break
            case 'FID':
              recommendations.push('Reducir tiempo de ejecución de JavaScript')
              recommendations.push('Dividir tareas largas en chunks más pequeños')
              break
            case 'CLS':
              recommendations.push('Reservar espacio para elementos dinámicos')
              recommendations.push('Precargar recursos críticos')
              break
            case 'FCP':
              recommendations.push('Optimizar critical rendering path')
              recommendations.push('Reducir tiempo de bloqueo de CSS')
              break
            case 'TTFB':
              recommendations.push('Optimizar servidor y base de datos')
              recommendations.push('Implementar caching efectivo')
              break
            case 'INP':
              recommendations.push('Optimizar manejadores de eventos')
              recommendations.push('Reducir complejidad de actualizaciones del DOM')
              break
            case 'TBT':
              recommendations.push('Minimizar JavaScript no esencial')
              recommendations.push('Implementar code splitting')
              break
          }
        }
      })

      const finalScore = metricCount > 0 ? (totalScore / metricCount) * 100 : 0
      return {
        score: Math.round(finalScore),
        recommendations: [...new Set(recommendations)] // Eliminar duplicados
      }
    } catch (err) {
      throw new BaseError('Error al analizar rendimiento', { cause: err })
    }
  }, [getMetrics, webVitalsState?.thresholds])

  // Rastrear Web Vitals
  const trackWebVitals = useCallback((path: string): () => void => {
    const newObservers: PerformanceObserver[] = []

    // Rastrear FCP
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            reportWebVital({
              name: 'FCP',
              value: entry.startTime,
              path,
              user_agent: navigator.userAgent,
              device_type: getDeviceType(),
              connection_type: (navigator as any).connection?.effectiveType
            })
          }
        })
      })
      fcpObserver.observe({ entryTypes: ['paint'] })
      newObservers.push(fcpObserver)
    } catch (e) {
      console.warn('FCP no soportado:', e)
    }

    // Rastrear LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          reportWebVital({
            name: 'LCP',
            value: entry.startTime,
            path,
            user_agent: navigator.userAgent,
            device_type: getDeviceType(),
            connection_type: (navigator as any).connection?.effectiveType
          })
        })
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      newObservers.push(lcpObserver)
    } catch (e) {
      console.warn('LCP no soportado:', e)
    }

    // Rastrear FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.name === 'first-input') {
            reportWebVital({
              name: 'FID',
              value: entry.processingStart - entry.startTime,
              path,
              user_agent: navigator.userAgent,
              device_type: getDeviceType(),
              connection_type: (navigator as any).connection?.effectiveType
            })
          }
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
      newObservers.push(fidObserver)
    } catch (e) {
      console.warn('FID no soportado:', e)
    }

    // Rastrear CLS
    try {
      let clsValue = 0
      let clsEntries: PerformanceEntry[] = []

      const clsObserver = new PerformanceObserver((list) => {
        clsEntries = clsEntries.concat(list.getEntries() as PerformanceEntry[])
        
        let sessionValue = 0
        let sessionEntries: PerformanceEntry[] = []
        let previousValue = 0

        clsEntries.forEach(entry => {
          if (!sessionEntries.length || entry.startTime - sessionEntries[sessionEntries.length - 1].startTime < 1000) {
            sessionEntries.push(entry)
            sessionValue += (entry as any).value
          } else {
            if (sessionValue > previousValue) {
              previousValue = sessionValue
              clsValue = sessionValue
            }
            sessionValue = (entry as any).value
            sessionEntries = [entry]
          }
        })

        if (sessionValue > previousValue) {
          clsValue = sessionValue
        }

        reportWebVital({
          name: 'CLS',
          value: clsValue,
          path,
          user_agent: navigator.userAgent,
          device_type: getDeviceType(),
          connection_type: (navigator as any).connection?.effectiveType
        })
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
      newObservers.push(clsObserver)
    } catch (e) {
      console.warn('CLS no soportado:', e)
    }

    // Rastrear TTFB
    try {
      const ttfbObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name === location.href) {
            const ttfb = entry.responseStart - entry.requestStart
            reportWebVital({
              name: 'TTFB',
              value: ttfb,
              path,
              user_agent: navigator.userAgent,
              device_type: getDeviceType(),
              connection_type: (navigator as any).connection?.effectiveType
            })
          }
        })
      })
      ttfbObserver.observe({ entryTypes: ['navigation'] })
      newObservers.push(ttfbObserver)
    } catch (e) {
      console.warn('TTFB no soportado:', e)
    }

    setObservers(prev => [...prev, ...newObservers])

    // Función de limpieza
    return () => {
      newObservers.forEach(observer => observer.disconnect())
      setObservers(prev => prev.filter(obs => !newObservers.includes(obs)))
    }
  }, [reportWebVital])

  // Exportar métricas
  const exportMetrics = useCallback(async (format: 'csv' | 'json'): Promise<string> => {
    try {
      const metrics = webVitalsState?.metrics || []

      if (format === 'json') {
        return JSON.stringify(metrics, null, 2)
      }

      // Formato CSV
      const headers = ['name', 'value', 'rating', 'path', 'device_type', 'timestamp']
      const rows = metrics.map(metric => 
        headers.map(header => (metric as any)[header]).join(',')
      )

      return [headers.join(','), ...rows].join('\n')
    } catch (err) {
      throw new BaseError('Error al exportar métricas', { cause: err })
    }
  }, [webVitalsState?.metrics])

  // Limpiar métricas antiguas
  const clearMetrics = useCallback(async (olderThan: Date): Promise<void> => {
    if (!user) {
      handleWebVitalsError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('web_vitals')
          .delete()
          .lt('timestamp', olderThan.toISOString())
      )

      if (error) {
        handleWebVitalsError(error, 'SERVER_ERROR')
      }

      setWebVitalsState(prev => ({
        ...prev,
        metrics: prev.metrics.filter(m => new Date(m.timestamp) >= olderThan)
      }))
    } catch (err) {
      throw new BaseError('Error al limpiar métricas', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Función auxiliar para determinar tipo de dispositivo
  const getDeviceType = (): WebVitalMetric['device_type'] => {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  // Limpiar observadores al desmontar
  useEffect(() => {
    return () => {
      observers.forEach(observer => observer.disconnect())
    }
  }, [observers])

  return {
    metrics: webVitalsState?.metrics || [],
    thresholds: webVitalsState?.thresholds || DEFAULT_THRESHOLDS,
    reports: webVitalsState?.reports || [],
    isLoading,
    reportWebVital,
    getMetrics,
    getReport,
    generateReport,
    updateThreshold,
    analyzePerformance,
    getMetricRating,
    trackWebVitals,
    exportMetrics,
    clearMetrics
  }
} 