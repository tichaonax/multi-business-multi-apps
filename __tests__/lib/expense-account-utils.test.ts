/**
 * Expense Account Utilities Tests
 *
 * Tests for expense account utility functions including validations and formatting.
 */

import { describe, it, expect } from '@jest/globals'
import {
  validateDepositAmount,
  validatePaymentAmount,
  checkLowBalance,
  formatCurrency,
} from '@/lib/expense-account-utils'

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
