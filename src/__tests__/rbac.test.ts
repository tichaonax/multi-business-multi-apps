import { hasPermission, canAccessModule, DEFAULT_PERMISSIONS, Permission } from '@/lib/rbac'

describe('RBAC System', () => {
  describe('hasPermission', () => {
    it('should return true when user has the required permission', () => {
      const permissions = { construction: ['read' as Permission, 'write' as Permission] }
      expect(hasPermission(permissions, 'construction', 'read')).toBe(true)
    })

    it('should return false when user lacks the required permission', () => {
      const permissions = { construction: ['read' as Permission] }
      expect(hasPermission(permissions, 'construction', 'write')).toBe(false)
    })
  })

  describe('canAccessModule', () => {
    it('should return true when user has any permission for module', () => {
      const permissions = { construction: ['read' as Permission] }
      expect(canAccessModule(permissions, 'construction')).toBe(true)
    })

    it('should return false when user has no permissions for module', () => {
      const permissions = { restaurant: ['read' as Permission] }
      expect(canAccessModule(permissions, 'construction')).toBe(false)
    })
  })

  describe('DEFAULT_PERMISSIONS', () => {
    it('should give admin access to all modules', () => {
      const adminPerms = DEFAULT_PERMISSIONS.admin
      expect(canAccessModule(adminPerms, 'construction')).toBe(true)
      expect(canAccessModule(adminPerms, 'restaurant')).toBe(true)
      expect(hasPermission(adminPerms, 'admin', 'manage_users')).toBe(true)
    })

    it('should limit user access to personal module only', () => {
      const userPerms = DEFAULT_PERMISSIONS.user
      expect(canAccessModule(userPerms, 'personal')).toBe(true)
      expect(canAccessModule(userPerms, 'construction')).toBe(false)
    })
  })
})