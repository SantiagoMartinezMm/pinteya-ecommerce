import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCallback, useEffect } from 'react'
import {
  User,
  Session,
  AuthError,
  SupabaseClient,
  AuthChangeEvent,
} from '@supabase/supabase-js'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const credentialsSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')
})

const signUpOptionsSchema = z.object({
  emailRedirectTo: z.string().url().optional(),
  data: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional()
})

export interface AuthUser extends User {
  customData?: Record<string, unknown>
}

export interface AuthState {
  user: AuthUser | null
  session: Session | null
  isAuthenticated: boolean
}

export interface AuthError extends BaseError {
  code: 'AUTH_ERROR'
  details: {
    type: 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'SESSION_EXPIRED' | 'NETWORK_ERROR'
    originalError?: unknown
  }
}

export interface AuthHookReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, options?: SignUpOptions) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (data: Partial<AuthUser>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isLoading: boolean
}

interface SignUpOptions {
  emailRedirectTo?: string
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export function useAuth(): AuthHookReturn {
  const router = useRouter()
  const supabase = createClient() as SupabaseClient
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 3,
    delay: 1000,
    backoff: true
  })
  
  // Cache para datos del usuario
  const { data: cachedUser, setData: setCachedUser } = useCache<AuthUser>({
    key: 'auth-user',
    ttl: 1000 * 60 * 5 // 5 minutos
  })

  // Estado inicial
  const initialState: AuthState = {
    user: cachedUser,
    session: null,
    isAuthenticated: false
  }

  const [state, setState] = useLoadingState<AuthState>(initialState)

  // Manejador de errores de autenticación
  const handleAuthError = (error: unknown, type: AuthError['details']['type']): never => {
    throw new BaseError('Error de autenticación', {
      code: 'AUTH_ERROR',
      details: {
        type,
        originalError: error
      }
    })
  }

  // Efecto para suscripción a cambios de autenticación
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        try {
          startLoading()
          
          const user = session?.user ?? null
          const isAuthenticated = !!user

          // Actualizar cache y estado
          if (user) {
            const enrichedUser = await enrichUserData(user)
            setCachedUser(enrichedUser)
            setState({
              user: enrichedUser,
              session,
              isAuthenticated
            })
          } else {
            setCachedUser(null)
            setState({
              user: null,
              session: null,
              isAuthenticated: false
            })
          }

        } catch (err) {
          console.error('Error en cambio de estado de auth:', err)
        } finally {
          stopLoading()
        }
      }
    )

    // Inicialización
    const initializeAuth = async () => {
      try {
        startLoading()
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        const user = session?.user ?? null
        const isAuthenticated = !!user

        if (user) {
          const enrichedUser = await enrichUserData(user)
          setCachedUser(enrichedUser)
          setState({
            user: enrichedUser,
            session,
            isAuthenticated
          })
        }
      } catch (err) {
        console.error('Error al inicializar auth:', err)
        setState({
          user: null,
          session: null,
          isAuthenticated: false
        })
      } finally {
        stopLoading()
      }
    }

    initializeAuth()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  // Enriquecer datos del usuario
  const enrichUserData = async (user: User): Promise<AuthUser> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      return {
        ...user,
        customData: data
      }
    } catch (err) {
      console.error('Error al obtener datos adicionales del usuario:', err)
      return user as AuthUser
    }
  }

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      startLoading()
      
      // Validar credenciales
      const credentials = credentialsSchema.parse({ email, password })

      await executeWithRetry(async () => {
        const { error } = await supabase.auth.signInWithPassword(credentials)
        
        if (error) {
          handleAuthError(error, 'INVALID_CREDENTIALS')
        }

        router.push('/dashboard')
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Credenciales inválidas', { cause: err })
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [router, startLoading, stopLoading, executeWithRetry])

  const signUp = useCallback(async (
    email: string, 
    password: string,
    options?: SignUpOptions
  ): Promise<void> => {
    try {
      startLoading()
      
      // Validar datos
      const credentials = credentialsSchema.parse({ email, password })
      if (options) {
        signUpOptionsSchema.parse(options)
      }

      await executeWithRetry(async () => {
        const { error } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options
        })

        if (error) {
          handleAuthError(error, 'INVALID_CREDENTIALS')
        }

        router.push('/verify-email')
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Datos de registro inválidos', { cause: err })
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [router, startLoading, stopLoading, executeWithRetry])

  const signOut = useCallback(async (): Promise<void> => {
    try {
      startLoading()
      
      await executeWithRetry(async () => {
        const { error } = await supabase.auth.signOut()
        
        if (error) {
          handleAuthError(error, 'SESSION_EXPIRED')
        }

        // Limpiar cache y estado
        setCachedUser(null)
        setState({
          user: null,
          session: null,
          isAuthenticated: false
        })

        router.push('/login')
      })
    } catch (err) {
      throw new BaseError('Error al cerrar sesión', { cause: err })
    } finally {
      stopLoading()
    }
  }, [router, startLoading, stopLoading, executeWithRetry])

  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      startLoading()
      
      await executeWithRetry(async () => {
        const { error } = await supabase.auth.refreshSession()
        
        if (error) {
          handleAuthError(error, 'SESSION_EXPIRED')
        }
      })
    } catch (err) {
      throw new BaseError('Error al refrescar sesión', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry])

  const updateProfile = useCallback(async (data: Partial<AuthUser>): Promise<void> => {
    try {
      startLoading()
      
      if (!state.user?.id) {
        throw new ValidationError('Usuario no autenticado')
      }

      await executeWithRetry(async () => {
        // Actualizar datos de auth si es necesario
        if (data.email || data.password) {
          const { error: authError } = await supabase.auth.updateUser(data)
          if (authError) throw authError
        }

        // Actualizar datos adicionales
        if (data.customData) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update(data.customData)
            .eq('id', state.user.id)

          if (profileError) throw profileError
        }

        // Actualizar cache y estado
        const updatedUser = await enrichUserData(state.user)
        setCachedUser(updatedUser)
        setState(prev => ({
          ...prev,
          user: updatedUser
        }))
      })
    } catch (err) {
      throw new BaseError('Error al actualizar perfil', { cause: err })
    } finally {
      stopLoading()
    }
  }, [state.user, startLoading, stopLoading, executeWithRetry])

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      startLoading()
      
      // Validar email
      const { email: validatedEmail } = credentialsSchema.pick({ email: true }).parse({ email })

      await executeWithRetry(async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(validatedEmail)
        
        if (error) {
          handleAuthError(error, 'INVALID_CREDENTIALS')
        }
      })
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError('Email inválido', { cause: err })
      }
      throw err
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry])

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateProfile,
    resetPassword,
    isLoading
  }
}
