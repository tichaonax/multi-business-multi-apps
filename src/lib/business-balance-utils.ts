import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export interface BusinessBalanceInfo {
  businessId: string
  balance: number
  hasAccount: boolean
  isInitialized: boolean
}

export interface BalanceValidationResult {
  isValid: boolean
  currentBalance: number
  requiredAmount: number
  shortfall?: number
  message: string
}

export interface BusinessTransactionData {
  businessId: string
  amount: number
  type: 'deposit' | 'withdrawal' | 'loan_disbursement' | 'loan_payment' | 'transfer'
  description: string
  referenceId?: string
  referenceType?: string
  notes?: string
  metadata?: any
  createdBy: string
}

/**
 * Get current balance for a business
 */
export async function getBusinessBalance(businessId: string): Promise<BusinessBalanceInfo> {
  try {
    const account = await prisma.businessAccounts.findUnique({
      where: { businessId }
    }) as any

    if (!account) {
      return {
        businessId,
        balance: 0,
        hasAccount: false,
        isInitialized: false
      }
    }

    return {
      businessId,
      balance: Number(account.balance),
      hasAccount: true,
      isInitialized: true
    }
  } catch (error) {
    console.error(`Error getting business balance for ${businessId}:`, error)
    return {
      businessId,
      balance: 0,
      hasAccount: false,
      isInitialized: false
    }
  }
}

/**
 * Initialize business account with starting balance
 */
export async function initializeBusinessAccount(
  businessId: string,
  initialBalance: number = 0,
  createdBy: string
): Promise<BusinessBalanceInfo> {
  try {
    // Check if account already exists
    const existing = await prisma.businessAccounts.findUnique({
      where: { businessId }
    }) as any

    if (existing) {
      return {
        businessId,
        balance: Number(existing.balance),
        hasAccount: true,
        isInitialized: true
      }
    }

    // Create new account
    const account = await prisma.businessAccounts.create({
      // cast to any because Prisma generated types expect additional required fields
      data: ({
        businessId,
        balance: initialBalance,
        createdBy
      } as any)
    }) as any

    // Create initial transaction if balance > 0
    if (initialBalance > 0) {
      await prisma.businessTransactions.create({
        data: ({
          businessId,
          amount: initialBalance,
          type: 'deposit',
          description: 'Initial account setup',
          balanceAfter: initialBalance,
          createdBy,
          notes: 'Account initialization'
        } as any)
      }) as any
    }

    return {
      businessId,
      balance: Number(account.balance),
      hasAccount: true,
      isInitialized: true
    }
  } catch (error) {
    console.error(`Error initializing business account for ${businessId}:`, error)
    throw error
  }
}

/**
 * Validate if business has sufficient balance for a transaction
 */
export async function validateBusinessBalance(
  businessId: string,
  requiredAmount: number
): Promise<BalanceValidationResult> {
  try {
    const balanceInfo = await getBusinessBalance(businessId)

    if (!balanceInfo.hasAccount) {
      return {
        isValid: false,
        currentBalance: 0,
        requiredAmount,
        shortfall: requiredAmount,
        message: 'Business account not initialized. Please initialize account first.'
      }
    }

    const currentBalance = balanceInfo.balance
    const hasEnoughFunds = currentBalance >= requiredAmount

    if (hasEnoughFunds) {
      return {
        isValid: true,
        currentBalance,
        requiredAmount,
        message: 'Sufficient funds available'
      }
    } else {
      const shortfall = requiredAmount - currentBalance
      return {
        isValid: false,
        currentBalance,
        requiredAmount,
        shortfall,
        message: `Insufficient funds. Current balance: $${currentBalance.toFixed(2)}, Required: $${requiredAmount.toFixed(2)}, Shortfall: $${shortfall.toFixed(2)}`
      }
    }
  } catch (error) {
    console.error(`Error validating business balance for ${businessId}:`, error)
    return {
      isValid: false,
      currentBalance: 0,
      requiredAmount,
      shortfall: requiredAmount,
      message: 'Error validating balance. Please try again.'
    }
  }
}

/**
 * Process a business transaction with automatic balance updates
 */
export async function processBusinessTransaction(
  transactionData: BusinessTransactionData
): Promise<{ success: boolean; newBalance: number; transactionId?: string; error?: string }> {
  try {
    const { businessId, amount, type, description, referenceId, referenceType, notes, metadata, createdBy } = transactionData

    // Validate business account exists
    const balanceInfo = await getBusinessBalance(businessId)
    if (!balanceInfo.hasAccount) {
      throw new Error('Business account not initialized')
    }

    // For withdrawals, validate sufficient funds
    if (['withdrawal', 'loan_disbursement', 'loan_payment'].includes(type)) {
      const validation = await validateBusinessBalance(businessId, amount)
      if (!validation.isValid) {
        return {
          success: false,
          newBalance: validation.currentBalance,
          error: validation.message
        }
      }
    }

    // Calculate new balance
    const currentBalance = balanceInfo.balance
    let newBalance: number

    if (['deposit', 'transfer'].includes(type)) {
      newBalance = currentBalance + amount
    } else if (['withdrawal', 'loan_disbursement', 'loan_payment'].includes(type)) {
      newBalance = Math.max(0, currentBalance - amount)
    } else {
      throw new Error(`Unknown transaction type: ${type}`)
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update account balance
      await tx.businessAccount.update({
        where: { businessId },
        data: { balance: newBalance }
      })

      // Create transaction record
      const transaction = await tx.businessTransaction.create({
        data: {
          businessId,
          amount,
          type,
          description,
          referenceId,
          referenceType,
          balanceAfter: newBalance,
          createdBy,
          notes,
          metadata
        }
      })

      return { transactionId: transaction.id, newBalance }
    })

    return {
      success: true,
      newBalance: result.newBalance,
      transactionId: result.transactionId
    }
  } catch (error) {
    console.error('Error processing business transaction:', error)
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get business transaction history
 */
export async function getBusinessTransactionHistory(
  businessId: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    const transactions = await prisma.businessTransactions.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      // cast include to any because Prisma client types may not include the 'creator' relation in all schemas
      include: ({} as any)
    }) as any[]

    return transactions.map(tx => ({
      ...tx,
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balanceAfter)
    }))
  } catch (error) {
    console.error(`Error getting transaction history for ${businessId}:`, error)
    return []
  }
}

/**
 * Get business balance summary with recent transactions
 */
export async function getBusinessBalanceSummary(businessId: string) {
  try {
    const [balanceInfo, recentTransactions] = await Promise.all([
      getBusinessBalance(businessId),
      getBusinessTransactionHistory(businessId, 10)
    ])

    return {
      balance: balanceInfo,
      recentTransactions
    }
  } catch (error) {
    console.error(`Error getting balance summary for ${businessId}:`, error)
    return {
      balance: {
        businessId,
        balance: 0,
        hasAccount: false,
        isInitialized: false
      },
      recentTransactions: []
    }
  }
}