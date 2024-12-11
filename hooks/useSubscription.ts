import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const planSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  price: z.number().min(0),
  interval: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  limits: z.object({
    products: z.number(),
    orders: z.number(),
    storage: z.number(),
    analytics: z.boolean()
  }),
  is_active: z.boolean(),
  trial_days: z.number().optional(),
  metadata: z.record(z.unknown()).optional()
})

const subscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum([
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'trialing',
    'unpaid'
  ]),
  current_period_start: z.string(),
  current_period_end: z.string(),
  cancel_at_period_end: z.boolean(),
  trial_end: z.string().nullable(),
  canceled_at: z.string().nullable(),
  ended_at: z.string().nullable(),
  usage: z.object({
    products: z.number(),
    orders: z.number(),
    storage: z.number()
  }),
  payment_method: z.object({
    type: z.string(),
    last4: z.string(),
    exp_month: z.number(),
    exp_year: z.number()
  }).optional()
})

export type Plan = z.infer<typeof planSchema>
export type Subscription = z.infer<typeof subscriptionSchema>

export interface SubscriptionError extends BaseError {
  code: 'SUBSCRIPTION_ERROR'
  details: {
    type: 'PAYMENT' | 'PLAN' | 'LIMIT' | 'SERVER_ERROR'
    field?: string
    originalError?: unknown
  }
}

export interface SubscriptionHookReturn {
  subscription: Subscription | null
  availablePlans: Plan[]
  isLoading: boolean
  subscribe: (planId: string, paymentMethodId?: string) => Promise<void>
  cancelSubscription: (immediate?: boolean) => Promise<void>
  updatePaymentMethod: (paymentMethodId: string) => Promise<void>
  checkLimit: (type: keyof Subscription['usage']) => boolean
  getRemainingDays: () => number
  isFeatureAvailable: (feature: string) => boolean
  refreshSubscription: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 15 // 15 minutos

export function useSubscription(): SubscriptionHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 3,
    delay: 1000
  })

  // Cache para planes y suscripción
  const { 
    data: subscriptionData, 
    setData: setSubscriptionData 
  } = useCache<{
    subscription: Subscription | null
    plans: Plan[]
  }>({
    key: `subscription-${user?.id}`,
    ttl: CACHE_TTL
  })

  const handleSubscriptionError = (
    error: unknown, 
    type: SubscriptionError['details']['type'], 
    field?: string
  ): never => {
    throw new BaseError('Error en suscripción', {
      code: 'SUBSCRIPTION_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  // Cargar suscripción actual
  const fetchSubscription = useCallback(async (): Promise<Subscription | null> => {
    if (!user?.id) return null

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      handleSubscriptionError(error, 'SERVER_ERROR')
    }

    return data ? subscriptionSchema.parse(data) : null
  }, [user?.id])

  // Cargar planes disponibles
  const fetchPlans = useCallback(async (): Promise<Plan[]> => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) {
      handleSubscriptionError(error, 'SERVER_ERROR')
    }

    return data?.map(plan => planSchema.parse(plan)) || []
  }, [])

  // Refrescar datos
  const refreshSubscription = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      const [subscription, plans] = await Promise.all([
        executeWithRetry(fetchSubscription),
        executeWithRetry(fetchPlans)
      ])

      setSubscriptionData({
        subscription,
        plans
      })
    } catch (err) {
      throw new BaseError('Error al refrescar suscripción', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchSubscription, fetchPlans])

  // Suscribirse a un plan
  const subscribe = useCallback(async (
    planId: string,
    paymentMethodId?: string
  ): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      const plan = subscriptionData?.plans.find(p => p.id === planId)
      if (!plan) {
        handleSubscriptionError(new Error('Plan no encontrado'), 'PLAN')
      }

      await executeWithRetry(async () => {
        // Aquí se integraría con el sistema de pagos (Stripe, etc.)
        // Por ahora solo actualizamos la base de datos

        const subscription: Partial<Subscription> = {
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
          usage: {
            products: 0,
            orders: 0,
            storage: 0
          }
        }

        if (paymentMethodId) {
          // Aquí se procesaría el método de pago
        }

        const { error } = await supabase
          .from('subscriptions')
          .upsert(subscription)

        if (error) {
          handleSubscriptionError(error, 'PAYMENT')
        }

        await refreshSubscription()
      })
    } catch (err) {
      throw new BaseError('Error al suscribirse', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, subscriptionData?.plans, startLoading, stopLoading, executeWithRetry, refreshSubscription])

  // Cancelar suscripción
  const cancelSubscription = useCallback(async (immediate = false): Promise<void> => {
    try {
      startLoading()

      if (!user?.id || !subscriptionData?.subscription) {
        throw new ValidationError('No hay suscripción activa')
      }

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: immediate ? 'canceled' : 'active',
            cancel_at_period_end: !immediate,
            canceled_at: new Date().toISOString(),
            ended_at: immediate ? new Date().toISOString() : null
          })
          .eq('id', subscriptionData.subscription?.id)

        if (error) {
          handleSubscriptionError(error, 'SERVER_ERROR')
        }

        await refreshSubscription()
      })
    } catch (err) {
      throw new BaseError('Error al cancelar suscripción', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, subscriptionData?.subscription, startLoading, stopLoading, executeWithRetry, refreshSubscription])

  // Actualizar método de pago
  const updatePaymentMethod = useCallback(async (
    paymentMethodId: string
  ): Promise<void> => {
    try {
      startLoading()

      if (!user?.id || !subscriptionData?.subscription) {
        throw new ValidationError('No hay suscripción activa')
      }

      // Aquí se integraría con el sistema de pagos
      // Por ahora solo simulamos la actualización

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('subscriptions')
          .update({
            payment_method: {
              type: 'card',
              last4: '4242',
              exp_month: 12,
              exp_year: 2025
            }
          })
          .eq('id', subscriptionData.subscription?.id)

        if (error) {
          handleSubscriptionError(error, 'PAYMENT')
        }

        await refreshSubscription()
      })
    } catch (err) {
      throw new BaseError('Error al actualizar método de pago', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, subscriptionData?.subscription, startLoading, stopLoading, executeWithRetry, refreshSubscription])

  // Verificar límites
  const checkLimit = useCallback((type: keyof Subscription['usage']): boolean => {
    if (!subscriptionData?.subscription) return false

    const { usage } = subscriptionData.subscription
    const plan = subscriptionData.plans.find(
      p => p.id === subscriptionData.subscription?.plan_id
    )

    if (!plan) return false

    return usage[type] < plan.limits[type]
  }, [subscriptionData])

  // Obtener días restantes
  const getRemainingDays = useCallback((): number => {
    if (!subscriptionData?.subscription) return 0

    const end = new Date(subscriptionData.subscription.current_period_end)
    const now = new Date()
    const diff = end.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [subscriptionData?.subscription])

  // Verificar disponibilidad de característica
  const isFeatureAvailable = useCallback((feature: string): boolean => {
    if (!subscriptionData?.subscription) return false

    const plan = subscriptionData.plans.find(
      p => p.id === subscriptionData.subscription?.plan_id
    )

    return plan?.features.includes(feature) || false
  }, [subscriptionData])

  // Cargar datos iniciales
  useEffect(() => {
    if (user?.id) {
      void refreshSubscription()
    }
  }, [user?.id])

  return {
    subscription: subscriptionData?.subscription || null,
    availablePlans: subscriptionData?.plans || [],
    isLoading,
    subscribe,
    cancelSubscription,
    updatePaymentMethod,
    checkLimit,
    getRemainingDays,
    isFeatureAvailable,
    refreshSubscription
  }
} 