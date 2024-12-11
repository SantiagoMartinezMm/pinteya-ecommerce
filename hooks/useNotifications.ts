import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'
import { useSession } from '@/hooks/useSession'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { RealtimeChannel } from '@supabase/supabase-js'

// Tipos base
export type NotificationType = 
  | 'ORDER_STATUS' 
  | 'STOCK_ALERT' 
  | 'PRICE_DROP' 
  | 'SYSTEM_ALERT'
  | 'SHIPPING_UPDATE'
  | 'PAYMENT_STATUS'

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  data?: Record<string, unknown>
  read: boolean
  read_at?: string
  created_at: string
}

export type CreateNotificationInput = Omit<
  Notification,
  'id' | 'read' | 'read_at' | 'created_at'
>

// Tipos de auditoría específicos para notificaciones
export type NotificationAuditAction = Extract<
  AuditAction,
  'create_notification' | 'mark_notification_read' | 'delete_notification'
>

export type NotificationAuditResource = Extract<AuditResource, 'notification'>

export interface NotificationAuditPayload extends Record<string, unknown> {
  notification_id?: string
  notification_type: NotificationType
  user_id: string
  bulk_operation?: boolean
}

// Interfaces para opciones y respuestas
export interface NotificationOptions {
  unreadOnly?: boolean
  type?: NotificationType
  limit?: number
  offset?: number
}

export interface NotificationChangePayload {
  eventType: 'INSERT'
  old: null
  new: Notification
}

// Interfaces para el hook
interface NotificationHookState {
  loading: boolean
  error: PostgrestError | null
}

interface NotificationHookActions {
  getNotifications: (
    userId: string,
    options?: NotificationOptions
  ) => Promise<Notification[]>
  getUnreadCount: (userId: string) => Promise<number>
  createNotification: (notification: CreateNotificationInput) => Promise<Notification | null>
  createBulkNotifications: (notifications: CreateNotificationInput[]) => Promise<Notification[]>
  markAsRead: (notificationId: string) => Promise<Notification | null>
  markAllAsRead: (userId: string) => Promise<boolean>
  deleteNotification: (notificationId: string) => Promise<boolean>
  deleteAllRead: (userId: string) => Promise<boolean>
  subscribeToNotifications: (
    userId: string,
    callback: (payload: NotificationChangePayload) => void
  ) => () => void
}

export type NotificationHookReturn = NotificationHookState & NotificationHookActions

// Configuración de tipos de notificación
const NOTIFICATION_TYPES: Record<NotificationType, any> = {
  ORDER_STATUS: {
    name: 'Estado de Orden',
    priority: 'HIGH',
    template: 'Tu orden #{orderId} ha cambiado a estado {status}',
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 días
  },
  STOCK_ALERT: {
    name: 'Alerta de Stock',
    priority: 'MEDIUM',
    template: 'El producto {productName} está nuevamente disponible',
    ttl: 24 * 60 * 60 * 1000 // 1 día
  },
  PRICE_DROP: {
    name: 'Bajada de Precio',
    priority: 'LOW',
    template: '¡{productName} ahora está a {newPrice}!',
    ttl: 3 * 24 * 60 * 60 * 1000 // 3 días
  },
  SYSTEM_ALERT: {
    name: 'Alerta del Sistema',
    priority: 'HIGH',
    template: '{message}',
    ttl: 30 * 24 * 60 * 60 * 1000 // 30 días
  },
  SHIPPING_UPDATE: {
    name: 'Actualización de Envío',
    priority: 'HIGH',
    template: 'Tu envío #{trackingNumber} está {status}',
    ttl: 15 * 24 * 60 * 60 * 1000 // 15 días
  },
  PAYMENT_STATUS: {
    name: 'Estado de Pago',
    priority: 'HIGH',
    template: 'El pago de tu orden #{orderId} está {status}',
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 días
  }
}

export function useNotifications() {
  const supabase = createClient()
  const { session } = useSession()
  const { logAction } = useAudit()
  const { loading, error, setLoading, setError, resetState } = useLoadingState<PostgrestError>()
  const { data: cachedNotifications, setData: setCachedNotifications } = useCache<Record<string, any>>('notifications')
  const { executeWithRetry } = useRetry()
  const { getPaginationQuery, getPaginatedResponse } = usePagination()
  const [activeSubscription, setActiveSubscription] = useState<RealtimeChannel | null>(null)

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (activeSubscription) {
        activeSubscription.unsubscribe()
      }
    }
  }, [activeSubscription])

  // Función auxiliar para generar claves de caché
  const getCacheKey = useCallback((key: string, params?: Record<string, any>) => {
    return params ? `${key}_${JSON.stringify(params)}` : key
  }, [])

  // Función auxiliar para invalidar caché relacionado
  const invalidateRelatedCache = useCallback((patterns: string[]) => {
    patterns.forEach(pattern => {
      const keys = Object.keys(cachedNotifications || {}).filter(key => key.startsWith(pattern))
      keys.forEach(key => setCachedNotifications(key, null))
    })
  }, [cachedNotifications, setCachedNotifications])

  // Función auxiliar para generar mensaje de notificación
  const generateNotificationMessage = useCallback((
    type: NotificationType,
    data: Record<string, unknown>
  ): string => {
    const template = NOTIFICATION_TYPES[type].template
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return String(data[key] || match)
    })
  }, [])

  // Función auxiliar para limpiar notificaciones antiguas
  const cleanupOldNotifications = useCallback(async (userId: string) => {
    try {
      const now = new Date()
      const deletedByType: Record<NotificationType, number> = {} as any

      for (const [type, config] of Object.entries(NOTIFICATION_TYPES)) {
        const expirationDate = new Date(now.getTime() - config.ttl)
        
        const { data, error } = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId)
          .eq('type', type)
          .lt('created_at', expirationDate.toISOString())
          .select('id')

        if (!error && data) {
          deletedByType[type as NotificationType] = data.length
        }
      }

      // Log cleanup action if any notifications were deleted
      const totalDeleted = Object.values(deletedByType).reduce((a, b) => a + b, 0)
      if (totalDeleted > 0) {
        await logAction(
          'delete_notification' as NotificationAuditAction,
          'notification' as NotificationAuditResource,
          {
            user_id: userId,
            bulk_operation: true,
            cleanup: true,
            deleted_count: totalDeleted,
            deleted_by_type: deletedByType
          }
        )

        // Invalidate related caches
        invalidateRelatedCache(['notifications', 'unread_count'])
      }
    } catch (err) {
      console.error('Error cleaning up old notifications:', err)
    }
  }, [supabase, logAction, invalidateRelatedCache])

  const getNotifications = useCallback(async (
    userId: string,
    options?: NotificationOptions
  ): Promise<Notification[]> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('notifications', { userId, ...options })
      const cached = cachedNotifications?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (options?.unreadOnly) {
          query = query.eq('read', false)
        }
        if (options?.type) {
          query = query.eq('type', options.type)
        }

        return await getPaginationQuery(query, 1, options?.limit || 20)
      })

      if (fetchError) throw fetchError

      // Cache the results
      if (data) {
        setCachedNotifications(cacheKey, data)
      }

      return data as Notification[]
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, getPaginationQuery, cachedNotifications, setCachedNotifications, getCacheKey])

  const getUnreadCount = useCallback(async (userId: string): Promise<number> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('unread_count', { userId })
      const cached = cachedNotifications?.get(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      const { count, error: countError } = await executeWithRetry(async () => {
        return await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false)
      })

      if (countError) throw countError

      // Cache the result
      setCachedNotifications(cacheKey, count)

      return count || 0
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, cachedNotifications, setCachedNotifications, getCacheKey])

  const createNotification = useCallback(async (notification: CreateNotificationInput): Promise<Notification> => {
    try {
      setLoading(true)
      resetState()

      const { data, error: createError } = await executeWithRetry(async () => {
        // Validate notification type
        if (!NOTIFICATION_TYPES[notification.type]) {
          throw new Error('Tipo de notificación inválido')
        }

        // Generate message from template if not provided
        const message = notification.message || generateNotificationMessage(
          notification.type,
          notification.data || {}
        )

        // Create notification
        const result = await supabase
          .from('notifications')
          .insert([{
            ...notification,
            message,
            priority: notification.priority || NOTIFICATION_TYPES[notification.type].priority,
            read: false,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (result.data) {
          await logAction(
            'create_notification' as NotificationAuditAction,
            'notification' as NotificationAuditResource,
            {
              notification_id: result.data.id,
              notification_type: notification.type,
              user_id: notification.user_id
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['notifications', 'unread_count'])
        }

        return result
      })

      if (createError) throw createError

      return data as Notification
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
    setLoading,
    setError,
    resetState,
    executeWithRetry,
    generateNotificationMessage,
    logAction,
    invalidateRelatedCache
  ])

  const createBulkNotifications = useCallback(async (
    notifications: CreateNotificationInput[]
  ): Promise<Notification[]> => {
    try {
      setLoading(true)
      resetState()

      const { data, error: createError } = await executeWithRetry(async () => {
        // Validate and prepare notifications
        const preparedNotifications = notifications.map(notification => {
          if (!NOTIFICATION_TYPES[notification.type]) {
            throw new Error(`Tipo de notificación inválido: ${notification.type}`)
          }

          const message = notification.message || generateNotificationMessage(
            notification.type,
            notification.data || {}
          )

          return {
            ...notification,
            message,
            priority: notification.priority || NOTIFICATION_TYPES[notification.type].priority,
            read: false,
            created_at: new Date().toISOString()
          }
        })

        // Create notifications in batch
        const result = await supabase
          .from('notifications')
          .insert(preparedNotifications)
          .select()

        if (result.data) {
          await logAction(
            'create_notification' as NotificationAuditAction,
            'notification' as NotificationAuditResource,
            {
              bulk_operation: true,
              notification_count: result.data.length,
              notification_types: [...new Set(notifications.map(n => n.type))]
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['notifications', 'unread_count'])
        }

        return result
      })

      if (createError) throw createError

      return data as Notification[]
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
    setLoading,
    setError,
    resetState,
    executeWithRetry,
    generateNotificationMessage,
    logAction,
    invalidateRelatedCache
  ])

  const markAsRead = useCallback(async (notificationId: string): Promise<Notification> => {
    try {
      setLoading(true)
      resetState()

      const { data, error: updateError } = await executeWithRetry(async () => {
        const result = await supabase
          .from('notifications')
          .update({
            read: true,
            read_at: new Date().toISOString()
          })
          .eq('id', notificationId)
          .select()
          .single()

        if (result.data) {
          await logAction(
            'mark_notification_read' as NotificationAuditAction,
            'notification' as NotificationAuditResource,
            {
              notification_id: notificationId,
              user_id: result.data.user_id
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['notifications', 'unread_count'])
        }

        return result
      })

      if (updateError) throw updateError

      return data as Notification
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, invalidateRelatedCache])

  const markAllAsRead = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setLoading(true)
      resetState()

      const { error: updateError } = await executeWithRetry(async () => {
        const result = await supabase
          .from('notifications')
          .update({
            read: true,
            read_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('read', false)

        if (!result.error) {
          await logAction(
            'mark_notification_read' as NotificationAuditAction,
            'notification' as NotificationAuditResource,
            {
              user_id: userId,
              bulk_operation: true
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['notifications', 'unread_count'])
        }

        return result
      })

      if (updateError) throw updateError

      return true
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, invalidateRelatedCache])

  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    try {
      setLoading(true)
      resetState()

      const { error: deleteError } = await executeWithRetry(async () => {
        const { data: notification } = await supabase
          .from('notifications')
          .select('user_id, type')
          .eq('id', notificationId)
          .single()

        if (!notification) throw new Error('Notificación no encontrada')

        const result = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)

        if (!result.error) {
          await logAction(
            'delete_notification' as NotificationAuditAction,
            'notification' as NotificationAuditResource,
            {
              notification_id: notificationId,
              notification_type: notification.type,
              user_id: notification.user_id
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['notifications', 'unread_count'])
        }

        return result
      })

      if (deleteError) throw deleteError

      return true
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, invalidateRelatedCache])

  const deleteAllRead = useCallback(async (userId: string): Promise<boolean> => {
    try {
      setLoading(true)
      resetState()

      const { error: deleteError } = await executeWithRetry(async () => {
        const result = await supabase
          .from('notifications')
          .delete()
          .eq('user_id', userId)
          .eq('read', true)

        if (!result.error) {
          await logAction(
            'delete_notification' as NotificationAuditAction,
            'notification' as NotificationAuditResource,
            {
              user_id: userId,
              bulk_operation: true,
              read_only: true
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['notifications'])
        }

        return result
      })

      if (deleteError) throw deleteError

      return true
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, invalidateRelatedCache])

  const subscribeToNotifications = useCallback((
    userId: string,
    callback: (payload: NotificationChangePayload) => void
  ) => {
    // Cleanup previous subscription
    if (activeSubscription) {
      activeSubscription.unsubscribe()
    }

    const subscription = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          try {
            // Invalidate caches
            invalidateRelatedCache(['notifications', 'unread_count'])

            // Cleanup old notifications periodically
            if (Math.random() < 0.1) { // 10% chance on each new notification
              await cleanupOldNotifications(userId)
            }

            callback({
              eventType: 'INSERT',
              old: null,
              new: payload.new as Notification
            })
          } catch (err) {
            console.error('Error processing notification update:', err)
          }
        }
      )
      .subscribe()

    setActiveSubscription(subscription)

    return () => {
      subscription.unsubscribe()
      setActiveSubscription(null)
    }
  }, [supabase, activeSubscription, invalidateRelatedCache, cleanupOldNotifications])

  return {
    loading,
    error,
    getNotifications,
    getUnreadCount,
    createNotification,
    createBulkNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    subscribeToNotifications
  }
}
