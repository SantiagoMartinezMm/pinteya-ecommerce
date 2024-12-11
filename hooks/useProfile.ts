import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const profileSchema = z.object({
  full_name: z.string().min(3, 'Nombre completo debe tener al menos 3 caracteres'),
  phone: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string()
  }).optional(),
  preferences: z.object({
    language: z.string(),
    theme: z.enum(['light', 'dark', 'system']),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean()
    })
  }).optional(),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional()
})

export type Profile = z.infer<typeof profileSchema>

export interface ProfileError extends BaseError {
  code: 'PROFILE_ERROR'
  details: {
    type: 'NOT_FOUND' | 'VALIDATION' | 'UPDATE_FAILED' | 'UPLOAD_FAILED'
    field?: string
    originalError?: unknown
  }
}

export interface ProfileHookReturn {
  profile: Profile | null
  isLoading: boolean
  updateProfile: (data: Partial<Profile>) => Promise<void>
  uploadAvatar: (file: File) => Promise<string>
  deleteAvatar: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useProfile(): ProfileHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 3,
    delay: 1000
  })

  // Cache para datos del perfil
  const { data: cachedProfile, setData: setCachedProfile } = useCache<Profile>({
    key: `profile-${user?.id}`,
    ttl: 1000 * 60 * 5 // 5 minutos
  })

  const handleProfileError = (error: unknown, type: ProfileError['details']['type'], field?: string): never => {
    throw new BaseError('Error en perfil', {
      code: 'PROFILE_ERROR',
      details: {
        type,
        field,
        originalError: error
      }
    })
  }

  const fetchProfile = useCallback(async (): Promise<Profile> => {
    if (!user?.id) {
      throw new ValidationError('Usuario no autenticado')
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      handleProfileError(error, 'NOT_FOUND')
    }

    return profileSchema.parse(data)
  }, [user?.id])

  const refreshProfile = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      const profile = await executeWithRetry(fetchProfile)
      setCachedProfile(profile)

    } catch (err) {
      if (err instanceof z.ZodError) {
        handleProfileError(err, 'VALIDATION')
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchProfile])

  const updateProfile = useCallback(async (data: Partial<Profile>): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      // Validar datos parciales
      const partialSchema = profileSchema.partial()
      const validated = partialSchema.parse(data)

      await executeWithRetry(async () => {
        const { error } = await supabase
          .from('profiles')
          .update(validated)
          .eq('id', user.id)

        if (error) {
          handleProfileError(error, 'UPDATE_FAILED')
        }

        // Actualizar cache con nuevos datos
        const updatedProfile = await fetchProfile()
        setCachedProfile(updatedProfile)
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        handleProfileError(err, 'VALIDATION')
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [user?.id, startLoading, stopLoading, executeWithRetry, fetchProfile])

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      // Validar archivo
      if (!file.type.startsWith('image/')) {
        throw new ValidationError('El archivo debe ser una imagen')
      }

      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new ValidationError('La imagen no debe superar 5MB')
      }

      await executeWithRetry(async () => {
        // Subir imagen
        const fileName = `${user.id}-${Date.now()}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file)

        if (uploadError) {
          handleProfileError(uploadError, 'UPLOAD_FAILED')
        }

        // Obtener URL pública
        const { data: { publicUrl }, error: urlError } = await supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)

        if (urlError) {
          handleProfileError(urlError, 'UPLOAD_FAILED')
        }

        // Actualizar perfil con nueva URL
        await updateProfile({ avatar_url: publicUrl })

        return publicUrl
      })

      return ''
    } catch (err) {
      throw new BaseError('Error al subir avatar', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, startLoading, stopLoading, executeWithRetry, updateProfile])

  const deleteAvatar = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      if (!user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      if (!cachedProfile?.avatar_url) {
        return
      }

      await executeWithRetry(async () => {
        // Extraer nombre del archivo de la URL
        const fileName = cachedProfile.avatar_url.split('/').pop()
        if (!fileName) return

        // Eliminar archivo
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove([fileName])

        if (deleteError) {
          handleProfileError(deleteError, 'UPLOAD_FAILED')
        }

        // Actualizar perfil
        await updateProfile({ avatar_url: null })
      })
    } catch (err) {
      throw new BaseError('Error al eliminar avatar', { cause: err })
    } finally {
      stopLoading()
    }
  }, [user?.id, cachedProfile, startLoading, stopLoading, executeWithRetry, updateProfile])

  return {
    profile: cachedProfile,
    isLoading,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    refreshProfile
  }
} 