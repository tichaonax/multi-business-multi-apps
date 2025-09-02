export type BusinessModule = 
  | 'construction' 
  | 'restaurant' 
  | 'grocery' 
  | 'clothing' 
  | 'personal'
  | 'admin'

export type Permission = 
  | 'read' 
  | 'write' 
  | 'delete' 
  | 'manage_users' 
  | 'backup_restore'
  | 'reports'
  | 'pos'

export type UserRole = 'admin' | 'manager' | 'employee' | 'user'

export interface UserPermissions {
  [module: string]: Permission[]
}

export function hasPermission(
  userPermissions: UserPermissions,
  module: BusinessModule,
  permission: Permission
): boolean {
  return userPermissions[module]?.includes(permission) || false
}

export function hasAnyPermission(
  userPermissions: UserPermissions,
  module: BusinessModule,
  permissions: Permission[]
): boolean {
  return permissions.some(permission => 
    hasPermission(userPermissions, module, permission)
  )
}

export function canAccessModule(
  userPermissions: UserPermissions,
  module: BusinessModule
): boolean {
  return !!(userPermissions[module] && userPermissions[module].length > 0)
}

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    construction: ['read', 'write', 'delete', 'reports'],
    restaurant: ['read', 'write', 'delete', 'reports', 'pos'],
    grocery: ['read', 'write', 'delete', 'reports', 'pos'],
    clothing: ['read', 'write', 'delete', 'reports', 'pos'],
    personal: ['read', 'write', 'delete', 'reports'],
    admin: ['manage_users', 'backup_restore'],
  },
  manager: {
    construction: ['read', 'write', 'reports'],
    restaurant: ['read', 'write', 'reports', 'pos'],
    grocery: ['read', 'write', 'reports', 'pos'],
    clothing: ['read', 'write', 'reports', 'pos'],
    personal: ['read', 'write', 'reports'],
  },
  employee: {
    construction: ['read', 'write'],
    restaurant: ['read', 'write', 'pos'],
    grocery: ['read', 'write', 'pos'],
    clothing: ['read', 'write', 'pos'],
    personal: ['read', 'write'],
  },
  user: {
    personal: ['read', 'write'],
  },
}