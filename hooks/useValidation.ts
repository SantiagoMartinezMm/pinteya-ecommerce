import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const validationRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  entity_type: z.enum([
    'user',
    'product',
    'order',
    'payment',
    'shipping',
    'review',
    'comment',
    'discount'
  ]),
  field: z.string(),
  rule_type: z.enum([
    'required',
    'format',
    'range',
    'length',
    'enum',
    'unique',
    'dependency',
    'custom'
  ]),
  parameters: z.record(z.unknown()),
  error_message: z.string(),
  priority: z.number().default(0),
  is_active: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

const validationResultSchema = z.object({
  rule_id: z.string().uuid(),
  field: z.string(),
  is_valid: z.boolean(),
  error_message: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})

export type ValidationRule = z.infer<typeof validationRuleSchema>
export type ValidationResult = z.infer<typeof validationResultSchema>

export interface ValidationError extends BaseError {
  code: 'VALIDATION_ERROR'
  details: {
    type: 'RULE_ERROR' | 'NOT_FOUND' | 'PERMISSION' | 'SERVER_ERROR'
    rule_id?: string
    field?: string
    originalError?: unknown
  }
}

export interface ValidationFilters {
  entity_type?: ValidationRule['entity_type']
  field?: string
  rule_type?: ValidationRule['rule_type']
  is_active?: boolean
  search?: string
}

export interface ValidationHookReturn {
  rules: ValidationRule[]
  isLoading: boolean
  getRules: (filters?: ValidationFilters) => Promise<ValidationRule[]>
  getRule: (ruleId: string) => Promise<ValidationRule>
  createRule: (rule: Omit<ValidationRule, 'id' | 'created_at' | 'updated_at'>) => Promise<ValidationRule>
  updateRule: (ruleId: string, updates: Partial<ValidationRule>) => Promise<ValidationRule>
  deleteRule: (ruleId: string) => Promise<void>
  validateField: (
    entityType: ValidationRule['entity_type'],
    field: string,
    value: unknown,
    context?: Record<string, unknown>
  ) => Promise<ValidationResult[]>
  validateEntity: (
    entityType: ValidationRule['entity_type'],
    data: Record<string, unknown>
  ) => Promise<Record<string, ValidationResult[]>>
  validateBatch: (
    entityType: ValidationRule['entity_type'],
    items: Array<Record<string, unknown>>
  ) => Promise<Array<Record<string, ValidationResult[]>>>
  refreshRules: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 15 // 15 minutos

export function useValidation(): ValidationHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()

  // Cache para reglas
  const {
    data: validationState,
    setData: setValidationState
  } = useCache<{
    rules: ValidationRule[]
  }>({
    key: 'validation-state',
    ttl: CACHE_TTL,
    initialData: {
      rules: []
    }
  })

  const handleValidationError = (
    error: unknown,
    type: ValidationError['details']['type'],
    rule_id?: string,
    field?: string
  ): never => {
    throw new BaseError('Error en validación', {
      code: 'VALIDATION_ERROR',
      details: {
        type,
        rule_id,
        field,
        originalError: error
      }
    })
  }

  // Obtener reglas
  const getRules = useCallback(async (
    filters?: ValidationFilters
  ): Promise<ValidationRule[]> => {
    try {
      startLoading()

      let query = supabase
        .from('validation_rules')
        .select('*')

      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type)
      }
      if (filters?.field) {
        query = query.eq('field', filters.field)
      }
      if (filters?.rule_type) {
        query = query.eq('rule_type', filters.rule_type)
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }

      const { data: rules, error } = await executeWithRetry(() =>
        query
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
      )

      if (error) {
        handleValidationError(error, 'SERVER_ERROR')
      }

      setValidationState({
        rules: rules || []
      })

      return rules || []
    } catch (err) {
      throw new BaseError('Error al obtener reglas', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener regla específica
  const getRule = useCallback(async (ruleId: string): Promise<ValidationRule> => {
    try {
      startLoading()

      const { data: rule, error } = await executeWithRetry(() =>
        supabase
          .from('validation_rules')
          .select('*')
          .eq('id', ruleId)
          .single()
      )

      if (error) {
        handleValidationError(error, 'NOT_FOUND', ruleId)
      }

      return rule
    } catch (err) {
      throw new BaseError('Error al obtener regla', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Crear regla
  const createRule = useCallback(async (
    rule: Omit<ValidationRule, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ValidationRule> => {
    if (!user) {
      handleValidationError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('validation_rules')
          .insert([rule])
          .select()
          .single()
      )

      if (error) {
        handleValidationError(error, 'SERVER_ERROR')
      }

      setValidationState(prev => ({
        rules: [...prev.rules, data]
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al crear regla', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Actualizar regla
  const updateRule = useCallback(async (
    ruleId: string,
    updates: Partial<ValidationRule>
  ): Promise<ValidationRule> => {
    if (!user) {
      handleValidationError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('validation_rules')
          .update(updates)
          .eq('id', ruleId)
          .select()
          .single()
      )

      if (error) {
        handleValidationError(error, 'SERVER_ERROR', ruleId)
      }

      setValidationState(prev => ({
        rules: prev.rules.map(r =>
          r.id === ruleId ? { ...r, ...data } : r
        )
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al actualizar regla', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar regla
  const deleteRule = useCallback(async (ruleId: string): Promise<void> => {
    if (!user) {
      handleValidationError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { error } = await executeWithRetry(() =>
        supabase
          .from('validation_rules')
          .delete()
          .eq('id', ruleId)
      )

      if (error) {
        handleValidationError(error, 'SERVER_ERROR', ruleId)
      }

      setValidationState(prev => ({
        rules: prev.rules.filter(r => r.id !== ruleId)
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar regla', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Validar campo
  const validateField = useCallback(async (
    entityType: ValidationRule['entity_type'],
    field: string,
    value: unknown,
    context?: Record<string, unknown>
  ): Promise<ValidationResult[]> => {
    try {
      startLoading()

      // Obtener reglas aplicables
      const rules = validationState?.rules.filter(r =>
        r.entity_type === entityType &&
        r.field === field &&
        r.is_active
      ) || []

      // Aplicar reglas en orden de prioridad
      const results: ValidationResult[] = []

      for (const rule of rules) {
        const result = await validateRule(rule, value, context)
        results.push(result)

        // Si la validación falla y hay más reglas, continuar con la siguiente
        if (!result.is_valid) {
          break
        }
      }

      return results
    } catch (err) {
      throw new BaseError('Error al validar campo', { cause: err })
    } finally {
      stopLoading()
    }
  }, [validationState?.rules, startLoading, stopLoading])

  // Validar entidad completa
  const validateEntity = useCallback(async (
    entityType: ValidationRule['entity_type'],
    data: Record<string, unknown>
  ): Promise<Record<string, ValidationResult[]>> => {
    try {
      startLoading()

      const results: Record<string, ValidationResult[]> = {}

      // Validar cada campo
      for (const [field, value] of Object.entries(data)) {
        results[field] = await validateField(entityType, field, value, data)
      }

      return results
    } catch (err) {
      throw new BaseError('Error al validar entidad', { cause: err })
    } finally {
      stopLoading()
    }
  }, [validateField, startLoading, stopLoading])

  // Validar lote de entidades
  const validateBatch = useCallback(async (
    entityType: ValidationRule['entity_type'],
    items: Array<Record<string, unknown>>
  ): Promise<Array<Record<string, ValidationResult[]>>> => {
    try {
      startLoading()

      const results = await Promise.all(
        items.map(item => validateEntity(entityType, item))
      )

      return results
    } catch (err) {
      throw new BaseError('Error al validar lote', { cause: err })
    } finally {
      stopLoading()
    }
  }, [validateEntity, startLoading, stopLoading])

  // Validar regla individual
  const validateRule = async (
    rule: ValidationRule,
    value: unknown,
    context?: Record<string, unknown>
  ): Promise<ValidationResult> => {
    const result: ValidationResult = {
      rule_id: rule.id,
      field: rule.field,
      is_valid: true
    }

    try {
      switch (rule.rule_type) {
        case 'required':
          result.is_valid = value !== undefined && value !== null && value !== ''
          break

        case 'format':
          if (typeof value === 'string') {
            const regex = new RegExp(rule.parameters.pattern as string)
            result.is_valid = regex.test(value)
          }
          break

        case 'range':
          if (typeof value === 'number') {
            const min = rule.parameters.min as number
            const max = rule.parameters.max as number
            result.is_valid = value >= min && value <= max
          }
          break

        case 'length':
          if (typeof value === 'string') {
            const min = rule.parameters.min as number
            const max = rule.parameters.max as number
            result.is_valid = value.length >= min && value.length <= max
          }
          break

        case 'enum':
          const allowedValues = rule.parameters.values as unknown[]
          result.is_valid = allowedValues.includes(value)
          break

        case 'unique':
          if (value !== undefined) {
            const { count } = await supabase
              .from(rule.entity_type)
              .select('*', { count: 'exact' })
              .eq(rule.field, value)
              .single()

            result.is_valid = count === 0
          }
          break

        case 'dependency':
          if (context) {
            const dependentField = rule.parameters.field as string
            const dependentValue = rule.parameters.value
            const operator = rule.parameters.operator as string

            const contextValue = context[dependentField]

            switch (operator) {
              case 'equals':
                result.is_valid = contextValue === dependentValue
                break
              case 'not_equals':
                result.is_valid = contextValue !== dependentValue
                break
              case 'in':
                result.is_valid = (dependentValue as unknown[]).includes(contextValue)
                break
              case 'not_in':
                result.is_valid = !(dependentValue as unknown[]).includes(contextValue)
                break
            }
          }
          break

        case 'custom':
          if (rule.parameters.function) {
            const customFunction = new Function(
              'value',
              'context',
              rule.parameters.function as string
            )
            result.is_valid = customFunction(value, context)
          }
          break
      }

      if (!result.is_valid) {
        result.error_message = rule.error_message
      }

      return result
    } catch (err) {
      throw new BaseError('Error al validar regla', {
        cause: err,
        details: { rule_id: rule.id }
      })
    }
  }

  // Refrescar reglas
  const refreshRules = useCallback(async (): Promise<void> => {
    await getRules()
  }, [getRules])

  return {
    rules: validationState?.rules || [],
    isLoading,
    getRules,
    getRule,
    createRule,
    updateRule,
    deleteRule,
    validateField,
    validateEntity,
    validateBatch,
    refreshRules
  }
} 