import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { usePagination } from './usePagination'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const wishlistItemSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  product_id: z.string().uuid(),
  added_at: z.string().datetime(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    price: z.number(),
    image_url: z.string().url(),
    stock: z.number(),
    category_id: z.string().uuid(),
    is_available: z.boolean()
  })
})

export type WishlistItem = z.infer<typeof wishlistItemSchema>

export interface WishlistError extends BaseError {
  code: 'WISHLIST_ERROR'
  details: {
    type: 'NOT_FOUND' | 'VALIDATION' | 'DUPLICATE' | 'STOCK' | 'SERVER_ERROR'
    field?: string
    originalError?: unknown
  }
}

export interface WishlistStats {
  totalItems: number
  totalValue: number
  availableItems: number
  outOfStockItems: number
}

export interface WishlistHookReturn {
  items: WishlistItem[]
  stats: WishlistStats
  isLoading: boolean
  addToWishlist: (productId: string) => Promise<void>
  removeFromWishlist: (productId: string) => Promise<void>
  clearWishlist: () => Promise<void>
  moveToCart: (productId: string) => Promise<void>
  isInWishlist: (productId: string) => boolean
  refreshWishlist: () => Promise<void>
  page: number
  totalPages: number
  nextPage: () => void
  prevPage: () => void
}

export function useWishlist(): WishlistHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 500
  })

  // Paginación
  const { 
    page, 
    pageSize, 
    totalPages, 
    nextPage, 
    prevPage, 
    setTotalItems 
  } = usePagination({
    initialPage: 1,
    pageSize: 12
  })

  // Cache para items de wishlist
  const { 
    data: wishlistState, 
    setData: setWishlistState 
  } = useCache<{
    items: WishlistItem[]
    stats: WishlistStats
  }>({
    key: `wishlist-${user?.id}`,
    ttl: 1000 * 60 * 5 // 5 minutos
  })

  const handleWishlistError = (
    error: unknown, 
    type: WishlistError['details']['type'], 
    field?: string
  ): never => {
    throw new BaseError('Error en lista de deseos', {
      code: 'WISHLIST_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  // Calcular estadísticas
  const calculateStats = (items: WishlistItem[]): WishlistStats => {
    return items.reduce((stats, item) => ({
      totalItems: stats.totalItems + 1,
      totalValue: stats.totalValue + item.product.price,
      availableItems: stats.availableItems + (item.product.is_available ? 1 : 0),
      outOfStockItems: stats.outOfStockItems + (item.product.stock === 0 ? 1 : 0)
    }), {
      totalItems: 0,
      totalValue: 0,
      availableItems: 0,
      outOfStockItems: 0
    })
  }

  // Cargar wishlist
  const fetchWishlist = useCallback(async (): Promise<WishlistItem[]> => {
    if (!user?.id) {
      throw new ValidationError('Usuario no autenticado')
    }

    const { data, error, count } = await supabase
      .from('wishlist')
      .select(`
        *,
        product:products(
          id,
          name,
          price,
          image_url,
          stock,
          category_id,
          is_available
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('added_at', { ascending: false })

    if (error) {
      handleWishlistError(error, 'SERVER_ERROR')
    }

    setTotalItems(count || 0)
    return data?.map(item => wishlistItemSchema.parse(item)) || []
  }, [user?.id, page, pageSize])

  // Refrescar wishlist
  const refreshWishlist = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      const items = await executeWithRetry(fetchWishlist)
      const stats = calculateStats(items)

      setWishlistState({
        items,
        stats
      })
    } catch (err) {
      throw new BaseError('Error al refrescar lista de deseos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchWishlist])

  // Cargar wishlist inicialmente
  useEffect(() => {
    if (user?.id) {
      refreshWishlist()
    }
  }, [user?.id, page])

  // Agregar a wishlist
  const addToWishlist = useCallback(async (productId: string): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      // Verificar si ya existe
      if (isInWishlist(productId)) {
        handleWishlistError(new Error('Producto ya en lista'), 'DUPLICATE')
      }

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            product_id: productId
          })

        if (error) {
          handleWishlistError(error, 'SERVER_ERROR')
        }

        await refreshWishlist()
      })
    } catch (err) {
      throw new BaseError('Error al agregar a lista de deseos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, startLoading, stopLoading, executeWithRetry, refreshWishlist])

  // Remover de wishlist
  const removeFromWishlist = useCallback(async (productId: string): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)

        if (error) {
          handleWishlistError(error, 'SERVER_ERROR')
        }

        await refreshWishlist()
      })
    } catch (err) {
      throw new BaseError('Error al remover de lista de deseos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, startLoading, stopLoading, executeWithRetry, refreshWishlist])

  // Limpiar wishlist
  const clearWishlist = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)

        if (error) {
          handleWishlistError(error, 'SERVER_ERROR')
        }

        setWishlistState({
          items: [],
          stats: {
            totalItems: 0,
            totalValue: 0,
            availableItems: 0,
            outOfStockItems: 0
          }
        })
      })
    } catch (err) {
      throw new BaseError('Error al limpiar lista de deseos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, startLoading, stopLoading, executeWithRetry])

  // Mover a carrito
  const moveToCart = useCallback(async (productId: string): Promise<void> => {
    try {
      startLoading()

      const item = wishlistState?.items.find(i => i.product_id === productId)
      if (!item) {
        handleWishlistError(new Error('Producto no encontrado'), 'NOT_FOUND')
      }

      if (!item?.product.is_available || item?.product.stock === 0) {
        handleWishlistError(new Error('Producto sin stock'), 'STOCK')
      }

      // Aquí se integraría con useCart para agregar al carrito
      // Por ahora solo removemos de wishlist
      await removeFromWishlist(productId)

    } catch (err) {
      throw new BaseError('Error al mover a carrito', { cause: err })
    } finally {
      stopLoading()
    }
  }, [wishlistState?.items, startLoading, stopLoading, removeFromWishlist])

  // Verificar si está en wishlist
  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlistState?.items.some(item => item.product_id === productId) || false
  }, [wishlistState?.items])

  return {
    items: wishlistState?.items || [],
    stats: wishlistState?.stats || {
      totalItems: 0,
      totalValue: 0,
      availableItems: 0,
      outOfStockItems: 0
    },
    isLoading,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    moveToCart,
    isInWishlist,
    refreshWishlist,
    page,
    totalPages,
    nextPage,
    prevPage
  }
}
