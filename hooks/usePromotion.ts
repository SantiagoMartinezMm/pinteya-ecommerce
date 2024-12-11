import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit } from './useAudit'

export type PromotionType = 
  | 'percentage_discount'
  | 'fixed_amount_discount'
  | 'buy_x_get_y'
  | 'free_shipping'
  | 'bundle_discount'
  | 'flash_sale'

export type PromotionStatus = 'draft' | 'active' | 'scheduled' | 'expired' | 'cancelled'

export type DiscountTarget = 
  | 'cart_total'
  | 'specific_products'
  | 'specific_categories'
  | 'shipping'

export type ConditionType = 'min_purchase' | 'min_items' | 'specific_customer' | 'first_purchase' | 'payment_method'

export interface Condition {
  type: ConditionType
  value: number | string | boolean
}

export interface CartItem {
  id: string
  quantity: number
  price: number
}

export interface Promotion {
  id: string
  name: string
  description: string
  type: PromotionType
  target: DiscountTarget
  discount_value: number
  conditions?: Condition[]
  start_date: string
  end_date: string
  usage_limit?: number
  usage_count: number
  minimum_purchase?: number
  maximum_discount?: number
  applicable_products?: string[]
  applicable_categories?: string[]
  coupon_code?: string
  status: PromotionStatus
  created_at: string
  updated_at: string
}

export type CreatePromotionInput = Omit<
  Promotion,
  'id' | 'usage_count' | 'status' | 'created_at' | 'updated_at'
>

export type UpdatePromotionInput = Partial<
  Omit<Promotion, 'id' | 'created_at' | 'updated_at'>
>

export interface AffectedItem {
  item_id: string
  original_price: number
  discounted_price: number
}

export interface AppliedPromotion {
  promotion: Promotion
  discount_amount: number
  affected_items: AffectedItem[]
}

export interface ValidationResult {
  valid: boolean
  reason?: 'invalid_code' | 'usage_limit_reached' | 'minimum_purchase_not_met' | 'minimum_items_not_met' | 'not_first_purchase' | 'error'
  minimum_purchase?: number
  promotion?: Promotion
}

export function usePromotion() {
  const supabase = createClient()
  const { user } = useAuth()
  const { logAction } = useAudit()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getActivePromotions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .order('created_at', { ascending: false })

      if (error) throw error

      await logAction(
        'promotion.list' as any,
        'promotion',
        { status: 'active', timestamp: now }
      )

      return data as Promotion[]

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const createPromotion = useCallback(async (promotion: CreatePromotionInput) => {
    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      const startDate = new Date(promotion.start_date)
      const endDate = new Date(promotion.end_date)
      
      const status: PromotionStatus = 
        startDate > now 
          ? 'scheduled'
          : endDate < now
            ? 'expired'
            : 'active'

      const { data, error } = await supabase
        .from('promotions')
        .insert([{
          ...promotion,
          usage_count: 0,
          status
        }])
        .select()
        .single()

      if (error) throw error

      await logAction(
        'promotion.create' as any,
        'promotion',
        { 
          promotion_id: data.id,
          promotion_type: promotion.type,
          status 
        }
      )

      return data as Promotion

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const updatePromotion = useCallback(async (
    promotionId: string,
    updates: UpdatePromotionInput
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Si se actualizan las fechas, actualizar el estado
      if (updates.start_date || updates.end_date) {
        const { data: current } = await supabase
          .from('promotions')
          .select('start_date, end_date')
          .eq('id', promotionId)
          .single()

        if (current) {
          const startDate = new Date(updates.start_date || current.start_date)
          const endDate = new Date(updates.end_date || current.end_date)
          const now = new Date()

          updates.status = 
            startDate > now 
              ? 'scheduled'
              : endDate < now
                ? 'expired'
                : 'active'
        }
      }

      const { data, error } = await supabase
        .from('promotions')
        .update(updates)
        .eq('id', promotionId)
        .select()
        .single()

      if (error) throw error

      await logAction(
        'promotion.update' as any,
        'promotion',
        { 
          promotion_id: promotionId,
          updates: Object.keys(updates),
          new_status: updates.status
        }
      )

      return data as Promotion

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const validateCoupon = useCallback(async (
    code: string,
    cartTotal: number,
    items: CartItem[]
  ): Promise<ValidationResult> => {
    try {
      setLoading(true)
      setError(null)

      const now = new Date().toISOString()

      // Buscar promoción activa con el código
      const { data: promotion, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('coupon_code', code)
        .eq('status', 'active')
        .lte('start_date', now)
        .gte('end_date', now)
        .single()

      if (error) throw error
      if (!promotion) return { valid: false, reason: 'invalid_code' }

      // Validar límite de uso
      if (promotion.usage_limit && promotion.usage_count >= promotion.usage_limit) {
        return { valid: false, reason: 'usage_limit_reached' }
      }

      // Validar monto mínimo de compra
      if (promotion.minimum_purchase && cartTotal < promotion.minimum_purchase) {
        return {
          valid: false,
          reason: 'minimum_purchase_not_met',
          minimum_purchase: promotion.minimum_purchase
        }
      }

      // Validar condiciones específicas
      if (promotion.conditions) {
        for (const condition of promotion.conditions) {
          switch (condition.type) {
            case 'min_items':
              const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
              if (typeof condition.value === 'number' && totalItems < condition.value) {
                return { valid: false, reason: 'minimum_items_not_met' }
              }
              break
            case 'first_purchase':
              if (condition.value && user?.id) {
                const { data: previousOrders } = await supabase
                  .from('orders')
                  .select('id')
                  .eq('user_id', user.id)
                  .limit(1)

                if (previousOrders?.length) {
                  return { valid: false, reason: 'not_first_purchase' }
                }
              }
              break
          }
        }
      }

      await logAction(
        'promotion.validate' as any,
        'promotion',
        { 
          promotion_id: promotion.id,
          code,
          cart_total: cartTotal,
          items_count: items.length,
          valid: true
        }
      )

      return { valid: true, promotion }

    } catch (error) {
      setError(error as PostgrestError)
      return { valid: false, reason: 'error' }
    } finally {
      setLoading(false)
    }
  }, [user?.id, logAction])

  const calculateDiscount = useCallback((
    promotion: Promotion,
    items: CartItem[],
    cartTotal: number,
    shippingCost: number
  ): AppliedPromotion => {
    let discountAmount = 0
    const affectedItems: AffectedItem[] = []

    switch (promotion.type) {
      case 'percentage_discount':
        if (promotion.target === 'cart_total') {
          discountAmount = (cartTotal * promotion.discount_value) / 100
        } else if (promotion.target === 'specific_products') {
          items.forEach(item => {
            if (promotion.applicable_products?.includes(item.id)) {
              const itemDiscount = (item.price * promotion.discount_value) / 100
              discountAmount += itemDiscount * item.quantity
              affectedItems.push({
                item_id: item.id,
                original_price: item.price,
                discounted_price: item.price - itemDiscount
              })
            }
          })
        }
        break

      case 'fixed_amount_discount':
        discountAmount = promotion.discount_value
        break

      case 'free_shipping':
        if (promotion.target === 'shipping') {
          discountAmount = shippingCost
        }
        break

      case 'buy_x_get_y':
        // Implementar lógica para promociones tipo "compre X lleve Y"
        break

      case 'bundle_discount':
        // Implementar lógica para descuentos en paquetes
        break
    }

    // Aplicar límite máximo de descuento si existe
    if (promotion.maximum_discount) {
      discountAmount = Math.min(discountAmount, promotion.maximum_discount)
    }

    return {
      promotion,
      discount_amount: discountAmount,
      affected_items: affectedItems
    }
  }, [])

  const applyPromotion = useCallback(async (
    promotionId: string,
    orderId: string,
    discountAmount: number
  ) => {
    try {
      setLoading(true)
      setError(null)

      if (!user?.id) {
        throw new Error('Usuario no autenticado')
      }

      // Registrar uso de la promoción
      const { error: usageError } = await supabase
        .from('promotion_usage')
        .insert([{
          promotion_id: promotionId,
          order_id: orderId,
          user_id: user.id,
          discount_amount: discountAmount
        }])

      if (usageError) throw usageError

      // Incrementar contador de uso
      const { error: updateError } = await supabase.rpc('increment_promotion_usage', {
        p_promotion_id: promotionId
      })

      if (updateError) throw updateError

      await logAction(
        'promotion.apply' as any,
        'promotion',
        { 
          promotion_id: promotionId,
          order_id: orderId,
          discount_amount: discountAmount
        }
      )

      return true

    } catch (error) {
      setError(error as PostgrestError)
      return false
    } finally {
      setLoading(false)
    }
  }, [user?.id, logAction])

  return {
    loading,
    error,
    getActivePromotions,
    createPromotion,
    updatePromotion,
    validateCoupon,
    calculateDiscount,
    applyPromotion
  }
}
