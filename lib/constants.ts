export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
} as const;

export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

export type UserRole = keyof typeof USER_ROLES;
export type UserStatus = keyof typeof USER_STATUS;
export type Permission = keyof typeof PERMISSIONS;