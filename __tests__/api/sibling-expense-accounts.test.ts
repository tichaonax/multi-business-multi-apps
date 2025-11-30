// @ts-nocheck

/**
 * @jest-environment node
 */

// Avoid importing next/server to prevent runtime Request imports during module evaluation
import { createTestUser, createTestBusiness, createTestExpenseAccount } from '../helpers/test-helpers'

// Mock the auth utilities
jest.mock('@/lib/auth-utils', () => ({
  getCurrentUser: jest.fn(),
  requirePermission: jest.fn(),
  requireAdmin: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    // Provide both plural and singular property names to match both client usage and legacy tests
    expenseAccounts: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expenseAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    expenseAccountTransaction: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    expenseAccountTransactions: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    expenseAccountDeposits: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    expenseAccountPayments: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

// Avoid loading ESM-only or heavy auth modules during unit tests by mocking auth exports
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock next/server as we don't have web platform globals in Jest by default
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: { json: (body: any, options?: any) => ({ status: options?.status || 200, json: async () => body }) },
}))

jest.mock('@/lib/permission-utils', () => ({
  getEffectivePermissions: jest.fn(),
}))

const mockGetCurrentUser = require('@/lib/auth-utils').getCurrentUser
const mockRequirePermission = require('@/lib/auth-utils').requirePermission
const mockRequireAdmin = require('@/lib/auth-utils').requireAdmin
const { prisma } = require('@/lib/prisma')
const { GET, POST } = require('@/app/api/expense-account/[accountId]/sibling/route')
const { POST: mergePOST } = require('@/app/api/expense-account/[accountId]/merge/route')

// Helper to build Request-like objects for Next.js route tests
function makeRequest(url: string | URL, methodOrOpts: any = 'GET', body: any = null) {
  let method = 'GET'
  let requestBody = body

  if (typeof methodOrOpts === 'string') {
    method = methodOrOpts
  } else if (methodOrOpts && typeof methodOrOpts === 'object') {
    method = methodOrOpts.method || 'GET'
    requestBody = methodOrOpts.body !== undefined ? methodOrOpts.body : requestBody
  }

  // If URL object passed, convert to string
  const urlStr = typeof url === 'string' ? url : url.toString()

  return {
    method,
    url: urlStr,
    json: async () => {
      if (typeof requestBody === 'string') {
        try {
          return JSON.parse(requestBody)
        } catch (e) {
          return requestBody
        }
      }
      return requestBody
    },
  } as any
}

describe('/api/expense-account/[accountId]/sibling', () => {
  let testUser: any
  let testBusiness: any
  let parentAccount: any

  beforeEach(async () => {
    // Reset mock call counters only; keep mock implementations defined by jest.mock above
    jest.clearAllMocks()

    // Create test data
    testUser = await createTestUser()
    testBusiness = await createTestBusiness(testUser.id)
    parentAccount = await createTestExpenseAccount(testBusiness.id)

    // Mock auth
    mockGetCurrentUser.mockResolvedValue(testUser)
    mockRequirePermission.mockResolvedValue(true)
    // Ensure server session returns our test user
    const mockGetServerSession = require('next-auth').getServerSession
    mockGetServerSession.mockResolvedValue({ user: testUser })
    // Ensure getEffectivePermissions returns expected permission flags
    const mockGetEffectivePermissions = require('@/lib/permission-utils').getEffectivePermissions
    mockGetEffectivePermissions.mockReturnValue({ canAccessExpenseAccount: true, canCreateSiblingAccounts: true })
  })

  describe('GET /api/expense-account/[accountId]/sibling', () => {
    it('should return sibling accounts for valid parent account', async () => {
      const siblingAccounts = [
        {
          id: 'sib_1',
          accountNumber: 'EXP-001-1',
          name: 'Sibling Account 1',
          parentAccountId: parentAccount.id,
          isSibling: true,
          balance: 100.00,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sib_2',
          accountNumber: 'EXP-001-2',
          name: 'Sibling Account 2',
          parentAccountId: parentAccount.id,
          isSibling: true,
          balance: 200.00,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

        ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(parentAccount)
        ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue(siblingAccounts)

      const request = makeRequest(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`, 'GET')

      const response = await GET(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.siblingAccounts).toHaveLength(2)
      expect(result.data.siblingAccounts[0].accountNumber).toBe('EXP-001-1')
      expect(result.data.siblingAccounts[1].accountNumber).toBe('EXP-001-2')
    })

    it('should return empty array when no sibling accounts exist', async () => {
      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccount.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue([])

      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        { method: 'GET' }
      )

      const response = await GET(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.siblingAccounts).toEqual([])
    })

    it('should return 404 for non-existent parent account', async () => {
      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue([])

      const request = makeRequest(
        new URL('http://localhost:3000/api/expense-account/non-existent/sibling'),
        { method: 'GET' }
      )

      const response = await GET(request, { params: { accountId: 'non-existent' } })
      const result = await response.json()

      // GET returns an empty list (no 404) if parent doesn't exist
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.siblingAccounts).toEqual([])
    })

    it('should return 403 when user lacks permission', async () => {
      const mockGetEffectivePermissions = require('@/lib/permission-utils').getEffectivePermissions
      mockGetEffectivePermissions.mockReturnValue({ canAccessExpenseAccount: false })

      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        { method: 'GET' }
      )

      const response = await GET(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('You do not have permission')
    })
  })

  describe('POST /api/expense-account/[accountId]/sibling', () => {
    it('should create a new sibling account successfully', async () => {
      const newSiblingAccount = {
        id: 'sib_new',
        accountNumber: 'EXP-001-1',
        accountName: 'New Sibling Account',
        name: 'New Sibling Account',
        parentAccountId: parentAccount.id,
        isSibling: true,
        balance: 0.00,
        businessId: testBusiness.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccount.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.expenseAccount.create as jest.Mock).mockResolvedValue(newSiblingAccount)
      ;(prisma.expenseAccount.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.create as jest.Mock).mockResolvedValue(newSiblingAccount)

      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'New Sibling Account',
            description: 'Test sibling account',
          }),
        }
      )

      const response = await POST(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.success).toBe(true)
      expect(result.data.siblingAccount.accountNumber).toBe('EXP-001-1')
      expect(result.data.siblingAccount.accountName).toBe('New Sibling Account')
      expect(result.data.siblingAccount.isSibling).toBe(true)
    })

    it('should generate correct sibling account number', async () => {
      const existingSiblings = [
        { accountNumber: 'EXP-001-1' },
        { accountNumber: 'EXP-001-2' },
      ]

      const newSiblingAccount = {
        id: 'sib_new',
        accountNumber: 'EXP-001-3',
        name: 'Third Sibling Account',
        parentAccountId: parentAccount.id,
        isSibling: true,
        balance: 0.00,
        businessId: testBusiness.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(parentAccount)
      ;(prisma.expenseAccount.findMany as jest.Mock).mockResolvedValue(existingSiblings)
      ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue(existingSiblings)
      ;(prisma.expenseAccounts.findFirst as jest.Mock).mockResolvedValue({ siblingNumber: 2 })
      ;(prisma.expenseAccount.findFirst as jest.Mock).mockResolvedValue({ siblingNumber: 2 })
      ;(prisma.expenseAccount.create as jest.Mock).mockResolvedValue(newSiblingAccount)
      ;(prisma.expenseAccounts.create as jest.Mock).mockResolvedValue(newSiblingAccount)

      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Third Sibling Account',
          }),
        }
      )

      const response = await POST(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(201)
      expect(result.data.siblingAccount.accountNumber).toBe('EXP-001-3')
    })

    it('should return 400 for invalid request data', async () => {
      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/sibling`),
        {
          method: 'POST',
          body: JSON.stringify({
            name: '', // Invalid empty name
          }),
        }
      )

      const response = await POST(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Sibling account name is required')
    })

    it('should return 404 for non-existent parent account', async () => {
      ;(prisma.expenseAccount.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)

      const request = makeRequest(
        new URL('http://localhost:3000/api/expense-account/non-existent/sibling'),
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Sibling',
          }),
        }
      )

      const response = await POST(request, { params: { accountId: 'non-existent' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('Parent account not found')
    })
  })
})

describe('/api/expense-account/[accountId]/merge', () => {
  let testUser: any
  let testBusiness: any
  let parentAccount: any
  let siblingAccount: any

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create test data
    testUser = await createTestUser()
    testBusiness = await createTestBusiness(testUser.id)
    parentAccount = await createTestExpenseAccount(testBusiness.id)
    siblingAccount = {
      ...await createTestExpenseAccount(testBusiness.id),
      parentAccountId: parentAccount.id,
      isSibling: true,
      accountNumber: 'EXP-001-1',
      balance: 0.00,
    }

    // Mock auth
    mockGetCurrentUser.mockResolvedValue(testUser)
    mockRequirePermission.mockResolvedValue(true)
    const mockGetServerSession = require('next-auth').getServerSession
    mockGetServerSession.mockResolvedValue({ user: testUser })
    const mockGetEffectivePermissions = require('@/lib/permission-utils').getEffectivePermissions
    mockGetEffectivePermissions.mockReturnValue({ canMergeSiblingAccounts: true })

    // Mock aggregate functions used in updateExpenseAccountBalance
    ;(prisma.expenseAccountDeposits.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } })
    ;(prisma.expenseAccountPayments.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: 0 } })
  })

  describe('POST /api/expense-account/[accountId]/merge', () => {
    it('should merge sibling account into parent successfully', async () => {
      const mergedAccount = {
        ...parentAccount,
        balance: parentAccount.balance + siblingAccount.balance,
        updatedAt: new Date(),
      }

      ;(prisma.expenseAccount.findUnique as jest.Mock)
      ;(prisma.expenseAccounts.findUnique as jest.Mock)
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockImplementation(({ where }: any) => {
        if (where?.id === siblingAccount.id) return siblingAccount
        if (where?.id === parentAccount.id) return parentAccount
        return null
      })
      ;(prisma.expenseAccountTransaction.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.expenseAccountTransactions.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.expenseAccountTransactions.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback({
          expenseAccountDeposits: {
            updateMany: jest.fn().mockResolvedValue([]),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          expenseAccountPayments: {
            updateMany: jest.fn().mockResolvedValue([]),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          expenseAccounts: {
            update: jest.fn().mockResolvedValue(mergedAccount),
            delete: jest.fn().mockResolvedValue(siblingAccount),
          },
        })
      })

      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            confirmZeroBalance: true,
            confirmIrreversible: true,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: siblingAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.mergedAccountId).toBe(siblingAccount.id)
      expect(result.data.parentAccountId).toBe(parentAccount.id)
    })

    it('should return 400 when trying to merge account with itself', async () => {
      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${parentAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            confirmZeroBalance: true,
            confirmIrreversible: true,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: parentAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Account is not a sibling account')
    })

    it('should allow merging sibling with transactions (transactions are moved to parent)', async () => {
      const transactions = [{ id: 'txn_1', amount: 50.00 }]

      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockImplementation(({ where }: any) => {
        if (where?.id === siblingAccount.id) return siblingAccount
        if (where?.id === parentAccount.id) return parentAccount
        return null
      })
      ;(prisma.expenseAccountTransaction.findMany as jest.Mock).mockResolvedValue(transactions)
      ;(prisma.expenseAccountTransactions.findMany as jest.Mock).mockResolvedValue(transactions)

      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            confirmZeroBalance: true,
            confirmIrreversible: true,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: siblingAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.data.mergedAccountId).toBe(siblingAccount.id)
      expect(result.data.parentAccountId).toBe(parentAccount.id)
    })

    it('should return 404 for non-existent sibling account', async () => {
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)

      const request = makeRequest(
        new URL('http://localhost:3000/api/expense-account/non-existent/merge'),
        {
          method: 'POST',
          body: JSON.stringify({
            confirmZeroBalance: true,
            confirmIrreversible: true,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: 'non-existent' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toContain('Sibling account not found')
    })

    it('should return 404 for non-existent target account', async () => {
      ;(prisma.expenseAccounts.findUnique as jest.Mock).mockImplementation(({ where }: any) => {
        if (where?.id === siblingAccount.id) return siblingAccount
        if (where?.id === parentAccount.id) return null
        return null
      })

      const request = makeRequest(
        new URL(`http://localhost:3000/api/expense-account/${siblingAccount.id}/merge`),
        {
          method: 'POST',
          body: JSON.stringify({
            confirmZeroBalance: true,
            confirmIrreversible: true,
          }),
        }
      )

      const response = await mergePOST(request, { params: { accountId: siblingAccount.id } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toContain('Target account not found')
    })
  })
})