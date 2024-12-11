import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { useSession } from '@/hooks/useSession'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { RealtimeChannel } from '@supabase/supabase-js'

export type PaymentProviderType = 'MERCADO_PAGO' | 'STRIPE' | 'INTERNAL'

export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'CASH'

export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'

export interface PaymentIntent {
  id: string
  order_id: string
  amount: number
  currency: string
  provider: PaymentProviderType
  provider_payment_id?: string
  status: PaymentStatus
  created_at: string
  expires_at?: string
}

export interface PaymentTransaction {
  id: string
  payment_intent_id: string
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  provider: PaymentProviderType
  provider_transaction_id?: string
  error_message?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface CreatePaymentIntentInput {
  order_id: string
  amount: number
  currency?: string
  provider: PaymentProviderType
  metadata?: Record<string, unknown>
}

export interface ProcessPaymentInput {
  payment_intent_id: string
  method: PaymentMethod
  card_token?: string
  installments?: number
  payer?: {
    email: string
    identification?: {
      type: string
      number: string
    }
  }
}

export interface IPaymentProvider {
  name: string
  processPayment: (params: {
    amount: number
    currency: string
    paymentMethod: PaymentMethod
    metadata?: Record<string, unknown>
  }) => Promise<PaymentResult>
  handleRefund: (params: {
    transactionId: string
    amount: number
    reason?: string
  }) => Promise<RefundResult>
  validatePaymentMethod: (paymentMethod: PaymentMethod) => Promise<boolean>
  getPaymentMethods: () => Promise<PaymentMethod[]>
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
  metadata?: Record<string, unknown>
}

export interface RefundResult {
  success: boolean
  refundId?: string
  error?: string
  metadata?: Record<string, unknown>
}

type PaymentAuditAction = 
  | 'payment.process'
  | 'payment.refund'
  | 'payment.update_status'

const createPaymentProvider = async (
  providerType: PaymentProviderType,
  config: Record<string, unknown>
): Promise<IPaymentProvider> => {
  switch (providerType) {
    case 'MERCADO_PAGO':
      const { MercadoPagoProvider } = await import('@/lib/payments/mercadopago')
      return new MercadoPagoProvider(config)
    case 'STRIPE':
      const { StripeProvider } = await import('@/lib/payments/stripe')
      return new StripeProvider(config)
    case 'INTERNAL':
      const { InternalProvider } = await import('@/lib/payments/internal')
      return new InternalProvider(config)
    default:
      throw new Error(`Unsupported payment provider: ${providerType}`)
  }
}

// Configuración de proveedores de pago
const PAYMENT_PROVIDERS: Record<PaymentProviderType, any> = {
  MERCADO_PAGO: {
    name: 'MercadoPago',
    supportedMethods: ['CREDIT_CARD', 'DEBIT_CARD'],
    expirationTime: 30 * 60 * 1000, // 30 minutos
    retryAttempts: 3
  },
  STRIPE: {
    name: 'Stripe',
    supportedMethods: ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER'],
    expirationTime: 60 * 60 * 1000, // 1 hora
    retryAttempts: 3
  },
  INTERNAL: {
    name: 'Internal',
    supportedMethods: ['CASH', 'BANK_TRANSFER'],
    expirationTime: 24 * 60 * 60 * 1000, // 24 horas
    retryAttempts: 1
  }
}

export function usePayments() {
  const supabase = createClient()
  const { session } = useSession()
  const { logAction } = useAudit()
  const { loading, error, setLoading, setError, resetState } = useLoadingState<PostgrestError>()
  const { data: cachedPayments, setData: setCachedPayments } = useCache<Record<string, any>>('payments')
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
      const keys = Object.keys(cachedPayments || {}).filter(key => key.startsWith(pattern))
      keys.forEach(key => setCachedPayments(key, null))
    })
  }, [cachedPayments, setCachedPayments])

  // Función auxiliar para validar método de pago
  const validatePaymentMethod = useCallback(async (
    provider: PaymentProviderType,
    method: PaymentMethod
  ): Promise<boolean> => {
    const providerConfig = PAYMENT_PROVIDERS[provider]
    if (!providerConfig) return false
    return providerConfig.supportedMethods.includes(method)
  }, [])

  // Función auxiliar para calcular expiración
  const calculateExpirationTime = useCallback((provider: PaymentProviderType): string => {
    const providerConfig = PAYMENT_PROVIDERS[provider]
    const expirationTime = providerConfig?.expirationTime || 30 * 60 * 1000 // default 30 min
    return new Date(Date.now() + expirationTime).toISOString()
  }, [])

  // Función auxiliar para validar estado de pago
  const validatePaymentStatus = useCallback((
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus
  ): boolean => {
    const statusFlow = {
      PENDING: ['PROCESSING', 'FAILED'],
      PROCESSING: ['COMPLETED', 'FAILED'],
      COMPLETED: ['REFUNDED'],
      FAILED: [],
      REFUNDED: []
    }
    return statusFlow[currentStatus].includes(newStatus)
  }, [])

  // Función auxiliar para procesar pago con proveedor
  const processWithProvider = useCallback(async (
    provider: PaymentProviderType,
    paymentData: ProcessPaymentInput,
    amount: number
  ): Promise<PaymentResult> => {
    const paymentProvider = await createPaymentProvider(provider, {})
    return await paymentProvider.processPayment({
      amount,
      currency: 'ARS',
      paymentMethod: paymentData.method,
      metadata: {
        installments: paymentData.installments,
        payer: paymentData.payer
      }
    })
  }, [])

  const createPaymentIntent = useCallback(async (input: CreatePaymentIntentInput): Promise<PaymentIntent> => {
    try {
      setLoading(true)
      resetState()

      if (!session?.user?.id) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error: createError } = await executeWithRetry(async () => {
        // Validate provider
        if (!PAYMENT_PROVIDERS[input.provider]) {
          throw new Error('Proveedor de pago no válido')
        }

        // Create payment intent
        const result = await supabase
          .from('payment_intents')
          .insert([{
            order_id: input.order_id,
            amount: input.amount,
            currency: input.currency || 'ARS',
            provider: input.provider,
            status: 'PENDING',
            expires_at: calculateExpirationTime(input.provider)
          }])
          .select()
          .single()

        if (result.data) {
          await logAction(
            'payment.create_intent' as PaymentAuditAction,
            'payment' as AuditResource,
            {
              payment_intent_id: result.data.id,
              order_id: input.order_id,
              amount: input.amount,
              provider: input.provider
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['payment_intent', 'payment_list'])
        }

        return result
      })

      if (createError) throw createError

      return data as PaymentIntent
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, session, setLoading, setError, resetState, executeWithRetry, logAction, calculateExpirationTime, invalidateRelatedCache])

  const processPayment = useCallback(async (paymentData: ProcessPaymentInput): Promise<PaymentTransaction> => {
    try {
      setLoading(true)
      resetState()

      if (!session?.user?.id) {
        throw new Error('Usuario no autenticado')
      }

      const { data, error: processError } = await executeWithRetry(async () => {
        // Get payment intent
        const { data: intent } = await supabase
          .from('payment_intents')
          .select('*')
          .eq('id', paymentData.payment_intent_id)
          .single()

        if (!intent) throw new Error('Intent de pago no encontrado')
        if (intent.status !== 'PENDING') throw new Error('Intent de pago no está pendiente')
        if (new Date(intent.expires_at) < new Date()) throw new Error('Intent de pago expirado')

        // Validate payment method
        const isValidMethod = await validatePaymentMethod(intent.provider, paymentData.method)
        if (!isValidMethod) {
          throw new Error('Método de pago no válido para este proveedor')
        }

        // Process with provider
        const providerResult = await processWithProvider(
          intent.provider,
          paymentData,
          intent.amount
        )

        if (!providerResult.success) {
          throw new Error(providerResult.error || 'Error procesando el pago')
        }

        // Create transaction record
        const result = await supabase
          .from('payment_transactions')
          .insert([{
            payment_intent_id: intent.id,
            amount: intent.amount,
            currency: intent.currency,
            method: paymentData.method,
            status: 'COMPLETED',
            provider: intent.provider,
            provider_transaction_id: providerResult.transactionId,
            metadata: {
              ...paymentData,
              ...providerResult.metadata
            }
          }])
          .select()
          .single()

        if (result.data) {
          // Update payment intent status
          await supabase
            .from('payment_intents')
            .update({
              status: 'COMPLETED',
              provider_payment_id: providerResult.transactionId
            })
            .eq('id', intent.id)

          await logAction(
            'payment.process' as PaymentAuditAction,
            'payment' as AuditResource,
            {
              payment_intent_id: intent.id,
              transaction_id: result.data.id,
              amount: intent.amount,
              method: paymentData.method
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['payment_intent', 'payment_list', 'transaction'])
        }

        return result
      })

      if (processError) throw processError

      return data as PaymentTransaction
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
    validatePaymentMethod,
    processWithProvider,
    logAction,
    invalidateRelatedCache
  ])

  const refundPayment = useCallback(async (
    transactionId: string,
    amount: number,
    reason?: string
  ): Promise<PaymentTransaction> => {
    try {
      setLoading(true)
      resetState()

      const { data, error: refundError } = await executeWithRetry(async () => {
        // Get transaction
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('*, payment_intent:payment_intents(*)')
          .eq('id', transactionId)
          .single()

        if (!transaction) throw new Error('Transacción no encontrada')
        if (transaction.status !== 'COMPLETED') throw new Error('Transacción no está completada')
        if (amount > transaction.amount) throw new Error('Monto de reembolso excede el pago original')

        // Process refund with provider
        const provider = await createPaymentProvider(transaction.provider, {})
        const refundResult = await provider.handleRefund({
          transactionId: transaction.provider_transaction_id!,
          amount,
          reason
        })

        if (!refundResult.success) {
          throw new Error(refundResult.error || 'Error procesando el reembolso')
        }

        // Create refund transaction
        const result = await supabase
          .from('payment_transactions')
          .insert([{
            payment_intent_id: transaction.payment_intent_id,
            amount: -amount,
            currency: transaction.currency,
            method: transaction.method,
            status: 'COMPLETED',
            provider: transaction.provider,
            provider_transaction_id: refundResult.refundId,
            metadata: {
              refund_reason: reason,
              original_transaction_id: transactionId,
              ...refundResult.metadata
            }
          }])
          .select()
          .single()

        if (result.data) {
          // Update original transaction status if full refund
          if (amount === transaction.amount) {
            await supabase
              .from('payment_transactions')
              .update({ status: 'REFUNDED' })
              .eq('id', transactionId)

            await supabase
              .from('payment_intents')
              .update({ status: 'REFUNDED' })
              .eq('id', transaction.payment_intent_id)
          }

          await logAction(
            'payment.refund' as PaymentAuditAction,
            'payment' as AuditResource,
            {
              original_transaction_id: transactionId,
              refund_transaction_id: result.data.id,
              amount,
              reason
            }
          )

          // Invalidate related caches
          invalidateRelatedCache(['payment_intent', 'payment_list', 'transaction'])
        }

        return result
      })

      if (refundError) throw refundError

      return data as PaymentTransaction
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, invalidateRelatedCache])

  const getPaymentMethods = useCallback(async (provider: PaymentProviderType): Promise<PaymentMethod[]> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('payment_methods', { provider })
      const cached = cachedPayments?.get(cacheKey)
      if (cached) {
        return cached
      }

      const providerConfig = PAYMENT_PROVIDERS[provider]
      if (!providerConfig) {
        throw new Error('Proveedor de pago no válido')
      }

      const methods = providerConfig.supportedMethods
      setCachedPayments(cacheKey, methods)

      return methods
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, resetState, cachedPayments, setCachedPayments, getCacheKey])

  const getPaymentIntent = useCallback(async (intentId: string): Promise<PaymentIntent> => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = getCacheKey('payment_intent', { intentId })
      const cached = cachedPayments?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        return await supabase
          .from('payment_intents')
          .select('*')
          .eq('id', intentId)
          .single()
      })

      if (fetchError) throw fetchError

      // Cache the result
      if (data) {
        setCachedPayments(cacheKey, data)
      }

      return data as PaymentIntent
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, cachedPayments, setCachedPayments, getCacheKey])

  return {
    loading,
    error,
    createPaymentIntent,
    processPayment,
    refundPayment,
    getPaymentMethods,
    getPaymentIntent
  }
}
