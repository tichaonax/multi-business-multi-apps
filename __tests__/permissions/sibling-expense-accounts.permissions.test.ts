/**
 * Permission Tests for Sibling Expense Accounts
 *
 * Tests that sibling account operations respect the permission system
 * and enforce proper access controls.
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/expense-account/[accountId]/sibling/route'
import { POST as mergePOST } from '@/app/api/expense-account/[accountId]/merge/route'
import { prisma } from '@/lib/prisma'

// Mock the auth utilities
jest.mock('@/lib/auth-utils', () => ({
  getCurrentUser: jest.fn(),
  requirePermission: jest.fn(),
  requireAdmin: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    expenseAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expenseAccountTransaction: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

const mockGetCurrentUser = require('@/lib/auth-utils').getCurrentUser
const mockRequirePermission = require('@/lib/auth-utils').requirePermission
const mockRequireAdmin = require('@/lib/auth-utils').requireAdmin

describe('Sibling Expense Accounts Permission Tests', () => {
  let testUser: any
  let testBusiness: any
  let parentAccount: any
  let siblingAccount: any

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create test data
    testUser = {
      id: 'user_123',
      email: 'test@example.com',
      role: 'USER',
    }

    testBusiness = {
      id: 'biz_123',
      name: 'Test Business',
    }

    parentAccount = {
      id: 'exp_parent',
      accountNumber: 'EXP-001',
      name: 'Parent Account',
      businessId: testBusiness.id,
      isSibling: false,
      balance: 1000.00,
    }

    siblingAccount = {
      id: 'exp_sibling',
      accountNumber: 'EXP-001-01',
      name: 'Sibling Account',
      businessId: testBusiness.id,
      isSibling: true,
      parentAccountId: parentAccount.id,
      balance: 0.00,
      canMerge: true,
    }

    // Mock auth
    mockGetCurrentUser.mockResolvedValue(testUser)
  })

  describe('GET /api/expense-account/[accountId]/sibling - Permission Enforcement', () => {
    it('should allow access with canAccessExpenseAccount permission', async () => {
      mockRequirePermission.mockResolvedValue(true)
      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccount.findMany as jest.Mock).mockResolvedValue([siblingAccount])

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        { method: 'GET' }
      )

      const response = await GET(request, { params: { accountId: parentAccount.id } })
      expect(response.status).toBe(200)
      expect(mockRequirePermission).toHaveBeenCalledWith('canAccessExpenseAccount')
    })

    it('should deny access without canAccessExpenseAccount permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Permission denied'))

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        { method: 'GET' }
      )

      const response = await GET(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toContain('Permission denied')
    })
  })

  describe('POST /api/expense-account/[accountId]/sibling - Permission Enforcement', () => {
    it('should allow creation with canCreateExpenseAccount permission', async () => {
      mockRequirePermission.mockResolvedValue(true)
      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccount.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.expenseAccount.create as jest.Mock).mockResolvedValue({
        ...siblingAccount,
        accountNumber: 'EXP-001-01',
      })

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'New Sibling',
            description: 'Test sibling',
          }),
        }
      )

      const response = await POST(request, { params: { accountId: parentAccount.id } })
      expect(response.status).toBe(201)
      expect(mockRequirePermission).toHaveBeenCalledWith('canCreateExpenseAccount')
    })

    it('should deny creation without canCreateExpenseAccount permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Permission denied'))

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'New Sibling',
          }),
        }
      )

      const response = await POST(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toContain('Permission denied')
    })
  })

  describe('POST /api/expense-account/[accountId]/merge - Permission Enforcement', () => {
    it('should allow merge with canMergeSiblingAccounts permission', async () => {
      mockRequirePermission.mockResolvedValue(true)
      ;(prisma.expenseAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(siblingAccount)
        .mockResolvedValueOnce(parentAccount)
      ;(prisma.expenseAccountTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          expenseAccount: {
            update: jest.fn().mockResolvedValue(parentAccount),
            delete: jest.fn().mockResolvedValue(siblingAccount),
          },
        })
      })

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            targetAccountId: parentAccount.id,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: siblingAccount.id } })
      expect(response.status).toBe(200)
      expect(mockRequirePermission).toHaveBeenCalledWith('canMergeSiblingAccounts')
    })

    it('should deny merge without canMergeSiblingAccounts permission', async () => {
      mockRequirePermission.mockRejectedValue(new Error('Permission denied'))

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            targetAccountId: parentAccount.id,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: siblingAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toContain('Permission denied')
    })

    it('should allow merge for admin users even without explicit permission', async () => {
      // Admin users bypass permission checks
      mockRequireAdmin.mockResolvedValue(true)
      mockRequirePermission.mockRejectedValue(new Error('Permission denied'))

      ;(prisma.expenseAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(siblingAccount)
        .mockResolvedValueOnce(parentAccount)
      ;(prisma.expenseAccountTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          expenseAccount: {
            update: jest.fn().mockResolvedValue(parentAccount),
            delete: jest.fn().mockResolvedValue(siblingAccount),
          },
        })
      })

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            targetAccountId: parentAccount.id,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: siblingAccount.id } })
      expect(response.status).toBe(200)
      // Admin bypass should be checked
      expect(mockRequireAdmin).toHaveBeenCalled()
    })
  })

  describe('Role-based Permission Scenarios', () => {
    it('should allow basic user to view siblings but not merge', async () => {
      // Basic user permissions
      mockRequirePermission
        .mockResolvedValueOnce(true) // canAccessExpenseAccount
        .mockRejectedValueOnce(new Error('Permission denied')) // canMergeSiblingAccounts

      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccount.findMany as jest.Mock).mockResolvedValue([siblingAccount])

      // GET siblings should work
      const getRequest = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        { method: 'GET' }
      )
      const getResponse = await GET(getRequest, { params: { accountId: parentAccount.id } })
      expect(getResponse.status).toBe(200)

      // POST merge should fail
      const mergeRequest = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            targetAccountId: parentAccount.id,
          }),
        }
      )
      const mergeResponse = await mergePOST(mergeRequest, { params: { accountId: siblingAccount.id } })
      expect(mergeResponse.status).toBe(403)
    })

    it('should allow accountant role full sibling access', async () => {
      // Accountant permissions
      mockRequirePermission.mockResolvedValue(true) // All permissions granted

      ;(prisma.expenseAccount.findUnique as jest.Mock)
        .mockResolvedValueOnce(parentAccount)
        .mockResolvedValueOnce([])
      ;(prisma.expenseAccount.create as jest.Mock).mockResolvedValue(siblingAccount)

      // POST create sibling should work
      const createRequest = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Accountant Created Sibling',
          }),
        }
      )
      const createResponse = await POST(createRequest, { params: { accountId: parentAccount.id } })
      expect(createResponse.status).toBe(201)
    })

    it('should restrict manager role from merging siblings', async () => {
      // Manager permissions - can create and view but not merge
      mockRequirePermission
        .mockResolvedValueOnce(true) // canCreateExpenseAccount
        .mockRejectedValueOnce(new Error('Permission denied')) // canMergeSiblingAccounts

      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccount.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.expenseAccount.create as jest.Mock).mockResolvedValue(siblingAccount)

      // POST create should work
      const createRequest = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Manager Created Sibling',
          }),
        }
      )
      const createResponse = await POST(createRequest, { params: { accountId: parentAccount.id } })
      expect(createResponse.status).toBe(201)

      // POST merge should fail
      const mergeRequest = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            targetAccountId: parentAccount.id,
          }),
        }
      )
      const mergeResponse = await mergePOST(mergeRequest, { params: { accountId: siblingAccount.id } })
      expect(mergeResponse.status).toBe(403)
    })
  })

  describe('Business Context Isolation', () => {
    it('should only allow access to accounts within user business', async () => {
      // User tries to access account from different business
      const otherBusinessAccount = {
        ...parentAccount,
        businessId: 'other_business_123',
      }

      mockRequirePermission.mockResolvedValue(true)
      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(otherBusinessAccount)

      const request = new NextRequest(
        new URL(`http://localhost:3000/api/expense-account/${otherBusinessAccount.id}/sibling`),
        { method: 'GET' }
      )

      // This should either return 404 or 403 depending on implementation
      // The key is that business isolation is enforced
      const response = await GET(request, { params: { accountId: otherBusinessAccount.id } })
      expect([403, 404]).toContain(response.status)
    })
  })
})