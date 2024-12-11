import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'
import { useSession } from '@/hooks/useSession'
import { useAudit, type AuditAction, type AuditResource } from './useAudit'
import { Product } from './useProducts'

// Tipos base
export interface UserFavorite {
  id: string
  user_id: string
  product_id: string
  product?: Product
  created_at: string
}

// Tipos de auditoría específicos para favoritos
export type FavoriteAuditAction = Extract<
  AuditAction,
  'add_favorite' | 'remove_favorite'
>

export type FavoriteAuditResource = Extract<AuditResource, 'favorite'>

export interface FavoriteAuditPayload extends Record<string, unknown> {
  favorite_id: string
  product_id: string
  user_id: string
}

// Tipos para las suscripciones
export type FavoriteChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

export interface FavoriteChangePayload {
  eventType: FavoriteChangeEvent
  old: UserFavorite | null
  new: UserFavorite | null
}

// Interfaces para el hook
interface FavoriteHookState {
  loading: boolean
  error: PostgrestError | null
}

interface FavoriteHookActions {
  getFavorites: (userId: string) => Promise<UserFavorite[]>
  addToFavorites: (userId: string, productId: string) => Promise<UserFavorite | null>
  removeFromFavorites: (userId: string, productId: string) => Promise<boolean>
  isProductFavorite: (userId: string, productId: string) => Promise<boolean>
  subscribeToFavorites: (
    userId: string,
    callback: (payload: FavoriteChangePayload) => void
  ) => () => void
}

export type FavoriteHookReturn = FavoriteHookState & FavoriteHookActions

export function useFavorites(): FavoriteHookReturn {
  const { session } = useSession()
  const { logAction } = useAudit()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getFavorites = useCallback(async (userId: string): Promise<UserFavorite[]> => {
    try {
      setLoading(true)
      setError(null)

      if (!userId) {
        throw new Error('ID de usuario requerido')
      }

      const { data, error } = await createClient()
        .from('user_favorites')
        .select(`
          *,
          product:products (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data as UserFavorite[]
    } catch (err) {
      const error = err as PostgrestError
      setError(error)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const addToFavorites = useCallback(async (
    userId: string,
    productId: string
  ): Promise<UserFavorite | null> => {
    try {
      setLoading(true)
      setError(null)

      if (!userId || !productId) {
        throw new Error('ID de usuario y producto requeridos')
      }

      // Verificar si ya existe en favoritos
      const { data: existing } = await createClient()
        .from('user_favorites')
        .select()
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle()

      if (existing) {
        return existing as UserFavorite
      }

      const { data, error } = await createClient()
        .from('user_favorites')
        .insert([
          {
            user_id: userId,
            product_id: productId
          }
        ])
        .select(`
          *,
          product:products (*)
        `)
        .single()

      if (error) throw error

      await logAction(
        'add_favorite' as FavoriteAuditAction,
        'favorite' as FavoriteAuditResource,
        {
          favorite_id: data.id,
          product_id: productId,
          user_id: userId
        } as FavoriteAuditPayload
      )

      return data as UserFavorite
    } catch (err) {
      const error = err as PostgrestError
      setError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const removeFromFavorites = useCallback(async (
    userId: string,
    productId: string
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      if (!userId || !productId) {
        throw new Error('ID de usuario y producto requeridos')
      }

      const { data: favorite, error: getFavoriteError } = await createClient()
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .single()

      if (getFavoriteError) throw getFavoriteError

      const { error: deleteError } = await createClient()
        .from('user_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)

      if (deleteError) throw deleteError

      await logAction(
        'remove_favorite' as FavoriteAuditAction,
        'favorite' as FavoriteAuditResource,
        {
          favorite_id: favorite.id,
          product_id: productId,
          user_id: userId
        } as FavoriteAuditPayload
      )

      return true
    } catch (err) {
      const error = err as PostgrestError
      setError(error)
      return false
    } finally {
      setLoading(false)
    }
  }, [logAction])

  const isProductFavorite = useCallback(async (
    userId: string,
    productId: string
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      if (!userId || !productId) {
        throw new Error('ID de usuario y producto requeridos')
      }

      const { data, error } = await createClient()
        .from('user_favorites')
        .select()
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle()

      if (error) throw error

      return !!data
    } catch (err) {
      const error = err as PostgrestError
      setError(error)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const subscribeToFavorites = useCallback((
    userId: string,
    callback: (payload: FavoriteChangePayload) => void
  ): (() => void) => {
    if (!userId) {
      throw new Error('ID de usuario requerido')
    }

    const subscription = createClient()
      .channel(`favorites_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favorites',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const changePayload: FavoriteChangePayload = {
            eventType: payload.eventType as FavoriteChangeEvent,
            old: payload.old as UserFavorite | null,
            new: payload.new as UserFavorite | null
          }
          callback(changePayload)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    loading,
    error,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    isProductFavorite,
    subscribeToFavorites
  }
}
