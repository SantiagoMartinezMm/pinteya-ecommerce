import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const layoutConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['default', 'admin', 'auth', 'error', 'custom']),
  config: z.object({
    sidebar: z.object({
      enabled: z.boolean().default(true),
      width: z.number().default(240),
      collapsible: z.boolean().default(true),
      defaultCollapsed: z.boolean().default(false)
    }).optional(),
    header: z.object({
      enabled: z.boolean().default(true),
      height: z.number().default(64),
      fixed: z.boolean().default(true),
      transparent: z.boolean().default(false)
    }).optional(),
    footer: z.object({
      enabled: z.boolean().default(true),
      height: z.number().default(64),
      fixed: z.boolean().default(false)
    }).optional(),
    content: z.object({
      maxWidth: z.number().optional(),
      padding: z.number().default(24),
      background: z.string().optional()
    }).optional()
  }),
  theme: z.object({
    colors: z.record(z.string()).optional(),
    fonts: z.record(z.string()).optional(),
    spacing: z.record(z.number()).optional(),
    breakpoints: z.record(z.number()).optional()
  }).optional(),
  routes: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

const layoutStateSchema = z.object({
  sidebarCollapsed: z.boolean().default(false),
  sidebarWidth: z.number(),
  headerHeight: z.number(),
  footerHeight: z.number(),
  contentPadding: z.number(),
  scrollPosition: z.number().default(0),
  breakpoint: z.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl']).default('lg'),
  isScrolled: z.boolean().default(false),
  isResizing: z.boolean().default(false)
})

export type LayoutConfig = z.infer<typeof layoutConfigSchema>
export type LayoutState = z.infer<typeof layoutStateSchema>

export interface LayoutError extends BaseError {
  code: 'LAYOUT_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    layout_id?: string
    originalError?: unknown
  }
}

export interface LayoutDimensions {
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
}

export interface LayoutHookReturn {
  config: LayoutConfig | null
  state: LayoutState
  dimensions: {
    sidebar: LayoutDimensions
    header: LayoutDimensions
    footer: LayoutDimensions
    content: LayoutDimensions
  }
  isLoading: boolean
  getConfig: (layoutId: string) => Promise<LayoutConfig>
  updateConfig: (layoutId: string, updates: Partial<LayoutConfig>) => Promise<LayoutConfig>
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setHeaderHeight: (height: number) => void
  setFooterHeight: (height: number) => void
  setContentPadding: (padding: number) => void
  resetLayout: () => void
  getBreakpoint: () => LayoutState['breakpoint']
  isBreakpoint: (breakpoint: LayoutState['breakpoint']) => boolean
  onResize: (callback: (dimensions: LayoutDimensions) => void) => () => void
  refreshLayout: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 60 // 1 hora
const SCROLL_THRESHOLD = 50
const RESIZE_DEBOUNCE = 200

const DEFAULT_DIMENSIONS: LayoutDimensions = {
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0
}

export function useLayout(): LayoutHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()

  // Cache para configuración y estado
  const {
    data: layoutState,
    setData: setLayoutState
  } = useCache<{
    config: LayoutConfig | null
    state: LayoutState
    dimensions: {
      sidebar: LayoutDimensions
      header: LayoutDimensions
      footer: LayoutDimensions
      content: LayoutDimensions
    }
  }>({
    key: 'layout-state',
    ttl: CACHE_TTL,
    initialData: {
      config: null,
      state: {
        sidebarCollapsed: false,
        sidebarWidth: 240,
        headerHeight: 64,
        footerHeight: 64,
        contentPadding: 24,
        scrollPosition: 0,
        breakpoint: 'lg',
        isScrolled: false,
        isResizing: false
      },
      dimensions: {
        sidebar: DEFAULT_DIMENSIONS,
        header: DEFAULT_DIMENSIONS,
        footer: DEFAULT_DIMENSIONS,
        content: DEFAULT_DIMENSIONS
      }
    }
  })

  const handleLayoutError = (
    error: unknown,
    type: LayoutError['details']['type'],
    layout_id?: string
  ): never => {
    throw new BaseError('Error en layout', {
      code: 'LAYOUT_ERROR',
      details: {
        type,
        layout_id,
        originalError: error
      }
    })
  }

  // Obtener configuración
  const getConfig = useCallback(async (layoutId: string): Promise<LayoutConfig> => {
    try {
      startLoading()

      const { data: config, error } = await executeWithRetry(() =>
        supabase
          .from('layout_configs')
          .select('*')
          .eq('id', layoutId)
          .single()
      )

      if (error) {
        handleLayoutError(error, 'NOT_FOUND', layoutId)
      }

      setLayoutState(prev => ({
        ...prev,
        config
      }))

      return config
    } catch (err) {
      throw new BaseError('Error al obtener configuración', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Actualizar configuración
  const updateConfig = useCallback(async (
    layoutId: string,
    updates: Partial<LayoutConfig>
  ): Promise<LayoutConfig> => {
    if (!user) {
      handleLayoutError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: config, error } = await executeWithRetry(() =>
        supabase
          .from('layout_configs')
          .update(updates)
          .eq('id', layoutId)
          .select()
          .single()
      )

      if (error) {
        handleLayoutError(error, 'SERVER_ERROR', layoutId)
      }

      setLayoutState(prev => ({
        ...prev,
        config
      }))

      return config
    } catch (err) {
      throw new BaseError('Error al actualizar configuración', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Alternar sidebar
  const toggleSidebar = useCallback((): void => {
    setLayoutState(prev => ({
      ...prev,
      state: {
        ...prev.state,
        sidebarCollapsed: !prev.state.sidebarCollapsed
      }
    }))
  }, [])

  // Establecer ancho del sidebar
  const setSidebarWidth = useCallback((width: number): void => {
    setLayoutState(prev => ({
      ...prev,
      state: {
        ...prev.state,
        sidebarWidth: width
      }
    }))
  }, [])

  // Establecer altura del header
  const setHeaderHeight = useCallback((height: number): void => {
    setLayoutState(prev => ({
      ...prev,
      state: {
        ...prev.state,
        headerHeight: height
      }
    }))
  }, [])

  // Establecer altura del footer
  const setFooterHeight = useCallback((height: number): void => {
    setLayoutState(prev => ({
      ...prev,
      state: {
        ...prev.state,
        footerHeight: height
      }
    }))
  }, [])

  // Establecer padding del contenido
  const setContentPadding = useCallback((padding: number): void => {
    setLayoutState(prev => ({
      ...prev,
      state: {
        ...prev.state,
        contentPadding: padding
      }
    }))
  }, [])

  // Restablecer layout
  const resetLayout = useCallback((): void => {
    setLayoutState(prev => ({
      ...prev,
      state: {
        sidebarCollapsed: false,
        sidebarWidth: prev.config?.config.sidebar?.width || 240,
        headerHeight: prev.config?.config.header?.height || 64,
        footerHeight: prev.config?.config.footer?.height || 64,
        contentPadding: prev.config?.config.content?.padding || 24,
        scrollPosition: 0,
        breakpoint: 'lg',
        isScrolled: false,
        isResizing: false
      }
    }))
  }, [])

  // Obtener breakpoint actual
  const getBreakpoint = useCallback((): LayoutState['breakpoint'] => {
    if (typeof window === 'undefined') return 'lg'

    const width = window.innerWidth
    if (width < 640) return 'xs'
    if (width < 768) return 'sm'
    if (width < 1024) return 'md'
    if (width < 1280) return 'lg'
    if (width < 1536) return 'xl'
    return '2xl'
  }, [])

  // Verificar breakpoint
  const isBreakpoint = useCallback((breakpoint: LayoutState['breakpoint']): boolean => {
    return layoutState?.state.breakpoint === breakpoint
  }, [layoutState?.state.breakpoint])

  // Suscribirse a eventos de resize
  const onResize = useCallback((
    callback: (dimensions: LayoutDimensions) => void
  ): () => void => {
    let timeoutId: NodeJS.Timeout

    const handleResize = (): void => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      setLayoutState(prev => ({
        ...prev,
        state: {
          ...prev.state,
          isResizing: true
        }
      }))

      timeoutId = setTimeout(() => {
        const dimensions = calculateDimensions()
        callback(dimensions)

        setLayoutState(prev => ({
          ...prev,
          state: {
            ...prev.state,
            isResizing: false,
            breakpoint: getBreakpoint()
          },
          dimensions
        }))
      }, RESIZE_DEBOUNCE)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [getBreakpoint])

  // Calcular dimensiones
  const calculateDimensions = useCallback((): {
    sidebar: LayoutDimensions
    header: LayoutDimensions
    footer: LayoutDimensions
    content: LayoutDimensions
  } => {
    if (typeof window === 'undefined') {
      return {
        sidebar: DEFAULT_DIMENSIONS,
        header: DEFAULT_DIMENSIONS,
        footer: DEFAULT_DIMENSIONS,
        content: DEFAULT_DIMENSIONS
      }
    }

    const state = layoutState?.state
    const config = layoutState?.config

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Calcular dimensiones del sidebar
    const sidebarWidth = state?.sidebarCollapsed ? 0 : state?.sidebarWidth
    const sidebar: LayoutDimensions = {
      width: sidebarWidth,
      height: windowHeight,
      top: 0,
      left: 0,
      right: sidebarWidth,
      bottom: windowHeight
    }

    // Calcular dimensiones del header
    const headerHeight = config?.config.header?.enabled ? state?.headerHeight : 0
    const header: LayoutDimensions = {
      width: windowWidth - sidebarWidth,
      height: headerHeight,
      top: 0,
      left: sidebarWidth,
      right: windowWidth,
      bottom: headerHeight
    }

    // Calcular dimensiones del footer
    const footerHeight = config?.config.footer?.enabled ? state?.footerHeight : 0
    const footer: LayoutDimensions = {
      width: windowWidth - sidebarWidth,
      height: footerHeight,
      top: windowHeight - footerHeight,
      left: sidebarWidth,
      right: windowWidth,
      bottom: windowHeight
    }

    // Calcular dimensiones del contenido
    const content: LayoutDimensions = {
      width: windowWidth - sidebarWidth,
      height: windowHeight - headerHeight - footerHeight,
      top: headerHeight,
      left: sidebarWidth,
      right: windowWidth,
      bottom: windowHeight - footerHeight
    }

    return {
      sidebar,
      header,
      footer,
      content
    }
  }, [layoutState?.state, layoutState?.config])

  // Manejar scroll
  useEffect(() => {
    const handleScroll = (): void => {
      const scrollPosition = window.scrollY
      const isScrolled = scrollPosition > SCROLL_THRESHOLD

      setLayoutState(prev => ({
        ...prev,
        state: {
          ...prev.state,
          scrollPosition,
          isScrolled
        }
      }))
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Manejar resize inicial
  useEffect(() => {
    const dimensions = calculateDimensions()
    const breakpoint = getBreakpoint()

    setLayoutState(prev => ({
      ...prev,
      state: {
        ...prev.state,
        breakpoint
      },
      dimensions
    }))
  }, [calculateDimensions, getBreakpoint])

  // Refrescar layout
  const refreshLayout = useCallback(async (): Promise<void> => {
    if (layoutState?.config?.id) {
      await getConfig(layoutState.config.id)
    }
  }, [layoutState?.config?.id, getConfig])

  return {
    config: layoutState?.config || null,
    state: layoutState?.state,
    dimensions: layoutState?.dimensions,
    isLoading,
    getConfig,
    updateConfig,
    toggleSidebar,
    setSidebarWidth,
    setHeaderHeight,
    setFooterHeight,
    setContentPadding,
    resetLayout,
    getBreakpoint,
    isBreakpoint,
    onResize,
    refreshLayout
  }
} 