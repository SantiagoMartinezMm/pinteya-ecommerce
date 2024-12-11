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
const historyEventSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  entity_type: z.enum([
    'product',
    'order',
    'user',
    'payment',
    'shipping',
    'review',
    'comment',
    'discount',
    'category',
    'setting',
    'subscription'
  ]),
  entity_id: z.string().uuid(),
  action: z.enum([
    'create',
    'update',
    'delete',
    'view',
    'export',
    'import',
    'approve',
    'reject',
    'cancel',
    'restore',
    'archive'
  ]),
  changes: z.record(z.object({
    old_value: z.unknown(),
    new_value: z.unknown()
  })).optional(),
  metadata: z.record(z.unknown()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.string().datetime()
})

const historySnapshotSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  data: z.record(z.unknown()),
  created_at: z.string().datetime()
})

export type HistoryEvent = z.infer<typeof historyEventSchema>
export type HistorySnapshot = z.infer<typeof historySnapshotSchema>

export interface HistoryError extends BaseError {
  code: 'HISTORY_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    event_id?: string
    entity_id?: string
    originalError?: unknown
  }
}

export interface HistoryFilters {
  entity_type?: HistoryEvent['entity_type']
  entity_id?: string
  user_id?: string
  action?: HistoryEvent['action']
  date_from?: string
  date_to?: string
  search?: string
  sort_by?: 'recent' | 'entity' | 'action' | 'user'
  sort_order?: 'asc' | 'desc'
}

export interface HistoryHookReturn {
  events: HistoryEvent[]
  snapshots: Record<string, HistorySnapshot>
  isLoading: boolean
  currentPage: number
  totalPages: number
  filters: HistoryFilters
  getHistory: (filters?: HistoryFilters) => Promise<HistoryEvent[]>
  getEventDetails: (eventId: string) => Promise<{ event: HistoryEvent, snapshot: HistorySnapshot }>
  getEntityHistory: (entityType: HistoryEvent['entity_type'], entityId: string) => Promise<HistoryEvent[]>
  getUserHistory: (userId: string) => Promise<HistoryEvent[]>
  trackEvent: (
    entityType: HistoryEvent['entity_type'],
    entityId: string,
    action: HistoryEvent['action'],
    changes?: HistoryEvent['changes'],
    metadata?: HistoryEvent['metadata']
  ) => Promise<HistoryEvent>
  createSnapshot: (
    eventId: string,
    entityType: string,
    entityId: string,
    data: Record<string, unknown>
  ) => Promise<HistorySnapshot>
  restoreSnapshot: (snapshotId: string) => Promise<void>
  exportHistory: (filters?: HistoryFilters) => Promise<Blob>
  setFilters: (filters: HistoryFilters) => void
  nextPage: () => void
  previousPage: () => void
  refreshHistory: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos
const ITEMS_PER_PAGE = 50

export function useHistory(): HistoryHookReturn {
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

  // Cache para eventos y snapshots
  const {
    data: historyState,
    setData: setHistoryState
  } = useCache<{
    events: HistoryEvent[]
    snapshots: Record<string, HistorySnapshot>
    filters: HistoryFilters
  }>({
    key: 'history-state',
    ttl: CACHE_TTL,
    initialData: {
      events: [],
      snapshots: {},
      filters: {}
    }
  })

  const handleHistoryError = (
    error: unknown,
    type: HistoryError['details']['type'],
    event_id?: string,
    entity_id?: string
  ): never => {
    throw new BaseError('Error en historial', {
      code: 'HISTORY_ERROR',
      details: {
        type,
        event_id,
        entity_id,
        originalError: error
      }
    })
  }

  // Obtener historial
  const getHistory = useCallback(async (
    filters: HistoryFilters = {}
  ): Promise<HistoryEvent[]> => {
    try {
      startLoading()

      let query = supabase
        .from('history_events')
        .select('*', { count: 'exact' })

      // Aplicar filtros
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type)
      }
      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id)
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id)
      }
      if (filters.action) {
        query = query.eq('action', filters.action)
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters.search) {
        query = query.or(
          `metadata.ilike.%${filters.search}%,changes.ilike.%${filters.search}%`
        )
      }

      // Ordenamiento
      const orderColumn = filters.sort_by === 'recent' ? 'created_at' :
        filters.sort_by === 'entity' ? 'entity_type' :
        filters.sort_by === 'action' ? 'action' :
        filters.sort_by === 'user' ? 'user_id' :
        'created_at'

      query = query.order(orderColumn, {
        ascending: filters.sort_order === 'asc'
      })

      // Paginación
      query = query.range(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE - 1
      )

      const { data: events, error, count } = await executeWithRetry(() =>
        query.returns<HistoryEvent[]>()
      )

      if (error) {
        handleHistoryError(error, 'SERVER_ERROR')
      }

      // Cargar snapshots relacionados
      const eventIds = events?.map(e => e.id) || []
      if (eventIds.length > 0) {
        const { data: snapshots, error: snapshotsError } = await executeWithRetry(() =>
          supabase
            .from('history_snapshots')
            .select('*')
            .in('event_id', eventIds)
        )

        if (snapshotsError) {
          handleHistoryError(snapshotsError, 'SERVER_ERROR')
        }

        // Agrupar snapshots por event_id
        const groupedSnapshots = snapshots?.reduce((acc, snapshot) => ({
          ...acc,
          [snapshot.event_id]: snapshot
        }), {} as Record<string, HistorySnapshot>)

        setHistoryState(prev => ({
          ...prev,
          snapshots: {
            ...prev.snapshots,
            ...groupedSnapshots
          }
        }))
      }

      setTotalItems(count || 0)
      setHistoryState(prev => ({
        ...prev,
        events: events || [],
        filters
      }))

      return events || []
    } catch (err) {
      throw new BaseError('Error al obtener historial', { cause: err })
    } finally {
      stopLoading()
    }
  }, [currentPage, executeWithRetry, startLoading, stopLoading])

  // Obtener detalles de un evento
  const getEventDetails = useCallback(async (
    eventId: string
  ): Promise<{ event: HistoryEvent, snapshot: HistorySnapshot }> => {
    try {
      startLoading()

      const [eventResult, snapshotResult] = await Promise.all([
        executeWithRetry(() =>
          supabase
            .from('history_events')
            .select('*')
            .eq('id', eventId)
            .single()
        ),
        executeWithRetry(() =>
          supabase
            .from('history_snapshots')
            .select('*')
            .eq('event_id', eventId)
            .single()
        )
      ])

      if (eventResult.error) {
        handleHistoryError(eventResult.error, 'NOT_FOUND', eventId)
      }

      if (snapshotResult.error && snapshotResult.error.code !== 'PGRST116') {
        handleHistoryError(snapshotResult.error, 'SERVER_ERROR', eventId)
      }

      return {
        event: eventResult.data,
        snapshot: snapshotResult.data
      }
    } catch (err) {
      throw new BaseError('Error al obtener detalles del evento', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener historial de una entidad
  const getEntityHistory = useCallback(async (
    entityType: HistoryEvent['entity_type'],
    entityId: string
  ): Promise<HistoryEvent[]> => {
    return getHistory({
      entity_type: entityType,
      entity_id: entityId,
      sort_by: 'recent',
      sort_order: 'desc'
    })
  }, [getHistory])

  // Obtener historial de un usuario
  const getUserHistory = useCallback(async (
    userId: string
  ): Promise<HistoryEvent[]> => {
    return getHistory({
      user_id: userId,
      sort_by: 'recent',
      sort_order: 'desc'
    })
  }, [getHistory])

  // Registrar evento
  const trackEvent = useCallback(async (
    entityType: HistoryEvent['entity_type'],
    entityId: string,
    action: HistoryEvent['action'],
    changes?: HistoryEvent['changes'],
    metadata?: HistoryEvent['metadata']
  ): Promise<HistoryEvent> => {
    if (!user) {
      handleHistoryError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const event = {
        user_id: user.id,
        entity_type: entityType,
        entity_id: entityId,
        action,
        changes,
        metadata: {
          ...metadata,
          ip_address: window.clientInformation?.userAgent,
          user_agent: window.navigator.userAgent
        }
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('history_events')
          .insert([event])
          .select()
          .single()
      )

      if (error) {
        handleHistoryError(error, 'SERVER_ERROR', undefined, entityId)
      }

      setHistoryState(prev => ({
        ...prev,
        events: [data, ...prev.events]
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al registrar evento', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Crear snapshot
  const createSnapshot = useCallback(async (
    eventId: string,
    entityType: string,
    entityId: string,
    data: Record<string, unknown>
  ): Promise<HistorySnapshot> => {
    try {
      startLoading()

      const snapshot = {
        event_id: eventId,
        entity_type: entityType,
        entity_id: entityId,
        data
      }

      const { data: result, error } = await executeWithRetry(() =>
        supabase
          .from('history_snapshots')
          .insert([snapshot])
          .select()
          .single()
      )

      if (error) {
        handleHistoryError(error, 'SERVER_ERROR', eventId, entityId)
      }

      setHistoryState(prev => ({
        ...prev,
        snapshots: {
          ...prev.snapshots,
          [eventId]: result
        }
      }))

      return result
    } catch (err) {
      throw new BaseError('Error al crear snapshot', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Restaurar snapshot
  const restoreSnapshot = useCallback(async (snapshotId: string): Promise<void> => {
    if (!user) {
      handleHistoryError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: snapshot, error: snapshotError } = await executeWithRetry(() =>
        supabase
          .from('history_snapshots')
          .select('*')
          .eq('id', snapshotId)
          .single()
      )

      if (snapshotError) {
        handleHistoryError(snapshotError, 'NOT_FOUND', undefined, snapshotId)
      }

      // Restaurar datos en la entidad correspondiente
      const { error: restoreError } = await executeWithRetry(() =>
        supabase
          .from(snapshot.entity_type)
          .update(snapshot.data)
          .eq('id', snapshot.entity_id)
      )

      if (restoreError) {
        handleHistoryError(restoreError, 'SERVER_ERROR', undefined, snapshot.entity_id)
      }

      // Registrar evento de restauración
      await trackEvent(
        snapshot.entity_type as HistoryEvent['entity_type'],
        snapshot.entity_id,
        'restore',
        undefined,
        { snapshot_id: snapshotId }
      )
    } catch (err) {
      throw new BaseError('Error al restaurar snapshot', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading, trackEvent])

  // Exportar historial
  const exportHistory = useCallback(async (
    filters?: HistoryFilters
  ): Promise<Blob> => {
    try {
      startLoading()

      const events = await getHistory(filters)
      const snapshots = Object.values(historyState?.snapshots || {})

      const exportData = {
        events,
        snapshots,
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
      throw new BaseError('Error al exportar historial', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, getHistory, historyState?.snapshots, startLoading, stopLoading])

  // Actualizar filtros
  const setFilters = useCallback((filters: HistoryFilters): void => {
    setHistoryState(prev => ({
      ...prev,
      filters
    }))
  }, [])

  // Refrescar historial
  const refreshHistory = useCallback(async (): Promise<void> => {
    if (historyState?.filters) {
      await getHistory(historyState.filters)
    }
  }, [historyState?.filters, getHistory])

  return {
    events: historyState?.events || [],
    snapshots: historyState?.snapshots || {},
    isLoading,
    currentPage,
    totalPages,
    filters: historyState?.filters || {},
    getHistory,
    getEventDetails,
    getEntityHistory,
    getUserHistory,
    trackEvent,
    createSnapshot,
    restoreSnapshot,
    exportHistory,
    setFilters,
    nextPage,
    previousPage,
    refreshHistory
  }
} 