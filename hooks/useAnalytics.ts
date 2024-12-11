import { useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'
import debounce from 'lodash/debounce'

// Esquemas de validación
const eventSchema = z.object({
  name: z.string(),
  category: z.enum([
    'page_view',
    'product',
    'cart',
    'checkout',
    'search',
    'user',
    'wishlist',
    'review'
  ]),
  properties: z.record(z.unknown()).optional(),
  value: z.number().optional(),
  timestamp: z.string().datetime()
})

const sessionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime().optional(),
  device: z.object({
    type: z.string(),
    os: z.string(),
    browser: z.string()
  }),
  referrer: z.string().optional(),
  utm: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional()
  }).optional()
})

export type AnalyticsEvent = z.infer<typeof eventSchema>
export type AnalyticsSession = z.infer<typeof sessionSchema>

export interface AnalyticsError extends BaseError {
  code: 'ANALYTICS_ERROR'
  details: {
    type: 'TRACKING' | 'SESSION' | 'BATCH' | 'SERVER_ERROR'
    originalError?: unknown
  }
}

export interface EventBatch {
  events: AnalyticsEvent[]
  pendingCount: number
  lastSync: string
}

export interface AnalyticsHookReturn {
  trackEvent: (name: string, category: AnalyticsEvent['category'], data?: Partial<AnalyticsEvent>) => void
  trackPageView: (path: string, properties?: Record<string, unknown>) => void
  startSession: () => void
  endSession: () => void
  isLoading: boolean
}

const BATCH_SIZE = 50
const SYNC_INTERVAL = 1000 * 60 // 1 minuto
const SESSION_TIMEOUT = 1000 * 60 * 30 // 30 minutos

export function useAnalytics(): AnalyticsHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 3,
    delay: 1000
  })

  // Referencias para batch y sesión
  const batchRef = useRef<EventBatch>({
    events: [],
    pendingCount: 0,
    lastSync: new Date().toISOString()
  })
  const sessionRef = useRef<AnalyticsSession | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout>()

  // Cache para configuración
  const { data: config } = useCache<{
    sampling_rate: number
    enabled_categories: AnalyticsEvent['category'][]
  }>({
    key: 'analytics-config',
    ttl: 1000 * 60 * 60 // 1 hora
  })

  const handleAnalyticsError = (
    error: unknown,
    type: AnalyticsError['details']['type']
  ): void => {
    console.error(new BaseError('Error en analytics', {
      code: 'ANALYTICS_ERROR',
      details: {
        type,
        originalError: error
      }
    }))
  }

  // Detectar información del dispositivo
  const getDeviceInfo = useCallback(() => {
    const ua = navigator.userAgent
    return {
      type: /mobile/i.test(ua) ? 'mobile' : 'desktop',
      os: /(android|ios)/i.test(ua) ? 'mobile' : 'desktop',
      browser: /chrome/i.test(ua) ? 'chrome' : 
               /firefox/i.test(ua) ? 'firefox' : 
               /safari/i.test(ua) ? 'safari' : 'other'
    }
  }, [])

  // Iniciar sesión
  const startSession = useCallback(() => {
    const session: AnalyticsSession = {
      id: crypto.randomUUID(),
      user_id: user?.id,
      start_time: new Date().toISOString(),
      device: getDeviceInfo(),
      referrer: document.referrer,
      utm: {
        source: new URLSearchParams(window.location.search).get('utm_source') || undefined,
        medium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
        campaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined
      }
    }

    sessionRef.current = sessionSchema.parse(session)
    
    // Registrar inicio de sesión
    void executeWithRetry(async () => {
      const { error } = await supabase
        .from('analytics_sessions')
        .insert([session])

      if (error) {
        handleAnalyticsError(error, 'SESSION')
      }
    })
  }, [user?.id, executeWithRetry])

  // Finalizar sesión
  const endSession = useCallback(() => {
    if (!sessionRef.current?.id) return

    const session = {
      ...sessionRef.current,
      end_time: new Date().toISOString()
    }

    void executeWithRetry(async () => {
      const { error } = await supabase
        .from('analytics_sessions')
        .update({ end_time: session.end_time })
        .eq('id', session.id)

      if (error) {
        handleAnalyticsError(error, 'SESSION')
      }
    })

    sessionRef.current = null
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
    }
  }, [executeWithRetry])

  // Sincronizar eventos en batch
  const syncEvents = useCallback(async () => {
    try {
      startLoading()

      const batch = batchRef.current
      if (!batch.events.length) return

      const events = batch.events.splice(0, BATCH_SIZE)
      
      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('analytics_events')
          .insert(events)

        if (error) {
          handleAnalyticsError(error, 'BATCH')
          // Reintegrar eventos fallidos
          batchRef.current.events.unshift(...events)
        } else {
          batchRef.current.pendingCount -= events.length
          batchRef.current.lastSync = new Date().toISOString()
        }
      })
    } catch (err) {
      handleAnalyticsError(err, 'BATCH')
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry])

  // Sincronización periódica de eventos
  useEffect(() => {
    const interval = setInterval(syncEvents, SYNC_INTERVAL)
    return () => clearInterval(interval)
  }, [syncEvents])

  // Renovar sesión con actividad
  const renewSession = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
    }

    sessionTimeoutRef.current = setTimeout(() => {
      endSession()
      startSession()
    }, SESSION_TIMEOUT)
  }, [endSession, startSession])

  // Trackear evento
  const trackEvent = useCallback((
    name: string,
    category: AnalyticsEvent['category'],
    data?: Partial<AnalyticsEvent>
  ) => {
    try {
      // Verificar muestreo y categorías habilitadas
      if (
        config?.sampling_rate && 
        Math.random() > config.sampling_rate ||
        config?.enabled_categories && 
        !config.enabled_categories.includes(category)
      ) {
        return
      }

      const event = eventSchema.parse({
        name,
        category,
        ...data,
        timestamp: new Date().toISOString()
      })

      batchRef.current.events.push(event)
      batchRef.current.pendingCount++

      // Sincronizar inmediatamente si el batch está lleno
      if (batchRef.current.events.length >= BATCH_SIZE) {
        void syncEvents()
      }

      renewSession()
    } catch (err) {
      handleAnalyticsError(err, 'TRACKING')
    }
  }, [config, syncEvents, renewSession])

  // Trackear vista de página
  const trackPageView = useCallback((
    path: string,
    properties?: Record<string, unknown>
  ) => {
    trackEvent('page_view', 'page_view', {
      properties: {
        path,
        title: document.title,
        ...properties
      }
    })
  }, [trackEvent])

  // Iniciar sesión al montar
  useEffect(() => {
    startSession()
    return () => endSession()
  }, [startSession, endSession])

  // Escuchar eventos de navegación
  useEffect(() => {
    const handleNavigation = () => {
      trackPageView(window.location.pathname)
    }

    window.addEventListener('popstate', handleNavigation)
    return () => window.removeEventListener('popstate', handleNavigation)
  }, [trackPageView])

  return {
    trackEvent,
    trackPageView,
    startSession,
    endSession,
    isLoading
  }
}
