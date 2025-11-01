/**
 * Employee Transfer Service Unit Tests
 * 
 * Tests for all employee transfer service functions:
 * - getTransferableEmployees
 * - getCompatibleTargetBusinesses
 * - validateTransfer
 * - transferEmployeesToBusiness
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { 
  getTransferableEmployees,
  getCompatibleTargetBusinesses,
  validateTransfer,
  transferEmployeesToBusiness
} from '@/lib/employee-transfer-service'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    employees: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    businesses: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    employeeContracts: {
      findFirst: jest.fn(),
    },
    contractRenewals: {
      create: jest.fn(),
    },
    employeeBusinessAssignments: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    auditLogs: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  }
}))

describe('Employee Transfer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations
    ;(mockPrisma.employees.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.businesses.findUnique as jest.Mock).mockResolvedValue(null)
    ;(mockPrisma.businesses.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.employee_contracts.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.contract_renewals.create as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.employee_business_assignments.updateMany as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.employee_business_assignments.create as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.audit_log.create as jest.Mock).mockResolvedValue({})
  })

  describe('getTransferableEmployees', () => {
    it('should return active employees for a business', async () => {
      const mockEmployees = [
        {
          id: 'emp1',
          fullName: 'John Doe',
          employeeNumber: 'EMP001',
          primaryBusinessId: 'biz1',
          isActive: true,
          job_titles: { title: 'Manager' },
          employee_contracts: [
            {
              id: 'contract1',
              contractNumber: 'CNT001',
              status: 'active',
              primaryBusinessId: 'biz1',
            }
          ]
        }
      ]

      ;(prisma.employees.findMany as jest.Mock).mockResolvedValue(mockEmployees)

      const result = await getTransferableEmployees('biz1')

      expect(result.success).toBe(true)
      expect(result.employees).toHaveLength(1)
      expect(result.employees![0].fullName).toBe('John Doe')
      expect(prisma.employees.findMany).toHaveBeenCalledWith({
        where: {
          primaryBusinessId: 'biz1',
          isActive: true
        },
        include: expect.any(Object)
      })
    })

    it('should return empty array when no employees found', async () => {
      ;(prisma.employees.findMany as jest.Mock).mockResolvedValue([])

      const result = await getTransferableEmployees('biz1')

      expect(result.success).toBe(true)
      expect(result.employees).toHaveLength(0)
      expect(result.count).toBe(0)
    })

    it('should handle errors gracefully', async () => {
      ;(prisma.employees.findMany as jest.Mock).mockRejectedValue(new Error('Database error'))

      const result = await getTransferableEmployees('biz1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to fetch transferable employees')
    })
  })

  describe('getCompatibleTargetBusinesses', () => {
    it('should return businesses of same type excluding source', async () => {
      const sourceBusiness = {
        id: 'biz1',
        type: 'retail',
        isActive: true
      }

      const targetBusinesses = [
        {
          id: 'biz2',
          name: 'Store 2',
          type: 'retail',
          isActive: true,
          _count: { employees: 5 }
        },
        {
          id: 'biz3',
          name: 'Store 3',
          type: 'retail',
          isActive: true,
          _count: { employees: 3 }
        }
      ]

      ;(prisma.businesses.findUnique as jest.Mock).mockResolvedValue(sourceBusiness)
      ;(prisma.businesses.findMany as jest.Mock).mockResolvedValue(targetBusinesses)

      const result = await getCompatibleTargetBusinesses('biz1')

      expect(result.success).toBe(true)
      expect(result.businesses).toHaveLength(2)
      expect(result.businesses![0].type).toBe('retail')
      expect(prisma.businesses.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'biz1' },
          type: 'retail',
          isActive: true
        },
        select: expect.any(Object)
      })
    })

    it('should return error when source business not found', async () => {
      ;(prisma.businesses.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await getCompatibleTargetBusinesses('biz1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Source business not found')
    })

    it('should handle inactive source business', async () => {
      const sourceBusiness = {
        id: 'biz1',
        type: 'retail',
        isActive: false
      }

      ;(prisma.businesses.findUnique as jest.Mock).mockResolvedValue(sourceBusiness)

      const result = await getCompatibleTargetBusinesses('biz1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Source business is not active')
    })
  })

  describe('validateTransfer', () => {
    it('should validate successful transfer', async () => {
      const sourceBusiness = { id: 'biz1', type: 'retail', isActive: true }
      const targetBusiness = { id: 'biz2', type: 'retail', isActive: true }
      const employees = [
        { id: 'emp1', isActive: true, primaryBusinessId: 'biz1' },
        { id: 'emp2', isActive: true, primaryBusinessId: 'biz1' }
      ]

      ;(prisma.businesses.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourceBusiness)
        .mockResolvedValueOnce(targetBusiness)
      ;(prisma.employees.findMany as jest.Mock).mockResolvedValue(employees)

      const result = await validateTransfer('biz1', 'biz2', ['emp1', 'emp2'])

      expect(result.success).toBe(true)
      expect(result.validation?.isValid).toBe(true)
      expect(result.validation?.validEmployeeIds).toHaveLength(2)
      expect(result.validation?.errors).toHaveLength(0)
    })

    it('should detect business type mismatch', async () => {
      const sourceBusiness = { id: 'biz1', type: 'retail', isActive: true }
      const targetBusiness = { id: 'biz2', type: 'restaurant', isActive: true }

      ;(prisma.businesses.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourceBusiness)
        .mockResolvedValueOnce(targetBusiness)

      const result = await validateTransfer('biz1', 'biz2', ['emp1'])

      expect(result.success).toBe(true)
      expect(result.validation?.isValid).toBe(false)
      expect(result.validation?.errors).toContain(
        'Business types do not match: retail -> restaurant'
      )
    })

    it('should detect inactive employees', async () => {
      const sourceBusiness = { id: 'biz1', type: 'retail', isActive: true }
      const targetBusiness = { id: 'biz2', type: 'retail', isActive: true }
      const employees = [
        { id: 'emp1', isActive: true, primaryBusinessId: 'biz1' },
        { id: 'emp2', isActive: false, primaryBusinessId: 'biz1' }
      ]

      ;(prisma.businesses.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourceBusiness)
        .mockResolvedValueOnce(targetBusiness)
      ;(prisma.employees.findMany as jest.Mock).mockResolvedValue(employees)

      const result = await validateTransfer('biz1', 'biz2', ['emp1', 'emp2'])

      expect(result.success).toBe(true)
      expect(result.validation?.validEmployeeIds).toHaveLength(1)
      expect(result.validation?.warnings).toContain('1 employee(s) are inactive and will be skipped')
    })

    it('should detect employees from wrong business', async () => {
      const sourceBusiness = { id: 'biz1', type: 'retail', isActive: true }
      const targetBusiness = { id: 'biz2', type: 'retail', isActive: true }
      const employees = [
        { id: 'emp1', isActive: true, primaryBusinessId: 'biz1' },
        { id: 'emp2', isActive: true, primaryBusinessId: 'biz3' } // Wrong business!
      ]

      ;(prisma.businesses.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourceBusiness)
        .mockResolvedValueOnce(targetBusiness)
      ;(prisma.employees.findMany as jest.Mock).mockResolvedValue(employees)

      const result = await validateTransfer('biz1', 'biz2', ['emp1', 'emp2'])

      expect(result.success).toBe(true)
      expect(result.validation?.validEmployeeIds).toHaveLength(1)
      expect(result.validation?.warnings.length).toBeGreaterThan(0)
    })

    it('should return error when target business not found', async () => {
      const sourceBusiness = { id: 'biz1', type: 'retail', isActive: true }

      ;(prisma.businesses.findUnique as jest.Mock)
        .mockResolvedValueOnce(sourceBusiness)
        .mockResolvedValueOnce(null)

      const result = await validateTransfer('biz1', 'biz2', ['emp1'])

      expect(result.success).toBe(false)
      expect(result.error).toContain('Target business not found')
    })
  })

  describe('transferEmployeesToBusiness', () => {
    it('should successfully transfer employees with contract renewals', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        return await callback({
          employees: {
            update: jest.fn().mockResolvedValue({ id: 'emp1' }),
          },
          employeeContracts: {
            findFirst: jest.fn().mockResolvedValue({
              id: 'contract1',
              contractNumber: 'CNT001',
              employeeId: 'emp1',
            }),
          },
          contractRenewals: {
            create: jest.fn().mockResolvedValue({ id: 'renewal1' }),
          },
          employeeBusinessAssignments: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({ id: 'assignment1' }),
          },
          auditLogs: {
            create: jest.fn().mockResolvedValue({ id: 'audit1' }),
          },
        })
      })

      ;(prisma.$transaction as jest.Mock) = mockTransaction

      const result = await transferEmployeesToBusiness(
        'biz1',
        'biz2',
        ['emp1'],
        'user1'
      )

      expect(result.success).toBe(true)
      expect(result.transferredCount).toBe(1)
      expect(result.contractRenewalsCreated).toBe(1)
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('should handle employees without active contracts', async () => {
      const mockTransaction = jest.fn(async (callback) => {
        return await callback({
          employees: {
            update: jest.fn().mockResolvedValue({ id: 'emp1' }),
          },
          employeeContracts: {
            findFirst: jest.fn().mockResolvedValue(null), // No contract
          },
          contractRenewals: {
            create: jest.fn(),
          },
          employeeBusinessAssignments: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({ id: 'assignment1' }),
          },
          auditLogs: {
            create: jest.fn().mockResolvedValue({ id: 'audit1' }),
          },
        })
      })

      ;(prisma.$transaction as jest.Mock) = mockTransaction

      const result = await transferEmployeesToBusiness(
        'biz1',
        'biz2',
        ['emp1'],
        'user1'
      )

      expect(result.success).toBe(true)
      expect(result.transferredCount).toBe(1)
      expect(result.contractRenewalsCreated).toBe(0) // No renewals created
    })

    it('should rollback on transaction failure', async () => {
      const mockTransaction = jest.fn(async () => {
        throw new Error('Transaction failed')
      })

      ;(prisma.$transaction as jest.Mock) = mockTransaction

      const result = await transferEmployeesToBusiness(
        'biz1',
        'biz2',
        ['emp1'],
        'user1'
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to transfer employees')
    })

    it('should handle empty employee list', async () => {
      const result = await transferEmployeesToBusiness(
        'biz1',
        'biz2',
        [],
        'user1'
      )

      expect(result.success).toBe(true)
      expect(result.transferredCount).toBe(0)
      expect(result.contractRenewalsCreated).toBe(0)
    })
  })
})
