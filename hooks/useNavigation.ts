import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'
import { useRouter } from 'next/router'

// Esquemas de validación
const navigationItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  path: z.string(),
  icon: z.string().optional(),
  parent_id: z.string().uuid().nullable(),
  order: z.number().default(0),
  is_visible: z.boolean().default(true),
  requires_auth: z.boolean().default(false),
  required_permissions: z.array(z.string()).optional(),
  target: z.enum(['_self', '_blank']).default('_self'),
  badge: z.object({
    text: z.string(),
    variant: z.enum(['primary', 'secondary', 'success', 'danger', 'warning', 'info'])
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

const breadcrumbSchema = z.object({
  title: z.string(),
  path: z.string(),
  icon: z.string().optional()
})

const navigationHistorySchema = z.object({
  path: z.string(),
  title: z.string(),
  timestamp: z.string().datetime()
})

export type NavigationItem = z.infer<typeof navigationItemSchema>
export type Breadcrumb = z.infer<typeof breadcrumbSchema>
export type NavigationHistory = z.infer<typeof navigationHistorySchema>

export interface NavigationError extends BaseError {
  code: 'NAVIGATION_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    path?: string
    originalError?: unknown
  }
}

export interface NavigationFilters {
  parent_id?: string | null
  requires_auth?: boolean
  is_visible?: boolean
  search?: string
}

export interface NavigationHookReturn {
  items: NavigationItem[]
  currentPath: string
  breadcrumbs: Breadcrumb[]
  history: NavigationHistory[]
  isLoading: boolean
  getItems: (filters?: NavigationFilters) => Promise<NavigationItem[]>
  getItem: (itemId: string) => Promise<NavigationItem>
  createItem: (item: Omit<NavigationItem, 'id' | 'created_at' | 'updated_at'>) => Promise<NavigationItem>
  updateItem: (itemId: string, updates: Partial<NavigationItem>) => Promise<NavigationItem>
  deleteItem: (itemId: string) => Promise<void>
  navigate: (path: string, options?: { replace?: boolean, scroll?: boolean }) => Promise<void>
  goBack: () => void
  goForward: () => void
  getBreadcrumbs: (path: string) => Breadcrumb[]
  addToHistory: (entry: Omit<NavigationHistory, 'timestamp'>) => void
  clearHistory: () => void
  isActive: (path: string) => boolean
  canAccess: (path: string) => boolean
  refreshNavigation: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 15 // 15 minutos
const MAX_HISTORY_ITEMS = 50

export function useNavigation(): NavigationHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const router = useRouter()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()

  // Cache para items y historial
  const {
    data: navigationState,
    setData: setNavigationState
  } = useCache<{
    items: NavigationItem[]
    history: NavigationHistory[]
  }>({
    key: 'navigation-state',
    ttl: CACHE_TTL,
    initialData: {
      items: [],
      history: []
    }
  })

  const handleNavigationError = (
    error: unknown,
    type: NavigationError['details']['type'],
    path?: string
  ): never => {
    throw new BaseError('Error en navegación', {
      code: 'NAVIGATION_ERROR',
      details: {
        type,
        path,
        originalError: error
      }
    })
  }

  // Obtener items de navegación
  const getItems = useCallback(async (
    filters?: NavigationFilters
  ): Promise<NavigationItem[]> => {
    try {
      startLoading()

      let query = supabase
        .from('navigation_items')
        .select('*')

      if (filters?.parent_id !== undefined) {
        query = filters.parent_id === null
          ? query.is('parent_id', null)
          : query.eq('parent_id', filters.parent_id)
      }
      if (filters?.requires_auth !== undefined) {
        query = query.eq('requires_auth', filters.requires_auth)
      }
      if (filters?.is_visible !== undefined) {
        query = query.eq('is_visible', filters.is_visible)
      }
      if (filters?.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,path.ilike.%${filters.search}%`
        )
      }

      const { data: items, error } = await executeWithRetry(() =>
        query
          .order('order', { ascending: true })
          .order('title', { ascending: true })
      )

      if (error) {
        handleNavigationError(error, 'SERVER_ERROR')
      }

      setNavigationState(prev => ({
        ...prev,
        items: items || []
      }))

      return items || []
    } catch (err) {
      throw new BaseError('Error al obtener items de navegación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener item específico
  const getItem = useCallback(async (itemId: string): Promise<NavigationItem> => {
    try {
      startLoading()

      const { data: item, error } = await executeWithRetry(() =>
        supabase
          .from('navigation_items')
          .select('*')
          .eq('id', itemId)
          .single()
      )

      if (error) {
        handleNavigationError(error, 'NOT_FOUND')
      }

      return item
    } catch (err) {
      throw new BaseError('Error al obtener item de navegación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Crear item
  const createItem = useCallback(async (
    item: Omit<NavigationItem, 'id' | 'created_at' | 'updated_at'>
  ): Promise<NavigationItem> => {
    if (!user) {
      handleNavigationError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('navigation_items')
          .insert([item])
          .select()
          .single()
      )

      if (error) {
        handleNavigationError(error, 'SERVER_ERROR')
      }

      setNavigationState(prev => ({
        ...prev,
        items: [...prev.items, data]
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al crear item de navegación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Actualizar item
  const updateItem = useCallback(async (
    itemId: string,
    updates: Partial<NavigationItem>
  ): Promise<NavigationItem> => {
    if (!user) {
      handleNavigationError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('navigation_items')
          .update(updates)
          .eq('id', itemId)
          .select()
          .single()
      )

      if (error) {
        handleNavigationError(error, 'SERVER_ERROR')
      }

      setNavigationState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId ? { ...item, ...data } : item
        )
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al actualizar item de navegación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar item
  const deleteItem = useCallback(async (itemId: string): Promise<void> => {
    if (!user) {
      handleNavigationError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('navigation_items')
          .delete()
          .eq('id', itemId)
      )

      if (error) {
        handleNavigationError(error, 'SERVER_ERROR')
      }

      setNavigationState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar item de navegación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Navegar a una ruta
  const navigate = useCallback(async (
    path: string,
    options?: { replace?: boolean, scroll?: boolean }
  ): Promise<void> => {
    try {
      // Verificar acceso
      if (!canAccess(path)) {
        handleNavigationError(
          new Error('No tiene permisos para acceder a esta ruta'),
          'PERMISSION',
          path
        )
      }

      // Navegar usando Next.js router
      if (options?.replace) {
        await router.replace(path, undefined, { scroll: options.scroll })
      } else {
        await router.push(path, undefined, { scroll: options?.scroll })
      }

      // Agregar a historial
      const item = navigationState?.items.find(i => i.path === path)
      if (item) {
        addToHistory({
          path,
          title: item.title
        })
      }
    } catch (err) {
      throw new BaseError('Error al navegar', { cause: err })
    }
  }, [router, navigationState?.items, canAccess])

  // Navegar hacia atrás
  const goBack = useCallback((): void => {
    router.back()
  }, [router])

  // Navegar hacia adelante
  const goForward = useCallback((): void => {
    router.forward()
  }, [router])

  // Obtener breadcrumbs
  const getBreadcrumbs = useCallback((path: string): Breadcrumb[] => {
    const breadcrumbs: Breadcrumb[] = []
    const pathParts = path.split('/').filter(Boolean)

    let currentPath = ''
    for (const part of pathParts) {
      currentPath += `/${part}`
      const item = navigationState?.items.find(i => i.path === currentPath)
      if (item) {
        breadcrumbs.push({
          title: item.title,
          path: item.path,
          icon: item.icon
        })
      }
    }

    return breadcrumbs
  }, [navigationState?.items])

  // Agregar entrada al historial
  const addToHistory = useCallback((
    entry: Omit<NavigationHistory, 'timestamp'>
  ): void => {
    setNavigationState(prev => {
      const newEntry = {
        ...entry,
        timestamp: new Date().toISOString()
      }

      const history = [
        newEntry,
        ...prev.history.filter(h => h.path !== entry.path)
      ].slice(0, MAX_HISTORY_ITEMS)

      return {
        ...prev,
        history
      }
    })
  }, [])

  // Limpiar historial
  const clearHistory = useCallback((): void => {
    setNavigationState(prev => ({
      ...prev,
      history: []
    }))
  }, [])

  // Verificar si una ruta está activa
  const isActive = useCallback((path: string): boolean => {
    return router.asPath === path
  }, [router.asPath])

  // Verificar si se puede acceder a una ruta
  const canAccess = useCallback((path: string): boolean => {
    const item = navigationState?.items.find(i => i.path === path)
    if (!item) return true // Si no hay configuración, permitir acceso

    // Verificar autenticación requerida
    if (item.requires_auth && !user) {
      return false
    }

    // Verificar permisos requeridos
    if (item.required_permissions?.length) {
      // TODO: Implementar verificación de permisos
      return true
    }

    return true
  }, [navigationState?.items, user])

  // Refrescar navegación
  const refreshNavigation = useCallback(async (): Promise<void> => {
    await getItems()
  }, [getItems])

  // Escuchar cambios de ruta
  useEffect(() => {
    const handleRouteChange = (url: string): void => {
      const item = navigationState?.items.find(i => i.path === url)
      if (item) {
        addToHistory({
          path: url,
          title: item.title
        })
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router, navigationState?.items, addToHistory])

  return {
    items: navigationState?.items || [],
    currentPath: router.asPath,
    breadcrumbs: getBreadcrumbs(router.asPath),
    history: navigationState?.history || [],
    isLoading,
    getItems,
    getItem,
    createItem,
    updateItem,
    deleteItem,
    navigate,
    goBack,
    goForward,
    getBreadcrumbs,
    addToHistory,
    clearHistory,
    isActive,
    canAccess,
    refreshNavigation
  }
} 