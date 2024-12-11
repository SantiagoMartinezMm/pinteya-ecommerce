import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/hooks/useSession'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'

// Tipos base
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued'

export type InventoryMovementType = 'purchase' | 'sale' | 'return' | 'adjustment' | 'loss'

export interface InventoryItem {
  id: string
  product_id: string
  variant_id?: string
  sku: string
  quantity: number
  reserved_quantity: number
  available_quantity: number
  reorder_point: number
  optimal_stock: number
  warehouse_location?: string
  status: StockStatus
  last_counted_at: string
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  inventory_item_id: string
  type: InventoryMovementType
  quantity: number
  reference_id?: string
  reference_type?: string
  notes?: string
  created_by: string
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  name: string
  sku: string
  price: number
  attributes: Record<string, string>
  created_at: string
  updated_at: string
}

export interface StockReservation {
  id: string
  inventory_item_id: string
  quantity: number
  reference_id: string
  reference_type: string
  created_by: string
  created_at: string
}

export type CreateInventoryItemInput = Omit<
  InventoryItem,
  'id' | 'available_quantity' | 'status' | 'last_counted_at' | 'created_at' | 'updated_at'
>

export type UpdateInventoryItemInput = Partial<
  Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>
>

// Tipos de auditoría específicos para inventario
export type InventoryAuditAction = Extract<
  AuditAction,
  'create_inventory' | 'update_inventory' | 'stock_movement' | 'stock_count'
>

export type InventoryAuditResource = Extract<AuditResource, 'inventory'>

export interface InventoryAuditPayload extends Record<string, unknown> {
  inventory_id: string
  movement_type?: InventoryMovementType
  quantity?: number
  previous_quantity?: number
  new_quantity?: number
}

// Interfaces para respuestas paginadas
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// Interfaces para el hook
interface InventoryHookState {
  loading: boolean
  error: PostgrestError | null
}

interface InventoryHookActions {
  getInventoryItem: (productId: string, variantId?: string) => Promise<InventoryItem | null>
  createInventoryItem: (item: CreateInventoryItemInput) => Promise<InventoryItem | null>
  updateInventoryItem: (itemId: string, updates: UpdateInventoryItemInput) => Promise<InventoryItem | null>
  recordMovement: (
    itemId: string,
    type: InventoryMovementType,
    quantity: number,
    referenceId?: string,
    referenceType?: string,
    notes?: string
  ) => Promise<InventoryMovement | null>
  getMovementHistory: (
    itemId: string,
    page?: number,
    limit?: number
  ) => Promise<PaginatedResponse<InventoryMovement> | null>
  getLowStockItems: (
    page?: number,
    limit?: number
  ) => Promise<PaginatedResponse<InventoryItem> | null>
  performStockCount: (
    itemId: string,
    countedQuantity: number,
    notes?: string
  ) => Promise<InventoryItem | null>
  reserveStock: (
    itemId: string,
    quantity: number,
    referenceId: string,
    referenceType: string
  ) => Promise<InventoryItem | null>
  releaseStock: (
    itemId: string,
    referenceId: string,
    referenceType: string
  ) => Promise<InventoryItem | null>
}

export type InventoryHookReturn = InventoryHookState & InventoryHookActions

export function useInventory() {
  const supabase = createClient()
  const { session } = useSession()
  const { logAction } = useAudit()
  const { loading, error, setLoading, setError, resetState } = useLoadingState<PostgrestError>()
  const { data: cachedInventory, setData: setCachedInventory } = useCache<Record<string, any>>('inventory')
  const { executeWithRetry } = useRetry()
  const { getPaginationQuery, getPaginatedResponse } = usePagination()

  // Función auxiliar para generar claves de caché
  const getCacheKey = useCallback((key: string, params?: Record<string, any>) => {
    return params ? `${key}_${JSON.stringify(params)}` : key
  }, [])

  // Función auxiliar para invalidar caché relacionado
  const invalidateRelatedCache = useCallback((patterns: string[]) => {
    patterns.forEach(pattern => {
      const keys = Object.keys(cachedInventory || {}).filter(key => key.startsWith(pattern))
      keys.forEach(key => setCachedInventory(key, null))
    })
  }, [cachedInventory, setCachedInventory])

  // Función auxiliar para validar el estado de stock
  const calculateStockStatus = useCallback((
    quantity: number,
    reorderPoint: number,
    optimalStock: number
  ): StockStatus => {
    if (quantity <= 0) return 'out_of_stock'
    if (quantity <= reorderPoint) return 'low_stock'
    if (quantity >= optimalStock) return 'in_stock'
    return 'in_stock'
  }, [])

  // Función auxiliar para registrar movimientos de inventario
  const recordInventoryMovement = useCallback(async (
    inventoryItemId: string,
    type: InventoryMovementType,
    quantity: number,
    referenceId?: string,
    referenceType?: string,
    notes?: string
  ) => {
    const { error } = await supabase
      .from('inventory_movements')
      .insert({
        inventory_item_id: inventoryItemId,
        type,
        quantity,
        reference_id: referenceId,
        reference_type: referenceType,
        notes,
        created_by: session?.user?.id
      })

    if (error) throw error

    await logAction(
      'stock_movement' as InventoryAuditAction,
      'inventory' as InventoryAuditResource,
      {
        inventory_id: inventoryItemId,
        movement_type: type,
        quantity
      }
    )
  }, [supabase, session, logAction])

  const getInventoryItem = useCallback(async (
    productId: string,
    variantId?: string
  ): Promise<InventoryItem | null> => {
    try {
      setLoading(true)
      resetState()

      if (!productId) {
        throw new Error('ID de producto requerido')
      }

      // Check cache first
      const cacheKey = getCacheKey('inventory_item', { productId, variantId })
      const cached = cachedInventory?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        let query = supabase
          .from('inventory_items')
          .select('*')
          .eq('product_id', productId)

        if (variantId) {
          query = query.eq('variant_id', variantId)
        }

        return await query.single()
      })

      if (fetchError) throw fetchError

      // Cache the result
      if (data) {
        setCachedInventory(cacheKey, data)
      }

      return data as InventoryItem
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, cachedInventory, setCachedInventory, getCacheKey])

  const createInventoryItem = useCallback(async (
    item: CreateInventoryItemInput
  ): Promise<InventoryItem> => {
    try {
      setLoading(true)
      resetState()

      if (!session?.user?.id) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error: createError } = await executeWithRetry(async () => {
        const status = calculateStockStatus(
          item.quantity,
          item.reorder_point,
          item.optimal_stock
        )

        const result = await supabase
          .from('inventory_items')
          .insert([{
            ...item,
            available_quantity: item.quantity - (item.reserved_quantity || 0),
            status,
            last_counted_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (result.data) {
          await logAction(
            'create_inventory' as InventoryAuditAction,
            'inventory' as InventoryAuditResource,
            {
              inventory_id: result.data.id,
              quantity: item.quantity
            } as InventoryAuditPayload
          )

          // Invalidate related caches
          invalidateRelatedCache(['inventory_item', 'inventory_list'])
        }

        return result
      })

      if (createError) throw createError

      return data as InventoryItem
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, session, setLoading, setError, resetState, executeWithRetry, logAction, calculateStockStatus, invalidateRelatedCache])

  const updateInventoryItem = useCallback(async (
    itemId: string,
    updates: UpdateInventoryItemInput
  ): Promise<InventoryItem> => {
    try {
      setLoading(true)
      resetState()

      if (!itemId) {
        throw new Error('ID de item requerido')
      }

      const { data, error: updateError } = await executeWithRetry(async () => {
        // Get current state
        const { data: current } = await supabase
          .from('inventory_items')
          .select('quantity, reserved_quantity, reorder_point, optimal_stock')
          .eq('id', itemId)
          .single()

        if (!current) throw new Error('Item no encontrado')

        // Calculate new values
        const newQuantity = updates.quantity ?? current.quantity
        const newReservedQuantity = updates.reserved_quantity ?? current.reserved_quantity
        const availableQuantity = newQuantity - newReservedQuantity
        const reorderPoint = updates.reorder_point ?? current.reorder_point
        const optimalStock = updates.optimal_stock ?? current.optimal_stock

        const result = await supabase
          .from('inventory_items')
          .update({
            ...updates,
            available_quantity: availableQuantity,
            status: calculateStockStatus(newQuantity, reorderPoint, optimalStock),
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .select()
          .single()

        if (result.data) {
          await logAction(
            'update_inventory' as InventoryAuditAction,
            'inventory' as InventoryAuditResource,
            {
              inventory_id: itemId,
              previous_quantity: current.quantity,
              new_quantity: updates.quantity
            } as InventoryAuditPayload
          )

          // Invalidate related caches
          invalidateRelatedCache(['inventory_item', 'inventory_list'])
        }

        return result
      })

      if (updateError) throw updateError

      return data as InventoryItem
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, calculateStockStatus, invalidateRelatedCache])

  const recordMovement = useCallback(async (
    itemId: string,
    type: InventoryMovementType,
    quantity: number,
    referenceId?: string,
    referenceType?: string,
    notes?: string
  ): Promise<InventoryMovement> => {
    try {
      setLoading(true)
      resetState()

      if (!session?.user?.id) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error: movementError } = await executeWithRetry(async () => {
        // Record movement
        const movementResult = await recordInventoryMovement(
          itemId,
          type,
          quantity,
          referenceId,
          referenceType,
          notes
        )

        // Update inventory quantity
        const quantityChange = ['sale', 'loss'].includes(type) ? -quantity : quantity
        const { error: updateError } = await supabase.rpc('update_inventory_quantity', {
          p_item_id: itemId,
          p_quantity_change: quantityChange
        })

        if (updateError) throw updateError

        // Invalidate related caches
        invalidateRelatedCache(['inventory_item', 'inventory_list', 'movement'])

        return movementResult
      })

      if (movementError) throw movementError

      return data as InventoryMovement
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, session, setLoading, setError, resetState, executeWithRetry, recordInventoryMovement, invalidateRelatedCache])

  const getMovementHistory = useCallback(async (
    itemId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<InventoryMovement>> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('movement_history', { itemId, page, limit })
      const cached = cachedInventory?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError, count } = await executeWithRetry(async () => {
        const query = supabase
          .from('inventory_movements')
          .select('*', { count: 'exact' })
          .eq('inventory_item_id', itemId)
          .order('created_at', { ascending: false })

        return await getPaginationQuery(query, page, limit)
      })

      if (fetchError) throw fetchError

      const response = getPaginatedResponse(data, count || 0, page, limit)

      // Cache the results
      setCachedInventory(cacheKey, response)

      return response
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, getPaginationQuery, getPaginatedResponse, cachedInventory, setCachedInventory, getCacheKey])

  const getLowStockItems = useCallback(async (
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<InventoryItem>> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('low_stock_items', { page, limit })
      const cached = cachedInventory?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError, count } = await executeWithRetry(async () => {
        const query = supabase
          .from('inventory_items')
          .select('*', { count: 'exact' })
          .eq('status', 'low_stock')
          .order('quantity', { ascending: true })

        return await getPaginationQuery(query, page, limit)
      })

      if (fetchError) throw fetchError

      const response = getPaginatedResponse(data, count || 0, page, limit)

      // Cache the results
      setCachedInventory(cacheKey, response)

      return response
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, getPaginationQuery, getPaginatedResponse, cachedInventory, setCachedInventory, getCacheKey])

  const performStockCount = useCallback(async (
    itemId: string,
    countedQuantity: number,
    notes?: string
  ): Promise<InventoryItem> => {
    try {
      setLoading(true)
      resetState()

      if (!itemId) {
        throw new Error('ID de item requerido')
      }

      const { data, error: countError } = await executeWithRetry(async () => {
        // Get current state
        const { data: item } = await supabase
          .from('inventory_items')
          .select('quantity, reserved_quantity, reorder_point, optimal_stock')
          .eq('id', itemId)
          .single()

        if (!item) throw new Error('Item no encontrado')

        // Record adjustment if needed
        const difference = countedQuantity - item.quantity
        if (difference !== 0) {
          await recordInventoryMovement(
            itemId,
            'adjustment',
            Math.abs(difference),
            undefined,
            'stock_count',
            notes
          )
        }

        // Update inventory
        const result = await supabase
          .from('inventory_items')
          .update({
            quantity: countedQuantity,
            available_quantity: countedQuantity - item.reserved_quantity,
            status: calculateStockStatus(countedQuantity, item.reorder_point, item.optimal_stock),
            last_counted_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .select()
          .single()

        if (result.data) {
          await logAction(
            'stock_count' as InventoryAuditAction,
            'inventory' as InventoryAuditResource,
            {
              inventory_id: itemId,
              previous_quantity: item.quantity,
              new_quantity: countedQuantity
            } as InventoryAuditPayload
          )

          // Invalidate related caches
          invalidateRelatedCache(['inventory_item', 'inventory_list', 'low_stock_items'])
        }

        return result
      })

      if (countError) throw countError

      return data as InventoryItem
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, recordInventoryMovement, logAction, calculateStockStatus, invalidateRelatedCache])

  const reserveStock = useCallback(async (
    itemId: string,
    quantity: number,
    referenceId: string,
    referenceType: string
  ): Promise<InventoryItem> => {
    try {
      setLoading(true)
      resetState()

      if (!session?.user?.id) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error: reserveError } = await executeWithRetry(async () => {
        // Check current stock
        const { data: item } = await supabase
          .from('inventory_items')
          .select('quantity, reserved_quantity, available_quantity')
          .eq('id', itemId)
          .single()

        if (!item) throw new Error('Item no encontrado')
        if (item.available_quantity < quantity) {
          throw new Error('Stock insuficiente')
        }

        // Update inventory
        const result = await supabase
          .from('inventory_items')
          .update({
            reserved_quantity: item.reserved_quantity + quantity,
            available_quantity: item.available_quantity - quantity
          })
          .eq('id', itemId)
          .select()
          .single()

        if (result.error) throw result.error

        // Create reservation
        await supabase
          .from('stock_reservations')
          .insert([{
            inventory_item_id: itemId,
            quantity,
            reference_id: referenceId,
            reference_type: referenceType,
            created_by: session.user.id
          }])

        // Invalidate related caches
        invalidateRelatedCache(['inventory_item', 'inventory_list'])

        return result
      })

      if (reserveError) throw reserveError

      return data as InventoryItem
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, session, setLoading, setError, resetState, executeWithRetry, invalidateRelatedCache])

  const releaseStock = useCallback(async (
    itemId: string,
    referenceId: string,
    referenceType: string
  ): Promise<InventoryItem> => {
    try {
      setLoading(true)
      resetState()

      const { data, error: releaseError } = await executeWithRetry(async () => {
        // Find reservation
        const { data: reservation } = await supabase
          .from('stock_reservations')
          .select('quantity')
          .eq('inventory_item_id', itemId)
          .eq('reference_id', referenceId)
          .eq('reference_type', referenceType)
          .single()

        if (!reservation) throw new Error('Reserva no encontrada')

        // Release stock
        const result = await supabase.rpc('release_stock_reservation', {
          p_item_id: itemId,
          p_quantity: reservation.quantity,
          p_reference_id: referenceId,
          p_reference_type: referenceType
        })

        if (result.error) throw result.error

        // Invalidate related caches
        invalidateRelatedCache(['inventory_item', 'inventory_list'])

        return result
      })

      if (releaseError) throw releaseError

      return data as InventoryItem
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, invalidateRelatedCache])

  return {
    loading,
    error,
    getInventoryItem,
    createInventoryItem,
    updateInventoryItem,
    recordMovement,
    getMovementHistory,
    getLowStockItems,
    performStockCount,
    reserveStock,
    releaseStock
  }
}
