import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const metadataSchema = z.object({
  id: z.string().uuid(),
  resource_type: z.string(),
  resource_id: z.string(),
  title: z.string().max(60),
  description: z.string().max(160),
  keywords: z.array(z.string()),
  og_title: z.string().max(60).optional(),
  og_description: z.string().max(160).optional(),
  og_image: z.string().url().optional(),
  twitter_card: z.enum(['summary', 'summary_large_image', 'app', 'player']).optional(),
  canonical_url: z.string().url().optional(),
  robots: z.string().optional(),
  schema_org: z.record(z.unknown()).optional(),
  custom_tags: z.array(z.object({
    tag: z.string(),
    attributes: z.record(z.string())
  })).optional(),
  updated_at: z.string()
})

const metadataDefaultsSchema = z.object({
  resource_type: z.string(),
  templates: z.object({
    title: z.string(),
    description: z.string(),
    keywords: z.array(z.string())
  }),
  settings: z.object({
    auto_generate: z.boolean(),
    use_ai: z.boolean().optional(),
    min_keywords: z.number().optional(),
    max_keywords: z.number().optional()
  })
})

export type Metadata = z.infer<typeof metadataSchema>
export type MetadataDefaults = z.infer<typeof metadataDefaultsSchema>

export interface MetadataError extends BaseError {
  code: 'METADATA_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'GENERATION' | 'SERVER_ERROR'
    field?: string
    originalError?: unknown
  }
}

export interface MetadataHookReturn {
  metadata: Metadata | null
  isLoading: boolean
  getMetadata: (resourceType: string, resourceId: string) => Promise<Metadata>
  updateMetadata: (metadata: Partial<Metadata>) => Promise<void>
  generateMetadata: (resourceType: string, resourceId: string) => Promise<Metadata>
  validateMetadata: (metadata: Partial<Metadata>) => boolean
  getDefaults: (resourceType: string) => Promise<MetadataDefaults>
  refreshMetadata: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 15 // 15 minutos

export function useMetadata(
  initialResourceType?: string,
  initialResourceId?: string
): MetadataHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 500
  })

  // Cache para metadatos
  const { 
    data: metadataState, 
    setData: setMetadataState 
  } = useCache<{
    metadata: Metadata | null
    defaults: Record<string, MetadataDefaults>
  }>({
    key: `metadata-${initialResourceType}-${initialResourceId}`,
    ttl: CACHE_TTL
  })

  const handleMetadataError = (
    error: unknown,
    type: MetadataError['details']['type'],
    field?: string
  ): never => {
    throw new BaseError('Error en metadatos', {
      code: 'METADATA_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  // Cargar metadatos
  const fetchMetadata = useCallback(async (
    resourceType: string,
    resourceId: string
  ): Promise<Metadata | null> => {
    const { data, error } = await supabase
      .from('metadata')
      .select('*')
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .single()

    if (error && error.code !== 'PGRST116') {
      handleMetadataError(error, 'SERVER_ERROR')
    }

    return data ? metadataSchema.parse(data) : null
  }, [])

  // Cargar configuración por defecto
  const fetchDefaults = useCallback(async (
    resourceType: string
  ): Promise<MetadataDefaults> => {
    const { data, error } = await supabase
      .from('metadata_defaults')
      .select('*')
      .eq('resource_type', resourceType)
      .single()

    if (error) {
      handleMetadataError(error, 'SERVER_ERROR')
    }

    return metadataDefaultsSchema.parse(data)
  }, [])

  // Obtener metadatos
  const getMetadata = useCallback(async (
    resourceType: string,
    resourceId: string
  ): Promise<Metadata> => {
    try {
      startLoading()

      const metadata = await executeWithRetry(() => fetchMetadata(resourceType, resourceId))
      
      if (!metadata) {
        // Si no existen, generar automáticamente
        return generateMetadata(resourceType, resourceId)
      }

      setMetadataState(prev => ({
        ...prev,
        metadata
      }))

      return metadata
    } catch (err) {
      throw new BaseError('Error al obtener metadatos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchMetadata])

  // Actualizar metadatos
  const updateMetadata = useCallback(async (
    updates: Partial<Metadata>
  ): Promise<void> => {
    try {
      startLoading()

      if (!metadataState?.metadata?.id) {
        throw new ValidationError('No hay metadatos para actualizar')
      }

      // Validar actualizaciones
      const partialSchema = metadataSchema.partial()
      const validated = partialSchema.parse(updates)

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('metadata')
          .update({
            ...validated,
            updated_at: new Date().toISOString()
          })
          .eq('id', metadataState.metadata.id)

        if (error) {
          handleMetadataError(error, 'SERVER_ERROR')
        }

        // Actualizar cache
        setMetadataState(prev => ({
          ...prev,
          metadata: {
            ...prev?.metadata,
            ...validated,
            updated_at: new Date().toISOString()
          } as Metadata
        }))
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        handleMetadataError(err, 'VALIDATION')
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [metadataState?.metadata, startLoading, stopLoading, executeWithRetry])

  // Generar metadatos
  const generateMetadata = useCallback(async (
    resourceType: string,
    resourceId: string
  ): Promise<Metadata> => {
    try {
      startLoading()

      // Obtener configuración por defecto
      const defaults = await executeWithRetry(() => fetchDefaults(resourceType))

      // Obtener datos del recurso
      const { data: resource, error: resourceError } = await supabase
        .from(resourceType)
        .select('*')
        .eq('id', resourceId)
        .single()

      if (resourceError) {
        handleMetadataError(resourceError, 'NOT_FOUND')
      }

      // Generar metadatos usando plantillas
      const metadata: Omit<Metadata, 'id'> = {
        resource_type: resourceType,
        resource_id: resourceId,
        title: interpolateTemplate(defaults.templates.title, resource),
        description: interpolateTemplate(defaults.templates.description, resource),
        keywords: defaults.templates.keywords,
        updated_at: new Date().toISOString()
      }

      // Si está habilitado el uso de IA, enriquecer metadatos
      if (defaults.settings.use_ai) {
        await enrichMetadataWithAI(metadata, resource)
      }

      // Guardar metadatos generados
      const { data, error } = await supabase
        .from('metadata')
        .insert(metadata)
        .select()
        .single()

      if (error) {
        handleMetadataError(error, 'GENERATION')
      }

      const generatedMetadata = metadataSchema.parse(data)

      setMetadataState(prev => ({
        ...prev,
        metadata: generatedMetadata
      }))

      return generatedMetadata
    } catch (err) {
      throw new BaseError('Error al generar metadatos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchDefaults])

  // Validar metadatos
  const validateMetadata = useCallback((metadata: Partial<Metadata>): boolean => {
    try {
      metadataSchema.partial().parse(metadata)
      return true
    } catch (err) {
      return false
    }
  }, [])

  // Obtener configuración por defecto
  const getDefaults = useCallback(async (
    resourceType: string
  ): Promise<MetadataDefaults> => {
    try {
      startLoading()

      const defaults = await executeWithRetry(() => fetchDefaults(resourceType))

      setMetadataState(prev => ({
        ...prev,
        defaults: {
          ...prev?.defaults,
          [resourceType]: defaults
        }
      }))

      return defaults
    } catch (err) {
      throw new BaseError('Error al obtener configuración', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchDefaults])

  // Refrescar metadatos
  const refreshMetadata = useCallback(async (): Promise<void> => {
    if (!initialResourceType || !initialResourceId) return

    await getMetadata(initialResourceType, initialResourceId)
  }, [initialResourceType, initialResourceId, getMetadata])

  // Cargar metadatos iniciales
  useEffect(() => {
    if (initialResourceType && initialResourceId) {
      void refreshMetadata()
    }
  }, [initialResourceType, initialResourceId])

  return {
    metadata: metadataState?.metadata || null,
    isLoading,
    getMetadata,
    updateMetadata,
    generateMetadata,
    validateMetadata,
    getDefaults,
    refreshMetadata
  }
}

// Utilidad para interpolar plantillas
function interpolateTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], data)
    return value?.toString() || ''
  })
}

// Función para enriquecer metadatos con IA (mock)
async function enrichMetadataWithAI(
  metadata: Partial<Metadata>,
  resource: Record<string, unknown>
): Promise<void> {
  // Aquí se integraría con un servicio de IA
  // Por ahora solo agregamos keywords de ejemplo
  metadata.keywords = [
    ...metadata.keywords || [],
    'ai-generated',
    'enhanced'
  ]
} 