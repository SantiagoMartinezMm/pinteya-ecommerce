import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Session, SupabaseClient } from '@supabase/supabase-js'
import { useAudit } from '@/hooks/useAudit'
import { AuditAction, AuditResource } from '@/hooks/useAudit'
import { BaseHookState, ValidationResult } from '@/types/hooks'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { createError, ErrorCode } from '@/types/errors'

// Enums
export enum CartAction {
  ADD = 'add_to_cart',
  REMOVE = 'remove_from_cart',
  UPDATE = 'update_cart',
  CLEAR = 'clear_cart'
}

// Interfaces
export interface CartItem {
  id: string
  product_id: string
  quantity: number
  price: number
  user_id: string
  created_at?: string
  updated_at?: string
}

export interface Cart {
  items: CartItem[]
  total: number
}

interface CartHookOptions {
  session?: Session | null
}

interface CartHookReturn {
  loading: boolean
  error: PostgrestError | null
  addToCart: (productId: string, quantity?: number) => Promise<boolean>
  removeFromCart: (productId: string) => Promise<boolean>
  updateQuantity: (productId: string, quantity: number) => Promise<boolean>
  getCart: () => Promise<Cart | null>
  clearCart: () => Promise<boolean>
}

interface CartAuditPayload {
  product_id?: string
  quantity?: number
}

// Tipos específicos de error
export interface CartError extends BaseError {
  type: 'validation' | 'database' | 'network' | 'auth'
}

// Validaciones mejoradas
export interface CartItemValidation {
  quantity: ValidationResult
  productId: ValidationResult
}

// Estado del hook mejorado
interface CartState extends BaseHookState {
  items: CartItem[]
  total: number
  lastUpdated: string
}

// Constantes
const DEFAULT_QUANTITY = 1

const CART_CACHE_KEY = 'user_cart'
const CART_CACHE_TTL = 1000 * 60 * 30 // 30 minutos

export function useCart({ session }: CartHookOptions = {}): CartHookReturn {
  const supabase = createClient() as SupabaseClient
  const { logAction } = useAudit({ session })
  
  // Usar el nuevo hook de loading state
  const { loading, error, startLoading, stopLoading } = useLoadingState<CartError>()
  
  // Usar cache para el carrito
  const [cachedCart, setCachedCart] = useCache<Cart>({
    key: CART_CACHE_KEY,
    ttl: CART_CACHE_TTL
  })

  // Usar retry para operaciones que pueden fallar
  const { retry } = useRetry({
    maxAttempts: 3,
    delay: 1000,
    backoff: true
  })

  const validateSession = useCallback((): void => {
    if (!session?.user?.id) {
      throw createError(
        ErrorCode.AUTH,
        'User must be logged in',
        { session_status: 'missing' }
      )
    }
  }, [session])

  const validateCartItem = useCallback((item: CartItem): CartItemValidation => {
    const validation: CartItemValidation = {
      quantity: {
        isValid: item.quantity > 0 && Number.isInteger(item.quantity),
        errors: []
      },
      productId: {
        isValid: Boolean(item.product_id),
        errors: []
      }
    }

    if (!validation.quantity.isValid) {
      validation.quantity.errors.push('La cantidad debe ser mayor a 0')
    }

    if (!validation.productId.isValid) {
      validation.productId.errors.push('El ID de producto es requerido')
    }

    return validation
  }, [])

  const addToCart = useCallback(async (
    productId: string,
    quantity = DEFAULT_QUANTITY
  ): Promise<boolean> => {
    try {
      startLoading()
      validateSession()

      const operation = async () => {
        // Obtener precio del producto
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('price')
          .eq('id', productId)
          .single()

        if (productError) {
          throw createError(
            ErrorCode.NOT_FOUND,
            'Product not found',
            { product_id: productId }
          )
        }

        // Validar item
        const validation = validateCartItem({
          id: '', // será generado
          product_id: productId,
          quantity,
          price: product.price,
          user_id: session!.user.id
        })

        if (!validation.quantity.isValid || !validation.productId.isValid) {
          throw createError(
            ErrorCode.VALIDATION,
            'Invalid cart item',
            { validation }
          )
        }

        // Añadir al carrito
        const { error: cartError } = await supabase
          .from('cart_items')
          .upsert({
            user_id: session!.user.id,
            product_id: productId,
            quantity,
            price: product.price,
          }, {
            onConflict: 'user_id,product_id',
          })

        if (cartError) throw cartError

        // Actualizar cache
        const updatedCart = await getCart()
        setCachedCart(updatedCart)

        await logAction(
          CartAction.ADD as unknown as AuditAction,
          AuditResource.CART,
          { product_id: productId, quantity }
        )

        return true
      }

      // Usar retry para la operación
      return await retry(operation)
    } catch (err) {
      stopLoading(err as CartError)
      return false
    }
  }, [session, supabase, validateCartItem, logAction, retry, startLoading, stopLoading])

  const getCart = useCallback(async (): Promise<Cart | null> => {
    try {
      startLoading()
      validateSession()

      // Intentar usar cache primero
      if (cachedCart) {
        stopLoading()
        return cachedCart
      }

      const { data: items, error: cartError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', session!.user.id)

      if (cartError) {
        throw createError(
          ErrorCode.SERVER,
          'Failed to fetch cart',
          { error: cartError }
        )
      }

      const cart: Cart = {
        items: items || [],
        total: (items || []).reduce(
          (sum: number, item: CartItem) => sum + item.price * item.quantity,
          0
        )
      }

      // Actualizar cache
      setCachedCart(cart)

      return cart
    } catch (err) {
      stopLoading(err as CartError)
      return null
    }
  }, [session, supabase, cachedCart, setCachedCart, startLoading, stopLoading])

  const removeFromCart = useCallback(
    async (productId: string): Promise<boolean> => {
      try {
        startLoading()
        validateSession()

        const { error: deleteError } = await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', session.user.id)
          .eq('product_id', productId)

        if (deleteError) {
          throw createError(
            ErrorCode.SERVER,
            'Failed to remove item from cart',
            { error: deleteError }
          )
        }

        await logAction(
          CartAction.REMOVE as unknown as AuditAction,
          AuditResource.CART,
          { product_id: productId }
        )

        return true
      } catch (err) {
        stopLoading(err as CartError)
        return false
      }
    },
    [session, supabase, logAction, startLoading, stopLoading]
  )

  const updateQuantity = useCallback(
    async (productId: string, quantity: number): Promise<boolean> => {
      try {
        startLoading()
        validateSession()

        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', session.user.id)
          .eq('product_id', productId)

        if (updateError) {
          throw createError(
            ErrorCode.SERVER,
            'Failed to update quantity',
            { error: updateError }
          )
        }

        await logAction(
          CartAction.UPDATE as unknown as AuditAction,
          AuditResource.CART,
          { product_id: productId, quantity }
        )

        return true
      } catch (err) {
        stopLoading(err as CartError)
        return false
      }
    },
    [session, supabase, logAction, startLoading, stopLoading]
  )

  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      startLoading()
      validateSession()

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', session.user.id)

      if (deleteError) {
        throw createError(
          ErrorCode.SERVER,
          'Failed to clear cart',
          { error: deleteError }
        )
      }

      await logAction(
        CartAction.CLEAR as unknown as AuditAction,
        AuditResource.CART
      )

      return true
    } catch (err) {
      stopLoading(err as CartError)
      return false
    }
  }, [session, supabase, logAction, startLoading, stopLoading])

  return {
    loading,
    error,
    addToCart,
    removeFromCart,
    updateQuantity,
    getCart,
    clearCart,
  }
}
