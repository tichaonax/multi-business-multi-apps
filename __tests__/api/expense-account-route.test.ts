// @ts-nocheck

/**
 * @jest-environment node
 */

// Node environment may include web platform Request/Response - set to global if available
if (typeof globalThis.Request !== 'undefined') {
  global.Request = globalThis.Request
  global.Response = globalThis.Response
  global.Headers = globalThis.Headers
}

// NextRequest is used to craft request objects for Next.js route tests. Use runtime require after polyfills.
// Avoid importing `next/server` directly due to environment server import hoisting and Request polyfill issues.
// Use a minimal Request-like object for API route handlers in tests.
import { createTestUser } from '../helpers/test-helpers'

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock next/server to avoid web Request imports that Node/Jest don't provide by default
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: { json: (body: any, options?: any) => ({
    status: options?.status || 200,
    json: async () => body
  }) },
}))

jest.mock('@/lib/permission-utils', () => ({
  getEffectivePermissions: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    expenseAccounts: {
      findMany: jest.fn(),
    },
    expenseAccountDeposits: {
      groupBy: jest.fn(),
    },
    expenseAccountPayments: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

const { prisma } = require('@/lib/prisma')
const { GET } = require('@/app/api/expense-account/route')

describe('GET /api/expense-account', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns depositsTotal and paymentsTotal per account', async () => {
    const testUser = await createTestUser()
    const mockGetServerSession = require('next-auth').getServerSession
    mockGetServerSession.mockResolvedValue({ user: testUser })
    const mockGetEffectivePermissions = require('@/lib/permission-utils').getEffectivePermissions
    mockGetEffectivePermissions.mockReturnValue({ canAccessExpenseAccount: true })

    const accounts = [
      {
        id: 'acct_1',
        accountNumber: 'EXP-001',
        accountName: 'Office Supplies',
        balance: 1000,
        description: 'Test account',
        isActive: true,
        lowBalanceThreshold: 500,
        parentAccountId: null,
        siblingNumber: null,
        isSibling: false,
        canMerge: true,
        createdBy: 'user_1',
        createdAt: new Date(),
        updatedAt: new Date(),
        creator: { id: 'user_1', name: 'Test', email: 'test@example.com' },
      },
    ]

    ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue(accounts)

    // Group by results
    ;(prisma.expenseAccountDeposits.groupBy as jest.Mock).mockResolvedValue([
      { expenseAccountId: 'acct_1', _sum: { amount: 1000 } },
    ])
    ;(prisma.expenseAccountPayments.groupBy as jest.Mock).mockResolvedValue([
      { expenseAccountId: 'acct_1', _sum: { amount: 300 }, _max: { amount: 300 } },
    ])
    ;(prisma.expenseAccountPayments.findMany as jest.Mock) = jest.fn().mockResolvedValue([
      {
        id: 'pay_1',
        expenseAccountId: 'acct_1',
        amount: 300,
        paymentDate: new Date().toISOString(),
        payeeUser: { name: 'Vendor A' },
      },
    ])

    const request = { method: 'GET', url: 'http://localhost:3000/api/expense-account' } as any
    const response = await GET(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.data.accounts).toHaveLength(1)
    expect(result.data.accounts[0].depositsTotal).toBe(1000)
    expect(result.data.accounts[0].paymentsTotal).toBe(300)
    expect(result.data.accounts[0].largestPayment).toBe(300)
    expect(result.data.accounts[0].largestPaymentPayee).toBe('Vendor A')
    expect(result.data.accounts[0].largestPaymentId).toBe('pay_1')
  })
})
