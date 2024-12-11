export type UserRole = 'admin' | 'vendor' | 'customer'

export interface UserProfile {
  id: string
  user_id: string
  role: UserRole
  full_name?: string
  avatar_url?: string
  email: string
  created_at: string
  updated_at: string
}

export interface RolePermissions {
  can_manage_users: boolean
  can_manage_products: boolean
  can_manage_orders: boolean
  can_manage_vendors: boolean
  can_view_analytics: boolean
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    can_manage_users: true,
    can_manage_products: true,
    can_manage_orders: true,
    can_manage_vendors: true,
    can_view_analytics: true,
  },
  vendor: {
    can_manage_users: false,
    can_manage_products: true,
    can_manage_orders: true,
    can_manage_vendors: false,
    can_view_analytics: true,
  },
  customer: {
    can_manage_users: false,
    can_manage_products: false,
    can_manage_orders: false,
    can_manage_vendors: false,
    can_view_analytics: false,
  },
}
