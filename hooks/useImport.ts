import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { usePermissions } from './usePermissions'
import { useLoadingState } from './useLoadingState'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'
import Papa from 'papaparse'
import JSZip from 'jszip'

// Esquemas de validación
const importConfigSchema = z.object({
  resource: z.string(),
  format: z.enum(['csv', 'json', 'xlsx']),
  mode: z.enum(['insert', 'update', 'upsert']),
  mapping: z.record(z.string()).optional(),
  validation: z.record(z.any()).optional(),
  batch_size: z.number().min(1).max(1000).optional(),
  skip_errors: z.boolean().optional(),
  dry_run: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional()
})

const importJobSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(['pending', 'validating', 'processing', 'completed', 'failed']),
  config: importConfigSchema,
  result: z.object({
    total_records: z.number().optional(),
    processed_records: z.number().optional(),
    success_count: z.number().optional(),
    error_count: z.number().optional(),
    errors: z.array(z.object({
      row: z.number(),
      field: z.string().optional(),
      message: z.string()
    })).optional(),
    warnings: z.array(z.string()).optional()
  }).optional(),
  created_at: z.string(),
  updated_at: z.string()
})

export type ImportConfig = z.infer<typeof importConfigSchema>
export type ImportJob = z.infer<typeof importJobSchema>

export interface ImportError extends BaseError {
  code: 'IMPORT_ERROR'
  details: {
    type: 'VALIDATION' | 'PERMISSION' | 'FORMAT' | 'PROCESSING' | 'SERVER_ERROR'
    field?: string
    row?: number
    originalError?: unknown
  }
}

export interface ImportHookReturn {
  isLoading: boolean
  importData: (file: File, config: ImportConfig) => Promise<void>
  importMultiple: (files: File[], configs: ImportConfig[]) => Promise<void>
  validateImport: (file: File, config: ImportConfig) => Promise<void>
  getImportJobs: () => Promise<ImportJob[]>
  cancelImport: (jobId: string) => Promise<void>
  downloadTemplate: (resource: string, format: ImportConfig['format']) => Promise<void>
}

const DEFAULT_BATCH_SIZE = 100
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function useImport(): ImportHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { can } = usePermissions()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 1000
  })

  const handleImportError = (
    error: unknown,
    type: ImportError['details']['type'],
    field?: string,
    row?: number
  ): never => {
    throw new BaseError('Error en importación', {
      code: 'IMPORT_ERROR',
      details: {
        type,
        field,
        row,
        originalError: error
      }
    })
  }

  // Verificar permisos de importación
  const checkImportPermissions = useCallback((resource: string): void => {
    if (!can(resource, 'create') || !can(resource, 'update')) {
      handleImportError(
        new Error('Sin permisos para importar este recurso'),
        'PERMISSION',
        resource
      )
    }
  }, [can])

  // Parsear archivo según formato
  const parseFile = useCallback(async (
    file: File,
    format: ImportConfig['format']
  ): Promise<any[]> => {
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Archivo demasiado grande')
      }

      const content = await file.text()

      switch (format) {
        case 'csv':
          return new Promise((resolve, reject) => {
            Papa.parse(content, {
              header: true,
              skipEmptyLines: true,
              complete: results => resolve(results.data),
              error: err => reject(err)
            })
          })

        case 'json':
          return JSON.parse(content)

        case 'xlsx':
          // Aquí se integraría una librería como xlsx
          throw new Error('Formato XLSX no implementado')

        default:
          throw new Error(`Formato no soportado: ${format}`)
      }
    } catch (err) {
      handleImportError(err, 'FORMAT')
    }
  }, [])

  // Validar datos según esquema
  const validateData = useCallback(async (
    data: any[],
    config: ImportConfig
  ): Promise<{ valid: any[], errors: any[] }> => {
    const valid: any[] = []
    const errors: any[] = []

    // Obtener esquema de validación del recurso
    const { data: schema, error: schemaError } = await supabase
      .from('resource_schemas')
      .select('validation_schema')
      .eq('resource', config.resource)
      .single()

    if (schemaError) {
      handleImportError(schemaError, 'VALIDATION')
    }

    // Combinar esquema del recurso con validación personalizada
    const validationSchema = {
      ...schema.validation_schema,
      ...config.validation
    }

    // Validar cada registro
    data.forEach((record, index) => {
      try {
        const mappedRecord = config.mapping
          ? mapRecord(record, config.mapping)
          : record

        z.object(validationSchema).parse(mappedRecord)
        valid.push(mappedRecord)
      } catch (err) {
        errors.push({
          row: index + 1,
          field: err instanceof z.ZodError ? err.errors[0].path.join('.') : undefined,
          message: err instanceof z.ZodError ? err.errors[0].message : 'Error de validación'
        })
      }
    })

    return { valid, errors }
  }, [])

  // Crear trabajo de importación
  const createImportJob = useCallback(async (
    config: ImportConfig,
    totalRecords: number
  ): Promise<ImportJob> => {
    if (!user?.id) {
      throw new ValidationError('Usuario no autenticado')
    }

    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        user_id: user.id,
        status: 'pending',
        config,
        result: {
          total_records: totalRecords,
          processed_records: 0,
          success_count: 0,
          error_count: 0,
          errors: [],
          warnings: []
        }
      })
      .select()
      .single()

    if (error) {
      handleImportError(error, 'SERVER_ERROR')
    }

    return importJobSchema.parse(data)
  }, [user?.id])

  // Actualizar estado del trabajo
  const updateJobStatus = useCallback(async (
    jobId: string,
    status: ImportJob['status'],
    result?: Partial<ImportJob['result']>
  ): Promise<void> => {
    const { error } = await supabase
      .from('import_jobs')
      .update({
        status,
        result: result ? result : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      handleImportError(error, 'SERVER_ERROR')
    }
  }, [])

  // Procesar datos en lotes
  const processBatch = useCallback(async (
    data: any[],
    config: ImportConfig,
    jobId: string
  ): Promise<void> => {
    const batchSize = config.batch_size || DEFAULT_BATCH_SIZE
    let processedCount = 0
    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize)

      try {
        let query = supabase.from(config.resource)

        switch (config.mode) {
          case 'insert':
            query = query.insert(batch)
            break
          case 'update':
            // Asumiendo que hay un campo id para actualizar
            query = query.upsert(batch, { onConflict: 'id' })
            break
          case 'upsert':
            // Configurar campos para upsert
            query = query.upsert(batch)
            break
        }

        if (!config.dry_run) {
          const { error } = await query
          if (error) throw error
          successCount += batch.length
        }

      } catch (err) {
        errorCount += batch.length
        errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : 'Error de procesamiento'
        })

        if (!config.skip_errors) {
          throw err
        }
      }

      processedCount += batch.length

      // Actualizar progreso
      await updateJobStatus(jobId, 'processing', {
        processed_records: processedCount,
        success_count: successCount,
        error_count: errorCount,
        errors
      })
    }
  }, [])

  // Importar datos
  const importData = useCallback(async (
    file: File,
    config: ImportConfig
  ): Promise<void> => {
    try {
      startLoading()

      // Validar configuración
      const validatedConfig = importConfigSchema.parse(config)
      
      // Verificar permisos
      checkImportPermissions(validatedConfig.resource)

      // Parsear archivo
      const rawData = await parseFile(file, validatedConfig.format)

      // Crear trabajo de importación
      const job = await createImportJob(validatedConfig, rawData.length)

      await executeWithRetry(async () => {
        try {
          // Validar datos
          await updateJobStatus(job.id, 'validating')
          const { valid, errors } = await validateData(rawData, validatedConfig)

          if (errors.length > 0 && !validatedConfig.skip_errors) {
            await updateJobStatus(job.id, 'failed', { errors })
            return
          }

          // Procesar datos
          await updateJobStatus(job.id, 'processing')
          await processBatch(valid, validatedConfig, job.id)

          // Finalizar importación
          await updateJobStatus(job.id, 'completed')

        } catch (err) {
          await updateJobStatus(job.id, 'failed', {
            errors: [{
              row: 0,
              message: err instanceof Error ? err.message : 'Error desconocido'
            }]
          })
          throw err
        }
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        handleImportError(err, 'VALIDATION')
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [
    startLoading,
    stopLoading,
    executeWithRetry,
    checkImportPermissions,
    parseFile,
    createImportJob,
    validateData,
    processBatch,
    updateJobStatus
  ])

  // Importar múltiples archivos
  const importMultiple = useCallback(async (
    files: File[],
    configs: ImportConfig[]
  ): Promise<void> => {
    try {
      startLoading()

      if (files.length !== configs.length) {
        throw new ValidationError('Número de archivos y configuraciones no coincide')
      }

      for (let i = 0; i < files.length; i++) {
        await importData(files[i], configs[i])
      }
    } catch (err) {
      throw new BaseError('Error en importación múltiple', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, importData])

  // Validar importación sin procesar
  const validateImport = useCallback(async (
    file: File,
    config: ImportConfig
  ): Promise<void> => {
    try {
      startLoading()

      const validatedConfig = {
        ...importConfigSchema.parse(config),
        dry_run: true
      }

      await importData(file, validatedConfig)
    } catch (err) {
      throw new BaseError('Error en validación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, importData])

  // Obtener trabajos de importación
  const getImportJobs = useCallback(async (): Promise<ImportJob[]> => {
    if (!user?.id) {
      throw new ValidationError('Usuario no autenticado')
    }

    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      handleImportError(error, 'SERVER_ERROR')
    }

    return data?.map(job => importJobSchema.parse(job)) || []
  }, [user?.id])

  // Cancelar importación
  const cancelImport = useCallback(async (jobId: string): Promise<void> => {
    try {
      startLoading()

      const { data: job, error } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) {
        handleImportError(error, 'SERVER_ERROR')
      }

      const parsedJob = importJobSchema.parse(job)

      if (!['pending', 'validating', 'processing'].includes(parsedJob.status)) {
        throw new ValidationError('No se puede cancelar esta importaci��n')
      }

      await updateJobStatus(jobId, 'failed', {
        errors: [{
          row: 0,
          message: 'Importación cancelada por el usuario'
        }]
      })
    } catch (err) {
      throw new BaseError('Error al cancelar importación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, updateJobStatus])

  // Descargar plantilla
  const downloadTemplate = useCallback(async (
    resource: string,
    format: ImportConfig['format']
  ): Promise<void> => {
    try {
      startLoading()

      // Obtener estructura del recurso
      const { data: schema, error: schemaError } = await supabase
        .from('resource_schemas')
        .select('fields')
        .eq('resource', resource)
        .single()

      if (schemaError) {
        handleImportError(schemaError, 'SERVER_ERROR')
      }

      // Crear plantilla vacía
      const template = {
        fields: schema.fields,
        example: schema.fields.reduce((acc, field) => ({
          ...acc,
          [field]: ''
        }), {})
      }

      // Generar archivo según formato
      let blob: Blob
      switch (format) {
        case 'csv':
          const csv = Papa.unparse([template.example])
          blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          break

        case 'json':
          const json = JSON.stringify([template.example], null, 2)
          blob = new Blob([json], { type: 'application/json' })
          break

        case 'xlsx':
          throw new Error('Formato XLSX no implementado')

        default:
          throw new Error(`Formato no soportado: ${format}`)
      }

      // Descargar archivo
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template-${resource}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err) {
      throw new BaseError('Error al descargar plantilla', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading])

  return {
    isLoading,
    importData,
    importMultiple,
    validateImport,
    getImportJobs,
    cancelImport,
    downloadTemplate
  }
}

// Utilidad para mapear campos
function mapRecord(
  record: Record<string, any>,
  mapping: Record<string, string>
): Record<string, any> {
  return Object.entries(mapping).reduce((acc, [from, to]) => ({
    ...acc,
    [to]: record[from]
  }), {})
} 