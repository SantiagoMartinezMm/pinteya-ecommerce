import { usePermissions } from '@/hooks/usePermissions'
import { RolePermissions, UserRole } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: UserRole[]
  requiredPermissions?: (keyof RolePermissions)[]
  fallbackPath?: string
}

export function RoleGuard({
  children,
  allowedRoles,
  requiredPermissions,
  fallbackPath = '/',
}: RoleGuardProps) {
  const { userProfile, hasPermission } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!userProfile) {
      router.push('/auth/login')
      return
    }

    if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
      router.push(fallbackPath)
      return
    }

    if (requiredPermissions) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        hasPermission(permission)
      )
      if (!hasAllPermissions) {
        router.push(fallbackPath)
        return
      }
    }
  }, [userProfile, allowedRoles, requiredPermissions, fallbackPath, router, hasPermission])

  if (!userProfile) return null

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) return null

  if (requiredPermissions) {
    const hasAllPermissions = requiredPermissions.every((permission) =>
      hasPermission(permission)
    )
    if (!hasAllPermissions) return null
  }

  return <>{children}</>
}
