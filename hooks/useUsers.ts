import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostgrestError } from '@supabase/supabase-js'

export type UserRole = 'ADMIN' | 'CUSTOMER' | 'SELLER'

export type UserProfile = {
  id: string
  email: string
  role: UserRole
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  default_shipping_address?: string
  default_shipping_city?: string
  default_shipping_state?: string
  default_shipping_zip?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export type CreateUserInput = {
  email: string
  password: string
  role?: UserRole
  first_name: string
  last_name: string
  phone?: string
}

export type UpdateProfileInput = Partial<Omit<UserProfile, 'id' | 'email' | 'created_at' | 'updated_at'>>

export function useUsers() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<PostgrestError | null>(null)

  const getCurrentUser = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError

      if (!user) return null

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      return profile as UserProfile
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getUsers = useCallback(async (role?: UserRole, includeInactive = false) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (role) {
        query = query.eq('role', role)
      }

      if (!includeInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) throw error

      return data as UserProfile[]
    } catch (error) {
      setError(error as PostgrestError)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getUserById = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      return data as UserProfile
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createUser = useCallback(async (userData: CreateUserInput) => {
    try {
      setLoading(true)
      setError(null)

      // Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) throw new Error('Failed to create user')

      // Crear perfil en la tabla users
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          email: userData.email,
          role: userData.role || 'CUSTOMER',
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          is_active: true
        }])
        .select()
        .single()

      if (profileError) throw profileError

      return profile as UserProfile
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (userId: string, updates: UpdateProfileInput) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      return data as UserProfile
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateEmail = useCallback(async (newEmail: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error

      return true
    } catch (error) {
      setError(error as PostgrestError)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      return true
    } catch (error) {
      setError(error as PostgrestError)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const deactivateUser = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)

      if (error) throw error

      return true
    } catch (error) {
      setError(error as PostgrestError)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadAvatar = useCallback(async (userId: string, file: File) => {
    try {
      setLoading(true)
      setError(null)

      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${userId}.${fileExt}`

      // Subir imagen
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      // Actualizar perfil con nueva URL
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      return data as UserProfile
    } catch (error) {
      setError(error as PostgrestError)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    getCurrentUser,
    getUsers,
    getUserById,
    createUser,
    updateProfile,
    updateEmail,
    updatePassword,
    deactivateUser,
    uploadAvatar
  }
}
