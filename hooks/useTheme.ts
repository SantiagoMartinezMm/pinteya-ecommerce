import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const themeSchema = z.object({
  mode: z.enum(['light', 'dark', 'system']),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  fontSize: z.enum(['small', 'medium', 'large']),
  spacing: z.enum(['compact', 'comfortable', 'spacious']),
  borderRadius: z.enum(['none', 'small', 'medium', 'large']),
  animations: z.boolean(),
  customProperties: z.record(z.string()).optional()
})

const themePresetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  theme: themeSchema,
  isDefault: z.boolean().optional(),
  created_at: z.string()
})

export type Theme = z.infer<typeof themeSchema>
export type ThemePreset = z.infer<typeof themePresetSchema>

export interface ThemeError extends BaseError {
  code: 'THEME_ERROR'
  details: {
    type: 'VALIDATION' | 'STORAGE' | 'PRESET' | 'SERVER_ERROR'
    field?: string
    originalError?: unknown
  }
}

export interface ThemeHookReturn {
  theme: Theme
  presets: ThemePreset[]
  isLoading: boolean
  setTheme: (theme: Partial<Theme>) => void
  resetTheme: () => void
  savePreset: (name: string, description?: string) => Promise<void>
  loadPreset: (presetId: string) => Promise<void>
  deletePreset: (presetId: string) => Promise<void>
  applySystemTheme: () => void
}

const defaultTheme: Theme = {
  mode: 'system',
  primaryColor: '#007AFF',
  fontSize: 'medium',
  spacing: 'comfortable',
  borderRadius: 'medium',
  animations: true
}

const STORAGE_KEY = 'app-theme'
const PRESETS_CACHE_TTL = 1000 * 60 * 60 // 1 hora

export function useTheme(): ThemeHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 500
  })

  // Cache para presets
  const { 
    data: presets, 
    setData: setPresets 
  } = useCache<ThemePreset[]>({
    key: 'theme-presets',
    ttl: PRESETS_CACHE_TTL
  })

  // Cache para tema actual
  const { 
    data: currentTheme, 
    setData: setCurrentTheme 
  } = useCache<Theme>({
    key: STORAGE_KEY,
    ttl: Infinity, // El tema persiste hasta que se cambie
    initialData: defaultTheme
  })

  const handleThemeError = (
    error: unknown, 
    type: ThemeError['details']['type'], 
    field?: string
  ): never => {
    throw new BaseError('Error en tema', {
      code: 'THEME_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  // Aplicar tema al DOM
  const applyThemeToDOM = useCallback((theme: Theme) => {
    const root = document.documentElement
    const computedMode = theme.mode === 'system' 
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : theme.mode

    // Aplicar modo claro/oscuro
    root.setAttribute('data-theme', computedMode)

    // Aplicar variables CSS
    root.style.setProperty('--primary-color', theme.primaryColor)
    root.style.setProperty('--font-size-base', `var(--font-size-${theme.fontSize})`)
    root.style.setProperty('--spacing-base', `var(--spacing-${theme.spacing})`)
    root.style.setProperty('--border-radius-base', `var(--radius-${theme.borderRadius})`)
    
    // Aplicar animaciones
    root.style.setProperty('--transitions-enabled', theme.animations ? '1' : '0')

    // Aplicar propiedades personalizadas
    if (theme.customProperties) {
      Object.entries(theme.customProperties).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
      })
    }
  }, [])

  // Establecer tema
  const setTheme = useCallback((newTheme: Partial<Theme>) => {
    try {
      const mergedTheme = {
        ...currentTheme,
        ...newTheme
      }

      const validatedTheme = themeSchema.parse(mergedTheme)
      setCurrentTheme(validatedTheme)
      applyThemeToDOM(validatedTheme)

      // Sincronizar con preferencias de usuario si está autenticado
      if (user?.id) {
        void executeWithRetry(async () => {
          const { error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              theme: validatedTheme
            })

          if (error) {
            handleThemeError(error, 'STORAGE')
          }
        })
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        handleThemeError(err, 'VALIDATION')
      }
      throw err
    }
  }, [currentTheme, user?.id, executeWithRetry, applyThemeToDOM])

  // Restablecer tema por defecto
  const resetTheme = useCallback(() => {
    setTheme(defaultTheme)
  }, [setTheme])

  // Guardar preset
  const savePreset = useCallback(async (
    name: string,
    description?: string
  ): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      const preset: Omit<ThemePreset, 'id' | 'created_at'> = {
        name,
        description,
        theme: currentTheme,
        isDefault: false
      }

      await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('theme_presets')
          .insert(preset)
          .select()
          .single()

        if (error) {
          handleThemeError(error, 'PRESET')
        }

        // Actualizar cache de presets
        setPresets(prev => [...(prev || []), data])
      })
    } catch (err) {
      throw new BaseError('Error al guardar preset', { cause: err })
    } finally {
      stopLoading()
    }
  }, [currentTheme, user?.id, startLoading, stopLoading, executeWithRetry])

  // Cargar preset
  const loadPreset = useCallback(async (presetId: string): Promise<void> => {
    try {
      startLoading()

      await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('theme_presets')
          .select('theme')
          .eq('id', presetId)
          .single()

        if (error) {
          handleThemeError(error, 'PRESET')
        }

        setTheme(data.theme)
      })
    } catch (err) {
      throw new BaseError('Error al cargar preset', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, setTheme])

  // Eliminar preset
  const deletePreset = useCallback(async (presetId: string): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('theme_presets')
          .delete()
          .eq('id', presetId)
          .eq('user_id', user.id)

        if (error) {
          handleThemeError(error, 'PRESET')
        }

        // Actualizar cache de presets
        setPresets(prev => prev?.filter(p => p.id !== presetId) || [])
      })
    } catch (err) {
      throw new BaseError('Error al eliminar preset', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, startLoading, stopLoading, executeWithRetry])

  // Aplicar tema del sistema
  const applySystemTheme = useCallback(() => {
    setTheme({ mode: 'system' })
  }, [setTheme])

  // Cargar tema inicial
  useEffect(() => {
    if (user?.id) {
      void executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          handleThemeError(error, 'STORAGE')
        }

        if (data?.theme) {
          setTheme(data.theme)
        }
      })
    }
  }, [user?.id, executeWithRetry, setTheme])

  // Cargar presets
  useEffect(() => {
    if (user?.id) {
      void executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('theme_presets')
          .select('*')
          .or(`user_id.eq.${user.id},is_default.eq.true`)
          .order('created_at', { ascending: false })

        if (error) {
          handleThemeError(error, 'PRESET')
        }

        setPresets(data)
      })
    }
  }, [user?.id, executeWithRetry])

  // Escuchar cambios en el tema del sistema
  useEffect(() => {
    if (currentTheme.mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyThemeToDOM(currentTheme)
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [currentTheme, applyThemeToDOM])

  return {
    theme: currentTheme,
    presets: presets || [],
    isLoading,
    setTheme,
    resetTheme,
    savePreset,
    loadPreset,
    deletePreset,
    applySystemTheme
  }
} 