import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const auditLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  action: z.enum([
    'create',
    'update',
    'delete',
    'view',
    'login',
    'logout',
    'export',
    'import',
    'approve',
    'reject',
    'restore',
    'archive',
    'send',
    'receive',
    'process',
    'cancel',
    'refund',
    'verify',
    'block',
    'unblock'
  ]),
  entity_type: z.enum([
    'user',
    'product',
    'order',
    'payment',
    'shipping',
    'review',
    'comment',
    'discount',
    'category',
    'setting',
    'backup',
    'subscription',
    'notification',
    'report'
  ]),
  entity_id: z.string().uuid().optional(),
  changes: z.record(z.object({
    field: z.string(),
    old_value: z.unknown(),
    new_value: z.unknown()
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
  ip_address: z.string(),
  user_agent: z.string(),
  status: z.enum(['success', 'failure', 'warning']).default('success'),
  error_details: z.string().optional(),
  created_at: z.string().datetime()
})

const auditAlertSchema = z.object({
  id: z.string().uuid(),
  log_id: z.string().uuid(),
  type: z.enum(['security', 'compliance', 'system', 'business']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  is_resolved: z.boolean().default(false),
  resolved_by: z.string().uuid().optional(),
  resolved_at: z.string().datetime().optional(),
  created_at: z.string().datetime()
})

export type AuditLog = z.infer<typeof auditLogSchema>
export type AuditAlert = z.infer<typeof auditAlertSchema>

export interface AuditError extends BaseError {
  code: 'AUDIT_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    log_id?: string
    originalError?: unknown
  }
}

export interface AuditFilters {
  user_id?: string
  action?: AuditLog['action']
  entity_type?: AuditLog['entity_type']
  entity_id?: string
  status?: AuditLog['status']
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: 'recent' | 'user' | 'action' | 'status'
  sort_order?: 'asc' | 'desc'
}

export interface AlertFilters {
  type?: AuditAlert['type']
  severity?: AuditAlert['severity']
  is_resolved?: boolean
  date_from?: string
  date_to?: string
}

export interface AuditHookReturn {
  logs: AuditLog[]
  alerts: AuditAlert[]
  isLoading: boolean
  currentPage: number
  totalPages: number
  filters: AuditFilters
  getLogs: (filters?: AuditFilters) => Promise<AuditLog[]>
  getLogDetails: (logId: string) => Promise<AuditLog>
  getAlerts: (filters?: AlertFilters) => Promise<AuditAlert[]>
  trackAction: (
    action: AuditLog['action'],
    entityType: AuditLog['entity_type'],
    entityId?: string,
    changes?: AuditLog['changes'],
    metadata?: AuditLog['metadata']
  ) => Promise<AuditLog>
  createAlert: (
    logId: string,
    type: AuditAlert['type'],
    severity: AuditAlert['severity'],
    message: string,
    details?: Record<string, unknown>
  ) => Promise<AuditAlert>
  resolveAlert: (alertId: string) => Promise<void>
  exportAuditLog: (filters?: AuditFilters) => Promise<Blob>
  analyzeActivity: (userId: string) => Promise<{
    total_actions: number
    actions_by_type: Record<AuditLog['action'], number>
    entities_affected: Record<AuditLog['entity_type'], number>
    success_rate: number
    alerts_triggered: number
  }>
  setFilters: (filters: AuditFilters) => void
  nextPage: () => void
  previousPage: () => void
  refreshAudit: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos
const ITEMS_PER_PAGE = 50

export function useAudit(): AuditHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()
  const {
    currentPage,
    totalPages,
    setTotalItems,
    nextPage,
    previousPage
  } = usePagination({
    itemsPerPage: ITEMS_PER_PAGE
  })

  // Cache para logs y alertas
  const {
    data: auditState,
    setData: setAuditState
  } = useCache<{
    logs: AuditLog[]
    alerts: AuditAlert[]
    filters: AuditFilters
  }>({
    key: 'audit-state',
    ttl: CACHE_TTL,
    initialData: {
      logs: [],
      alerts: [],
      filters: {}
    }
  })

  const handleAuditError = (
    error: unknown,
    type: AuditError['details']['type'],
    log_id?: string
  ): never => {
    throw new BaseError('Error en auditoría', {
      code: 'AUDIT_ERROR',
      details: {
        type,
        log_id,
        originalError: error
      }
    })
  }

  // Obtener logs de auditoría
  const getLogs = useCallback(async (
    filters?: AuditFilters
  ): Promise<AuditLog[]> => {
    try {
      startLoading()

      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })

      // Aplicar filtros
      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      if (filters?.action) {
        query = query.eq('action', filters.action)
      }
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type)
      }
      if (filters?.entity_id) {
        query = query.eq('entity_id', filters.entity_id)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters?.search) {
        query = query.or(
          `metadata.ilike.%${filters.search}%,changes.ilike.%${filters.search}%`
        )
      }

      // Ordenamiento
      const orderColumn = filters?.sort_by === 'recent' ? 'created_at' :
        filters?.sort_by === 'user' ? 'user_id' :
        filters?.sort_by === 'action' ? 'action' :
        filters?.sort_by === 'status' ? 'status' :
        'created_at'

      query = query.order(orderColumn, {
        ascending: filters?.sort_order === 'asc'
      })

      // Paginación
      query = query.range(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE - 1
      )

      const { data: logs, error, count } = await executeWithRetry(() =>
        query.returns<AuditLog[]>()
      )

      if (error) {
        handleAuditError(error, 'SERVER_ERROR')
      }

      setTotalItems(count || 0)
      setAuditState(prev => ({
        ...prev,
        logs: logs || [],
        filters
      }))

      return logs || []
    } catch (err) {
      throw new BaseError('Error al obtener logs de auditoría', { cause: err })
    } finally {
      stopLoading()
    }
  }, [currentPage, executeWithRetry, startLoading, stopLoading])

  // Obtener detalles de un log
  const getLogDetails = useCallback(async (logId: string): Promise<AuditLog> => {
    try {
      startLoading()

      const { data: log, error } = await executeWithRetry(() =>
        supabase
          .from('audit_logs')
          .select('*')
          .eq('id', logId)
          .single()
      )

      if (error) {
        handleAuditError(error, 'NOT_FOUND', logId)
      }

      return log
    } catch (err) {
      throw new BaseError('Error al obtener detalles del log', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener alertas
  const getAlerts = useCallback(async (
    filters?: AlertFilters
  ): Promise<AuditAlert[]> => {
    try {
      startLoading()

      let query = supabase
        .from('audit_alerts')
        .select('*')

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity)
      }
      if (filters?.is_resolved !== undefined) {
        query = query.eq('is_resolved', filters.is_resolved)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      const { data: alerts, error } = await executeWithRetry(() =>
        query.order('created_at', { ascending: false })
      )

      if (error) {
        handleAuditError(error, 'SERVER_ERROR')
      }

      setAuditState(prev => ({
        ...prev,
        alerts: alerts || []
      }))

      return alerts || []
    } catch (err) {
      throw new BaseError('Error al obtener alertas', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Registrar acción
  const trackAction = useCallback(async (
    action: AuditLog['action'],
    entityType: AuditLog['entity_type'],
    entityId?: string,
    changes?: AuditLog['changes'],
    metadata?: AuditLog['metadata']
  ): Promise<AuditLog> => {
    if (!user) {
      handleAuditError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const log = {
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        changes,
        metadata,
        ip_address: window.clientInformation?.userAgent || 'unknown',
        user_agent: window.navigator.userAgent,
        status: 'success' as const
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('audit_logs')
          .insert([log])
          .select()
          .single()
      )

      if (error) {
        handleAuditError(error, 'SERVER_ERROR')
      }

      setAuditState(prev => ({
        ...prev,
        logs: [data, ...prev.logs]
      }))

      // Analizar acción para posibles alertas
      void analyzeForAlerts(data)

      return data
    } catch (err) {
      throw new BaseError('Error al registrar acción', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Crear alerta
  const createAlert = useCallback(async (
    logId: string,
    type: AuditAlert['type'],
    severity: AuditAlert['severity'],
    message: string,
    details?: Record<string, unknown>
  ): Promise<AuditAlert> => {
    try {
      startLoading()

      const alert = {
        log_id: logId,
        type,
        severity,
        message,
        details,
        is_resolved: false
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('audit_alerts')
          .insert([alert])
          .select()
          .single()
      )

      if (error) {
        handleAuditError(error, 'SERVER_ERROR')
      }

      setAuditState(prev => ({
        ...prev,
        alerts: [data, ...prev.alerts]
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al crear alerta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Resolver alerta
  const resolveAlert = useCallback(async (alertId: string): Promise<void> => {
    if (!user) {
      handleAuditError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('audit_alerts')
          .update({
            is_resolved: true,
            resolved_by: user.id,
            resolved_at: new Date().toISOString()
          })
          .eq('id', alertId)
      )

      if (error) {
        handleAuditError(error, 'SERVER_ERROR')
      }

      setAuditState(prev => ({
        ...prev,
        alerts: prev.alerts.map(a =>
          a.id === alertId
            ? {
                ...a,
                is_resolved: true,
                resolved_by: user.id,
                resolved_at: new Date().toISOString()
              }
            : a
        )
      }))
    } catch (err) {
      throw new BaseError('Error al resolver alerta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Exportar logs de auditoría
  const exportAuditLog = useCallback(async (
    filters?: AuditFilters
  ): Promise<Blob> => {
    try {
      startLoading()

      const logs = await getLogs(filters)

      const exportData = {
        logs,
        metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user?.id,
          filters
        }
      }

      return new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      )
    } catch (err) {
      throw new BaseError('Error al exportar logs', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, getLogs, startLoading, stopLoading])

  // Analizar actividad de usuario
  const analyzeActivity = useCallback(async (userId: string): Promise<{
    total_actions: number
    actions_by_type: Record<AuditLog['action'], number>
    entities_affected: Record<AuditLog['entity_type'], number>
    success_rate: number
    alerts_triggered: number
  }> => {
    try {
      startLoading()

      const { data: logs, error } = await executeWithRetry(() =>
        supabase
          .from('audit_logs')
          .select('*')
          .eq('user_id', userId)
      )

      if (error) {
        handleAuditError(error, 'SERVER_ERROR')
      }

      const analysis = {
        total_actions: logs?.length || 0,
        actions_by_type: {} as Record<AuditLog['action'], number>,
        entities_affected: {} as Record<AuditLog['entity_type'], number>,
        success_rate: 0,
        alerts_triggered: 0
      }

      if (logs) {
        // Analizar acciones
        logs.forEach(log => {
          analysis.actions_by_type[log.action] = 
            (analysis.actions_by_type[log.action] || 0) + 1
          analysis.entities_affected[log.entity_type] = 
            (analysis.entities_affected[log.entity_type] || 0) + 1
        })

        // Calcular tasa de éxito
        const successful = logs.filter(log => log.status === 'success').length
        analysis.success_rate = (successful / logs.length) * 100

        // Contar alertas relacionadas
        const { count } = await supabase
          .from('audit_alerts')
          .select('*', { count: 'exact' })
          .in('log_id', logs.map(l => l.id))

        analysis.alerts_triggered = count || 0
      }

      return analysis
    } catch (err) {
      throw new BaseError('Error al analizar actividad', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Analizar log para posibles alertas
  const analyzeForAlerts = async (log: AuditLog): Promise<void> => {
    try {
      // Reglas de alerta
      const rules: Array<{
        condition: (log: AuditLog) => boolean
        alert: {
          type: AuditAlert['type']
          severity: AuditAlert['severity']
          message: string
          details?: Record<string, unknown>
        }
      }> = [
        // Alertas de seguridad
        {
          condition: (log) => 
            log.action === 'login' && log.status === 'failure',
          alert: {
            type: 'security',
            severity: 'high',
            message: 'Intento de inicio de sesión fallido'
          }
        },
        {
          condition: (log) =>
            ['block', 'unblock'].includes(log.action),
          alert: {
            type: 'security',
            severity: 'high',
            message: `Usuario ${log.action === 'block' ? 'bloqueado' : 'desbloqueado'}`
          }
        },
        // Alertas de cumplimiento
        {
          condition: (log) =>
            log.action === 'delete' && 
            ['user', 'order', 'payment'].includes(log.entity_type),
          alert: {
            type: 'compliance',
            severity: 'medium',
            message: `${log.entity_type} eliminado`
          }
        },
        // Alertas de sistema
        {
          condition: (log) =>
            log.status === 'failure' &&
            ['process', 'import', 'export'].includes(log.action),
          alert: {
            type: 'system',
            severity: 'medium',
            message: `Error en operación ${log.action}`
          }
        },
        // Alertas de negocio
        {
          condition: (log) =>
            log.action === 'refund' && log.entity_type === 'payment',
          alert: {
            type: 'business',
            severity: 'medium',
            message: 'Reembolso procesado'
          }
        }
      ]

      // Evaluar reglas
      for (const rule of rules) {
        if (rule.condition(log)) {
          await createAlert(
            log.id,
            rule.alert.type,
            rule.alert.severity,
            rule.alert.message,
            rule.alert.details
          )
        }
      }
    } catch (err) {
      console.error('Error al analizar alertas:', err)
    }
  }

  // Actualizar filtros
  const setFilters = useCallback((filters: AuditFilters): void => {
    setAuditState(prev => ({
      ...prev,
      filters
    }))
  }, [])

  // Refrescar auditoría
  const refreshAudit = useCallback(async (): Promise<void> => {
    await Promise.all([
      getLogs(auditState?.filters),
      getAlerts()
    ])
  }, [auditState?.filters, getLogs, getAlerts])

  return {
    logs: auditState?.logs || [],
    alerts: auditState?.alerts || [],
    isLoading,
    currentPage,
    totalPages,
    filters: auditState?.filters || {},
    getLogs,
    getLogDetails,
    getAlerts,
    trackAction,
    createAlert,
    resolveAlert,
    exportAuditLog,
    analyzeActivity,
    setFilters,
    nextPage,
    previousPage,
    refreshAudit
  }
}
