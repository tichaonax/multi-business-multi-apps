// @ts-nocheck

/**
 * Expense Account Utilities Tests
 *
 * Tests for expense account utility functions including validations and formatting.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  validateDepositAmount,
  validatePaymentAmount,
  checkLowBalance,
  formatCurrency,
  generateNextSiblingNumber,
  createSiblingAccount,
  getSiblingAccounts,
  validateSiblingAccountForMerge,
  mergeSiblingAccount,
  hasActiveSiblings,
  getNextSiblingAccountNumber,
} from '@/lib/expense-account-utils'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    expenseAccounts: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    expenseAccountDeposits: {
      updateMany: jest.fn(),
    },
    expenseAccountPayments: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import { prisma } from '@/lib/prisma'

describe('validateDepositAmount', () => {
  it('should reject negative amounts', () => {
    const result = validateDepositAmount(-100)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('greater than 0')
  })

  it('should reject zero amount', () => {
    const result = validateDepositAmount(0)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('greater than 0')
  })

  it('should accept valid amount', () => {
    const result = validateDepositAmount(100.50)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject amounts exceeding maximum', () => {
    const result = validateDepositAmount(1000000000)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('exceeds maximum')
  })

  it('should reject more than 2 decimal places', () => {
    const result = validateDepositAmount(100.123)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('2 decimal places')
  })

  it('should accept exactly 2 decimal places', () => {
    const result = validateDepositAmount(100.99)
    expect(result.valid).toBe(true)
  })

  it('should accept 1 decimal place', () => {
    const result = validateDepositAmount(100.5)
    expect(result.valid).toBe(true)
  })

  it('should accept whole numbers', () => {
    const result = validateDepositAmount(100)
    expect(result.valid).toBe(true)
  })
})

describe('validatePaymentAmount', () => {
  it('should reject amount greater than available balance', () => {
    const result = validatePaymentAmount(1000, 500)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Insufficient balance')
  })

  it('should accept amount equal to available balance', () => {
    const result = validatePaymentAmount(500, 500)
    expect(result.valid).toBe(true)
  })

  it('should accept amount less than available balance', () => {
    const result = validatePaymentAmount(300, 500)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid amounts (inherits from validateDepositAmount)', () => {
    const result = validatePaymentAmount(-100, 500)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('greater than 0')
  })

  it('should reject amounts with more than 2 decimal places', () => {
    const result = validatePaymentAmount(100.123, 500)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('2 decimal places')
  })
})

describe('checkLowBalance', () => {
  it('should return true when balance is below threshold', () => {
    expect(checkLowBalance(400, 500)).toBe(true)
  })

  it('should return false when balance equals threshold', () => {
    expect(checkLowBalance(500, 500)).toBe(false)
  })

  it('should return false when balance is above threshold', () => {
    expect(checkLowBalance(600, 500)).toBe(false)
  })

  it('should handle zero balance', () => {
    expect(checkLowBalance(0, 500)).toBe(true)
  })

  it('should handle zero threshold', () => {
    expect(checkLowBalance(100, 0)).toBe(false)
  })
})

describe('formatCurrency', () => {
  it('should format whole numbers', () => {
    expect(formatCurrency(100)).toBe('$100.00')
  })

  it('should format decimal numbers', () => {
    expect(formatCurrency(123.45)).toBe('$123.45')
  })

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
  })

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('should format negative numbers', () => {
    expect(formatCurrency(-50.25)).toBe('-$50.25')
  })

  it('should always show 2 decimal places', () => {
    expect(formatCurrency(100.5)).toBe('$100.50')
  })
})

describe('Expense Account Utils - Exports', () => {
  it('should export all required functions', () => {
    const utils = require('@/lib/expense-account-utils')

    // Balance functions
    expect(utils.calculateExpenseAccountBalance).toBeDefined()
    expect(utils.updateExpenseAccountBalance).toBeDefined()
    expect(utils.getExpenseAccountBalanceSummary).toBeDefined()

    // Validation functions
    expect(utils.validateDepositAmount).toBeDefined()
    expect(utils.validatePaymentAmount).toBeDefined()
    expect(utils.checkLowBalance).toBeDefined()
    expect(utils.validateBatchPaymentTotal).toBeDefined()

    // Business account functions
    expect(utils.checkBusinessAccountBalance).toBeDefined()
    expect(utils.debitBusinessAccount).toBeDefined()

    // Helper functions
    expect(utils.generateAccountNumber).toBeDefined()
    expect(utils.generateDepositNote).toBeDefined()
    expect(utils.formatCurrency).toBeDefined()

    // Query functions
    expect(utils.getRecentDeposits).toBeDefined()
    expect(utils.getRecentPayments).toBeDefined()
    expect(utils.getExpenseAccountStats).toBeDefined()
    expect(utils.isExpenseAccountActive).toBeDefined()
    expect(utils.getActiveExpenseAccounts).toBeDefined()
    expect(utils.getExpenseAccountsWithLowBalance).toBeDefined()
  })

  it('should have correct function types', () => {
    const utils = require('@/lib/expense-account-utils')

    expect(typeof utils.validateDepositAmount).toBe('function')
    expect(typeof utils.validatePaymentAmount).toBe('function')
    expect(typeof utils.checkLowBalance).toBe('function')
    expect(typeof utils.formatCurrency).toBe('function')
  })
})

// Note: Database-dependent functions (calculateExpenseAccountBalance, updateExpenseAccountBalance,
// getExpenseAccountBalanceSummary, etc.) require integration testing with a test database.
// These are tested via API endpoint tests and integration tests.

// ============================================================================
// SIBLING ACCOUNT UTILITIES TESTS
// ============================================================================

describe('generateNextSiblingNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 1 when no siblings exist', async () => {
    ;(prisma.expenseAccounts.findFirst as jest.Mock).mockResolvedValue(null)

    const result = await generateNextSiblingNumber('parent-123')
    expect(result).toBe(1)
    expect(prisma.expenseAccounts.findFirst).toHaveBeenCalledWith({
      where: { parentAccountId: 'parent-123' },
      select: { siblingNumber: true },
      orderBy: { siblingNumber: 'desc' },
    })
  })

  it('should return next number when siblings exist', async () => {
    ;(prisma.expenseAccounts.findFirst as jest.Mock).mockResolvedValue({
      siblingNumber: 3,
    })

    const result = await generateNextSiblingNumber('parent-123')
    expect(result).toBe(4)
  })

  it('should handle zero sibling number', async () => {
    ;(prisma.expenseAccounts.findFirst as jest.Mock).mockResolvedValue({
      siblingNumber: 0,
    })

    const result = await generateNextSiblingNumber('parent-123')
    expect(result).toBe(1)
  })
})

describe('createSiblingAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a sibling account successfully', async () => {
    const mockParentAccount = {
      id: 'parent-123',
      isSibling: false,
      accountNumber: 'ACC-001',
    }

    const mockSiblingAccount = {
      id: 'sibling-456',
      accountNumber: 'ACC-001-01',
      accountName: 'Historical Data',
      balance: 0,
      isSibling: true,
      canMerge: true,
      parentAccountId: 'parent-123',
      siblingNumber: 1,
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockParentAccount) // Parent check
      .mockResolvedValueOnce(null) // No existing siblings

    ;(prisma.expenseAccounts.create as jest.Mock).mockResolvedValue(mockSiblingAccount)

    const result = await createSiblingAccount(
      'parent-123',
      {
        name: 'Historical Data',
        description: 'For entering historical expenses',
        lowBalanceThreshold: 100,
      },
      'user-789'
    )

    expect(result).toEqual(mockSiblingAccount)
    expect(prisma.expenseAccounts.create).toHaveBeenCalledWith({
      data: {
        accountNumber: 'ACC-001-01',
        accountName: 'Historical Data',
        description: 'For entering historical expenses',
        lowBalanceThreshold: 100,
        balance: 0,
        isActive: true,
        isSibling: true,
        canMerge: true,
        parentAccountId: 'parent-123',
        siblingNumber: 1,
        createdBy: 'user-789',
      },
    })
  })

  it('should throw error when parent account not found', async () => {
    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)

    await expect(
      createSiblingAccount('nonexistent', { name: 'Test' }, 'user-123')
    ).rejects.toThrow('Parent account not found')
  })

  it('should throw error when trying to create sibling from sibling', async () => {
    const mockSiblingParent = {
      id: 'sibling-123',
      isSibling: true,
      accountNumber: 'ACC-001-01',
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockSiblingParent)

    await expect(
      createSiblingAccount('sibling-123', { name: 'Test' }, 'user-123')
    ).rejects.toThrow('Cannot create sibling account from another sibling account')
  })

  it('should generate correct sibling account number', async () => {
    const mockParentAccount = {
      id: 'parent-123',
      isSibling: false,
      accountNumber: 'MAIN-001',
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockParentAccount)
    ;(prisma.expenseAccounts.findFirst as jest.Mock).mockResolvedValue({ siblingNumber: 2 })

    ;(prisma.expenseAccounts.create as jest.Mock).mockResolvedValue({
      id: 'sibling-456',
      accountNumber: 'MAIN-001-03',
    })

    await createSiblingAccount('parent-123', { name: 'Test' }, 'user-123')

    expect(prisma.expenseAccounts.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accountNumber: 'MAIN-001-03',
        siblingNumber: 3,
      }),
    })
  })
})

describe('validateSiblingAccountForMerge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should validate successfully for mergeable sibling with zero balance', async () => {
    const mockAccount = {
      id: 'sibling-123',
      isSibling: true,
      canMerge: true,
      balance: 0,
      parentAccountId: 'parent-456',
      accountName: 'Historical Data',
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockAccount)

    const result = await validateSiblingAccountForMerge('sibling-123')

    expect(result.canMerge).toBe(true)
    expect(result.account).toEqual(mockAccount)
  })

  it('should reject non-zero balance accounts', async () => {
    const mockAccount = {
      id: 'sibling-123',
      isSibling: true,
      canMerge: true,
      balance: 150.75,
      parentAccountId: 'parent-456',
      accountName: 'Historical Data',
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockAccount)

    const result = await validateSiblingAccountForMerge('sibling-123')

    expect(result.canMerge).toBe(false)
    expect(result.error).toContain('non-zero balance')
    expect(result.error).toContain('$150.75')
  })

  it('should reject non-sibling accounts', async () => {
    const mockAccount = {
      id: 'regular-123',
      isSibling: false,
      canMerge: true,
      balance: 0,
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockAccount)

    const result = await validateSiblingAccountForMerge('regular-123')

    expect(result.canMerge).toBe(false)
    expect(result.error).toBe('Account is not a sibling account')
  })

  it('should reject accounts not eligible for merging', async () => {
    const mockAccount = {
      id: 'sibling-123',
      isSibling: true,
      canMerge: false,
      balance: 0,
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockAccount)

    const result = await validateSiblingAccountForMerge('sibling-123')

    expect(result.canMerge).toBe(false)
    expect(result.error).toBe('Account is not eligible for merging')
  })

  it('should reject non-existent accounts', async () => {
    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)

    const result = await validateSiblingAccountForMerge('nonexistent')

    expect(result.canMerge).toBe(false)
    expect(result.error).toBe('Sibling account not found')
  })
})

describe('hasActiveSiblings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return true when active siblings exist', async () => {
    ;(prisma.expenseAccounts.count as jest.Mock).mockResolvedValue(2)

    const result = await hasActiveSiblings('parent-123')
    expect(result).toBe(true)
    expect(prisma.expenseAccounts.count).toHaveBeenCalledWith({
      where: {
        parentAccountId: 'parent-123',
        isSibling: true,
        isActive: true,
      },
    })
  })

  it('should return false when no active siblings exist', async () => {
    ;(prisma.expenseAccounts.count as jest.Mock).mockResolvedValue(0)

    const result = await hasActiveSiblings('parent-123')
    expect(result).toBe(false)
  })
})

describe('getNextSiblingAccountNumber', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should generate correct sibling account number', async () => {
    const mockParentAccount = {
      accountNumber: 'MAIN-001',
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockParentAccount)
    ;(prisma.expenseAccounts.findFirst as jest.Mock).mockResolvedValue({ siblingNumber: 2 })

    const result = await getNextSiblingAccountNumber('parent-123')

    expect(result).toBe('MAIN-001-03')
    expect(prisma.expenseAccounts.findUnique).toHaveBeenCalledWith({
      where: { id: 'parent-123' },
      select: { accountNumber: true },
    })
  })

  it('should throw error when parent account not found', async () => {
    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)

    await expect(getNextSiblingAccountNumber('nonexistent')).rejects.toThrow(
      'Parent account not found'
    )
  })
})

describe('getSiblingAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return sibling accounts for valid parent', async () => {
    const mockSiblings = [
      {
        id: 'sib-1',
        accountNumber: 'MAIN-001-01',
        accountName: 'Historical Q1',
        balance: 500.00,
        isSibling: true,
        canMerge: true,
        siblingNumber: 1,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'sib-2',
        accountNumber: 'MAIN-001-02',
        accountName: 'Historical Q2',
        balance: 0.00,
        isSibling: true,
        canMerge: true,
        siblingNumber: 2,
        createdAt: new Date('2024-04-01'),
      },
    ]

    ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue(mockSiblings)

    const result = await getSiblingAccounts('parent-123')

    expect(result).toEqual(mockSiblings)
    expect(prisma.expenseAccounts.findMany).toHaveBeenCalledWith({
      where: {
        parentAccountId: 'parent-123',
        isSibling: true,
      },
      orderBy: {
        siblingNumber: 'asc',
      },
    })
  })

  it('should return empty array when no siblings exist', async () => {
    ;(prisma.expenseAccounts.findMany as jest.Mock).mockResolvedValue([])

    const result = await getSiblingAccounts('parent-123')

    expect(result).toEqual([])
  })
})

describe('mergeSiblingAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully merge sibling account with zero balance', async () => {
    const mockSiblingAccount = {
      id: 'sib-123',
      accountName: 'Historical Data',
      balance: 0,
      isSibling: true,
      canMerge: true,
      parentAccountId: 'parent-456',
      siblingNumber: 1,
    }

    const mockParentAccount = {
      id: 'parent-456',
      accountName: 'Main Account',
      balance: 1000.00,
    }

    const mockMergedParent = {
      ...mockParentAccount,
      balance: 1000.00, // No change since sibling has 0 balance
      updatedAt: new Date(),
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockSiblingAccount) // Sibling lookup
      .mockResolvedValueOnce(mockParentAccount) // Parent lookup

    ;(prisma.expenseAccountPayments.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.expenseAccountDeposits.findMany as jest.Mock).mockResolvedValue([])

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        expenseAccounts: {
          update: jest.fn().mockResolvedValue(mockMergedParent),
          delete: jest.fn().mockResolvedValue(mockSiblingAccount),
        },
        expenseAccountPayments: {
          updateMany: jest.fn(),
        },
        expenseAccountDeposits: {
          updateMany: jest.fn(),
        },
      })
    })

    const result = await mergeSiblingAccount('sib-123', 'user-789')

    expect(result.success).toBe(true)
    expect(result.mergedAccount).toEqual(mockMergedParent)
    expect(result.deletedSibling).toEqual(mockSiblingAccount)
  })

  it('should successfully merge sibling account with positive balance', async () => {
    const mockSiblingAccount = {
      id: 'sib-123',
      accountName: 'Historical Data',
      balance: 250.75,
      isSibling: true,
      canMerge: true,
      parentAccountId: 'parent-456',
      siblingNumber: 1,
    }

    const mockParentAccount = {
      id: 'parent-456',
      accountName: 'Main Account',
      balance: 1000.00,
    }

    const mockMergedParent = {
      ...mockParentAccount,
      balance: 1250.75, // 1000 + 250.75
      updatedAt: new Date(),
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockSiblingAccount)
      .mockResolvedValueOnce(mockParentAccount)

    ;(prisma.expenseAccountPayments.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.expenseAccountDeposits.findMany as jest.Mock).mockResolvedValue([])

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        expenseAccounts: {
          update: jest.fn().mockResolvedValue(mockMergedParent),
          delete: jest.fn().mockResolvedValue(mockSiblingAccount),
        },
        expenseAccountPayments: {
          updateMany: jest.fn(),
        },
        expenseAccountDeposits: {
          updateMany: jest.fn(),
        },
      })
    })

    const result = await mergeSiblingAccount('sib-123', 'user-789')

    expect(result.success).toBe(true)
    expect(result.mergedAccount.balance).toBe(1250.75)
  })

  it('should transfer payments and deposits to parent account', async () => {
    const mockSiblingAccount = {
      id: 'sib-123',
      balance: 0,
      isSibling: true,
      canMerge: true,
      parentAccountId: 'parent-456',
    }

    const mockParentAccount = {
      id: 'parent-456',
      balance: 1000.00,
    }

    const mockPayments = [
      { id: 'pay-1', expenseAccountId: 'sib-123' },
      { id: 'pay-2', expenseAccountId: 'sib-123' },
    ]

    const mockDeposits = [
      { id: 'dep-1', expenseAccountId: 'sib-123' },
    ]

    ;(prisma.expenseAccounts.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockSiblingAccount)
      .mockResolvedValueOnce(mockParentAccount)

    ;(prisma.expenseAccountPayments.findMany as jest.Mock).mockResolvedValue(mockPayments)
    ;(prisma.expenseAccountDeposits.findMany as jest.Mock).mockResolvedValue(mockDeposits)

    const mockTransaction = {
      expenseAccounts: {
        update: jest.fn(),
        delete: jest.fn(),
      },
      expenseAccountPayments: {
        updateMany: jest.fn(),
      },
      expenseAccountDeposits: {
        updateMany: jest.fn(),
      },
    }

    ;(prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(mockTransaction)
    })

    await mergeSiblingAccount('sib-123', 'user-789')

    expect(mockTransaction.expenseAccountPayments.updateMany).toHaveBeenCalledWith({
      where: { expenseAccountId: 'sib-123' },
      data: { expenseAccountId: 'parent-456' },
    })
    expect(mockTransaction.expenseAccountDeposits.updateMany).toHaveBeenCalledWith({
      where: { expenseAccountId: 'sib-123' },
      data: { expenseAccountId: 'parent-456' },
    })
  })

  it('should throw error when sibling account not found', async () => {
    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(null)

    await expect(mergeSiblingAccount('nonexistent', 'user-123')).rejects.toThrow(
      'Sibling account not found'
    )
  })

  it('should throw error when sibling is not valid for merge', async () => {
    const mockSiblingAccount = {
      id: 'sib-123',
      balance: 100.00, // Non-zero balance
      isSibling: true,
      canMerge: true,
      parentAccountId: 'parent-456',
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock).mockResolvedValue(mockSiblingAccount)

    await expect(mergeSiblingAccount('sib-123', 'user-123')).rejects.toThrow(
      'Sibling account is not eligible for merging'
    )
  })

  it('should throw error when parent account not found', async () => {
    const mockSiblingAccount = {
      id: 'sib-123',
      balance: 0,
      isSibling: true,
      canMerge: true,
      parentAccountId: 'parent-456',
    }

    ;(prisma.expenseAccounts.findUnique as jest.Mock)
      .mockResolvedValueOnce(mockSiblingAccount)
      .mockResolvedValueOnce(null) // Parent not found

    await expect(mergeSiblingAccount('sib-123', 'user-123')).rejects.toThrow(
      'Parent account not found'
    )
  })
})
