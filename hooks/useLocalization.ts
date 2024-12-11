import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useSettings } from './useSettings'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const localeSchema = z.object({
  code: z.string(),
  name: z.string(),
  native_name: z.string(),
  region: z.string().optional(),
  is_default: z.boolean(),
  is_active: z.boolean(),
  direction: z.enum(['ltr', 'rtl']).default('ltr'),
  date_format: z.string().default('YYYY-MM-DD'),
  time_format: z.string().default('HH:mm'),
  number_format: z.object({
    decimal_separator: z.string(),
    thousand_separator: z.string(),
    decimal_digits: z.number()
  }),
  currency_format: z.object({
    symbol: z.string(),
    position: z.enum(['before', 'after']),
    space: z.boolean()
  }),
  metadata: z.record(z.unknown()).optional()
})

const translationSchema = z.object({
  locale: z.string(),
  namespace: z.string(),
  key: z.string(),
  value: z.string(),
  is_plural: z.boolean().optional(),
  plural_forms: z.record(z.string()).optional(),
  context: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})

export type Locale = z.infer<typeof localeSchema>
export type Translation = z.infer<typeof translationSchema>

export interface LocalizationError extends BaseError {
  code: 'LOCALIZATION_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'TRANSLATION' | 'SERVER_ERROR'
    locale?: string
    key?: string
    originalError?: unknown
  }
}

export interface LocalizationHookReturn {
  currentLocale: Locale
  availableLocales: Locale[]
  translations: Record<string, Record<string, string>>
  isLoading: boolean
  setLocale: (locale: string) => Promise<void>
  t: (key: string, params?: Record<string, unknown>) => string
  formatDate: (date: Date | string, format?: string) => string
  formatNumber: (number: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (amount: number, currency?: string) => string
  refreshTranslations: () => Promise<void>
  addTranslation: (translation: Omit<Translation, 'id'>) => Promise<void>
  importTranslations: (locale: string, translations: Record<string, string>) => Promise<void>
  exportTranslations: (locale: string) => Promise<Record<string, string>>
}

const CACHE_TTL = 1000 * 60 * 60 // 1 hora
const DEFAULT_NAMESPACE = 'common'

export function useLocalization(): LocalizationHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { getSetting } = useSettings()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 1000
  })

  // Cache para locales y traducciones
  const { 
    data: localizationState, 
    setData: setLocalizationState 
  } = useCache<{
    currentLocale: Locale
    availableLocales: Locale[]
    translations: Record<string, Record<string, string>>
  }>({
    key: 'localization-state',
    ttl: CACHE_TTL
  })

  const handleLocalizationError = (
    error: unknown,
    type: LocalizationError['details']['type'],
    locale?: string,
    key?: string
  ): never => {
    throw new BaseError('Error en localización', {
      code: 'LOCALIZATION_ERROR',
      details: {
        type,
        locale,
        key,
        originalError: error
      }
    })
  }

  // Cargar locales disponibles
  const fetchLocales = useCallback(async (): Promise<Locale[]> => {
    const { data, error } = await supabase
      .from('locales')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) {
      handleLocalizationError(error, 'SERVER_ERROR')
    }

    return data?.map(locale => localeSchema.parse(locale)) || []
  }, [])

  // Cargar traducciones para un locale
  const fetchTranslations = useCallback(async (
    locale: string
  ): Promise<Record<string, string>> => {
    const { data, error } = await supabase
      .from('translations')
      .select('*')
      .eq('locale', locale)

    if (error) {
      handleLocalizationError(error, 'SERVER_ERROR', locale)
    }

    return data?.reduce((acc, translation) => ({
      ...acc,
      [`${translation.namespace}:${translation.key}`]: translation.value
    }), {}) || {}
  }, [])

  // Determinar locale inicial
  const determineInitialLocale = useCallback(async (): Promise<Locale> => {
    const locales = await fetchLocales()
    if (!locales.length) {
      handleLocalizationError(
        new Error('No hay locales disponibles'),
        'NOT_FOUND'
      )
    }

    // Prioridad: configuración de usuario > preferencia del navegador > locale por defecto
    const userLocale = getSetting<string>('preferred_locale')
    const browserLocale = navigator.language.split('-')[0]
    
    return (
      locales.find(l => l.code === userLocale) ||
      locales.find(l => l.code === browserLocale) ||
      locales.find(l => l.is_default) ||
      locales[0]
    )
  }, [fetchLocales, getSetting])

  // Refrescar traducciones
  const refreshTranslations = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      const [locales, currentLocale] = await Promise.all([
        executeWithRetry(fetchLocales),
        executeWithRetry(determineInitialLocale)
      ])

      const translations = await executeWithRetry(() => 
        fetchTranslations(currentLocale.code)
      )

      setLocalizationState({
        currentLocale,
        availableLocales: locales,
        translations: {
          [currentLocale.code]: translations
        }
      })
    } catch (err) {
      throw new BaseError('Error al refrescar traducciones', { cause: err })
    } finally {
      stopLoading()
    }
  }, [
    startLoading,
    stopLoading,
    executeWithRetry,
    fetchLocales,
    determineInitialLocale,
    fetchTranslations
  ])

  // Cambiar locale
  const setLocale = useCallback(async (locale: string): Promise<void> => {
    try {
      startLoading()

      const targetLocale = localizationState?.availableLocales.find(l => l.code === locale)
      if (!targetLocale) {
        handleLocalizationError(
          new Error('Locale no encontrado'),
          'NOT_FOUND',
          locale
        )
      }

      // Cargar traducciones si no están en cache
      if (!localizationState?.translations[locale]) {
        const translations = await executeWithRetry(() => fetchTranslations(locale))
        setLocalizationState(prev => ({
          ...prev,
          currentLocale: targetLocale,
          translations: {
            ...prev?.translations,
            [locale]: translations
          }
        }))
      } else {
        setLocalizationState(prev => ({
          ...prev,
          currentLocale: targetLocale
        }))
      }
    } catch (err) {
      throw new BaseError('Error al cambiar locale', { cause: err })
    } finally {
      stopLoading()
    }
  }, [
    localizationState?.availableLocales,
    localizationState?.translations,
    startLoading,
    stopLoading,
    executeWithRetry,
    fetchTranslations
  ])

  // Traducir texto
  const t = useCallback((
    key: string,
    params?: Record<string, unknown>
  ): string => {
    if (!localizationState?.currentLocale) return key

    const locale = localizationState.currentLocale.code
    const translations = localizationState.translations[locale]
    if (!translations) return key

    const namespace = key.includes(':') ? key : `${DEFAULT_NAMESPACE}:${key}`
    const translation = translations[namespace]
    if (!translation) return key

    // Interpolar parámetros
    if (params) {
      return translation.replace(/\{\{([^}]+)\}\}/g, (_, param) => {
        const value = param.split('.').reduce((obj, key) => obj?.[key], params)
        return value?.toString() || ''
      })
    }

    return translation
  }, [localizationState?.currentLocale, localizationState?.translations])

  // Formatear fecha
  const formatDate = useCallback((
    date: Date | string,
    format?: string
  ): string => {
    if (!localizationState?.currentLocale) return date.toString()

    const locale = localizationState.currentLocale
    const dateFormat = format || locale.date_format

    return new Intl.DateTimeFormat(locale.code, {
      dateStyle: 'long',
      timeStyle: format?.includes('HH') ? 'short' : undefined
    }).format(typeof date === 'string' ? new Date(date) : date)
  }, [localizationState?.currentLocale])

  // Formatear número
  const formatNumber = useCallback((
    number: number,
    options?: Intl.NumberFormatOptions
  ): string => {
    if (!localizationState?.currentLocale) return number.toString()

    const locale = localizationState.currentLocale
    const { decimal_separator, thousand_separator, decimal_digits } = locale.number_format

    return new Intl.NumberFormat(locale.code, {
      minimumFractionDigits: decimal_digits,
      maximumFractionDigits: decimal_digits,
      ...options
    }).format(number)
  }, [localizationState?.currentLocale])

  // Formatear moneda
  const formatCurrency = useCallback((
    amount: number,
    currency?: string
  ): string => {
    if (!localizationState?.currentLocale) return amount.toString()

    const locale = localizationState.currentLocale
    const { symbol, position, space } = locale.currency_format

    const formattedAmount = formatNumber(amount, {
      style: 'currency',
      currency: currency || 'USD'
    })

    return position === 'before'
      ? `${symbol}${space ? ' ' : ''}${formattedAmount}`
      : `${formattedAmount}${space ? ' ' : ''}${symbol}`
  }, [localizationState?.currentLocale, formatNumber])

  // Agregar traducción
  const addTranslation = useCallback(async (
    translation: Omit<Translation, 'id'>
  ): Promise<void> => {
    try {
      startLoading()

      const validatedTranslation = translationSchema.parse({
        ...translation,
        namespace: translation.namespace || DEFAULT_NAMESPACE
      })

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('translations')
          .insert(validatedTranslation)

        if (error) {
          handleLocalizationError(error, 'TRANSLATION')
        }

        // Actualizar cache
        setLocalizationState(prev => {
          const locale = validatedTranslation.locale
          const key = `${validatedTranslation.namespace}:${validatedTranslation.key}`
          
          return {
            ...prev,
            translations: {
              ...prev?.translations,
              [locale]: {
                ...prev?.translations[locale],
                [key]: validatedTranslation.value
              }
            }
          }
        })
      })
    } catch (err) {
      throw new BaseError('Error al agregar traducción', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry])

  // Importar traducciones
  const importTranslations = useCallback(async (
    locale: string,
    translations: Record<string, string>
  ): Promise<void> => {
    try {
      startLoading()

      const batch = Object.entries(translations).map(([key, value]) => {
        const [namespace, translationKey] = key.includes(':') 
          ? key.split(':') 
          : [DEFAULT_NAMESPACE, key]

        return {
          locale,
          namespace,
          key: translationKey,
          value
        }
      })

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('translations')
          .upsert(batch)

        if (error) {
          handleLocalizationError(error, 'TRANSLATION')
        }

        // Actualizar cache
        setLocalizationState(prev => ({
          ...prev,
          translations: {
            ...prev?.translations,
            [locale]: translations
          }
        }))
      })
    } catch (err) {
      throw new BaseError('Error al importar traducciones', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry])

  // Exportar traducciones
  const exportTranslations = useCallback(async (
    locale: string
  ): Promise<Record<string, string>> => {
    try {
      startLoading()

      // Usar cache si está disponible
      if (localizationState?.translations[locale]) {
        return localizationState.translations[locale]
      }

      return await executeWithRetry(() => fetchTranslations(locale))
    } catch (err) {
      throw new BaseError('Error al exportar traducciones', { cause: err })
    } finally {
      stopLoading()
    }
  }, [
    localizationState?.translations,
    startLoading,
    stopLoading,
    executeWithRetry,
    fetchTranslations
  ])

  // Cargar datos iniciales
  useEffect(() => {
    void refreshTranslations()
  }, [])

  return {
    currentLocale: localizationState?.currentLocale,
    availableLocales: localizationState?.availableLocales || [],
    translations: localizationState?.translations || {},
    isLoading,
    setLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    refreshTranslations,
    addTranslation,
    importTranslations,
    exportTranslations
  }
}
