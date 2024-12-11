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
import { saveAs } from 'file-saver'

// Esquemas de validación
const exportConfigSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx', 'pdf']),
  resource: z.string(),
  filters: z.record(z.unknown()).optional(),
  fields: z.array(z.string()).optional(),
  include_relations: z.boolean().optional(),
  batch_size: z.number().min(1).max(10000).optional(),
  file_name: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
})

const exportJobSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  config: exportConfigSchema,
  result: z.object({
    url: z.string().url().optional(),
    error: z.string().optional(),
    total_records: z.number().optional(),
    file_size: z.number().optional()
  }).optional(),
  created_at: z.string(),
  updated_at: z.string()
})

export type ExportConfig = z.infer<typeof exportConfigSchema>
export type ExportJob = z.infer<typeof exportJobSchema>

export interface ExportError extends BaseError {
  code: 'EXPORT_ERROR'
  details: {
    type: 'VALIDATION' | 'PERMISSION' | 'RESOURCE' | 'FORMAT' | 'SERVER_ERROR'
    field?: string
    originalError?: unknown
  }
}

export interface ExportHookReturn {
  isLoading: boolean
  exportData: (config: ExportConfig) => Promise<void>
  exportMultiple: (configs: ExportConfig[]) => Promise<void>
  downloadExport: (jobId: string) => Promise<void>
  getExportJobs: () => Promise<ExportJob[]>
  cancelExport: (jobId: string) => Promise<void>
}

const DEFAULT_BATCH_SIZE = 1000
const MAX_CONCURRENT_EXPORTS = 3

export function useExport(): ExportHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { can } = usePermissions()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 1000
  })

  const handleExportError = (
    error: unknown,
    type: ExportError['details']['type'],
    field?: string
  ): never => {
    throw new BaseError('Error en exportación', {
      code: 'EXPORT_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  // Verificar permisos de exportación
  const checkExportPermissions = useCallback((resource: string): void => {
    if (!can(resource, 'read')) {
      handleExportError(
        new Error('Sin permisos para exportar este recurso'),
        'PERMISSION',
        resource
      )
    }
  }, [can])

  // Obtener datos del recurso
  const fetchResourceData = useCallback(async (
    resource: string,
    filters?: Record<string, unknown>,
    fields?: string[]
  ): Promise<any[]> => {
    let query = supabase
      .from(resource)
      .select(fields?.join(',') || '*')

    // Aplicar filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    const { data, error } = await query

    if (error) {
      handleExportError(error, 'RESOURCE')
    }

    return data || []
  }, [])

  // Formatear datos según el formato solicitado
  const formatData = useCallback(async (
    data: any[],
    format: ExportConfig['format']
  ): Promise<Blob> => {
    try {
      switch (format) {
        case 'csv':
          const csv = Papa.unparse(data)
          return new Blob([csv], { type: 'text/csv;charset=utf-8;' })

        case 'json':
          const json = JSON.stringify(data, null, 2)
          return new Blob([json], { type: 'application/json' })

        case 'xlsx':
          // Aquí se integraría una librería como xlsx
          throw new Error('Formato XLSX no implementado')

        case 'pdf':
          // Aquí se integraría una librería como pdfmake
          throw new Error('Formato PDF no implementado')

        default:
          handleExportError(
            new Error(`Formato no soportado: ${format}`),
            'FORMAT'
          )
      }
    } catch (err) {
      handleExportError(err, 'FORMAT')
    }
  }, [])

  // Crear trabajo de exportación
  const createExportJob = useCallback(async (
    config: ExportConfig
  ): Promise<ExportJob> => {
    if (!user?.id) {
      throw new ValidationError('Usuario no autenticado')
    }

    const { data, error } = await supabase
      .from('export_jobs')
      .insert({
        user_id: user.id,
        status: 'pending',
        config
      })
      .select()
      .single()

    if (error) {
      handleExportError(error, 'SERVER_ERROR')
    }

    return exportJobSchema.parse(data)
  }, [user?.id])

  // Actualizar estado del trabajo
  const updateJobStatus = useCallback(async (
    jobId: string,
    status: ExportJob['status'],
    result?: ExportJob['result']
  ): Promise<void> => {
    const { error } = await supabase
      .from('export_jobs')
      .update({
        status,
        result,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      handleExportError(error, 'SERVER_ERROR')
    }
  }, [])

  // Exportar datos
  const exportData = useCallback(async (config: ExportConfig): Promise<void> => {
    try {
      startLoading()

      // Validar configuración
      const validatedConfig = exportConfigSchema.parse(config)
      
      // Verificar permisos
      checkExportPermissions(validatedConfig.resource)

      // Crear trabajo de exportación
      const job = await createExportJob(validatedConfig)

      await executeWithRetry(async () => {
        try {
          // Actualizar estado
          await updateJobStatus(job.id, 'processing')

          // Obtener datos
          const data = await fetchResourceData(
            validatedConfig.resource,
            validatedConfig.filters,
            validatedConfig.fields
          )

          // Formatear datos
          const blob = await formatData(data, validatedConfig.format)

          // Subir archivo
          const fileName = validatedConfig.file_name || 
            `export-${validatedConfig.resource}-${Date.now()}.${validatedConfig.format}`

          const { error: uploadError, data: uploadData } = await supabase
            .storage
            .from('exports')
            .upload(`${user?.id}/${fileName}`, blob)

          if (uploadError) throw uploadError

          // Obtener URL pública
          const { data: { publicUrl }, error: urlError } = await supabase
            .storage
            .from('exports')
            .getPublicUrl(uploadData.path)

          if (urlError) throw urlError

          // Actualizar trabajo como completado
          await updateJobStatus(job.id, 'completed', {
            url: publicUrl,
            total_records: data.length,
            file_size: blob.size
          })

        } catch (err) {
          await updateJobStatus(job.id, 'failed', {
            error: err instanceof Error ? err.message : 'Error desconocido'
          })
          throw err
        }
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        handleExportError(err, 'VALIDATION')
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [
    user?.id,
    startLoading,
    stopLoading,
    executeWithRetry,
    checkExportPermissions,
    createExportJob,
    updateJobStatus,
    fetchResourceData,
    formatData
  ])

  // Exportar múltiples recursos
  const exportMultiple = useCallback(async (
    configs: ExportConfig[]
  ): Promise<void> => {
    try {
      startLoading()

      // Procesar en lotes para no sobrecargar
      const batches = []
      for (let i = 0; i < configs.length; i += MAX_CONCURRENT_EXPORTS) {
        const batch = configs.slice(i, i + MAX_CONCURRENT_EXPORTS)
        batches.push(batch)
      }

      // Procesar cada lote
      for (const batch of batches) {
        await Promise.all(batch.map(config => exportData(config)))
      }

      // Si todos los exports son del mismo usuario, crear un zip
      if (configs.length > 1) {
        const zip = new JSZip()
        const jobs = await getExportJobs()
        const recentJobs = jobs
          .filter(job => job.status === 'completed')
          .slice(0, configs.length)

        for (const job of recentJobs) {
          if (job.result?.url) {
            const response = await fetch(job.result.url)
            const blob = await response.blob()
            zip.file(
              `${job.config.resource}.${job.config.format}`,
              blob
            )
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, `export-${Date.now()}.zip`)
      }
    } catch (err) {
      throw new BaseError('Error en exportación múltiple', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, exportData, getExportJobs])

  // Obtener trabajos de exportación
  const getExportJobs = useCallback(async (): Promise<ExportJob[]> => {
    if (!user?.id) {
      throw new ValidationError('Usuario no autenticado')
    }

    const { data, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      handleExportError(error, 'SERVER_ERROR')
    }

    return data?.map(job => exportJobSchema.parse(job)) || []
  }, [user?.id])

  // Descargar exportación
  const downloadExport = useCallback(async (jobId: string): Promise<void> => {
    try {
      startLoading()

      const { data: job, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) {
        handleExportError(error, 'SERVER_ERROR')
      }

      const parsedJob = exportJobSchema.parse(job)

      if (parsedJob.status !== 'completed' || !parsedJob.result?.url) {
        throw new ValidationError('Exportación no disponible')
      }

      const response = await fetch(parsedJob.result.url)
      const blob = await response.blob()
      
      const fileName = parsedJob.config.file_name || 
        `export-${parsedJob.config.resource}-${Date.now()}.${parsedJob.config.format}`

      saveAs(blob, fileName)
    } catch (err) {
      throw new BaseError('Error al descargar exportación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading])

  // Cancelar exportación
  const cancelExport = useCallback(async (jobId: string): Promise<void> => {
    try {
      startLoading()

      const { data: job, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (error) {
        handleExportError(error, 'SERVER_ERROR')
      }

      const parsedJob = exportJobSchema.parse(job)

      if (parsedJob.status !== 'pending' && parsedJob.status !== 'processing') {
        throw new ValidationError('No se puede cancelar esta exportación')
      }

      await updateJobStatus(jobId, 'failed', {
        error: 'Exportación cancelada por el usuario'
      })
    } catch (err) {
      throw new BaseError('Error al cancelar exportación', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, updateJobStatus])

  return {
    isLoading,
    exportData,
    exportMultiple,
    downloadExport,
    getExportJobs,
    cancelExport
  }
} 