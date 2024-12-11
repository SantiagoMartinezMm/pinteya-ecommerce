import { useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { useSubscription } from './useSubscription'
import { useLoadingState } from './useLoadingState'
import { useCache } from './useCache'
import { useRetry } from './useRetry'
import { z } from 'zod'
import { BaseError, ValidationError } from '@/types/errors'

// Esquemas de validación
const permissionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  resource: z.string(),
  action: z.enum(['create', 'read', 'update', 'delete', 'manage']),
  conditions: z.record(z.unknown()).optional()
})

const roleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  is_system: z.boolean(),
  permissions: z.array(z.string().uuid()),
  metadata: z.record(z.unknown()).optional()
})

const userPermissionsSchema = z.object({
  user_id: z.string().uuid(),
  roles: z.array(z.string().uuid()),
  direct_permissions: z.array(z.string().uuid()),
  overrides: z.record(z.boolean()).optional()
})

export type Permission = z.infer<typeof permissionSchema>
export type Role = z.infer<typeof roleSchema>
export type UserPermissions = z.infer<typeof userPermissionsSchema>

export interface PermissionError extends BaseError {
  code: 'PERMISSION_ERROR'
  details: {
    type: 'VALIDATION' | 'ACCESS_DENIED' | 'ROLE' | 'SERVER_ERROR'
    resource?: string
    action?: string
    originalError?: unknown
  }
}

export interface PermissionsHookReturn {
  roles: Role[]
  permissions: Permission[]
  isLoading: boolean
  can: (resource: string, action: Permission['action']) => boolean
  hasRole: (roleId: string) => boolean
  checkPermission: (permissionId: string) => boolean
  getResourcePermissions: (resource: string) => Permission[]
  refreshPermissions: () => Promise<void>
}

const CACHE_TTL = 1000 * 60 * 30 // 30 minutos

// Roles del sistema
const SYSTEM_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
} as const

export function usePermissions(): PermissionsHookReturn {
  const supabase = createClient()
  const { user } = useAuth()
  const { subscription } = useSubscription()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { executeWithRetry } = useRetry({
    maxAttempts: 2,
    delay: 500
  })

  // Cache para permisos y roles
  const { 
    data: permissionsData, 
    setData: setPermissionsData 
  } = useCache<{
    roles: Role[]
    permissions: Permission[]
    userPermissions: UserPermissions | null
  }>({
    key: `permissions-${user?.id}`,
    ttl: CACHE_TTL
  })

  const handlePermissionError = (
    error: unknown,
    type: PermissionError['details']['type'],
    resource?: string,
    action?: string
  ): never => {
    throw new BaseError('Error de permisos', {
      code: 'PERMISSION_ERROR',
      details: {
        type,
        resource,
        action,
        originalError: error
      }
    })
  }

  // Cargar roles
  const fetchRoles = useCallback(async (): Promise<Role[]> => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name')

    if (error) {
      handlePermissionError(error, 'SERVER_ERROR')
    }

    return data?.map(role => roleSchema.parse(role)) || []
  }, [])

  // Cargar permisos
  const fetchPermissions = useCallback(async (): Promise<Permission[]> => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource', { ascending: true })
      .order('action', { ascending: true })

    if (error) {
      handlePermissionError(error, 'SERVER_ERROR')
    }

    return data?.map(permission => permissionSchema.parse(permission)) || []
  }, [])

  // Cargar permisos de usuario
  const fetchUserPermissions = useCallback(async (): Promise<UserPermissions | null> => {
    if (!user?.id) return null

    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      handlePermissionError(error, 'SERVER_ERROR')
    }

    return data ? userPermissionsSchema.parse(data) : null
  }, [user?.id])

  // Refrescar datos
  const refreshPermissions = useCallback(async (): Promise<void> => {
    try {
      startLoading()

      const [roles, permissions, userPermissions] = await Promise.all([
        executeWithRetry(fetchRoles),
        executeWithRetry(fetchPermissions),
        executeWithRetry(fetchUserPermissions)
      ])

      setPermissionsData({
        roles,
        permissions,
        userPermissions
      })
    } catch (err) {
      throw new BaseError('Error al refrescar permisos', { cause: err })
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading, executeWithRetry, fetchRoles, fetchPermissions, fetchUserPermissions])

  // Verificar si tiene un rol específico
  const hasRole = useCallback((roleId: string): boolean => {
    if (!permissionsData?.userPermissions) return false
    return permissionsData.userPermissions.roles.includes(roleId)
  }, [permissionsData])

  // Verificar un permiso específico
  const checkPermission = useCallback((permissionId: string): boolean => {
    if (!permissionsData?.userPermissions) return false

    // Verificar override específico
    if (permissionsData.userPermissions.overrides?.[permissionId] !== undefined) {
      return permissionsData.userPermissions.overrides[permissionId]
    }

    // Verificar permisos directos
    if (permissionsData.userPermissions.direct_permissions.includes(permissionId)) {
      return true
    }

    // Verificar permisos de roles
    const userRoles = permissionsData.roles.filter(
      role => permissionsData.userPermissions.roles.includes(role.id)
    )

    return userRoles.some(role => role.permissions.includes(permissionId))
  }, [permissionsData])

  // Verificar permiso por recurso y acción
  const can = useCallback((
    resource: string,
    action: Permission['action']
  ): boolean => {
    if (!permissionsData?.permissions) return false

    // Administradores tienen acceso total
    if (hasRole(SYSTEM_ROLES.ADMIN)) return true

    // Encontrar permiso específico
    const permission = permissionsData.permissions.find(
      p => p.resource === resource && p.action === action
    )

    if (!permission) return false

    // Verificar suscripción si es necesario
    if (permission.conditions?.requires_subscription && !subscription) {
      return false
    }

    return checkPermission(permission.id)
  }, [permissionsData, hasRole, checkPermission, subscription])

  // Obtener permisos de un recurso
  const getResourcePermissions = useCallback((resource: string): Permission[] => {
    if (!permissionsData?.permissions) return []
    return permissionsData.permissions.filter(p => p.resource === resource)
  }, [permissionsData])

  // Cargar datos iniciales
  useEffect(() => {
    if (user?.id) {
      void refreshPermissions()
    }
  }, [user?.id])

  return {
    roles: permissionsData?.roles || [],
    permissions: permissionsData?.permissions || [],
    isLoading,
    can,
    hasRole,
    checkPermission,
    getResourcePermissions,
    refreshPermissions
  }
}
