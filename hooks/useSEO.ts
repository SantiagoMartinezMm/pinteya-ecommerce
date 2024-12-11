import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const seoConfigSchema = z.object({
  id: z.string().uuid(),
  route: z.string(),
  title: z.string().max(60),
  description: z.string().max(160),
  keywords: z.array(z.string()).optional(),
  canonical_url: z.string().url().optional(),
  og_title: z.string().max(60).optional(),
  og_description: z.string().max(160).optional(),
  og_image: z.string().url().optional(),
  og_type: z.enum(['website', 'article', 'product']).default('website'),
  twitter_card: z.enum(['summary', 'summary_large_image']).default('summary'),
  twitter_title: z.string().max(60).optional(),
  twitter_description: z.string().max(160).optional(),
  twitter_image: z.string().url().optional(),
  robots: z.array(z.enum([
    'index',
    'noindex',
    'follow',
    'nofollow',
    'archive',
    'noarchive'
  ])).default(['index', 'follow']),
  priority: z.number().min(0).max(1).default(0.5),
  changefreq: z.enum([
    'always',
    'hourly',
    'daily',
    'weekly',
    'monthly',
    'yearly',
    'never'
  ]).default('weekly'),
  structured_data: z.record(z.unknown()).optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

const seoAnalyticsSchema = z.object({
  id: z.string().uuid(),
  route: z.string(),
  page_views: z.number().default(0),
  avg_time_on_page: z.number().default(0),
  bounce_rate: z.number().default(0),
  click_through_rate: z.number().default(0),
  search_impressions: z.number().default(0),
  search_clicks: z.number().default(0),
  search_position: z.number().default(0),
  last_updated: z.string().datetime()
})

export type SEOConfig = z.infer<typeof seoConfigSchema>
export type SEOAnalytics = z.infer<typeof seoAnalyticsSchema>

export interface SEOError extends BaseError {
  code: 'SEO_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    route?: string
    config_id?: string
    originalError?: unknown
  }
}

export interface SEOMetaTags {
  title: string
  meta: Array<{
    name?: string
    property?: string
    content: string
  }>
  link?: Array<{
    rel: string
    href: string
  }>
  script?: Array<{
    type: string
    innerHTML: string
  }>
}

export interface SEOHookReturn {
  configs: SEOConfig[]
  analytics: SEOAnalytics[]
  isLoading: boolean
  getConfig: (route: string) => Promise<SEOConfig>
  updateConfig: (configId: string, updates: Partial<SEOConfig>) => Promise<SEOConfig>
  createConfig: (config: Omit<SEOConfig, 'id' | 'created_at' | 'updated_at'>) => Promise<SEOConfig>
  deleteConfig: (configId: string) => Promise<void>
  getMetaTags: (route: string) => Promise<SEOMetaTags>
  generateSitemap: () => Promise<string>
  generateRobotsTxt: () => Promise<string>
  getAnalytics: (route: string) => Promise<SEOAnalytics>
  updateAnalytics: (route: string, data: Partial<SEOAnalytics>) => Promise<SEOAnalytics>
  validateConfig: (config: Partial<SEOConfig>) => Promise<boolean>
  generateStructuredData: (type: string, data: Record<string, unknown>) => string
  optimizeMetaTags: (config: SEOConfig) => Promise<SEOConfig>
  checkSEOScore: (route: string) => Promise<number>
}

const CACHE_TTL = 1000 * 60 * 15 // 15 minutos

export function useSEO(): SEOHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()

  // Cache para configuraciones y analíticas
  const {
    data: seoState,
    setData: setSeoState
  } = useCache<{
    configs: SEOConfig[]
    analytics: SEOAnalytics[]
  }>({
    key: 'seo-state',
    ttl: CACHE_TTL,
    initialData: {
      configs: [],
      analytics: []
    }
  })

  const handleSEOError = (
    error: unknown,
    type: SEOError['details']['type'],
    details?: Omit<SEOError['details'], 'type' | 'originalError'>
  ): never => {
    throw new BaseError('Error en gestión de SEO', {
      code: 'SEO_ERROR',
      details: {
        type,
        ...details,
        originalError: error
      }
    })
  }

  // Obtener configuración
  const getConfig = useCallback(async (route: string): Promise<SEOConfig> => {
    try {
      startLoading()

      const { data: config, error } = await executeWithRetry(() =>
        supabase
          .from('seo_configs')
          .select()
          .eq('route', route)
          .single()
      )

      if (error) {
        handleSEOError(error, 'NOT_FOUND', { route })
      }

      return config
    } catch (err) {
      throw new BaseError('Error al obtener configuración SEO', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Actualizar configuración
  const updateConfig = useCallback(async (
    configId: string,
    updates: Partial<SEOConfig>
  ): Promise<SEOConfig> => {
    if (!user) {
      handleSEOError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: config, error } = await executeWithRetry(() =>
        supabase
          .from('seo_configs')
          .update(updates)
          .eq('id', configId)
          .select()
          .single()
      )

      if (error) {
        handleSEOError(error, 'SERVER_ERROR', { config_id: configId })
      }

      setSeoState(prev => ({
        ...prev,
        configs: prev.configs.map(c => c.id === configId ? config : c)
      }))

      return config
    } catch (err) {
      throw new BaseError('Error al actualizar configuración SEO', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Crear configuración
  const createConfig = useCallback(async (
    config: Omit<SEOConfig, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SEOConfig> => {
    if (!user) {
      handleSEOError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: newConfig, error } = await executeWithRetry(() =>
        supabase
          .from('seo_configs')
          .insert(config)
          .select()
          .single()
      )

      if (error) {
        handleSEOError(error, 'SERVER_ERROR')
      }

      setSeoState(prev => ({
        ...prev,
        configs: [...prev.configs, newConfig]
      }))

      return newConfig
    } catch (err) {
      throw new BaseError('Error al crear configuración SEO', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar configuración
  const deleteConfig = useCallback(async (configId: string): Promise<void> => {
    if (!user) {
      handleSEOError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('seo_configs')
          .delete()
          .eq('id', configId)
      )

      if (error) {
        handleSEOError(error, 'SERVER_ERROR', { config_id: configId })
      }

      setSeoState(prev => ({
        ...prev,
        configs: prev.configs.filter(c => c.id !== configId)
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar configuración SEO', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Obtener meta tags
  const getMetaTags = useCallback(async (route: string): Promise<SEOMetaTags> => {
    try {
      const config = await getConfig(route)

      const metaTags: SEOMetaTags = {
        title: config.title,
        meta: [
          { name: 'description', content: config.description },
          { name: 'keywords', content: config.keywords?.join(', ') || '' },
          { property: 'og:title', content: config.og_title || config.title },
          { property: 'og:description', content: config.og_description || config.description },
          { property: 'og:image', content: config.og_image || '' },
          { property: 'og:type', content: config.og_type },
          { name: 'twitter:card', content: config.twitter_card },
          { name: 'twitter:title', content: config.twitter_title || config.title },
          { name: 'twitter:description', content: config.twitter_description || config.description },
          { name: 'twitter:image', content: config.twitter_image || '' },
          { name: 'robots', content: config.robots.join(', ') }
        ],
        link: config.canonical_url ? [
          { rel: 'canonical', href: config.canonical_url }
        ] : undefined,
        script: config.structured_data ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(config.structured_data)
          }
        ] : undefined
      }

      return metaTags
    } catch (err) {
      throw new BaseError('Error al obtener meta tags', { cause: err })
    }
  }, [getConfig])

  // Generar sitemap
  const generateSitemap = useCallback(async (): Promise<string> => {
    try {
      const { data: configs, error } = await executeWithRetry(() =>
        supabase
          .from('seo_configs')
          .select()
          .eq('is_active', true)
      )

      if (error) {
        handleSEOError(error, 'SERVER_ERROR')
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
      let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
      sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

      configs.forEach(config => {
        sitemap += '  <url>\n'
        sitemap += `    <loc>${baseUrl}${config.route}</loc>\n`
        sitemap += `    <lastmod>${config.updated_at}</lastmod>\n`
        sitemap += `    <changefreq>${config.changefreq}</changefreq>\n`
        sitemap += `    <priority>${config.priority}</priority>\n`
        sitemap += '  </url>\n'
      })

      sitemap += '</urlset>'
      return sitemap
    } catch (err) {
      throw new BaseError('Error al generar sitemap', { cause: err })
    }
  }, [executeWithRetry])

  // Generar robots.txt
  const generateRobotsTxt = useCallback(async (): Promise<string> => {
    try {
      const { data: configs, error } = await executeWithRetry(() =>
        supabase
          .from('seo_configs')
          .select('route, robots')
      )

      if (error) {
        handleSEOError(error, 'SERVER_ERROR')
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
      let robotsTxt = 'User-agent: *\n'

      configs.forEach(config => {
        if (config.robots.includes('noindex')) {
          robotsTxt += `Disallow: ${config.route}\n`
        }
      })

      robotsTxt += `\nSitemap: ${baseUrl}/sitemap.xml`
      return robotsTxt
    } catch (err) {
      throw new BaseError('Error al generar robots.txt', { cause: err })
    }
  }, [executeWithRetry])

  // Obtener analíticas
  const getAnalytics = useCallback(async (route: string): Promise<SEOAnalytics> => {
    try {
      startLoading()

      const { data: analytics, error } = await executeWithRetry(() =>
        supabase
          .from('seo_analytics')
          .select()
          .eq('route', route)
          .single()
      )

      if (error) {
        handleSEOError(error, 'NOT_FOUND', { route })
      }

      return analytics
    } catch (err) {
      throw new BaseError('Error al obtener analíticas SEO', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Actualizar analíticas
  const updateAnalytics = useCallback(async (
    route: string,
    data: Partial<SEOAnalytics>
  ): Promise<SEOAnalytics> => {
    try {
      startLoading()

      const { data: analytics, error } = await executeWithRetry(() =>
        supabase
          .from('seo_analytics')
          .update({
            ...data,
            last_updated: new Date().toISOString()
          })
          .eq('route', route)
          .select()
          .single()
      )

      if (error) {
        handleSEOError(error, 'SERVER_ERROR', { route })
      }

      setSeoState(prev => ({
        ...prev,
        analytics: prev.analytics.map(a => a.route === route ? analytics : a)
      }))

      return analytics
    } catch (err) {
      throw new BaseError('Error al actualizar analíticas SEO', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Validar configuración
  const validateConfig = useCallback(async (config: Partial<SEOConfig>): Promise<boolean> => {
    try {
      await seoConfigSchema.parseAsync(config)
      return true
    } catch (err) {
      return false
    }
  }, [])

  // Generar datos estructurados
  const generateStructuredData = useCallback((
    type: string,
    data: Record<string, unknown>
  ): string => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': type,
      ...data
    }
    return JSON.stringify(structuredData)
  }, [])

  // Optimizar meta tags
  const optimizeMetaTags = useCallback(async (config: SEOConfig): Promise<SEOConfig> => {
    const updates: Partial<SEOConfig> = {}

    // Optimizar título
    if (config.title.length > 60) {
      updates.title = config.title.substring(0, 57) + '...'
    }

    // Optimizar descripción
    if (config.description.length > 160) {
      updates.description = config.description.substring(0, 157) + '...'
    }

    // Asegurar Open Graph tags
    if (!config.og_title) updates.og_title = config.title
    if (!config.og_description) updates.og_description = config.description

    // Asegurar Twitter tags
    if (!config.twitter_title) updates.twitter_title = config.title
    if (!config.twitter_description) updates.twitter_description = config.description

    if (Object.keys(updates).length > 0) {
      return await updateConfig(config.id, updates)
    }

    return config
  }, [updateConfig])

  // Calcular puntuación SEO
  const checkSEOScore = useCallback(async (route: string): Promise<number> => {
    try {
      const config = await getConfig(route)
      let score = 0
      const maxScore = 100

      // Título (20 puntos)
      if (config.title) {
        score += 10
        if (config.title.length >= 30 && config.title.length <= 60) score += 10
      }

      // Descripción (20 puntos)
      if (config.description) {
        score += 10
        if (config.description.length >= 120 && config.description.length <= 160) score += 10
      }

      // Keywords (10 puntos)
      if (config.keywords && config.keywords.length > 0) score += 10

      // Open Graph (15 puntos)
      if (config.og_title) score += 5
      if (config.og_description) score += 5
      if (config.og_image) score += 5

      // Twitter Cards (15 puntos)
      if (config.twitter_title) score += 5
      if (config.twitter_description) score += 5
      if (config.twitter_image) score += 5

      // Datos estructurados (10 puntos)
      if (config.structured_data) score += 10

      // URL canónica (10 puntos)
      if (config.canonical_url) score += 10

      return (score / maxScore) * 100
    } catch (err) {
      throw new BaseError('Error al calcular puntuación SEO', { cause: err })
    }
  }, [getConfig])

  // Cargar configuraciones iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        startLoading()

        const [
          { data: configs, error: configsError },
          { data: analytics, error: analyticsError }
        ] = await Promise.all([
          executeWithRetry(() =>
            supabase
              .from('seo_configs')
              .select()
              .eq('is_active', true)
          ),
          executeWithRetry(() =>
            supabase
              .from('seo_analytics')
              .select()
          )
        ])

        if (configsError) handleSEOError(configsError, 'SERVER_ERROR')
        if (analyticsError) handleSEOError(analyticsError, 'SERVER_ERROR')

        setSeoState({
          configs: configs || [],
          analytics: analytics || []
        })
      } catch (err) {
        console.error('Error al cargar datos SEO iniciales:', err)
      } finally {
        stopLoading()
      }
    }

    loadInitialData()
  }, [executeWithRetry, startLoading, stopLoading])

  return {
    configs: seoState?.configs || [],
    analytics: seoState?.analytics || [],
    isLoading,
    getConfig,
    updateConfig,
    createConfig,
    deleteConfig,
    getMetaTags,
    generateSitemap,
    generateRobotsTxt,
    getAnalytics,
    updateAnalytics,
    validateConfig,
    generateStructuredData,
    optimizeMetaTags,
    checkSEOScore
  }
}
