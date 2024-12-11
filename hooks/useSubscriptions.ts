import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/hooks/useSession'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit } from './useAudit'

export type SubscriptionStatus = 
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'pending'
  | 'trial'
  | 'past_due'

export type BillingInterval = 
  | 'monthly'
  | 'quarterly'
  | 'biannual'
  | 'annual'

export type SubscriptionPlan = {
  id: string
  name: string
  description: string
  price: number
  billing_interval: BillingInterval
  features: string[]
  trial_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Subscription = {
  id: string
  user_id: string
  plan_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  trial_end?: string
  cancelled_at?: string
  cancellation_reason?: string
  payment_method_id?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export type SubscriptionUsage = {
  id: string
  subscription_id: string
  feature: string
  used_quantity: number
  limit: number
  reset_at: string
  created_at: string
  updated_at: string
}

export type CreateSubscriptionInput = {
  plan_id: string
  payment_method_id?: string
  trial_end?: string
  metadata?: Record<string, any>
}

export type UpdateSubscriptionInput = Partial<{
  plan_id: string
  payment_method_id: string
  metadata: Record<string, any>
}>

export function useSubscriptions() {
  const supabase = createClient()
  const { session } = useSession()
  const { logAction } = useAudit()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getSubscriptionPlans = useCallback(async (includeInactive = false) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      return data as SubscriptionPlan[]

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getCurrentSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!session?.user?.id) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', session.user.id)
        .neq('status', 'expired')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) throw error

      return data as Subscription & { subscription_plans: SubscriptionPlan }

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  const createSubscription = useCallback(async (input: CreateSubscriptionInput) => {
    try {
      setLoading(true)
      setError(null)

      if (!session?.user?.id) {
        throw new Error('User not authenticated')
      }

      // Obtener el plan
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', input.plan_id)
        .single()

      if (planError) throw planError

      // Crear la suscripción
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: session.user.id,
          plan_id: input.plan_id,
          status: plan.trial_days > 0 ? 'trial' : 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: calculatePeriodEnd(plan.billing_interval),
          trial_end: plan.trial_days > 0 
            ? new Date(Date.now() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
          payment_method_id: input.payment_method_id,
          metadata: input.metadata
        }])
        .select()
        .single()

      if (subscriptionError) throw subscriptionError

      // Registrar en audit log
      await logAction(
        'create',
        'subscription',
        {
          plan_id: input.plan_id,
          subscription_id: subscription.id
        }
      )

      return subscription as Subscription

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, logAction])

  const updateSubscription = useCallback(async (
    subscriptionId: string,
    updates: UpdateSubscriptionInput
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select()
        .single()

      if (error) throw error

      // Registrar en audit log
      await logAction(
        'update',
        'subscription',
        {
          subscription_id: subscriptionId,
          updates
        }
      )

      return data as Subscription

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const cancelSubscription = useCallback(async (
    subscriptionId: string,
    reason?: string
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('id', subscriptionId)
        .select()
        .single()

      if (error) throw error

      // Registrar en audit log
      await logAction(
        'cancel',
        'subscription',
        {
          subscription_id: subscriptionId,
          reason
        }
      )

      return data as Subscription

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const getSubscriptionUsage = useCallback(async (subscriptionId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('subscription_id', subscriptionId)

      if (error) throw error

      return data as SubscriptionUsage[]

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const recordUsage = useCallback(async (
    subscriptionId: string,
    feature: string,
    quantity: number
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Obtener el uso actual
      const { data: current, error: currentError } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('feature', feature)
        .single()

      if (currentError && currentError.code !== 'PGRST116') {
        throw currentError
      }

      // Crear o actualizar el registro de uso
      const { data, error } = current
        ? await supabase
            .from('subscription_usage')
            .update({
              used_quantity: current.used_quantity + quantity
            })
            .eq('id', current.id)
            .select()
            .single()
        : await supabase
            .from('subscription_usage')
            .insert([{
              subscription_id: subscriptionId,
              feature,
              used_quantity: quantity,
              reset_at: calculateNextReset()
            }])
            .select()
            .single()

      if (error) throw error

      return data as SubscriptionUsage

    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Funciones auxiliares
  const calculatePeriodEnd = (interval: BillingInterval) => {
    const now = new Date()
    switch (interval) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1)).toISOString()
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3)).toISOString()
      case 'biannual':
        return new Date(now.setMonth(now.getMonth() + 6)).toISOString()
      case 'annual':
        return new Date(now.setFullYear(now.getFullYear() + 1)).toISOString()
    }
  }

  const calculateNextReset = () => {
    const now = new Date()
    return new Date(now.setMonth(now.getMonth() + 1)).toISOString()
  }

  return {
    loading,
    error,
    getSubscriptionPlans,
    getCurrentSubscription,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    getSubscriptionUsage,
    recordUsage
  }
}
