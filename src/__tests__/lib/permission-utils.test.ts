import { canStockInventoryFromModal } from '../../lib/permission-utils'

describe('Permission Utils', () => {
  const mockUserWithPermissions = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    permissions: {
      canStockInventoryFromModal: true
    }
  }

  const mockUserWithoutPermissions = {
    id: 'user-2',
    email: 'test2@example.com',
    name: 'Test User 2',
    permissions: {
      canStockInventoryFromModal: false
    }
  }

  const mockAdminUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin'
  }

  describe('canStockInventoryFromModal', () => {
    it('should return true for admin user', () => {
      const result = canStockInventoryFromModal(mockAdminUser)
      expect(result).toBe(true)
    })

    it('should return true for user with stock inventory permission', () => {
      const result = canStockInventoryFromModal(mockUserWithPermissions)
      expect(result).toBe(true)
    })

    it('should return false for user without stock inventory permission', () => {
      const result = canStockInventoryFromModal(mockUserWithoutPermissions)
      expect(result).toBe(false)
    })

    it('should return false for null user', () => {
      const result = canStockInventoryFromModal(null)
      expect(result).toBe(false)
    })
  })
})