/**
 * Payee Utilities Tests
 *
 * Tests for payee utility functions including validation and formatting.
 */

import { describe, it, expect } from '@jest/globals'
import { formatPayeeDisplayName } from '@/types/payee'
import type { UserPayee, EmployeePayee, PersonPayee, BusinessPayee } from '@/types/payee'

describe('formatPayeeDisplayName', () => {
  it('should format USER payee display name', () => {
    const payee: UserPayee = {
      id: 'user-1',
      type: 'USER',
      name: 'John Doe',
      displayName: '',
      identifier: 'john@example.com',
      isActive: true,
      email: 'john@example.com',
      role: 'ADMIN',
    }
    expect(formatPayeeDisplayName(payee)).toBe('John Doe (john@example.com)')
  })

  it('should format EMPLOYEE payee display name', () => {
    const payee: EmployeePayee = {
      id: 'emp-1',
      type: 'EMPLOYEE',
      name: 'Jane Smith',
      displayName: '',
      identifier: 'EMP-001',
      isActive: true,
      employeeNumber: 'EMP-001',
      fullName: 'Jane Smith',
      nationalId: '12345678',
      phone: '555-1234',
    }
    expect(formatPayeeDisplayName(payee)).toBe('Jane Smith - EMP-001')
  })

  it('should format PERSON payee display name with national ID', () => {
    const payee: PersonPayee = {
      id: 'person-1',
      type: 'PERSON',
      name: 'Bob Johnson',
      displayName: '',
      identifier: '87654321',
      isActive: true,
      fullName: 'Bob Johnson',
      nationalId: '87654321',
      phone: '555-5678',
    }
    expect(formatPayeeDisplayName(payee)).toBe('Bob Johnson (87654321)')
  })

  it('should format PERSON payee display name without national ID', () => {
    const payee: PersonPayee = {
      id: 'person-2',
      type: 'PERSON',
      name: 'Alice Brown',
      displayName: '',
      identifier: '555-9999',
      isActive: true,
      fullName: 'Alice Brown',
      nationalId: null,
      phone: '555-9999',
    }
    expect(formatPayeeDisplayName(payee)).toBe('Alice Brown')
  })

  it('should format BUSINESS payee display name', () => {
    const payee: BusinessPayee = {
      id: 'biz-1',
      type: 'BUSINESS',
      name: 'ACME Corp',
      displayName: '',
      identifier: 'retail',
      isActive: true,
      businessName: 'ACME Corp',
      businessType: 'retail',
    }
    expect(formatPayeeDisplayName(payee)).toBe('ACME Corp [retail]')
  })
})

describe('Payee Utils - Exports', () => {
  it('should export all required functions', () => {
    const utils = require('@/lib/payee-utils')

    // Query functions
    expect(utils.getAllAvailablePayees).toBeDefined()
    expect(utils.getPayee).toBeDefined()
    expect(utils.searchPayees).toBeDefined()

    // Validation functions
    expect(utils.validatePayee).toBeDefined()

    // Creation functions
    expect(utils.createIndividualPayee).toBeDefined()
    expect(utils.generateIndividualId).toBeDefined()

    // Formatting functions
    expect(utils.formatPayeeDisplayName).toBeDefined()
  })

  it('should have correct function types', () => {
    const utils = require('@/lib/payee-utils')

    expect(typeof utils.getAllAvailablePayees).toBe('function')
    expect(typeof utils.validatePayee).toBe('function')
    expect(typeof utils.createIndividualPayee).toBe('function')
    expect(typeof utils.generateIndividualId).toBe('function')
    expect(typeof utils.getPayee).toBe('function')
    expect(typeof utils.searchPayees).toBe('function')
    expect(typeof utils.formatPayeeDisplayName).toBe('function')
  })
})

// Note: Database-dependent functions (getAllAvailablePayees, validatePayee, createIndividualPayee,
// getPayee, searchPayees) require integration testing with a test database.
// These are tested via API endpoint tests and integration tests.
