import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { usePermissions } from './usePermissions'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const settingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.unknown()),
  z.record(z.unknown())
])

const settingSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  value: settingValueSchema,
  type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
  category: z.string(),
  description: z.string().optional(),
  is_public: z.boolean(),
  requires_restart: z.boolean().optional(),
  validation: z.record(z.unknown()).optional(),
  default_value: settingValueSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
  updated_at: z.string(),
  updated_by: z.string().uuid().optional()
})

const settingsCategorySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().optional(),
  settings: z.array(settingSchema)
})

export type Setting = z.infer<typeof settingSchema>
export type SettingsCategory = z.infer<typeof settingsCategorySchema>

export interface SettingsError extends BaseError {
  code: 'SETTINGS_ERROR'
  details: {
    type: 'VALIDATION' | 'PERMISSION' | 'NOT_FOUND' | 'SERVER_ERROR'
    key?: string
    category?: string
    originalError?: unknown
  }
}

export interface SettingsHookReturn {
  settings: Record<string, Setting>
  categories: SettingsCategory[]
  isLoading: boolean
  getSetting: <T>(key: string) => T | undefined
  updateSetting: (key: string, value: unknown) => Promise<void>
  updateMultiple: (updates: Record<string, unknown>) => Promise<void>
  resetToDefault: (key: string) => Promise<void>
  resetCategory: (category: string) => Promise<void>
  validateSetting: (key: string, value: unknown) => boolean
  refreshSettings: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 30 // 30 minutos

export function useSettings(): SettingsHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { can } = usePermissions()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 1000
  })

  // Cache para configuraciones
  const { 
    data: settingsState, 
    setData: setSettingsState 
  } = useCache<{
    settings: Record<string, Setting>
    categories: SettingsCategory[]
  }>({
    key: 'app-settings',
    ttl: CACHE_TTL
  })

  const handleSettingsError = (
    error: unknown,
    type: SettingsError['details']['type'],
    key?: string,
    category?: string
  ): never => {
    throw new BaseError('Error en configuraciones', {
      code: 'SETTINGS_ERROR',
      details: {
        type,
        key,
        category,
        originalError: error
      }
    })
  }

  // Verificar permisos
  const checkSettingsPermissions = useCallback((setting: Setting): void => {
    if (!setting.is_public && !can('settings', 'manage')) {
      handleSettingsError(
        new Error('Sin permisos para acceder a esta configuración'),
        'PERMISSION',
        setting.key
      )
    }
  }, [can])

  // Validar valor de configuración
  const validateSettingValue = useCallback((
    setting: Setting,
    value: unknown
  ): boolean => {
    try {
      // Validar tipo básico
      const baseSchema = z.object({
        value: settingValueSchema
      })
      baseSchema.parse({ value })

      // Validar según tipo específico
      switch (setting.type) {
        case 'string':
          z.string().parse(value)
          break
        case 'number':
          z.number().parse(value)
          break
        case 'boolean':
          z.boolean().parse(value)
          break
        case 'array':
          z.array(z.unknown()).parse(value)
          break
        case 'object':
          z.record(z.unknown()).parse(value)
          break
      }

      // Validar reglas personalizadas si existen
      if (setting.validation) {
        const customSchema = z.object(setting.validation)
        customSchema.parse({ value })
      }

      return true
    } catch (err) {
      return false
    }
  }, [])

  // Cargar configuraciones
  const fetchSettings = useCallback(async (): Promise<Setting[]> => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .order('category')
      .order('key')

    if (error) {
      handleSettingsError(error, 'SERVER_ERROR')
    }

    return data?.map(setting => settingSchema.parse(setting)) || []
  }, [])

  // Refrescar configuraciones
  const refreshSettings = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      const settings = await executeWithRetry(fetchSettings)

      // Organizar por categorías
      const categoriesMap = new Map<string, Setting[]>()
      const settingsMap: Record<string, Setting> = {}

      settings.forEach(setting => {
        settingsMap[setting.key] = setting
        
        const categorySettings = categoriesMap.get(setting.category) || []
        categorySettings.push(setting)
        categoriesMap.set(setting.category, categorySettings)
      })

      // Convertir a array de categorías
      const categories = Array.from(categoriesMap.entries()).map(([name, settings]) => ({
        name,
        settings,
        order: settings[0]?.metadata?.category_order || 0
      }))

      // Ordenar categorías
      categories.sort((a, b) => a.order - b.order)

      setSettingsState({
        settings: settingsMap,
        categories
      })
    } catch (err) {
      throw new BaseError('Error al refrescar configuraciones', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchSettings])

  // Obtener valor de configuración
  const getSetting = useCallback(<T>(key: string): T | undefined => {
    const setting = settingsState?.settings[key]
    if (!setting) return undefined

    checkSettingsPermissions(setting)
    return setting.value as T
  }, [settingsState?.settings, checkSettingsPermissions])

  // Actualizar configuración
  const updateSetting = useCallback(async (
    key: string,
    value: unknown
  ): Promise<void> => {
    try {
      startLoading()

      const setting = settingsState?.settings[key]
      if (!setting) {
        handleSettingsError(
          new Error('Configuración no encontrada'),
          'NOT_FOUND',
          key
        )
      }

      checkSettingsPermissions(setting)

      if (!validateSettingValue(setting, value)) {
        handleSettingsError(
          new Error('Valor inválido'),
          'VALIDATION',
          key
        )
      }

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('settings')
          .update({
            value,
            updated_at: new Date().toISOString(),
            updated_by: user?.id
          })
          .eq('key', key)

        if (error) {
          handleSettingsError(error, 'SERVER_ERROR', key)
        }

        // Actualizar cache
        setSettingsState(prev => ({
          ...prev,
          settings: {
            ...prev?.settings,
            [key]: {
              ...prev?.settings[key],
              value,
              updated_at: new Date().toISOString(),
              updated_by: user?.id
            }
          }
        }))
      })
    } catch (err) {
      throw new BaseError('Error al actualizar configuración', { cause: err })
    } finally {
      stopLoading()
    }
  }, [
    user?.id,
    settingsState?.settings,
    startLoading,
    stopLoading,
    executeWithRetry,
    checkSettingsPermissions,
    validateSettingValue
  ])

  // Actualizar múltiples configuraciones
  const updateMultiple = useCallback(async (
    updates: Record<string, unknown>
  ): Promise<void> => {
    try {
      startLoading()

      // Validar todas las actualizaciones primero
      Object.entries(updates).forEach(([key, value]) => {
        const setting = settingsState?.settings[key]
        if (!setting) {
          handleSettingsError(
            new Error('Configuración no encontrada'),
            'NOT_FOUND',
            key
          )
        }

        checkSettingsPermissions(setting)

        if (!validateSettingValue(setting, value)) {
          handleSettingsError(
            new Error('Valor inválido'),
            'VALIDATION',
            key
          )
        }
      })

      await executeWithRetry(async () => {
        // Crear actualizaciones en batch
        const batch = Object.entries(updates).map(([key, value]) => ({
          key,
          value,
          updated_at: new Date().toISOString(),
          updated_by: user?.id
        }))

        const { error } = await supabase
          .from('settings')
          .upsert(batch)

        if (error) {
          handleSettingsError(error, 'SERVER_ERROR')
        }

        // Actualizar cache
        setSettingsState(prev => ({
          ...prev,
          settings: {
            ...prev?.settings,
            ...Object.entries(updates).reduce((acc, [key, value]) => ({
              ...acc,
              [key]: {
                ...prev?.settings[key],
                value,
                updated_at: new Date().toISOString(),
                updated_by: user?.id
              }
            }), {})
          }
        }))
      })
    } catch (err) {
      throw new BaseError('Error al actualizar configuraciones', { cause: err })
    } finally {
      stopLoading()
    }
  }, [
    user?.id,
    settingsState?.settings,
    startLoading,
    stopLoading,
    executeWithRetry,
    checkSettingsPermissions,
    validateSettingValue
  ])

  // Restablecer configuración a valor por defecto
  const resetToDefault = useCallback(async (key: string): Promise<void> => {
    try {
      startLoading()

      const setting = settingsState?.settings[key]
      if (!setting) {
        handleSettingsError(
          new Error('Configuración no encontrada'),
          'NOT_FOUND',
          key
        )
      }

      checkSettingsPermissions(setting)

      if (!setting.default_value) {
        throw new ValidationError('No hay valor por defecto definido')
      }

      await updateSetting(key, setting.default_value)
    } catch (err) {
      throw new BaseError('Error al restablecer configuración', { cause: err })
    } finally {
      stopLoading()
    }
  }, [
    settingsState?.settings,
    startLoading,
    stopLoading,
    checkSettingsPermissions,
    updateSetting
  ])

  // Restablecer categoría a valores por defecto
  const resetCategory = useCallback(async (category: string): Promise<void> => {
    try {
      startLoading()

      const categorySettings = settingsState?.categories
        .find(c => c.name === category)?.settings

      if (!categorySettings?.length) {
        handleSettingsError(
          new Error('Categoría no encontrada'),
          'NOT_FOUND',
          undefined,
          category
        )
      }

      const updates = categorySettings
        .filter(setting => setting.default_value !== undefined)
        .reduce((acc, setting) => ({
          ...acc,
          [setting.key]: setting.default_value
        }), {})

      await updateMultiple(updates)
    } catch (err) {
      throw new BaseError('Error al restablecer categoría', { cause: err })
    } finally {
      stopLoading()
    }
  }, [
    settingsState?.categories,
    startLoading,
    stopLoading,
    updateMultiple
  ])

  // Validar configuración
  const validateSetting = useCallback((
    key: string,
    value: unknown
  ): boolean => {
    const setting = settingsState?.settings[key]
    if (!setting) return false

    return validateSettingValue(setting, value)
  }, [settingsState?.settings, validateSettingValue])

  // Cargar configuraciones iniciales
  useEffect(() => {
    void refreshSettings()
  }, [])

  return {
    settings: settingsState?.settings || {},
    categories: settingsState?.categories || [],
    isLoading,
    getSetting,
    updateSetting,
    updateMultiple,
    resetToDefault,
    resetCategory,
    validateSetting,
    refreshSettings
  }
} 