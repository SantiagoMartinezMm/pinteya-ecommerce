import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const backupSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  type: z.enum(['full', 'partial', 'settings', 'user_data']),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  size: z.number().optional(),
  file_path: z.string().optional(),
  included_tables: z.array(z.string()).optional(),
  excluded_tables: z.array(z.string()).optional(),
  compression: z.enum(['none', 'gzip', 'zip']).default('gzip'),
  encryption: z.boolean().default(false),
  retention_days: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional(),
  error_message: z.string().optional()
})

const backupRestoreSchema = z.object({
  id: z.string().uuid(),
  backup_id: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  restore_point: z.string().datetime(),
  tables_restored: z.array(z.string()).optional(),
  error_details: z.string().optional(),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional()
})

export type Backup = z.infer<typeof backupSchema>
export type BackupRestore = z.infer<typeof backupRestoreSchema>

export interface BackupError extends BaseError {
  code: 'BACKUP_ERROR'
  details: {
    type: 'VALIDATION' | 'NOT_FOUND' | 'PERMISSION' | 'STORAGE' | 'SERVER_ERROR'
    backup_id?: string
    originalError?: unknown
  }
}

export interface BackupConfig {
  type: Backup['type']
  name?: string
  description?: string
  included_tables?: string[]
  excluded_tables?: string[]
  compression?: Backup['compression']
  encryption?: boolean
  retention_days?: number
  metadata?: Record<string, unknown>
}

export interface BackupFilters {
  type?: Backup['type']
  status?: Backup['status']
  date_from?: string
  date_to?: string
  created_by?: string
  search?: string
}

export interface BackupHookReturn {
  backups: Backup[]
  restoreHistory: BackupRestore[]
  isLoading: boolean
  createBackup: (config: BackupConfig) => Promise<Backup>
  getBackups: (filters?: BackupFilters) => Promise<Backup[]>
  getBackupDetails: (backupId: string) => Promise<Backup>
  downloadBackup: (backupId: string) => Promise<Blob>
  deleteBackup: (backupId: string) => Promise<void>
  restoreBackup: (backupId: string, options?: { tables?: string[] }) => Promise<BackupRestore>
  getRestoreHistory: () => Promise<BackupRestore[]>
  cancelBackup: (backupId: string) => Promise<void>
  scheduleBackup: (config: BackupConfig & { schedule: string }) => Promise<void>
  validateBackup: (backupId: string) => Promise<{ isValid: boolean, issues?: string[] }>
  refreshBackups: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos

export function useBackup(): BackupHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()

  // Cache para backups
  const {
    data: backupState,
    setData: setBackupState
  } = useCache<{
    backups: Backup[]
    restores: BackupRestore[]
  }>({
    key: 'backup-state',
    ttl: CACHE_TTL,
    initialData: {
      backups: [],
      restores: []
    }
  })

  const handleBackupError = (
    error: unknown,
    type: BackupError['details']['type'],
    backup_id?: string
  ): never => {
    throw new BaseError('Error en backup', {
      code: 'BACKUP_ERROR',
      details: {
        type,
        backup_id,
        originalError: error
      }
    })
  }

  // Crear backup
  const createBackup = useCallback(async (
    config: BackupConfig
  ): Promise<Backup> => {
    if (!user) {
      handleBackupError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const backup = {
        name: config.name || `Backup ${new Date().toISOString()}`,
        description: config.description,
        type: config.type,
        status: 'pending' as const,
        included_tables: config.included_tables,
        excluded_tables: config.excluded_tables,
        compression: config.compression || 'gzip',
        encryption: config.encryption || false,
        retention_days: config.retention_days,
        metadata: config.metadata,
        created_by: user.id
      }

      const { data, error } = await executeWithRetry(() =>
        supabase
          .from('backups')
          .insert([backup])
          .select()
          .single()
      )

      if (error) {
        handleBackupError(error, 'SERVER_ERROR')
      }

      // Iniciar proceso de backup en segundo plano
      void processBackup(data.id)

      setBackupState(prev => ({
        ...prev,
        backups: [data, ...prev.backups]
      }))

      return data
    } catch (err) {
      throw new BaseError('Error al crear backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Procesar backup
  const processBackup = async (backupId: string): Promise<void> => {
    try {
      // Actualizar estado a 'in_progress'
      await executeWithRetry(() =>
        supabase
          .from('backups')
          .update({ status: 'in_progress' })
          .eq('id', backupId)
      )

      // Obtener configuración del backup
      const { data: backup } = await executeWithRetry(() =>
        supabase
          .from('backups')
          .select('*')
          .eq('id', backupId)
          .single()
      )

      // Obtener tablas a respaldar
      const tables = await getTablesToBackup(backup)

      // Crear archivo de backup
      const backupData = await executeWithRetry(() =>
        Promise.all(tables.map(table =>
          supabase
            .from(table)
            .select('*')
            .then(({ data }) => ({ table, data }))
        ))
      )

      // Comprimir datos
      const compressedData = await compressBackupData(backupData, backup.compression)

      // Encriptar si es necesario
      const finalData = backup.encryption
        ? await encryptBackupData(compressedData)
        : compressedData

      // Guardar archivo
      const filePath = `backups/${backupId}.${backup.compression}`
      const { error: uploadError } = await supabase
        .storage
        .from('backups')
        .upload(filePath, finalData)

      if (uploadError) {
        throw uploadError
      }

      // Actualizar backup con información final
      await executeWithRetry(() =>
        supabase
          .from('backups')
          .update({
            status: 'completed',
            file_path: filePath,
            size: finalData.size,
            completed_at: new Date().toISOString()
          })
          .eq('id', backupId)
      )

      // Actualizar cache
      setBackupState(prev => ({
        ...prev,
        backups: prev.backups.map(b =>
          b.id === backupId
            ? {
                ...b,
                status: 'completed',
                file_path: filePath,
                size: finalData.size,
                completed_at: new Date().toISOString()
              }
            : b
        )
      }))
    } catch (err) {
      // Actualizar estado a 'failed'
      await executeWithRetry(() =>
        supabase
          .from('backups')
          .update({
            status: 'failed',
            error_message: err.message
          })
          .eq('id', backupId)
      )

      throw err
    }
  }

  // Obtener backups
  const getBackups = useCallback(async (
    filters?: BackupFilters
  ): Promise<Backup[]> => {
    try {
      startLoading()

      let query = supabase
        .from('backups')
        .select('*')

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }

      const { data: backups, error } = await executeWithRetry(() =>
        query.order('created_at', { ascending: false })
      )

      if (error) {
        handleBackupError(error, 'SERVER_ERROR')
      }

      setBackupState(prev => ({
        ...prev,
        backups: backups || []
      }))

      return backups || []
    } catch (err) {
      throw new BaseError('Error al obtener backups', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Obtener detalles de un backup
  const getBackupDetails = useCallback(async (
    backupId: string
  ): Promise<Backup> => {
    try {
      startLoading()

      const { data: backup, error } = await executeWithRetry(() =>
        supabase
          .from('backups')
          .select('*')
          .eq('id', backupId)
          .single()
      )

      if (error) {
        handleBackupError(error, 'NOT_FOUND', backupId)
      }

      return backup
    } catch (err) {
      throw new BaseError('Error al obtener detalles del backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Descargar backup
  const downloadBackup = useCallback(async (backupId: string): Promise<Blob> => {
    try {
      startLoading()

      const backup = await getBackupDetails(backupId)
      if (!backup.file_path) {
        handleBackupError(
          new Error('Backup no disponible para descarga'),
          'NOT_FOUND',
          backupId
        )
      }

      const { data, error } = await supabase
        .storage
        .from('backups')
        .download(backup.file_path)

      if (error) {
        handleBackupError(error, 'STORAGE', backupId)
      }

      return data
    } catch (err) {
      throw new BaseError('Error al descargar backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [getBackupDetails, startLoading, stopLoading])

  // Eliminar backup
  const deleteBackup = useCallback(async (backupId: string): Promise<void> => {
    if (!user) {
      handleBackupError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const backup = await getBackupDetails(backupId)

      // Eliminar archivo
      if (backup.file_path) {
        const { error: storageError } = await supabase
          .storage
          .from('backups')
          .remove([backup.file_path])

        if (storageError) {
          handleBackupError(storageError, 'STORAGE', backupId)
        }
      }

      // Eliminar registro
      const { error } = await executeWithRetry(() =>
        supabase
          .from('backups')
          .delete()
          .eq('id', backupId)
      )

      if (error) {
        handleBackupError(error, 'SERVER_ERROR', backupId)
      }

      setBackupState(prev => ({
        ...prev,
        backups: prev.backups.filter(b => b.id !== backupId)
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, getBackupDetails, startLoading, stopLoading])

  // Restaurar backup
  const restoreBackup = useCallback(async (
    backupId: string,
    options?: { tables?: string[] }
  ): Promise<BackupRestore> => {
    if (!user) {
      handleBackupError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const backup = await getBackupDetails(backupId)
      if (backup.status !== 'completed') {
        handleBackupError(
          new Error('Backup no está completo'),
          'VALIDATION',
          backupId
        )
      }

      // Crear registro de restauración
      const restore = {
        backup_id: backupId,
        status: 'pending' as const,
        restore_point: new Date().toISOString(),
        created_by: user.id
      }

      const { data: restoreRecord, error } = await executeWithRetry(() =>
        supabase
          .from('backup_restores')
          .insert([restore])
          .select()
          .single()
      )

      if (error) {
        handleBackupError(error, 'SERVER_ERROR', backupId)
      }

      // Iniciar proceso de restauración en segundo plano
      void processRestore(restoreRecord.id, options?.tables)

      setBackupState(prev => ({
        ...prev,
        restores: [restoreRecord, ...prev.restores]
      }))

      return restoreRecord
    } catch (err) {
      throw new BaseError('Error al restaurar backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, getBackupDetails, startLoading, stopLoading])

  // Procesar restauración
  const processRestore = async (
    restoreId: string,
    tables?: string[]
  ): Promise<void> => {
    try {
      // Actualizar estado a 'in_progress'
      await executeWithRetry(() =>
        supabase
          .from('backup_restores')
          .update({ status: 'in_progress' })
          .eq('id', restoreId)
      )

      // Obtener información de la restauración
      const { data: restore } = await executeWithRetry(() =>
        supabase
          .from('backup_restores')
          .select('*, backups(*)')
          .eq('id', restoreId)
          .single()
      )

      // Descargar archivo de backup
      const { data: backupFile } = await supabase
        .storage
        .from('backups')
        .download(restore.backups.file_path)

      // Descomprimir y desencriptar si es necesario
      let backupData = restore.backups.encryption
        ? await decryptBackupData(backupFile)
        : backupFile

      backupData = await decompressBackupData(
        backupData,
        restore.backups.compression
      )

      // Restaurar tablas
      const tablesToRestore = tables || Object.keys(backupData)
      for (const table of tablesToRestore) {
        if (backupData[table]) {
          // Limpiar tabla existente
          await executeWithRetry(() =>
            supabase
              .from(table)
              .delete()
              .neq('id', '') // Eliminar todos los registros
          )

          // Insertar datos del backup
          await executeWithRetry(() =>
            supabase
              .from(table)
              .insert(backupData[table])
          )
        }
      }

      // Actualizar estado de la restauración
      await executeWithRetry(() =>
        supabase
          .from('backup_restores')
          .update({
            status: 'completed',
            tables_restored: tablesToRestore,
            completed_at: new Date().toISOString()
          })
          .eq('id', restoreId)
      )

      // Actualizar cache
      setBackupState(prev => ({
        ...prev,
        restores: prev.restores.map(r =>
          r.id === restoreId
            ? {
                ...r,
                status: 'completed',
                tables_restored: tablesToRestore,
                completed_at: new Date().toISOString()
              }
            : r
        )
      }))
    } catch (err) {
      // Actualizar estado a 'failed'
      await executeWithRetry(() =>
        supabase
          .from('backup_restores')
          .update({
            status: 'failed',
            error_details: err.message
          })
          .eq('id', restoreId)
      )

      throw err
    }
  }

  // Obtener historial de restauraciones
  const getRestoreHistory = useCallback(async (): Promise<BackupRestore[]> => {
    try {
      startLoading()

      const { data: restores, error } = await executeWithRetry(() =>
        supabase
          .from('backup_restores')
          .select('*')
          .order('created_at', { ascending: false })
      )

      if (error) {
        handleBackupError(error, 'SERVER_ERROR')
      }

      setBackupState(prev => ({
        ...prev,
        restores: restores || []
      }))

      return restores || []
    } catch (err) {
      throw new BaseError('Error al obtener historial de restauraciones', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Cancelar backup en progreso
  const cancelBackup = useCallback(async (backupId: string): Promise<void> => {
    if (!user) {
      handleBackupError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const backup = await getBackupDetails(backupId)
      if (backup.status !== 'in_progress') {
        handleBackupError(
          new Error('Solo se pueden cancelar backups en progreso'),
          'VALIDATION',
          backupId
        )
      }

      const { error } = await executeWithRetry(() =>
        supabase
          .from('backups')
          .update({
            status: 'failed',
            error_message: 'Backup cancelado por el usuario'
          })
          .eq('id', backupId)
      )

      if (error) {
        handleBackupError(error, 'SERVER_ERROR', backupId)
      }

      setBackupState(prev => ({
        ...prev,
        backups: prev.backups.map(b =>
          b.id === backupId
            ? {
                ...b,
                status: 'failed',
                error_message: 'Backup cancelado por el usuario'
              }
            : b
        )
      }))
    } catch (err) {
      throw new BaseError('Error al cancelar backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, getBackupDetails, startLoading, stopLoading])

  // Programar backup
  const scheduleBackup = useCallback(async (
    config: BackupConfig & { schedule: string }
  ): Promise<void> => {
    if (!user) {
      handleBackupError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const schedule = {
        type: 'backup',
        config: {
          ...config,
          created_by: user.id
        },
        schedule: config.schedule,
        is_active: true,
        created_by: user.id
      }

      const { error } = await executeWithRetry(() =>
        supabase
          .from('scheduled_tasks')
          .insert([schedule])
      )

      if (error) {
        handleBackupError(error, 'SERVER_ERROR')
      }
    } catch (err) {
      throw new BaseError('Error al programar backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Validar backup
  const validateBackup = useCallback(async (
    backupId: string
  ): Promise<{ isValid: boolean, issues?: string[] }> => {
    try {
      startLoading()

      const backup = await getBackupDetails(backupId)
      if (!backup.file_path) {
        return {
          isValid: false,
          issues: ['Archivo de backup no encontrado']
        }
      }

      // Descargar y verificar integridad
      const { data: backupFile } = await supabase
        .storage
        .from('backups')
        .download(backup.file_path)

      // Verificar formato y estructura
      try {
        let backupData = backup.encryption
          ? await decryptBackupData(backupFile)
          : backupFile

        backupData = await decompressBackupData(
          backupData,
          backup.compression
        )

        // Validar estructura de datos
        const issues: string[] = []
        for (const [table, data] of Object.entries(backupData)) {
          if (!Array.isArray(data)) {
            issues.push(`Datos inválidos para la tabla ${table}`)
          }
        }

        return {
          isValid: issues.length === 0,
          issues: issues.length > 0 ? issues : undefined
        }
      } catch (err) {
        return {
          isValid: false,
          issues: ['Error al procesar archivo de backup: ' + err.message]
        }
      }
    } catch (err) {
      throw new BaseError('Error al validar backup', { cause: err })
    } finally {
      stopLoading()
    }
  }, [getBackupDetails, startLoading, stopLoading])

  // Funciones auxiliares
  const getTablesToBackup = async (backup: Backup): Promise<string[]> => {
    // Obtener lista de tablas de la base de datos
    const { data } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')

    let tables = data.map(t => t.table_name)

    // Aplicar filtros de inclusión/exclusión
    if (backup.included_tables?.length) {
      tables = tables.filter(t => backup.included_tables.includes(t))
    }
    if (backup.excluded_tables?.length) {
      tables = tables.filter(t => !backup.excluded_tables.includes(t))
    }

    return tables
  }

  const compressBackupData = async (
    data: unknown,
    compression: Backup['compression']
  ): Promise<Blob> => {
    const jsonString = JSON.stringify(data)
    
    switch (compression) {
      case 'gzip':
        // Implementar compresión gzip
        return new Blob([jsonString]) // TODO: Implementar compresión real
      case 'zip':
        // Implementar compresión zip
        return new Blob([jsonString]) // TODO: Implementar compresión real
      default:
        return new Blob([jsonString])
    }
  }

  const decompressBackupData = async (
    data: Blob,
    compression: Backup['compression']
  ): Promise<unknown> => {
    const text = await data.text()
    
    switch (compression) {
      case 'gzip':
        // Implementar descompresión gzip
        return JSON.parse(text) // TODO: Implementar descompresión real
      case 'zip':
        // Implementar descompresión zip
        return JSON.parse(text) // TODO: Implementar descompresión real
      default:
        return JSON.parse(text)
    }
  }

  const encryptBackupData = async (data: Blob): Promise<Blob> => {
    // TODO: Implementar encriptación
    return data
  }

  const decryptBackupData = async (data: Blob): Promise<Blob> => {
    // TODO: Implementar desencriptación
    return data
  }

  // Refrescar backups
  const refreshBackups = useCallback(async (): Promise<void> => {
    await Promise.all([
      getBackups(),
      getRestoreHistory()
    ])
  }, [getBackups, getRestoreHistory])

  return {
    backups: backupState?.backups || [],
    restoreHistory: backupState?.restores || [],
    isLoading,
    createBackup,
    getBackups,
    getBackupDetails,
    downloadBackup,
    deleteBackup,
    restoreBackup,
    getRestoreHistory,
    cancelBackup,
    scheduleBackup,
    validateBackup,
    refreshBackups
  }
}
