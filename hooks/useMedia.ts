import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError } from '@/types/errors'

// Esquemas de validación
const mediaSchema = z.object({
  id: z.string().uuid(),
  file_name: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  alt_text: z.string().optional(),
  caption: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  folder_path: z.string().default('/'),
  is_public: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  user_id: z.string().uuid()
})

const mediaFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  path: z.string(),
  parent_folder_id: z.string().uuid().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Media = z.infer<typeof mediaSchema>
export type MediaFolder = z.infer<typeof mediaFolderSchema>

export interface MediaError extends BaseError {
  code: 'MEDIA_ERROR'
  details: {
    type: 'UPLOAD' | 'DELETE' | 'NOT_FOUND' | 'PERMISSION' | 'STORAGE' | 'FORMAT' | 'SIZE'
    media_id?: string
    folder_id?: string
    originalError?: unknown
  }
}

export interface MediaUploadOptions {
  file: File
  folder_path?: string
  is_public?: boolean
  alt_text?: string
  caption?: string
  metadata?: Record<string, unknown>
}

export interface MediaHookReturn {
  files: Media[]
  folders: MediaFolder[]
  selectedFiles: Media[]
  currentFolder: MediaFolder | null
  isLoading: boolean
  uploadFile: (options: MediaUploadOptions) => Promise<Media>
  uploadMultipleFiles: (files: File[], options?: Omit<MediaUploadOptions, 'file'>) => Promise<Media[]>
  deleteFile: (mediaId: string) => Promise<void>
  deleteMultipleFiles: (mediaIds: string[]) => Promise<void>
  createFolder: (name: string, parentFolderId?: string) => Promise<MediaFolder>
  deleteFolder: (folderId: string) => Promise<void>
  moveFile: (mediaId: string, newFolderPath: string) => Promise<Media>
  moveMultipleFiles: (mediaIds: string[], newFolderPath: string) => Promise<Media[]>
  selectFile: (mediaId: string) => void
  unselectFile: (mediaId: string) => void
  clearSelection: () => void
  navigateToFolder: (folderId: string) => Promise<void>
  searchFiles: (query: string) => Promise<Media[]>
  updateFileMetadata: (mediaId: string, metadata: Partial<Media>) => Promise<Media>
  generateThumbnail: (file: File) => Promise<string>
  getPublicUrl: (mediaId: string) => Promise<string>
  getSignedUrl: (mediaId: string, expiresIn?: number) => Promise<string>
}

const CACHE_TTL = 1000 * 60 * 5 // 5 minutos
const MAX_FILE_SIZE = 1024 * 1024 * 50 // 50MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'application/pdf'
]

export function useMedia(): MediaHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry()
  const [selectedFiles, setSelectedFiles] = useState<Media[]>([])

  // Cache para archivos y carpetas
  const {
    data: mediaState,
    setData: setMediaState
  } = useCache<{
    files: Media[]
    folders: MediaFolder[]
    currentFolder: MediaFolder | null
  }>({
    key: 'media-state',
    ttl: CACHE_TTL,
    initialData: {
      files: [],
      folders: [],
      currentFolder: null
    }
  })

  const handleMediaError = (
    error: unknown,
    type: MediaError['details']['type'],
    details?: Omit<MediaError['details'], 'type' | 'originalError'>
  ): never => {
    throw new BaseError('Error en gestión de medios', {
      code: 'MEDIA_ERROR',
      details: {
        type,
        ...details,
        originalError: error
      }
    })
  }

  // Validar archivo
  const validateFile = (file: File): void => {
    if (file.size > MAX_FILE_SIZE) {
      handleMediaError(
        new Error('Archivo demasiado grande'),
        'SIZE'
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      handleMediaError(
        new Error('Tipo de archivo no permitido'),
        'FORMAT'
      )
    }
  }

  // Generar thumbnail
  const generateThumbnail = useCallback(async (file: File): Promise<string> => {
    if (!file.type.startsWith('image/')) {
      return '/images/file-thumbnail.png'
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          const MAX_THUMB_SIZE = 200

          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_THUMB_SIZE) {
              height = height * (MAX_THUMB_SIZE / width)
              width = MAX_THUMB_SIZE
            }
          } else {
            if (height > MAX_THUMB_SIZE) {
              width = width * (MAX_THUMB_SIZE / height)
              height = MAX_THUMB_SIZE
            }
          }

          canvas.width = width
          canvas.height = height

          ctx?.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.7))
        }
        img.onerror = () => reject(new Error('Error al generar thumbnail'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Error al leer archivo'))
      reader.readAsDataURL(file)
    })
  }, [])

  // Subir archivo
  const uploadFile = useCallback(async ({
    file,
    folder_path = '/',
    is_public = true,
    alt_text,
    caption,
    metadata
  }: MediaUploadOptions): Promise<Media> => {
    if (!user) {
      handleMediaError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()
      validateFile(file)

      const fileName = `${Date.now()}-${file.name}`
      const filePath = `${folder_path}/${fileName}`
      const thumbnailUrl = await generateThumbnail(file)

      const { data: uploadData, error: uploadError } = await executeWithRetry(() =>
        supabase.storage
          .from('media')
          .upload(filePath, file)
      )

      if (uploadError) {
        handleMediaError(uploadError, 'UPLOAD')
      }

      const { data: media, error: insertError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .insert({
            file_name: fileName,
            file_size: file.size,
            mime_type: file.type,
            url: uploadData?.path || '',
            thumbnail_url: thumbnailUrl,
            alt_text,
            caption,
            metadata,
            folder_path,
            is_public,
            user_id: user.id
          })
          .select()
          .single()
      )

      if (insertError) {
        handleMediaError(insertError, 'STORAGE')
      }

      setMediaState(prev => ({
        ...prev,
        files: [...prev.files, media]
      }))

      return media
    } catch (err) {
      throw new BaseError('Error al subir archivo', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, generateThumbnail, startLoading, stopLoading])

  // Subir múltiples archivos
  const uploadMultipleFiles = useCallback(async (
    files: File[],
    options?: Omit<MediaUploadOptions, 'file'>
  ): Promise<Media[]> => {
    const uploadedFiles = await Promise.all(
      files.map(file => uploadFile({ file, ...options }))
    )
    return uploadedFiles
  }, [uploadFile])

  // Eliminar archivo
  const deleteFile = useCallback(async (mediaId: string): Promise<void> => {
    if (!user) {
      handleMediaError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: media, error: selectError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .select()
          .eq('id', mediaId)
          .single()
      )

      if (selectError) {
        handleMediaError(selectError, 'NOT_FOUND', { media_id: mediaId })
      }

      const { error: storageError } = await executeWithRetry(() =>
        supabase.storage
          .from('media')
          .remove([media.url])
      )

      if (storageError) {
        handleMediaError(storageError, 'STORAGE')
      }

      const { error: deleteError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .delete()
          .eq('id', mediaId)
      )

      if (deleteError) {
        handleMediaError(deleteError, 'DELETE', { media_id: mediaId })
      }

      setMediaState(prev => ({
        ...prev,
        files: prev.files.filter(f => f.id !== mediaId)
      }))

      setSelectedFiles(prev => prev.filter(f => f.id !== mediaId))
    } catch (err) {
      throw new BaseError('Error al eliminar archivo', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar múltiples archivos
  const deleteMultipleFiles = useCallback(async (mediaIds: string[]): Promise<void> => {
    await Promise.all(mediaIds.map(id => deleteFile(id)))
  }, [deleteFile])

  // Crear carpeta
  const createFolder = useCallback(async (
    name: string,
    parentFolderId?: string
  ): Promise<MediaFolder> => {
    if (!user) {
      handleMediaError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      let path = '/'
      if (parentFolderId) {
        const { data: parentFolder, error: parentError } = await executeWithRetry(() =>
          supabase
            .from('media_folders')
            .select()
            .eq('id', parentFolderId)
            .single()
        )

        if (parentError) {
          handleMediaError(parentError, 'NOT_FOUND', { folder_id: parentFolderId })
        }

        path = `${parentFolder.path}/${name}`
      } else {
        path = `/${name}`
      }

      const { data: folder, error } = await executeWithRetry(() =>
        supabase
          .from('media_folders')
          .insert({
            name,
            path,
            parent_folder_id: parentFolderId
          })
          .select()
          .single()
      )

      if (error) {
        handleMediaError(error, 'STORAGE')
      }

      setMediaState(prev => ({
        ...prev,
        folders: [...prev.folders, folder]
      }))

      return folder
    } catch (err) {
      throw new BaseError('Error al crear carpeta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Eliminar carpeta
  const deleteFolder = useCallback(async (folderId: string): Promise<void> => {
    if (!user) {
      handleMediaError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: folder, error: selectError } = await executeWithRetry(() =>
        supabase
          .from('media_folders')
          .select()
          .eq('id', folderId)
          .single()
      )

      if (selectError) {
        handleMediaError(selectError, 'NOT_FOUND', { folder_id: folderId })
      }

      // Eliminar archivos en la carpeta
      const { data: files, error: filesError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .select()
          .eq('folder_path', folder.path)
      )

      if (filesError) {
        handleMediaError(filesError, 'STORAGE')
      }

      await Promise.all(files.map(file => deleteFile(file.id)))

      // Eliminar subcarpetas
      const { data: subfolders, error: subfoldersError } = await executeWithRetry(() =>
        supabase
          .from('media_folders')
          .select()
          .eq('parent_folder_id', folderId)
      )

      if (subfoldersError) {
        handleMediaError(subfoldersError, 'STORAGE')
      }

      await Promise.all(subfolders.map(subfolder => deleteFolder(subfolder.id)))

      // Eliminar la carpeta
      const { error: deleteError } = await executeWithRetry(() =>
        supabase
          .from('media_folders')
          .delete()
          .eq('id', folderId)
      )

      if (deleteError) {
        handleMediaError(deleteError, 'DELETE', { folder_id: folderId })
      }

      setMediaState(prev => ({
        ...prev,
        folders: prev.folders.filter(f => f.id !== folderId)
      }))
    } catch (err) {
      throw new BaseError('Error al eliminar carpeta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, deleteFile, startLoading, stopLoading])

  // Mover archivo
  const moveFile = useCallback(async (
    mediaId: string,
    newFolderPath: string
  ): Promise<Media> => {
    if (!user) {
      handleMediaError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: media, error: updateError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .update({ folder_path: newFolderPath })
          .eq('id', mediaId)
          .select()
          .single()
      )

      if (updateError) {
        handleMediaError(updateError, 'STORAGE', { media_id: mediaId })
      }

      setMediaState(prev => ({
        ...prev,
        files: prev.files.map(f => f.id === mediaId ? media : f)
      }))

      return media
    } catch (err) {
      throw new BaseError('Error al mover archivo', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Mover múltiples archivos
  const moveMultipleFiles = useCallback(async (
    mediaIds: string[],
    newFolderPath: string
  ): Promise<Media[]> => {
    const movedFiles = await Promise.all(
      mediaIds.map(id => moveFile(id, newFolderPath))
    )
    return movedFiles
  }, [moveFile])

  // Seleccionar archivo
  const selectFile = useCallback((mediaId: string): void => {
    const file = mediaState?.files.find(f => f.id === mediaId)
    if (file && !selectedFiles.some(f => f.id === mediaId)) {
      setSelectedFiles(prev => [...prev, file])
    }
  }, [mediaState?.files, selectedFiles])

  // Deseleccionar archivo
  const unselectFile = useCallback((mediaId: string): void => {
    setSelectedFiles(prev => prev.filter(f => f.id !== mediaId))
  }, [])

  // Limpiar selección
  const clearSelection = useCallback((): void => {
    setSelectedFiles([])
  }, [])

  // Navegar a carpeta
  const navigateToFolder = useCallback(async (folderId: string): Promise<void> => {
    try {
      startLoading()

      const { data: folder, error: folderError } = await executeWithRetry(() =>
        supabase
          .from('media_folders')
          .select()
          .eq('id', folderId)
          .single()
      )

      if (folderError) {
        handleMediaError(folderError, 'NOT_FOUND', { folder_id: folderId })
      }

      const { data: files, error: filesError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .select()
          .eq('folder_path', folder.path)
      )

      if (filesError) {
        handleMediaError(filesError, 'STORAGE')
      }

      const { data: subfolders, error: subfoldersError } = await executeWithRetry(() =>
        supabase
          .from('media_folders')
          .select()
          .eq('parent_folder_id', folderId)
      )

      if (subfoldersError) {
        handleMediaError(subfoldersError, 'STORAGE')
      }

      setMediaState(prev => ({
        ...prev,
        files,
        folders: subfolders,
        currentFolder: folder
      }))
    } catch (err) {
      throw new BaseError('Error al navegar a carpeta', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Buscar archivos
  const searchFiles = useCallback(async (query: string): Promise<Media[]> => {
    try {
      startLoading()

      const { data: files, error } = await executeWithRetry(() =>
        supabase
          .from('media')
          .select()
          .or(`file_name.ilike.%${query}%,alt_text.ilike.%${query}%,caption.ilike.%${query}%`)
      )

      if (error) {
        handleMediaError(error, 'STORAGE')
      }

      return files
    } catch (err) {
      throw new BaseError('Error al buscar archivos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [executeWithRetry, startLoading, stopLoading])

  // Actualizar metadatos
  const updateFileMetadata = useCallback(async (
    mediaId: string,
    metadata: Partial<Media>
  ): Promise<Media> => {
    if (!user) {
      handleMediaError(new Error('Usuario no autenticado'), 'PERMISSION')
    }

    try {
      startLoading()

      const { data: media, error } = await executeWithRetry(() =>
        supabase
          .from('media')
          .update(metadata)
          .eq('id', mediaId)
          .select()
          .single()
      )

      if (error) {
        handleMediaError(error, 'STORAGE', { media_id: mediaId })
      }

      setMediaState(prev => ({
        ...prev,
        files: prev.files.map(f => f.id === mediaId ? media : f)
      }))

      return media
    } catch (err) {
      throw new BaseError('Error al actualizar metadatos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user, executeWithRetry, startLoading, stopLoading])

  // Obtener URL pública
  const getPublicUrl = useCallback(async (mediaId: string): Promise<string> => {
    try {
      const { data: media, error: selectError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .select()
          .eq('id', mediaId)
          .single()
      )

      if (selectError) {
        handleMediaError(selectError, 'NOT_FOUND', { media_id: mediaId })
      }

      if (!media.is_public) {
        handleMediaError(new Error('Archivo no público'), 'PERMISSION', { media_id: mediaId })
      }

      const { data } = supabase.storage
        .from('media')
        .getPublicUrl(media.url)

      return data.publicUrl
    } catch (err) {
      throw new BaseError('Error al obtener URL pública', { cause: err })
    }
  }, [executeWithRetry])

  // Obtener URL firmada
  const getSignedUrl = useCallback(async (
    mediaId: string,
    expiresIn = 3600
  ): Promise<string> => {
    try {
      const { data: media, error: selectError } = await executeWithRetry(() =>
        supabase
          .from('media')
          .select()
          .eq('id', mediaId)
          .single()
      )

      if (selectError) {
        handleMediaError(selectError, 'NOT_FOUND', { media_id: mediaId })
      }

      const { data, error: signedError } = await supabase.storage
        .from('media')
        .createSignedUrl(media.url, expiresIn)

      if (signedError) {
        handleMediaError(signedError, 'STORAGE', { media_id: mediaId })
      }

      return data.signedUrl
    } catch (err) {
      throw new BaseError('Error al obtener URL firmada', { cause: err })
    }
  }, [executeWithRetry])

  return {
    files: mediaState?.files || [],
    folders: mediaState?.folders || [],
    selectedFiles,
    currentFolder: mediaState?.currentFolder || null,
    isLoading,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    deleteMultipleFiles,
    createFolder,
    deleteFolder,
    moveFile,
    moveMultipleFiles,
    selectFile,
    unselectFile,
    clearSelection,
    navigateToFolder,
    searchFiles,
    updateFileMetadata,
    generateThumbnail,
    getPublicUrl,
    getSignedUrl
  }
} 