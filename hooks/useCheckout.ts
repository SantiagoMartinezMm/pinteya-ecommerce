import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from '@/hooks/useSession'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'
import { useCart } from './useCart'
import { BaseHookState, ValidationResult } from '@/types/hooks'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { createError, ErrorCode } from '@/types/errors'

// Tipos base
export interface Product {
  id: string
  name: string
  price: number
  stock: number
}

export interface CartItem {
  product_id: string
  quantity: number
}

export interface CheckoutItem extends CartItem {
  product: Product
}

export interface ShippingAddress {
  street: string
  city: string
  state: string
  postal_code: string
  country: string
  phone?: string
}

export type CheckoutStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface CheckoutSession {
  id: string
  user_id: string
  items: CheckoutItem[]
  subtotal: number
  tax: number
  shipping_cost: number
  total: number
  status: CheckoutStatus
  payment_intent_id?: string
  shipping_address?: ShippingAddress
  created_at?: string
  updated_at?: string
}

// Tipos de auditoría específicos para checkout
export type CheckoutAuditAction = Extract<
  AuditAction,
  'payment_process' | 'order_status_change' | 'refund_process'
>

export type CheckoutAuditResource = Extract<AuditResource, 'checkout'>

export interface CheckoutAuditPayload {
  checkout_id: string
  total?: number
  updates?: Partial<CheckoutSession>
}

// Interfaces para el rate limiter
interface RateLimiter {
  remaining: number
  reset: number
}

// Tipos específicos de error
export interface CheckoutError extends BaseError {
  type: 'validation' | 'payment' | 'inventory' | 'shipping'
}

// Validaciones mejoradas
export interface CheckoutValidation {
  address: ValidationResult
  payment: ValidationResult
  inventory: ValidationResult
}

// Estado del hook mejorado
interface CheckoutState extends BaseHookState {
  session: CheckoutSession | null
  step: CheckoutStep
  validations: CheckoutValidation
}

// Enums para mejor tipado
export enum CheckoutStep {
  ADDRESS = 'address',
  PAYMENT = 'payment',
  CONFIRMATION = 'confirmation'
}

// Constantes
const CHECKOUT_CACHE_KEY = 'checkout_session'
const CHECKOUT_CACHE_TTL = 1000 * 60 * 15 // 15 minutos
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 3600000 // 1 hora

export function useCheckout(): CheckoutHookReturn {
  const { session } = useSession()
  const { cart, clearCart } = useCart()
  const { logAction } = useAudit()
  
  // Usar hooks de utilidad
  const { loading, error, startLoading, stopLoading } = useLoadingState<CheckoutError>()
  
  const [cachedSession, setCachedSession] = useCache<CheckoutSession>({
    key: CHECKOUT_CACHE_KEY,
    ttl: CHECKOUT_CACHE_TTL
  })

  const { retry } = useRetry({
    maxAttempts: 3,
    delay: 1000,
    backoff: true
  })

  // Validaciones mejoradas
  const validateAddress = useCallback((address?: ShippingAddress): ValidationResult => {
    const errors: string[] = []
    
    if (!address) {
      errors.push('Dirección de envío requerida')
      return { isValid: false, errors }
    }

    if (!address.street) errors.push('Calle requerida')
    if (!address.city) errors.push('Ciudad requerida')
    if (!address.state) errors.push('Estado/Provincia requerido')
    if (!address.postal_code) errors.push('Código postal requerido')
    if (!address.country) errors.push('País requerido')

    return {
      isValid: errors.length === 0,
      errors
    }
  }, [])

  const validateInventory = useCallback(async (items?: CheckoutItem[]): Promise<ValidationResult> => {
    const errors: string[] = []
    
    if (!items?.length) {
      errors.push('No hay items en el carrito')
      return { isValid: false, errors }
    }

    try {
      const { data: products } = await createClient()
        .from('products')
        .select('id, stock')
        .in('id', items.map(item => item.product_id))

      items.forEach(item => {
        const product = products?.find(p => p.id === item.product_id)
        if (!product) {
          errors.push(`Producto ${item.product_id} no encontrado`)
        } else if (product.stock < item.quantity) {
          errors.push(`Stock insuficiente para ${item.product_id}`)
        }
      })

      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      errors.push('Error al validar inventario')
      return { isValid: false, errors }
    }
  }, [])

  const createCheckoutSession = useCallback(async (
    shippingAddress: ShippingAddress,
    shippingCost: number = 0
  ): Promise<CheckoutSession | null> => {
    try {
      startLoading()

      if (!session?.user?.id) {
        throw createError(
          ErrorCode.AUTH,
          'Usuario no autenticado',
          { session_status: 'missing' }
        )
      }

      const operation = async () => {
        // Validar dirección
        const addressValidation = validateAddress(shippingAddress)
        if (!addressValidation.isValid) {
          throw createError(
            ErrorCode.VALIDATION,
            'Dirección inválida',
            { validation: addressValidation }
          )
        }

        // Validar carrito
        if (!cart?.items?.length) {
          throw createError(
            ErrorCode.VALIDATION,
            'Carrito vacío',
            { cart_status: 'empty' }
          )
        }

        // Validar inventario
        const inventoryValidation = await validateInventory(cart.items)
        if (!inventoryValidation.isValid) {
          throw createError(
            ErrorCode.VALIDATION,
            'Problemas de inventario',
            { validation: inventoryValidation }
          )
        }

        // Crear sesión
        const subtotal = cart.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        )
        const tax = subtotal * 0.21 // 21% IVA

        const { data: session, error: createError } = await createClient()
          .from('checkout_sessions')
          .insert([{
            user_id: session.user.id,
            items: cart.items,
            subtotal,
            tax,
            shipping_cost: shippingCost,
            total: subtotal + tax + shippingCost,
            status: 'pending' as CheckoutStatus,
            shipping_address: shippingAddress,
          }])
          .select()
          .single()

        if (createError) {
          throw createError(
            ErrorCode.SERVER,
            'Error al crear sesión',
            { error: createError }
          )
        }

        // Guardar en cache
        setCachedSession(session)

        await logAction(
          'payment_process' as CheckoutAuditAction,
          'checkout' as CheckoutAuditResource,
          {
            checkout_id: session.id,
            total: session.total,
          }
        )

        return session
      }

      return await retry(operation)
    } catch (err) {
      stopLoading(err as CheckoutError)
      return null
    }
  }, [session, cart, validateAddress, validateInventory, retry, startLoading, stopLoading])

  // Interfaces para el hook
  interface CheckoutHookActions {
    createCheckoutSession: (
      shippingAddress: ShippingAddress,
      shippingCost?: number
    ) => Promise<CheckoutSession | null>
    updateCheckoutSession: (
      id: string,
      updates: Partial<Omit<CheckoutSession, 'id' | 'user_id' | 'created_at'>>
    ) => Promise<CheckoutSession | null>
    completeCheckoutSession: (id: string) => Promise<boolean>
    cancelCheckoutSession: (id: string) => Promise<boolean>
  }

  export type CheckoutHookReturn = CheckoutHookState & CheckoutHookActions

  return {
    loading,
    error,
    createCheckoutSession,
    updateCheckoutSession,
    completeCheckoutSession,
    cancelCheckoutSession,
  }
}
