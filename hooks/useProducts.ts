import { useCallback, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { useAudit } from './useAudit'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED'

export interface Product {
  id: string
  name: string
  slug: string
  code: string
  images: string[]
  price: number
  original_price: number | null
  description: string
  category_id: string
  brand: string
  sku: string
  stock: number
  features: string[]
  status: ProductStatus
  views: number
  created_at: string
  updated_at: string
}

export interface ProductWithCategory extends Product {
  categories: {
    id: string
    name: string
    slug: string
  }
}

export interface ProductFilter {
  category_id?: string
  brand?: string
  status?: ProductStatus
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  search?: string
  sortBy?: 'price' | 'created_at' | 'views'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface StockUpdatePayload {
  old_record: Pick<Product, 'id' | 'stock'>
  record: Pick<Product, 'id' | 'stock'>
  eventType: 'UPDATE'
}

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'views'>
export type UpdateProductInput = Partial<Omit<Product, 'id' | 'created_at' | 'updated_at'>>

export function useProducts() {
  const supabase = createClient()
  const { logAction } = useAudit()
  const { loading, error, setLoading, setError, resetState } = useLoadingState<PostgrestError>()
  const { data: cachedProducts, setData: setCachedProducts } = useCache<ProductWithCategory[]>('products')
  const { executeWithRetry } = useRetry()
  const [activeSubscription, setActiveSubscription] = useState<RealtimeChannel | null>(null)

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (activeSubscription) {
        activeSubscription.unsubscribe()
      }
    }
  }, [activeSubscription])

  const getProducts = useCallback(async (filters?: ProductFilter) => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = JSON.stringify(filters)
      const cached = cachedProducts?.get(cacheKey)
      if (cached) {
        return cached
      }

      let query = supabase
        .from('products')
        .select('*, categories(*)')

      // Apply filters
      if (filters) {
        if (filters.category_id) {
          query = query.eq('category_id', filters.category_id)
        }
        if (filters.brand) {
          query = query.eq('brand', filters.brand)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.minPrice !== undefined) {
          query = query.gte('price', filters.minPrice)
        }
        if (filters.maxPrice !== undefined) {
          query = query.lte('price', filters.maxPrice)
        }
        if (filters.inStock) {
          query = query.gt('stock', 0)
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
        }

        // Sorting
        if (filters.sortBy) {
          query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })
        }

        // Pagination
        if (filters.limit) {
          query = query.limit(filters.limit)
        }
        if (filters.offset) {
          query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
        }
      }

      const { data, error: fetchError } = await executeWithRetry(() => query)

      if (fetchError) {
        throw fetchError
      }

      // Cache the results
      if (data) {
        setCachedProducts(cacheKey, data)
      }

      return data as ProductWithCategory[]
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, cachedProducts, setCachedProducts, executeWithRetry])

  const getProductBySlug = useCallback(async (slug: string) => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = `product_${slug}`
      const cached = cachedProducts?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        const result = await supabase
          .from('products')
          .select('*, categories(*)')
          .eq('slug', slug)
          .single()

        if (result.data) {
          // Incrementar vistas en una transacción separada
          await supabase
            .from('products')
            .update({ views: (result.data.views || 0) + 1 })
            .eq('id', result.data.id)

          await logAction(
            'product.view' as any,
            'product',
            { product_id: result.data.id, slug }
          )
        }

        return result
      })

      if (fetchError) {
        throw fetchError
      }

      // Cache the result
      if (data) {
        setCachedProducts(cacheKey, data)
      }

      return data as ProductWithCategory
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, cachedProducts, setCachedProducts, executeWithRetry, logAction])

  const createProduct = useCallback(async (product: CreateProductInput) => {
    try {
      setLoading(true)
      resetState()

      const { data, error: createError } = await executeWithRetry(async () => {
        const result = await supabase
          .from('products')
          .insert([{
            ...product,
            views: 0,
            status: product.status || 'DRAFT'
          }])
          .select()

        if (result.data?.[0]) {
          await logAction(
            'product.create' as any,
            'product',
            { product_id: result.data[0].id }
          )

          // Invalidate products cache
          setCachedProducts('products', null)
        }

        return result
      })

      if (createError) {
        throw createError
      }

      return data?.[0] as Product
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, setCachedProducts])

  const updateProduct = useCallback(async (id: string, updates: UpdateProductInput) => {
    try {
      setLoading(true)
      resetState()

      const { data, error: updateError } = await executeWithRetry(async () => {
        const result = await supabase
          .from('products')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (result.data) {
          await logAction(
            'product.update' as any,
            'product',
            { product_id: id, updates }
          )

          // Invalidate related caches
          setCachedProducts('products', null)
          setCachedProducts(`product_${result.data.slug}`, null)
        }

        return result
      })

      if (updateError) {
        throw updateError
      }

      return data as Product
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, setCachedProducts])

  const deleteProduct = useCallback(async (id: string) => {
    try {
      setLoading(true)
      resetState()

      const { data: product, error: deleteError } = await executeWithRetry(async () => {
        // Primero verificamos si el producto existe y obtenemos datos necesarios
        const { data: existingProduct, error: fetchError } = await supabase
          .from('products')
          .select('id, name, slug')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError
        if (!existingProduct) throw new Error('Producto no encontrado')

        // Procedemos con el borrado
        const result = await supabase
          .from('products')
          .delete()
          .eq('id', id)

        if (result.error) throw result.error

        await logAction(
          'product.delete' as any,
          'product',
          { product_id: id, product_name: existingProduct.name }
        )

        // Invalidate related caches
        setCachedProducts('products', null)
        setCachedProducts(`product_${existingProduct.slug}`, null)

        return { data: existingProduct }
      })

      if (deleteError) {
        throw deleteError
      }

      return product as Product
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, executeWithRetry, logAction, setCachedProducts])

  const subscribeToStockUpdates = useCallback((callback: (payload: StockUpdatePayload) => void) => {
    // Cleanup previous subscription if exists
    if (activeSubscription) {
      activeSubscription.unsubscribe()
    }

    const subscription = supabase
      .channel('stock_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: 'stock=eq.true'
        },
        async (payload) => {
          try {
            // Invalidate product cache when stock changes
            const stockPayload = payload as StockUpdatePayload
            if (stockPayload.record?.id) {
              const { data } = await supabase
                .from('products')
                .select('slug')
                .eq('id', stockPayload.record.id)
                .single()
              
              if (data?.slug) {
                setCachedProducts(`product_${data.slug}`, null)
              }
              setCachedProducts('products', null)
            }
            
            callback(stockPayload)
          } catch (err) {
            console.error('Error processing stock update:', err)
          }
        }
      )
      .subscribe()

    setActiveSubscription(subscription)

    return () => {
      subscription.unsubscribe()
      setActiveSubscription(null)
    }
  }, [supabase, setCachedProducts])

  const getBrands = useCallback(async () => {
    try {
      setLoading(true)
      resetState()

      // Check cache first
      const cacheKey = 'product_brands'
      const cached = cachedProducts?.get(cacheKey)
      if (cached) {
        return cached
      }

      const { data, error: fetchError } = await executeWithRetry(async () => {
        return await supabase
          .from('products')
          .select('brand')
          .not('brand', 'is', null)
          .order('brand')
      })

      if (fetchError) {
        throw fetchError
      }

      // Remove duplicates and empty values
      const uniqueBrands = [...new Set(data?.map(p => p.brand) || [])]
        .filter(Boolean)
        .sort()

      // Cache the results
      setCachedProducts(cacheKey, uniqueBrands)

      return uniqueBrands
    } catch (err) {
      setError(err as PostgrestError)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, setLoading, setError, resetState, cachedProducts, setCachedProducts, executeWithRetry])

  return {
    loading,
    error,
    getProducts,
    getProductBySlug,
    createProduct,
    updateProduct,
    deleteProduct,
    subscribeToStockUpdates,
    getBrands
  }
}
