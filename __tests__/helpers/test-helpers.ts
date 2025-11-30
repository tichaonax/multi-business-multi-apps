import { prisma } from '@/lib/prisma'

// Test helper functions for creating test data
export async function createTestUser(overrides: Partial<any> = {}) {
  const user = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  // In a real implementation, this would create the user in the database
  // For now, we'll just return the mock user object
  return user
}

export async function createTestBusiness(userId: string, overrides: Partial<any> = {}) {
  const business = {
    id: `biz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Business',
    type: 'RESTAURANT',
    ownerId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  // In a real implementation, this would create the business in the database
  return business
}

export async function createTestExpenseAccount(businessId: string, overrides: Partial<any> = {}) {
  const account = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    accountNumber: 'EXP-001',
    name: 'Test Expense Account',
    accountName: 'Test Expense Account',
    description: 'Test account for testing',
    balance: 0.00,
    businessId,
    isSibling: false,
    canMerge: true,
    parentAccountId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  // In a real implementation, this would create the account in the database
  return account
}

export async function createTestExpenseAccountTransaction(
  accountId: string,
  amount: number,
  type: 'DEPOSIT' | 'PAYMENT',
  overrides: Partial<any> = {}
) {
  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    accountId,
    amount,
    type,
    description: `Test ${type.toLowerCase()}`,
    transactionDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }

  // In a real implementation, this would create the transaction in the database
  return transaction
}

// Helper to clean up test data
export async function cleanupTestData() {
  // In a real implementation, this would clean up test data from the database
  // For now, it's a no-op since we're using mocks
}

// Helper to setup test database state
export async function setupTestDatabase() {
  // In a real implementation, this would set up test database state
  // For now, it's a no-op since we're using mocks
}