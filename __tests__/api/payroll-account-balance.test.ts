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
  NextResponse: {
    json: function(body: any, options?: any) {
      return {
        status: options?.status || 200,
        json: async () => body
      }
    }
  },
}))

jest.mock('@/lib/permission-utils', () => ({
  getEffectivePermissions: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    payrollAccounts: {
      findFirst: jest.fn(),
    },
    payrollAccountDeposits: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    payrollAccountPayments: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const { getServerSession } = require('next-auth')
const { getEffectivePermissions } = require('@/lib/permission-utils')
const { prisma } = require('@/lib/prisma')

describe('Payroll Account Balance API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return payroll account balance successfully', async () => {
    // Mock authentication
    getServerSession.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' }
    })

    // Mock permissions
    getEffectivePermissions.mockResolvedValue({
      canViewPayrollAccountBalance: true
    })

    // Mock payroll account
    prisma.payrollAccounts.findFirst.mockResolvedValue({
      id: 'payroll-account-id',
      accountNumber: 'PAY-001',
      balance: 1000.00,
    })

    // Mock balance summary
    prisma.payrollAccountDeposits.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 1500 } })
      .mockResolvedValueOnce({ _count: 5 })

    prisma.payrollAccountPayments.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 500 } })
      .mockResolvedValueOnce({ _count: 2 })

    prisma.payrollAccountPayments.count.mockResolvedValue(1)

    // Import the route handler
    const { GET } = require('@/app/api/payroll/account/balance/route')

    // Create mock request
    const mockRequest = {
      url: 'http://localhost:8080/api/payroll/account/balance',
    }

    // Call the handler
    const response = await GET(mockRequest)

    // Check response
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.accountNumber).toBe('PAY-001')
    expect(data.data.currentBalance).toBe(1000)
    expect(data.data.calculatedBalance).toBe(1000) // 1500 - 500
    expect(data.data.totalDeposits).toBe(1500)
    expect(data.data.totalPayments).toBe(500)
    expect(data.data.depositsCount).toBe(5)
    expect(data.data.paymentsCount).toBe(2)
  })
})