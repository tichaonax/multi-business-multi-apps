// @ts-nocheck
/**
 * @jest-environment node
 *
 * Tests for POST /api/expense-account/outgoing-loans/[loanId]/payments
 *
 * Key behaviours under test:
 *  1. BUSINESS loan repayment credits lender's expense account
 *  2. BUSINESS loan repayment debits borrower's expense account
 *  3. PERSON loan repayment only credits lender (no borrower expense account)
 *  4. PAYROLL loan repayment credits payroll account
 *  5. Repayment creates AccountOutgoingLoanPayments record
 *  6. Loan remainingBalance is reduced; status flips to PAID_OFF when fully repaid
 *  7. Over-payment is rejected
 *  8. Repayment on non-ACTIVE loan is rejected
 *  9. Permission check — canManageLending required
 */

jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, options?: any) => ({
      status: options?.status || 200,
      json: async () => body,
    }),
  },
}))
jest.mock('@/lib/permission-utils', () => ({
  getEffectivePermissions: jest.fn(),
}))
jest.mock('@/lib/get-server-user', () => ({
  getServerUser: jest.fn(),
}))

// ─── Prisma mock ────────────────────────────────────────────────────────────
const mockTransactionFn = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    accountOutgoingLoans: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    expenseAccountDeposits: { create: jest.fn() },
    expenseAccountPayments: { create: jest.fn() },
    expenseAccounts: {
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    payrollAccountDeposits: { create: jest.fn() },
    payrollAccounts: { update: jest.fn() },
    accountOutgoingLoanPayments: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const { prisma } = require('@/lib/prisma')
const { POST } = require('@/app/api/expense-account/outgoing-loans/[loanId]/payments/route')
const { getServerUser } = require('@/lib/get-server-user')
const { getEffectivePermissions } = require('@/lib/permission-utils')

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeRequest(body: object) {
  return {
    method: 'POST',
    url: 'http://localhost/api/expense-account/outgoing-loans/loan_1/payments',
    json: async () => body,
  } as any
}

const ADMIN_USER = { id: 'user_admin', name: 'Admin', role: 'admin' }
const MANAGER_USER = { id: 'user_mgr', name: 'Manager', role: 'USER' }

const BASE_BUSINESS_LOAN = {
  id: 'loan_1',
  loanNumber: 'OL-2026-001',
  loanType: 'BUSINESS',
  expenseAccountId: 'acct_lender',
  payrollAccountId: null,
  recipientBusinessId: 'biz_borrower',
  recipientPersonId: null,
  recipientEmployeeId: null,
  principalAmount: 5,
  remainingBalance: 5,
  status: 'ACTIVE',
  recipientPerson: null,
  recipientBusiness: { name: 'Mvimvi Groceries' },
  recipientEmployee: null,
  payrollAccount: null,
}

const PARAMS = { params: { loanId: 'loan_1' } }

// ─── Setup ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks()

  // Default: admin user with canManageLending
  getServerUser.mockResolvedValue(ADMIN_USER)
  getEffectivePermissions.mockReturnValue({ canManageLending: true })

  // Default loan
  prisma.accountOutgoingLoans.findUnique.mockResolvedValue(BASE_BUSINESS_LOAN)

  // $transaction executes the callback immediately with the tx mock
  prisma.$transaction.mockImplementation(async (fn: any) => {
    const tx = {
      expenseAccountDeposits: prisma.expenseAccountDeposits,
      expenseAccountPayments: prisma.expenseAccountPayments,
      expenseAccounts: prisma.expenseAccounts,
      payrollAccountDeposits: prisma.payrollAccountDeposits,
      payrollAccounts: prisma.payrollAccounts,
      accountOutgoingLoanPayments: prisma.accountOutgoingLoanPayments,
      accountOutgoingLoans: prisma.accountOutgoingLoans,
    }
    return fn(tx)
  })

  // Default mock return values for db writes
  prisma.expenseAccountDeposits.create.mockResolvedValue({ id: 'dep_1' })
  prisma.expenseAccountPayments.create.mockResolvedValue({ id: 'pay_1' })
  prisma.expenseAccounts.update.mockResolvedValue({})
  prisma.expenseAccounts.findFirst.mockResolvedValue({ id: 'acct_borrower' })
  prisma.accountOutgoingLoanPayments.create.mockResolvedValue({ id: 'olp_1' })
  prisma.accountOutgoingLoans.update.mockResolvedValue({})
})

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('POST /api/expense-account/outgoing-loans/[loanId]/payments', () => {

  // ── Auth & permission ──────────────────────────────────────────────────────
  describe('authentication and authorisation', () => {
    it('returns 401 when no user session', async () => {
      getServerUser.mockResolvedValue(null)
      const res = await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toMatch(/unauthorized/i)
    })

    it('returns 403 when user lacks canManageLending', async () => {
      getServerUser.mockResolvedValue(MANAGER_USER)
      getEffectivePermissions.mockReturnValue({ canManageLending: false })
      const res = await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(403)
    })

    it('allows non-admin user with canManageLending', async () => {
      getServerUser.mockResolvedValue(MANAGER_USER)
      getEffectivePermissions.mockReturnValue({ canManageLending: true })
      const res = await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(200)
    })
  })

  // ── Validation ─────────────────────────────────────────────────────────────
  describe('input validation', () => {
    it('returns 400 when amount is missing', async () => {
      const res = await POST(makeRequest({ paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/amount/i)
    })

    it('returns 400 when amount is zero', async () => {
      const res = await POST(makeRequest({ amount: 0, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(400)
    })

    it('returns 400 when paymentDate is missing', async () => {
      const res = await POST(makeRequest({ amount: 1 }), PARAMS)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/paymentDate/i)
    })

    it('returns 404 when loan does not exist', async () => {
      prisma.accountOutgoingLoans.findUnique.mockResolvedValue(null)
      const res = await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(404)
    })

    it('returns 400 when repayment exceeds remaining balance', async () => {
      prisma.accountOutgoingLoans.findUnique.mockResolvedValue({
        ...BASE_BUSINESS_LOAN,
        remainingBalance: 2,
      })
      const res = await POST(makeRequest({ amount: 5, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/exceeds/i)
    })

    it('returns 400 when loan status is not ACTIVE', async () => {
      prisma.accountOutgoingLoans.findUnique.mockResolvedValue({
        ...BASE_BUSINESS_LOAN,
        status: 'PAID_OFF',
      })
      const res = await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/status/i)
    })
  })

  // ── BUSINESS loan repayment ────────────────────────────────────────────────
  describe('BUSINESS loan repayment', () => {
    it('creates a deposit to credit the lender expense account', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.expenseAccountDeposits.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseAccountId: 'acct_lender',
            sourceType: 'LOAN_REPAYMENT',
            amount: 1,
          }),
        })
      )
    })

    it('increments lender account balance', async () => {
      await POST(makeRequest({ amount: 1.50, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.expenseAccounts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acct_lender' },
          data: { balance: { increment: 1.50 } },
        })
      )
    })

    it('looks up borrower primary expense account by recipientBusinessId', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.expenseAccounts.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: 'biz_borrower',
            isActive: true,
            isSibling: false,
          }),
        })
      )
    })

    it('creates a LOAN_REPAYMENT payment to debit the borrower expense account', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.expenseAccountPayments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseAccountId: 'acct_borrower',
            paymentType: 'LOAN_REPAYMENT',
            amount: 1,
          }),
        })
      )
    })

    it('decrements borrower account balance', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.expenseAccounts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acct_borrower' },
          data: { balance: { decrement: 1 } },
        })
      )
    })

    it('does NOT debit borrower account when no primary account is found', async () => {
      prisma.expenseAccounts.findFirst.mockResolvedValue(null)

      const res = await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(200) // repayment still succeeds

      // Payment create for borrower should not have been called
      expect(prisma.expenseAccountPayments.create).not.toHaveBeenCalled()
      // Lender deposit still created
      expect(prisma.expenseAccountDeposits.create).toHaveBeenCalled()
    })

    it('creates AccountOutgoingLoanPayments record', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20', notes: 'test note' }), PARAMS)

      expect(prisma.accountOutgoingLoanPayments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            loanId: 'loan_1',
            amount: 1,
            notes: 'test note',
          }),
        })
      )
    })

    it('reduces the loan remainingBalance', async () => {
      await POST(makeRequest({ amount: 2, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.accountOutgoingLoans.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'loan_1' },
          data: expect.objectContaining({
            remainingBalance: 3, // 5 - 2
            status: 'ACTIVE',
          }),
        })
      )
    })

    it('marks loan as PAID_OFF when fully repaid', async () => {
      await POST(makeRequest({ amount: 5, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.accountOutgoingLoans.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            remainingBalance: 0,
            status: 'PAID_OFF',
          }),
        })
      )

      const body = await (await POST(makeRequest({ amount: 5, paymentDate: '2026-02-20' }), PARAMS)).json()
      expect(body.data.status).toBe('PAID_OFF')
    })

    it('returns success response with updated remainingBalance', async () => {
      const res = await POST(makeRequest({ amount: 2, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.success).toBe(true)
      expect(body.data.remainingBalance).toBe(3)
    })
  })

  // ── PERSON loan repayment ──────────────────────────────────────────────────
  describe('PERSON loan repayment', () => {
    const PERSON_LOAN = {
      ...BASE_BUSINESS_LOAN,
      loanType: 'PERSON',
      recipientBusinessId: null,
      recipientPersonId: 'person_1',
      recipientBusiness: null,
      recipientPerson: { fullName: 'John Doe' },
    }

    beforeEach(() => {
      prisma.accountOutgoingLoans.findUnique.mockResolvedValue(PERSON_LOAN)
    })

    it('credits the lender expense account', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.expenseAccountDeposits.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseAccountId: 'acct_lender',
            sourceType: 'LOAN_REPAYMENT',
          }),
        })
      )
    })

    it('does NOT look up or debit a borrower expense account', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      // PERSON loans have no recipientBusinessId, so no expense account lookup
      expect(prisma.expenseAccounts.findFirst).not.toHaveBeenCalled()
      expect(prisma.expenseAccountPayments.create).not.toHaveBeenCalled()
    })
  })

  // ── PAYROLL (EMPLOYEE) loan repayment ─────────────────────────────────────
  describe('EMPLOYEE (payroll) loan repayment', () => {
    const EMPLOYEE_LOAN = {
      ...BASE_BUSINESS_LOAN,
      loanType: 'EMPLOYEE',
      expenseAccountId: null,
      payrollAccountId: 'payroll_1',
      recipientBusinessId: null,
      recipientBusiness: null,
      recipientEmployee: { fullName: 'Jane Smith' },
      payrollAccount: { id: 'payroll_1', businessId: 'biz_1' },
    }

    beforeEach(() => {
      prisma.accountOutgoingLoans.findUnique.mockResolvedValue(EMPLOYEE_LOAN)
      prisma.payrollAccountDeposits.create.mockResolvedValue({ id: 'pd_1' })
      prisma.payrollAccounts.update.mockResolvedValue({})
    })

    it('credits the payroll account, not an expense account', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.payrollAccountDeposits.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payrollAccountId: 'payroll_1',
            transactionType: 'LOAN_REPAYMENT',
            amount: 1,
          }),
        })
      )
      expect(prisma.payrollAccounts.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payroll_1' },
          data: expect.objectContaining({ balance: { increment: 1 } }),
        })
      )
    })

    it('does NOT touch any expense account', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.expenseAccountDeposits.create).not.toHaveBeenCalled()
      expect(prisma.expenseAccountPayments.create).not.toHaveBeenCalled()
      expect(prisma.expenseAccounts.update).not.toHaveBeenCalled()
    })
  })

  // ── Edge cases ─────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('allows repayment of exactly the remaining balance (full repayment)', async () => {
      prisma.accountOutgoingLoans.findUnique.mockResolvedValue({
        ...BASE_BUSINESS_LOAN,
        remainingBalance: 2.97,
      })
      const res = await POST(makeRequest({ amount: 2.97, paymentDate: '2026-02-20' }), PARAMS)
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.data.status).toBe('PAID_OFF')
      expect(body.data.remainingBalance).toBe(0)
    })

    it('uses CASH as default paymentMethod when not supplied', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20' }), PARAMS)

      expect(prisma.accountOutgoingLoanPayments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentMethod: 'CASH' }),
        })
      )
    })

    it('stores supplied paymentMethod on the repayment record', async () => {
      await POST(makeRequest({ amount: 1, paymentDate: '2026-02-20', paymentMethod: 'BANK_TRANSFER' }), PARAMS)

      expect(prisma.accountOutgoingLoanPayments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentMethod: 'BANK_TRANSFER' }),
        })
      )
    })
  })
})
