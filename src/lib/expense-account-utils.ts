import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

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
