import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const discountSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(3).max(50),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y']),
  value: z.number().min(0),
  min_purchase_amount: z.number().min(0).optional(),
  max_discount_amount: z.number().min(0).optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  usage_limit: z.number().min(0).optional(),
  used_count: z.number().default(0),
  is_active: z.boolean().default(true),
  is_public: z.boolean().default(true),
  description: z.string().optional(),
  conditions: z.object({
    product_ids: z.array(z.string().uuid()).optional(),
    category_ids: z.array(z.string().uuid()).optional(),
    user_ids: z.array(z.string().uuid()).optional(),
    user_groups: z.array(z.string()).optional(),
    min_items: z.number().min(0).optional(),
    max_items: z.number().min(0).optional(),
    allowed_payment_methods: z.array(z.string()).optional(),
    first_time_purchase: z.boolean().optional(),
    buy_x_get_y_config: z.object({
      buy_quantity: z.number().min(1),
      get_quantity: z.number().min(1),
      product_id: z.string().uuid().optional(),
      category_id: z.string().uuid().optional()
    }).optional()
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

const discountUsageSchema = z.object({
  id: z.string().uuid(),
  discount_id: z.string().uuid(),
  user_id: z.string().uuid(),
  order_id: z.string().uuid(),
  amount_saved: z.number(),
  created_at: z.string().datetime()
})

export type Discount = z.infer<typeof discountSchema>
export type DiscountUsage = z.infer<typeof discountUsageSchema>

export interface DiscountError extends BaseError {
  code: 'DISCOUNT_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'EXPIRED' | 'LIMIT_REACHED' | 'NOT_ELIGIBLE' | 'SERVER_ERROR'
    discount_code?: string
    originalError?: unknown
  }
}

export interface DiscountValidationResult {
  isValid: boolean
  discount?: Discount
  error?: {
    type: DiscountError['details']['type']
    message: string
  }
  savings?: {
    amount: number
    details: string
  }
}

export interface DiscountFilters {
  active_only?: boolean
  public_only?: boolean
  type?: Discount['type']
  search?: string
  sort_by?: 'created_at' | 'usage' | 'value' | 'ends_at'
  sort_order?: 'asc' | 'desc'
}

export interface DiscountsHookReturn {
  discounts: Discount[]
  userDiscounts: Discount[]
  discountUsage: Record<string, DiscountUsage[]>
  isLoading: boolean
  getDiscounts: (filters?: DiscountFilters) => Promise<Discount[]>
  getUserDiscounts: () => Promise<Discount[]>
  getDiscountByCode: (code: string) => Promise<Discount>
  validateDiscount: (code: string, cartTotal: number, items: Array<{ id: string, quantity: number }>) => Promise<DiscountValidationResult>
  createDiscount: (discount: Omit<Discount, 'id' | 'used_count' | 'created_at' | 'updated_at'>) => Promise<Discount>
  updateDiscount: (id: string, updates: Partial<Discount>) => Promise<Discount>
  deleteDiscount: (id: string) => Promise<void>
  applyDiscount: (code: string, orderId: string, amount: number) => Promise<void>
  calculateDiscountAmount: (discount: Discount, subtotal: number, items: Array<{ id: string, quantity: number, price: number }>) => number
  refreshDiscounts: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

export function useDiscounts(): DiscountsHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()

  // Cache para descuentos
  const {
    data: discountsState,
    setData: setDiscountsState
  } = useCache<{
    discounts: Discount[]
    userDiscounts: Discount[]
    usage: Record<string, DiscountUsage[]>
  }>({
    key: 'discounts-state',
    ttl: CACHE_TTL,
    initialData: {
      discounts: [],
      userDiscounts: [],
      usage: {}
    }
  })

  const handleDiscountError = (
    error: unknown,
    type: DiscountError['details']['type'],
    discount_code?: string
  ): never => {
    throw new BaseError('Error en descuentos', {
      code: 'DISCOUNT_ERROR',
      details: {
        type,
        discount_code,
        originalError: error
      }
    })
  }

  // Obtener todos los descuentos
  const getDiscounts = useCallback(async (
    filters: DiscountFilters = {}
  ): Promise<Discount[]> => {
    try {
      startLoading()

      let query = supabase
        .from('discounts')
        .select('*')

      if (filters.active_only) {
        const now = new Date().toISOString()
        query = query
          .eq('is_active', true)
          .lte('starts_at', now)
          .or(`ends_at.gt.${now},ends_at.is.null`)
      }

      if (filters.public_only) {
        query = query.eq('is_public', true)
      }

      if (filters.type) {
        query = query.eq('type', filters.type)
      }

      if (filters.search) {
        query = query.or(`code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      // Ordenamiento
      const orderColumn = filters.sort_by || 'created_at'
      const orderDirection = filters.sort_order || 'desc'
      query = query.order(orderColumn, { ascending: orderDirection === 'asc' })

      const { data: discounts, error } = await executeWithRetry(() =>
        query.returns<Discount[]>()
      )

      if (error) {
        handleDiscountError(error, 'SERVER_ERROR')
      }

      setDiscountsState(prev => ({
        ...prev,
        discounts: discounts || []
      }))

      return discounts || []
    } catch (err) {
      throw new BaseError('Error al obtener descuentos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener descuentos del usuario
  const getUserDiscounts = useCallback(async (): Promise<Discount[]> => {
    if (!user) {
      return []
    }

    try {
      startLoading()

      const now = new Date().toISOString()
      const { data: discounts, error } = await executeWithRetry(() =>
        supabase
          .from('discounts')
          .select('*')
          .eq('is_active', true)
          .lte('starts_at', now)
          .or(`ends_at.gt.${now},ends_at.is.null`)
          .or(`conditions->user_ids.cs.{${user.id}},conditions->user_groups.cs.{${user.user_metadata?.group || ''}}`)
      )

      if (error) {
        handleDiscountError(error, 'SERVER_ERROR')
      }

      setDiscountsState(prev => ({
        ...prev,
        userDiscounts: discounts || []
      }))

      return discounts || []
    } catch (err) {
      throw new BaseError('Error al obtener descuentos del usuario', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Obtener descuento por código
  const getDiscountByCode = useCallback(async (code: string): Promise<Discount> => {
    try {
      startLoading()

      const { data: discount, error } = await executeWithRetry(() =>
        supabase
          .from('discounts')
          .select('*')
          .eq('code', code.toUpperCase())
          .single()
      )

      if (error) {
        handleDiscountError(error, 'NOT_FOUND', code)
      }

      return discount
    } catch (err) {
      throw new BaseError('Error al obtener descuento', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Validar descuento
  const validateDiscount = useCallback(async (
    code: string,
    cartTotal: number,
    items: Array<{ id: string, quantity: number }>
  ): Promise<DiscountValidationResult> => {
    try {
      const discount = await getDiscountByCode(code)

      // Validar estado activo
      if (!discount.is_active) {
        return {
          isValid: false,
          error: {
            type: 'NOT_ELIGIBLE',
            message: 'El descuento no está activo'
          }
        }
      }

      // Validar fechas
      const now = new Date()
      if (new Date(discount.starts_at) > now) {
        return {
          isValid: false,
          error: {
            type: 'NOT_ELIGIBLE',
            message: 'El descuento aún no está vigente'
          }
        }
      }
      if (discount.ends_at && new Date(discount.ends_at) < now) {
        return {
          isValid: false,
          error: {
            type: 'EXPIRED',
            message: 'El descuento ha expirado'
          }
        }
      }

      // Validar límite de uso
      if (discount.usage_limit && discount.used_count >= discount.usage_limit) {
        return {
          isValid: false,
          error: {
            type: 'LIMIT_REACHED',
            message: 'El descuento ha alcanzado su límite de uso'
          }
        }
      }

      // Validar monto mínimo
      if (discount.min_purchase_amount && cartTotal < discount.min_purchase_amount) {
        return {
          isValid: false,
          error: {
            type: 'NOT_ELIGIBLE',
            message: `El monto mínimo de compra es ${discount.min_purchase_amount}`
          }
        }
      }

      // Validar condiciones específicas
      if (discount.conditions) {
        // Validar productos
        if (discount.conditions.product_ids?.length) {
          const hasValidProduct = items.some(item => 
            discount.conditions.product_ids.includes(item.id)
          )
          if (!hasValidProduct) {
            return {
              isValid: false,
              error: {
                type: 'NOT_ELIGIBLE',
                message: 'El descuento no aplica para los productos seleccionados'
              }
            }
          }
        }

        // Validar cantidad de items
        if (discount.conditions.min_items) {
          const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
          if (totalItems < discount.conditions.min_items) {
            return {
              isValid: false,
              error: {
                type: 'NOT_ELIGIBLE',
                message: `Se requieren al menos ${discount.conditions.min_items} items`
              }
            }
          }
        }

        // Validar usuario
        if (discount.conditions.user_ids?.length) {
          if (!user || !discount.conditions.user_ids.includes(user.id)) {
            return {
              isValid: false,
              error: {
                type: 'NOT_ELIGIBLE',
                message: 'El descuento es exclusivo para usuarios específicos'
              }
            }
          }
        }

        // Validar grupo de usuario
        if (discount.conditions.user_groups?.length) {
          if (!user?.user_metadata?.group || 
              !discount.conditions.user_groups.includes(user.user_metadata.group)) {
            return {
              isValid: false,
              error: {
                type: 'NOT_ELIGIBLE',
                message: 'El descuento es exclusivo para grupos específicos'
              }
            }
          }
        }

        // Validar primera compra
        if (discount.conditions.first_time_purchase) {
          const { data: previousOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', user?.id)
            .limit(1)

          if (previousOrders?.length) {
            return {
              isValid: false,
              error: {
                type: 'NOT_ELIGIBLE',
                message: 'El descuento es solo para primera compra'
              }
            }
          }
        }
      }

      // Calcular ahorro
      const savings = {
        amount: calculateDiscountAmount(discount, cartTotal, items.map(item => ({
          ...item,
          price: 0 // TODO: Obtener precio real
        }))),
        details: getDiscountDescription(discount)
      }

      return {
        isValid: true,
        discount,
        savings
      }
    } catch (err) {
      throw new BaseError('Error al validar descuento', { cause: err })
    }
  }, [user, getDiscountByCode])

  // Crear descuento
  const createDiscount = useCallback(async (
    discount: Omit<Discount, 'id' | 'used_count' | 'created_at' | 'updated_at'>
  ): Promise<Discount> => {
    try {
      startLoading()

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('discounts')
          .insert([{
            ...discount,
            code: discount.code.toUpperCase(),
            used_count: 0
          }])
          .select()
          .single()
      )

      if (error) {
        handleDiscountError(error, 'SERVER_ERROR')
      }

      setDiscountsState(prev => ({
        ...prev,
        discounts: [...prev.discounts, data]
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al crear descuento', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Actualizar descuento
  const updateDiscount = useCallback(async (
    id: string,
    updates: Partial<Discount>
  ): Promise<Discount> => {
    try {
      startLoading()

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('discounts')
          .update({
            ...updates,
            code: updates.code?.toUpperCase()
          })
          .eq('id', id)
          .select()
          .single()
      )

      if (error) {
        handleDiscountError(error, 'SERVER_ERROR')
      }

      setDiscountsState(prev => ({
        ...prev,
        discounts: prev.discounts.map(d =>
          d.id === id ? { ...d, ...data } : d
        )
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al actualizar descuento', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Eliminar descuento
  const deleteDiscount = useCallback(async (id: string): Promise<void> => {
    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('discounts')
          .delete()
          .eq('id', id)
      )

      if (error) {
        handleDiscountError(error, 'SERVER_ERROR')
      }

      setDiscountsState(prev => ({
        ...prev,
        discounts: prev.discounts.filter(d => d.id !== id)
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar descuento', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Aplicar descuento
  const applyDiscount = useCallback(async (
    code: string,
    orderId: string,
    amount: number
  ): Promise<void> => {
    try {
      startLoading()

      const discount = await getDiscountByCode(code)

      // Registrar uso
      const { error: usageError } = await executeWithRetry(() =>
        supabase
          .from('discount_usage')
          .insert([{
            discount_id: discount.id,
            user_id: user.id,
            order_id: orderId,
            amount_saved: amount
          }])
      )

      if (usageError) {
        handleDiscountError(usageError, 'SERVER_ERROR', code)
      }

      // Incrementar contador
      const { error: updateError } = await executeWithRetry(() =>
        supabase
          .from('discounts')
          .update({ used_count: discount.used_count + 1 })
          .eq('id', discount.id)
      )

      if (updateError) {
        handleDiscountError(updateError, 'SERVER_ERROR', code)
      }

      // Actualizar cache
      setDiscountsState(prev => ({
        ...prev,
        discounts: prev.discounts.map(d =>
          d.id === discount.id
            ? { ...d, used_count: d.used_count + 1 }
            : d
        )
      }))
    } catch (err) {
      throw new BaseError('Error al aplicar descuento', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading, getDiscountByCode])

  // Calcular monto de descuento
  const calculateDiscountAmount = useCallback((
    discount: Discount,
    subtotal: number,
    items: Array<{ id: string, quantity: number, price: number }>
  ): number => {
    let amount = 0

    switch (discount.type) {
      case 'percentage':
        amount = subtotal * (discount.value / 100)
        break

      case 'fixed_amount':
        amount = Math.min(discount.value, subtotal)
        break

      case 'free_shipping':
        // TODO: Implementar lógica de envío gratis
        amount = 0
        break

      case 'buy_x_get_y':
        if (discount.conditions?.buy_x_get_y_config) {
          const config = discount.conditions.buy_x_get_y_config
          const eligibleItems = items.filter(item => {
            if (config.product_id) return item.id === config.product_id
            // TODO: Validar categoría si config.category_id está presente
            return true
          })

          for (const item of eligibleItems) {
            const sets = Math.floor(item.quantity / (config.buy_quantity + config.get_quantity))
            amount += sets * config.get_quantity * item.price
          }
        }
        break
    }

    // Aplicar límite máximo si existe
    if (discount.max_discount_amount) {
      amount = Math.min(amount, discount.max_discount_amount)
    }

    return amount
  }, [])

  // Obtener descripción del descuento
  const getDiscountDescription = (discount: Discount): string => {
    switch (discount.type) {
      case 'percentage':
        return `${discount.value}% de descuento`
      case 'fixed_amount':
        return `$${discount.value} de descuento`
      case 'free_shipping':
        return 'Envío gratis'
      case 'buy_x_get_y':
        if (discount.conditions?.buy_x_get_y_config) {
          const config = discount.conditions.buy_x_get_y_config
          return `Compra ${config.buy_quantity} y lleva ${config.get_quantity} gratis`
        }
        return 'Promoción especial'
      default:
        return discount.description || 'Descuento'
    }
  }

  // Refrescar descuentos
  const refreshDiscounts = useCallback(async (): Promise<void> => {
    await Promise.all([
      getDiscounts(),
      getUserDiscounts()
    ])
  }, [getDiscounts, getUserDiscounts])

  return {
    discounts: discountsState?.discounts || [],
    userDiscounts: discountsState?.userDiscounts || [],
    discountUsage: discountsState?.usage || {},
    isLoading,
    getDiscounts,
    getUserDiscounts,
    getDiscountByCode,
    validateDiscount,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    applyDiscount,
    calculateDiscountAmount,
    refreshDiscounts
  }
}
