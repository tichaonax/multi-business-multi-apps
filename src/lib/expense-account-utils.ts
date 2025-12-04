import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Calculate current balance from deposits and payments
 * @param accountId - The expense account ID
 * @returns The calculated balance
 */
export async function calculateExpenseAccountBalance(accountId: string): Promise<number> {
  // Sum all deposits
  const depositsSum = await prisma.expenseAccountDeposits.aggregate({
    where: { expenseAccountId: accountId },
    _sum: { amount: true },
  })

  // Sum all submitted payments only (exclude DRAFT)
  const paymentsSum = await prisma.expenseAccountPayments.aggregate({
    where: {
      expenseAccountId: accountId,
      status: 'SUBMITTED'
    },
    _sum: { amount: true },
  })

  const totalDeposits = Number(depositsSum._sum.amount || 0)
  const totalPayments = Number(paymentsSum._sum.amount || 0)

  return totalDeposits - totalPayments
}

/**
 * Update expense account balance
 * @param accountId - The expense account ID
 */
export async function updateExpenseAccountBalance(accountId: string) {
  const balance = await calculateExpenseAccountBalance(accountId)

  await prisma.expenseAccounts.update({
    where: { id: accountId },
    data: { balance, updatedAt: new Date() },
  })

  return balance
}

/**
 * Update expense account balance using a provided transaction client (tx)
 * This ensures updates can participate in an existing transaction and avoid race conditions
 */
export async function updateExpenseAccountBalanceTx(tx: any, accountId: string) {
  // Reuse the same logic as calculateExpenseAccountBalance but executed with tx
  const depositsSum = await tx.expenseAccountDeposits.aggregate({
    where: { expenseAccountId: accountId },
    _sum: { amount: true },
  })

  const paymentsSum = await tx.expenseAccountPayments.aggregate({
    where: { expenseAccountId: accountId, status: 'SUBMITTED' },
    _sum: { amount: true },
  })

  const totalDeposits = Number(depositsSum._sum.amount || 0)
  const totalPayments = Number(paymentsSum._sum.amount || 0)
  const balance = totalDeposits - totalPayments

  await tx.expenseAccounts.update({
    where: { id: accountId },
    data: { balance, updatedAt: new Date() },
  })

  return balance
}

/**
 * Get expense account balance with transaction summary
 * @param accountId - The expense account ID
 */
export async function getExpenseAccountBalanceSummary(accountId: string) {
  const [account, depositsSum, paymentsSum, depositsCount, paymentsCount, pendingPaymentsCount] = await Promise.all([
    prisma.expenseAccounts.findUnique({ where: { id: accountId } }),
    prisma.expenseAccountDeposits.aggregate({
      where: { expenseAccountId: accountId },
      _sum: { amount: true },
    }),
    prisma.expenseAccountPayments.aggregate({
      where: {
        expenseAccountId: accountId,
        status: 'SUBMITTED'
      },
      _sum: { amount: true },
    }),
    prisma.expenseAccountDeposits.count({ where: { expenseAccountId: accountId } }),
    prisma.expenseAccountPayments.count({
      where: {
        expenseAccountId: accountId,
        status: 'SUBMITTED'
      }
    }),
    prisma.expenseAccountPayments.count({
      where: {
        expenseAccountId: accountId,
        status: 'DRAFT'
      }
    }),
  ])

  const totalDeposits = Number(depositsSum._sum.amount || 0)
  const totalPayments = Number(paymentsSum._sum.amount || 0)
  const calculatedBalance = totalDeposits - totalPayments

  return {
    accountId,
    balance: Number(account?.balance || 0),
    calculatedBalance,
    totalDeposits,
    totalPayments,
    depositsCount,
    paymentCount: paymentsCount,
    pendingPayments: pendingPaymentsCount,
    isBalanced: Number(account?.balance || 0) === calculatedBalance,
  }
}

/**
 * Validate deposit amount
 * @param amount - The amount to validate
 */
export function validateDepositAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' }
  }

  if (amount > 999999999.99) {
    return { valid: false, error: 'Amount exceeds maximum allowed value' }
  }

  // Check decimal places (max 2)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    return { valid: false, error: 'Amount cannot have more than 2 decimal places' }
  }

  return { valid: true }
}

/**
 * Validate payment amount against available balance
 * @param amount - The amount to validate
 * @param availableBalance - The available balance in the account
 */
export function validatePaymentAmount(
  amount: number,
  availableBalance: number
): { valid: boolean; error?: string } {
  // First validate the amount itself
  const amountValidation = validateDepositAmount(amount)
  if (!amountValidation.valid) {
    return amountValidation
  }

  // Check if sufficient balance
  if (amount > availableBalance) {
    return {
      valid: false,
      error: `Insufficient balance. Available: ${formatCurrency(availableBalance)}`
    }
  }

  return { valid: true }
}

/**
 * Check if account balance is below threshold
 * @param balance - Current balance
 * @param threshold - Low balance threshold
 */
export function checkLowBalance(balance: number, threshold: number): boolean {
  return balance < threshold
}

/**
 * Generate unique account number
 * Format: EXP-YYYYMMDD-XXXX (e.g., EXP-20251125-0001)
 */
export async function generateAccountNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

  // Find the highest account number for today
  const lastAccount = await prisma.expenseAccounts.findFirst({
    where: {
      accountNumber: {
        startsWith: `EXP-${dateStr}-`
      }
    },
    orderBy: {
      accountNumber: 'desc'
    }
  })

  let sequence = 1
  if (lastAccount) {
    const lastSequence = parseInt(lastAccount.accountNumber.split('-')[2])
    sequence = lastSequence + 1
  }

  return `EXP-${dateStr}-${sequence.toString().padStart(4, '0')}`
}

/**
 * Check if business account has sufficient balance for deposit
 * @param businessId - The business ID
 * @param amount - The amount to deposit
 */
export async function checkBusinessAccountBalance(businessId: string, amount: number): Promise<boolean> {
  const businessAccount = await prisma.businessAccounts.findUnique({
    where: { businessId },
    select: { balance: true },
  })

  if (!businessAccount) {
    return false
  }

  return Number(businessAccount.balance) >= amount
}

/**
 * Debit business account (used when making deposits to expense account)
 * @param businessId - The business ID
 * @param amount - The amount to debit
 * @param note - Transaction note
 * @param userId - User performing the transaction
 */
export async function debitBusinessAccount(
  businessId: string,
  amount: number,
  note: string,
  userId: string
) {
  const businessAccount = await prisma.businessAccounts.findUnique({
    where: { businessId },
  })

  if (!businessAccount) {
    throw new Error('Business account not found')
  }

  const currentBalance = Number(businessAccount.balance)
  if (currentBalance < amount) {
    throw new Error('Insufficient balance in business account')
  }

  const newBalance = currentBalance - amount

  await prisma.businessAccounts.update({
    where: { businessId },
    data: { balance: newBalance },
  })

  // Create transaction record
  await prisma.businessTransactions.create({
    data: {
      businessId,
      type: 'DEBIT',
      amount: -amount, // Negative for debit
      description: note,
      balanceAfter: newBalance,
      createdBy: userId,
      referenceType: 'EXPENSE_DEPOSIT',
    },
  })

  return { newBalance, debitedAmount: amount }
}

/**
 * Generate auto note for deposit
 * @param businessName - The business name
 * @param transactionType - The transaction type
 */
export function generateDepositNote(businessName: string, transactionType: string = 'EXPENSE_TRANSFER'): string {
  if (transactionType === 'EXPENSE_TRANSFER') {
    return `Deposit from ${businessName} for expenses`
  }
  return `Manual transfer from ${businessName}`
}

/**
 * Get recent deposits for expense account
 * @param accountId - The expense account ID
 * @param limit - Number of deposits to retrieve
 */
export async function getRecentDeposits(accountId: string, limit: number = 10) {
  return await prisma.expenseAccountDeposits.findMany({
    where: { expenseAccountId: accountId },
    include: {
      sourceBusiness: {
        select: { id: true, name: true, type: true },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { depositDate: 'desc' },
    take: limit,
  })
}

/**
 * Get recent payments for expense account
 * @param accountId - The expense account ID
 * @param limit - Number of payments to retrieve
 */
export async function getRecentPayments(accountId: string, limit: number = 10) {
  return await prisma.expenseAccountPayments.findMany({
    where: { expenseAccountId: accountId },
    include: {
      payeeUser: {
        select: { id: true, name: true, email: true },
      },
      payeeEmployee: {
        select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      },
      payeePerson: {
        select: { id: true, fullName: true, nationalId: true },
      },
      payeeBusiness: {
        select: { id: true, name: true, type: true },
      },
      category: {
        select: { id: true, name: true, emoji: true, color: true },
      },
      subcategory: {
        select: { id: true, name: true, emoji: true },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { paymentDate: 'desc' },
    take: limit,
  })
}

/**
 * Validate batch payment total against account balance
 * @param accountId - The expense account ID
 * @param batchTotal - Total amount of batch payments
 */
export async function validateBatchPaymentTotal(
  accountId: string,
  batchTotal: number
): Promise<{ valid: boolean; error?: string; availableBalance?: number }> {
  const account = await prisma.expenseAccounts.findUnique({
    where: { id: accountId },
    select: { balance: true },
  })

  if (!account) {
    return { valid: false, error: 'Expense account not found' }
  }

  const availableBalance = Number(account.balance)

  if (batchTotal > availableBalance) {
    return {
      valid: false,
      error: `Insufficient balance for batch. Required: ${formatCurrency(batchTotal)}, Available: ${formatCurrency(availableBalance)}`,
      availableBalance,
    }
  }

  return { valid: true, availableBalance }
}

/**
 * Format currency amount
 * @param amount - The amount to format
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Get expense account statistics
 * @param accountId - The expense account ID
 * @param startDate - Start date for statistics
 * @param endDate - End date for statistics
 */
export async function getExpenseAccountStats(
  accountId: string,
  startDate?: Date,
  endDate?: Date
) {
  const dateFilter: any = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const [depositsThisPeriod, paymentsThisPeriod, draftPaymentsCount, submittedPaymentsCount] = await Promise.all([
    prisma.expenseAccountDeposits.aggregate({
      where: {
        expenseAccountId: accountId,
        ...(Object.keys(dateFilter).length > 0 && { depositDate: dateFilter }),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expenseAccountPayments.aggregate({
      where: {
        expenseAccountId: accountId,
        status: 'SUBMITTED',
        ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter }),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.expenseAccountPayments.count({
      where: { expenseAccountId: accountId, status: 'DRAFT' },
    }),
    prisma.expenseAccountPayments.count({
      where: { expenseAccountId: accountId, status: 'SUBMITTED' },
    }),
  ])

  return {
    depositsThisPeriod: Number(depositsThisPeriod._sum.amount || 0),
    depositsCount: depositsThisPeriod._count,
    paymentsThisPeriod: Number(paymentsThisPeriod._sum.amount || 0),
    paymentsCount: paymentsThisPeriod._count,
    draftPaymentsCount,
    submittedPaymentsCount,
  }
}

/**
 * Check if expense account exists and is active
 * @param accountId - The expense account ID
 */
export async function isExpenseAccountActive(accountId: string): Promise<boolean> {
  const account = await prisma.expenseAccounts.findUnique({
    where: { id: accountId },
    select: { isActive: true },
  })

  return account?.isActive ?? false
}

/**
 * Get all active expense accounts
 */
export async function getActiveExpenseAccounts() {
  return await prisma.expenseAccounts.findMany({
    where: { isActive: true },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Get expense accounts with low balance alerts
 */
export async function getExpenseAccountsWithLowBalance() {
  return await prisma.expenseAccounts.findMany({
    where: {
      isActive: true,
      balance: {
        lte: prisma.expenseAccounts.fields.lowBalanceThreshold,
      },
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { balance: 'asc' },
  })
}

// ============================================================================
// SIBLING ACCOUNT UTILITIES
// ============================================================================

/**
 * Generate next sibling account number for a parent account
 * @param parentAccountId - The parent account ID
 * @returns The next sibling number (e.g., 1, 2, 3...)
 */
export async function generateNextSiblingNumber(parentAccountId: string): Promise<number> {
  const maxSibling = await prisma.expenseAccounts.findFirst({
    where: { parentAccountId },
    select: { siblingNumber: true },
    orderBy: { siblingNumber: 'desc' },
  })

  return (maxSibling?.siblingNumber || 0) + 1
}

/**
 * Create a sibling account for historical data entry
 * @param parentAccountId - The parent account ID
 * @param siblingData - The sibling account data
 * @param creatorId - The user creating the sibling account
 */
export async function createSiblingAccount(
  parentAccountId: string,
  siblingData: {
    name: string
    description?: string
    lowBalanceThreshold?: number
  },
  creatorId: string
) {
  // Verify parent account exists and is not itself a sibling
  const parentAccount = await prisma.expenseAccounts.findUnique({
    where: { id: parentAccountId },
    select: { id: true, isSibling: true, accountNumber: true },
  })

  if (!parentAccount) {
    throw new Error('Parent account not found')
  }

  if (parentAccount.isSibling) {
    throw new Error('Cannot create sibling account from another sibling account')
  }

  // Generate sibling number and account number
  const siblingNumber = await generateNextSiblingNumber(parentAccountId)
  const siblingAccountNumber = `${parentAccount.accountNumber}-${siblingNumber.toString().padStart(2, '0')}`

  // Create the sibling account
  const siblingAccount = await prisma.expenseAccounts.create({
    data: {
      accountNumber: siblingAccountNumber,
      accountName: siblingData.name,
      description: siblingData.description,
      lowBalanceThreshold: siblingData.lowBalanceThreshold || 0,
      balance: 0,
      isActive: true,
      isSibling: true,
      canMerge: true,
      parentAccountId,
      siblingNumber,
      createdBy: creatorId,
    },
  })

  return siblingAccount
}

/**
 * Get all sibling accounts for a parent account
 * @param parentAccountId - The parent account ID
 */
export async function getSiblingAccounts(parentAccountId: string) {
  return await prisma.expenseAccounts.findMany({
    where: {
      parentAccountId,
      isSibling: true,
    },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { siblingNumber: 'asc' },
  })
}

/**
 * Get parent account with all its siblings
 * @param accountId - Either parent or sibling account ID
 */
export async function getAccountWithSiblings(accountId: string) {
  // First, find the account
  const account = await prisma.expenseAccounts.findUnique({
    where: { id: accountId },
    include: {
      parentAccount: {
        include: {
          siblingAccounts: {
            include: {
              creator: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { siblingNumber: 'asc' },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      siblingAccounts: {
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { siblingNumber: 'asc' },
      },
      creator: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  if (!account) {
    throw new Error('Account not found')
  }

  // If this is a sibling, return the parent with all siblings
  if (account.isSibling && account.parentAccount) {
    return {
      parentAccount: account.parentAccount,
      siblings: account.parentAccount.siblingAccounts,
      isSibling: true,
      currentAccount: account,
    }
  }

  // If this is a parent, return it with siblings
  return {
    parentAccount: account,
    siblings: account.siblingAccounts,
    isSibling: false,
    currentAccount: account,
  }
}

/**
 * Validate if a sibling account can be merged
 * @param siblingAccountId - The sibling account ID to merge
 */
export async function validateSiblingAccountForMerge(siblingAccountId: string): Promise<{
  canMerge: boolean
  error?: string
  account?: any
}> {
  const account = await prisma.expenseAccounts.findUnique({
    where: { id: siblingAccountId },
    select: {
      id: true,
      isSibling: true,
      canMerge: true,
      balance: true,
      parentAccountId: true,
      accountName: true,
    },
  })

  if (!account) {
    return { canMerge: false, error: 'Sibling account not found' }
  }

  if (!account.isSibling) {
    return { canMerge: false, error: 'Account is not a sibling account' }
  }

  if (!account.canMerge) {
    return { canMerge: false, error: 'Account is not eligible for merging' }
  }

  const balance = Number(account.balance)
  if (balance !== 0) {
    return {
      canMerge: false,
      error: `Cannot merge account with non-zero balance. Current balance: ${formatCurrency(balance)}`,
      account,
    }
  }

  return { canMerge: true, account }
}

/**
 * Merge a sibling account back into its parent account
 * @param siblingAccountId - The sibling account ID to merge
 * @param userId - The user performing the merge
 */
export async function mergeSiblingAccount(siblingAccountId: string, userId: string) {
  // Validate the merge operation
  const validation = await validateSiblingAccountForMerge(siblingAccountId)
  if (!validation.canMerge) {
    throw new Error(validation.error)
  }

  const siblingAccount = validation.account!

  // Ensure parent account exists
  const parentAccount = await prisma.expenseAccounts.findUnique({ where: { id: siblingAccount.parentAccountId! } })
  if (!parentAccount) {
    throw new Error('Target account not found')
  }

  // Start a transaction to ensure data consistency
  return await prisma.$transaction(async (tx: any) => {
    // Move all deposits from sibling to parent
    await tx.expenseAccountDeposits.updateMany({
      where: { expenseAccountId: siblingAccountId },
      data: { expenseAccountId: siblingAccount.parentAccountId! },
    })

    // Move all payments from sibling to parent
    await tx.expenseAccountPayments.updateMany({
      where: { expenseAccountId: siblingAccountId },
      data: { expenseAccountId: siblingAccount.parentAccountId! },
    })

    // Delete the sibling account
    await tx.expenseAccounts.delete({
      where: { id: siblingAccountId },
    })

    // Update parent account balance inside the same transaction to prevent race conditions
    await updateExpenseAccountBalanceTx(tx, siblingAccount.parentAccountId!)

    return {
      mergedAccountId: siblingAccountId,
      parentAccountId: siblingAccount.parentAccountId,
      message: `Successfully merged sibling account "${siblingAccount.name}" back into parent account`,
    }
  })
}

/**
 * Check if an account has any active sibling accounts
 * @param accountId - The account ID to check
 */
export async function hasActiveSiblings(accountId: string): Promise<boolean> {
  const count = await prisma.expenseAccounts.count({
    where: {
      parentAccountId: accountId,
      isSibling: true,
      isActive: true,
    },
  })

  return count > 0
}

/**
 * Get the next available sibling account number for a parent
 * @param parentAccountId - The parent account ID
 */
export async function getNextSiblingAccountNumber(parentAccountId: string): Promise<string> {
  const parentAccount = await prisma.expenseAccounts.findUnique({
    where: { id: parentAccountId },
    select: { accountNumber: true },
  })

  if (!parentAccount) {
    throw new Error('Parent account not found')
  }

  const nextNumber = await generateNextSiblingNumber(parentAccountId)
  return `${parentAccount.accountNumber}-${nextNumber.toString().padStart(2, '0')}`
}

/**
 * Validate if editing a deposit amount would cause negative balances in subsequent transactions
 * @param depositId - The deposit ID being edited
 * @param accountId - The expense account ID
 * @param newAmount - The new amount for the deposit
 * @returns Object with valid flag and error message if invalid
 */
export async function validateDepositEdit(
  depositId: string,
  accountId: string,
  newAmount: number
): Promise<{ valid: boolean; error?: string }> {
  // Get the deposit being edited
  const deposit = await prisma.expenseAccountDeposits.findUnique({
    where: { id: depositId },
    select: { amount: true, depositDate: true }
  })

  if (!deposit) {
    return { valid: false, error: 'Deposit not found' }
  }

  const currentAmount = Number(deposit.amount)
  const amountDifference = newAmount - currentAmount

  // If increasing deposit, no negative balance issues
  if (amountDifference >= 0) {
    return { valid: true }
  }

  // Get all transactions (deposits and payments) after this deposit chronologically
  const [depositsAfter, paymentsAfter] = await Promise.all([
    prisma.expenseAccountDeposits.findMany({
      where: {
        expenseAccountId: accountId,
        depositDate: { gte: deposit.depositDate }
      },
      orderBy: { depositDate: 'asc' },
      select: { id: true, amount: true, depositDate: true }
    }),
    prisma.expenseAccountPayments.findMany({
      where: {
        expenseAccountId: accountId,
        status: 'SUBMITTED',
        paymentDate: { gte: deposit.depositDate }
      },
      orderBy: { paymentDate: 'asc' },
      select: { id: true, amount: true, paymentDate: true }
    })
  ])

  // Build chronological list of all transactions
  interface Transaction {
    id: string
    date: Date
    amount: number
    type: 'DEPOSIT' | 'PAYMENT'
  }

  const allTransactions: Transaction[] = [
    ...depositsAfter.map(d => ({
      id: d.id,
      date: d.depositDate,
      amount: Number(d.amount),
      type: 'DEPOSIT' as const
    })),
    ...paymentsAfter.map(p => ({
      id: p.id,
      date: p.paymentDate,
      amount: Number(p.amount),
      type: 'PAYMENT' as const
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate balances chronologically with the new amount
  // Get balance up to (but not including) this deposit
  const [depositsBefore, paymentsBefore] = await Promise.all([
    prisma.expenseAccountDeposits.aggregate({
      where: {
        expenseAccountId: accountId,
        depositDate: { lt: deposit.depositDate }
      },
      _sum: { amount: true }
    }),
    prisma.expenseAccountPayments.aggregate({
      where: {
        expenseAccountId: accountId,
        status: 'SUBMITTED',
        paymentDate: { lt: deposit.depositDate }
      },
      _sum: { amount: true }
    })
  ])

  let runningBalance = Number(depositsBefore._sum.amount || 0) - Number(paymentsBefore._sum.amount || 0)

  // Apply all transactions chronologically with the edited amount
  for (const transaction of allTransactions) {
    if (transaction.type === 'DEPOSIT') {
      // If this is the deposit being edited, use new amount
      const amount = transaction.id === depositId ? newAmount : transaction.amount
      runningBalance += amount
    } else {
      // Payment
      runningBalance -= transaction.amount
      // Check if this causes negative balance
      if (runningBalance < 0) {
        return {
          valid: false,
          error: `Editing this deposit would cause a negative balance of $${Math.abs(runningBalance).toFixed(2)} on ${transaction.date.toLocaleDateString()}`
        }
      }
    }
  }

  return { valid: true }
}

/**
 * Validate if editing a payment amount would cause negative balance
 * @param paymentId - The payment ID being edited
 * @param accountId - The expense account ID
 * @param newAmount - The new amount for the payment
 * @returns Object with valid flag and error message if invalid
 */
export async function validatePaymentEdit(
  paymentId: string,
  accountId: string,
  newAmount: number
): Promise<{ valid: boolean; error?: string }> {
  // Get the payment being edited
  const payment = await prisma.expenseAccountPayments.findUnique({
    where: { id: paymentId },
    select: { amount: true, paymentDate: true, status: true }
  })

  if (!payment) {
    return { valid: false, error: 'Payment not found' }
  }

  // Only check for submitted payments (DRAFT payments don't affect balance)
  if (payment.status !== 'SUBMITTED') {
    return { valid: true }
  }

  const currentAmount = Number(payment.amount)
  const amountDifference = newAmount - currentAmount

  // Debug logging
  console.log('[validatePaymentEdit] Payment ID:', paymentId)
  console.log('[validatePaymentEdit] Current amount:', currentAmount, '-> New amount:', newAmount)
  console.log('[validatePaymentEdit] Amount difference:', amountDifference)
  console.log('[validatePaymentEdit] Payment date:', payment.paymentDate)

  // If decreasing payment, no negative balance issues
  // (we're putting money back into the account)
  if (amountDifference <= 0) {
    console.log('[validatePaymentEdit] Decreasing payment - validation passed')
    return { valid: true }
  }

  // For editing existing payments, we need to check if the increase would cause
  // any balance to go negative from this point forward.
  // Since the payment already exists, we calculate the current account balance
  // and see if there's enough cushion to increase this payment.

  // Get current account balance
  const [allDeposits, allPaymentsExcludingThis] = await Promise.all([
    prisma.expenseAccountDeposits.aggregate({
      where: { expenseAccountId: accountId },
      _sum: { amount: true }
    }),
    prisma.expenseAccountPayments.aggregate({
      where: {
        expenseAccountId: accountId,
        status: 'SUBMITTED',
        id: { not: paymentId }
      },
      _sum: { amount: true }
    })
  ])

  const totalDeposits = Number(allDeposits._sum.amount || 0)
  const totalOtherPayments = Number(allPaymentsExcludingThis._sum.amount || 0)
  // Current balance if this payment didn't exist
  const balanceWithoutThisPayment = totalDeposits - totalOtherPayments
  // Current balance with this payment at current amount
  const currentBalance = balanceWithoutThisPayment - currentAmount
  // What balance would be if we apply the new amount
  const balanceWithNewAmount = balanceWithoutThisPayment - newAmount

  console.log('[validatePaymentEdit] Total deposits:', totalDeposits)
  console.log('[validatePaymentEdit] Total other payments:', totalOtherPayments)
  console.log('[validatePaymentEdit] Balance without this payment:', balanceWithoutThisPayment)
  console.log('[validatePaymentEdit] Current balance:', currentBalance)
  console.log('[validatePaymentEdit] Balance with new amount:', balanceWithNewAmount)

  // Check if the new amount would make the current balance negative
  if (balanceWithNewAmount < 0) {
    const shortfall = Math.abs(balanceWithNewAmount)
    return {
      valid: false,
      error: `Insufficient funds for this amount. Current account balance would become: -$${shortfall.toFixed(2)}. Please reduce the amount or add more deposits first.`
    }
  }

  console.log('[validatePaymentEdit] Validation passed - sufficient funds for edit')
  return { valid: true }
}

/**
 * Check if a transaction is within the 5-day edit window
 * @param createdAt - The transaction creation date
 * @param isAdmin - Whether the user is an admin (admins can always edit)
 * @returns Object with allowed flag and error message if not allowed
 */
export function isWithinEditWindow(
  createdAt: Date,
  isAdmin: boolean
): { allowed: boolean; error?: string } {
  // Admins can always edit
  if (isAdmin) {
    return { allowed: true }
  }

  // Calculate days since creation
  const now = new Date()
  const diffMs = now.getTime() - createdAt.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays > 5) {
    return {
      allowed: false,
      error: `This transaction can only be edited within 5 days of creation. It was created ${diffDays} days ago. Only admins can edit older transactions.`
    }
  }

  return { allowed: true }
}
