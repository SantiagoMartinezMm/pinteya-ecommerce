import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { useSession } from '@/hooks/useSession'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'
import { Product } from './useProducts'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { RealtimeChannel } from '@supabase/supabase-js'

// Tipos base
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
export type ShippingProvider = 'CORREO_ARGENTINO' | 'ANDREANI' | 'OCA'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  product?: Product
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  total: number
  shipping_address: string
  shipping_city: string
  shipping_state: string
  shipping_zip: string
  shipping_provider: ShippingProvider
  tracking_number?: string
  notes?: string
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface CreateOrderItemInput {
  product_id: string
  quantity: number
  price: number
}

export type CreateOrderInput = Omit<Order, 'id' | 'created_at' | 'updated_at' | 'items'> & {
  items: CreateOrderItemInput[]
}

export interface UpdateShippingInfo {
  shipping_provider?: ShippingProvider
  tracking_number?: string
  shipping_address?: string
  shipping_city?: string
  shipping_state?: string
  shipping_zip?: string
}

// Tipos de auditoría específicos para órdenes
export type OrderAuditAction = Extract<
  AuditAction,
  'create_order' | 'update_order_status' | 'update_shipping_info'
>

export type OrderAuditResource = Extract<AuditResource, 'order'>

export interface OrderAuditPayload extends Record<string, unknown> {
  order_id: string
  user_id: string
  status?: OrderStatus
  total?: number
  shipping_info?: UpdateShippingInfo
}

// Interfaces para opciones y respuestas
export interface OrderOptions {
  userId?: string
  status?: OrderStatus
}

export interface OrderChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  old: Order | null
  new: Order | null
}

// Interfaces para el hook
interface OrderHookState {
  loading: boolean
  error: PostgrestError | null
}

interface OrderHookActions {
  getOrders: (options?: OrderOptions) => Promise<Order[]>
  getOrderById: (orderId: string) => Promise<Order | null>
  createOrder: (orderData: CreateOrderInput) => Promise<Order | null>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<Order | null>
  updateShippingInfo: (orderId: string, shippingInfo: UpdateShippingInfo) => Promise<Order | null>
  subscribeToOrderUpdates: (
    orderId: string,
    callback: (payload: OrderChangePayload) => void
  ) => () => void
}

export type OrderHookReturn = OrderHookState & OrderHookActions

export function useOrders() {
  const supabase = createClient()
  const { session } = useSession()
  const { logAction } = useAudit()
  const { loading, error, setLoading, setError, resetState } = useLoadingState<PostgrestError>()
  const { data: cachedOrders, setData: setCachedOrders } = useCache<Record<string, any>>('orders')
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
      const keys = Object.keys(cachedOrders || {}).filter(key => key.startsWith(pattern))
      keys.forEach(key => setCachedOrders(key, null))
    })
  }, [cachedOrders, setCachedOrders])

  // Función auxiliar para validar el estado de la orden
  const validateOrderStatus = useCallback((
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ): boolean => {
    const statusFlow = {
      PENDING: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: [],
      CANCELLED: []
    }

    return statusFlow[currentStatus].includes(newStatus)
  }, [])

  // Función auxiliar para calcular totales
  const calculateOrderTotal = useCallback((items: CreateOrderItemInput[]): number => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }, [])

  // Función auxiliar para validar items de orden
  const validateOrderItems = useCallback(async (items: CreateOrderItemInput[]): Promise<boolean> => {
    try {
      for (const item of items) {
        const { data } = await supabase
          .from('products')
          .select('price, stock')
          .eq('id', item.product_id)
          .single()

        if (!data) return false
        if (data.stock < item.quantity) return false
        if (data.price !== item.price) return false
      }
      return true
    } catch {
      return false
    }
  }, [supabase])

  // Función auxiliar para actualizar stock
  const updateProductStock = useCallback(async (
    items: CreateOrderItemInput[],
    operation: 'decrease' | 'increase' = 'decrease'
  ) => {
    for (const item of items) {
      const quantityChange = operation === 'decrease' ? -item.quantity : item.quantity
      await supabase.rpc('update_product_stock', {
        p_product_id: item.product_id,
        p_quantity_change: quantityChange
      })
    }
  }, [supabase])

  const getOrders = useCallback(async (options?: OrderOptions) => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('orders_list', options)
      const cached = cachedOrders?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        let query = supabase
          .from('orders')
          .select(`
            *,
            items:order_items (
              *,
              product:products (*)
            )
          `)
          .order('created_at', { ascending: false })

        if (options?.userId) {
          query = query.eq('user_id', options.userId)
        }
        if (options?.status) {
          query = query.eq('status', options.status)
        }

        return await query
      })

      if (fetchError) throw fetchError

      // Cache the results
      if (data) {
        setCachedOrders(cacheKey, data)
      }

      return data as Order[]
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, cachedOrders, setCachedOrders, getCacheKey])

  const getOrderById = useCallback(async (orderId: string) => {
    try {
      setLoading(true)
      resetState()

      if (!orderId) {
        throw new Error('ID de orden requerido')
      }

      // Check cache first
      const cacheKey = getCacheKey('order', { orderId })
      const cached = cachedOrders?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        return await supabase
          .from('orders')
          .select(`
            *,
            items:order_items (
              *,
              product:products (*)
            )
          `)
          .eq('id', orderId)
          .single()
      })

      if (fetchError) throw fetchError

      // Cache the result
      if (data) {
        setCachedOrders(cacheKey, data)
      }

      return data as Order
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, cachedOrders, setCachedOrders, getCacheKey])

  const createOrder = useCallback(async (orderData: CreateOrderInput) => {
    try {
      setLoading(true)
      resetState()

      if (!session?.user?.id) {
        throw new Error('Usuario no autenticado')
      }

      // Validate items and stock
      const itemsValid = await validateOrderItems(orderData.items)
      if (!itemsValid) {
        throw new Error('Items de orden inválidos o sin stock suficiente')
      }

      const { data, error: createError } = await executeWithRetry(async () => {
        // Calculate total
        const total = calculateOrderTotal(orderData.items)

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([{
            ...orderData,
            total,
            status: 'PENDING',
            user_id: session.user.id
          }])
          .select()
          .single()

        if (orderError) throw orderError

        // Create order items
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(
            orderData.items.map(item => ({
              order_id: order.id,
              ...item
            }))
          )

        if (itemsError) throw itemsError

        // Update product stock
        await updateProductStock(orderData.items, 'decrease')

        // Get complete order with items
        const result = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items (
              *,
              product:products (*)
            )
          `)
          .eq('id', order.id)
          .single()

        if (result.data) {
          await logAction(
            'create_order' as OrderAuditAction,
            'order' as OrderAuditResource,
            {
              order_id: result.data.id,
              user_id: session.user.id,
              total
            } as OrderAuditPayload
          )

          // Invalidate related caches
          invalidateRelatedCache(['orders_list', 'order'])
        }

        return result
      })

      if (createError) throw createError

      return data as Order
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [
    supabase,
    session,
    setLoading,
    setError,
    resetState,
    executeWithRetry,
    validateOrderItems,
    calculateOrderTotal,
    updateProductStock,
    logAction,
    invalidateRelatedCache
  ])

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      setLoading(true)
      resetState()

      if (!orderId) {
        throw new Error('ID de orden requerido')
      }

      const { data, error: updateError } = await executeWithRetry(async () => {
        // Get current order
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', orderId)
          .single()

        if (!currentOrder) throw new Error('Orden no encontrada')

        // Validate status change
        if (!validateOrderStatus(currentOrder.status, status)) {
          throw new Error('Cambio de estado inválido')
        }

        // Update order status
        const result = await supabase
          .from('orders')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            items:order_items (
              *,
              product:products (*)
            )
          `)
          .single()

        if (result.data) {
          await logAction(
            'update_order_status' as OrderAuditAction,
            'order' as OrderAuditResource,
            {
              order_id: orderId,
              status
            } as OrderAuditPayload
          )

          // If cancelled, return items to stock
          if (status === 'CANCELLED') {
            await updateProductStock(result.data.items, 'increase')
          }

          // Invalidate related caches
          invalidateRelatedCache(['orders_list', 'order'])
        }

        return result
      })

      if (updateError) throw updateError

      return data as Order
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
    validateOrderStatus,
    updateProductStock,
    logAction,
    invalidateRelatedCache
  ])

  const updateShippingInfo = useCallback(async (orderId: string, shippingInfo: UpdateShippingInfo) => {
    try {
      setLoading(true)
      resetState()

      if (!orderId) {
        throw new Error('ID de orden requerido')
      }

      const { data, error: updateError } = await executeWithRetry(async () => {
        const result = await supabase
          .from('orders')
          .update({
            ...shippingInfo,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            items:order_items (
              *,
              product:products (*)
            )
          `)
          .single()

        if (result.data) {
          await logAction(
            'update_shipping_info' as OrderAuditAction,
            'order' as OrderAuditResource,
            {
              order_id: orderId,
              shipping_info: shippingInfo
            } as OrderAuditPayload
          )

          // Invalidate related caches
          invalidateRelatedCache(['orders_list', 'order'])
        }

        return result
      })

      if (updateError) throw updateError

      return data as Order
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, invalidateRelatedCache])

  const subscribeToOrderUpdates = useCallback((
    orderId: string,
    callback: (payload: OrderChangePayload) => void
  ) => {
    // Cleanup previous subscription
    if (activeSubscription) {
      activeSubscription.unsubscribe()
    }

    const subscription = supabase
      .channel(`order_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          try {
            // Invalidate caches
            invalidateRelatedCache(['orders_list', 'order'])

            const changePayload: OrderChangePayload = {
              eventType: payload.eventType as any,
              old: payload.old_record as Order,
              new: payload.new_record as Order
            }

            callback(changePayload)
          } catch (err) {
            console.error('Error processing order update:', err)
          }
        }
      )
      .subscribe()

    setActiveSubscription(subscription)

    return () => {
      subscription.unsubscribe()
      setActiveSubscription(null)
    }
  }, [supabase, activeSubscription, invalidateRelatedCache])

  return {
    loading,
    error,
    getOrders,
    getOrderById,
    createOrder,
    updateOrderStatus,
    updateShippingInfo,
    subscribeToOrderUpdates
  }
}
