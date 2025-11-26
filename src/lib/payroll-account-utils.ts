import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Get the global payroll account
 */
export async function getGlobalPayrollAccount() {
  return await prisma.payrollAccounts.findFirst({
    where: { businessId: null, isActive: true },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}

/**
 * Calculate current balance from deposits and payments
 * @param payrollAccountId - The payroll account ID
 * @returns The calculated balance
 */
export async function calculatePayrollAccountBalance(payrollAccountId: string): Promise<number> {
  // Sum all deposits
  const depositsSum = await prisma.payrollAccountDeposits.aggregate({
    where: { payrollAccountId },
    _sum: { amount: true },
  })

  // Sum all payments
  const paymentsSum = await prisma.payrollPayments.aggregate({
    where: { payrollAccountId },
    _sum: { amount: true },
  })

  const totalDeposits = Number(depositsSum._sum.amount || 0)
  const totalPayments = Number(paymentsSum._sum.amount || 0)

  return totalDeposits - totalPayments
}

/**
 * Update payroll account balance
 * @param payrollAccountId - The payroll account ID
 */
export async function updatePayrollAccountBalance(payrollAccountId: string) {
  const balance = await calculatePayrollAccountBalance(payrollAccountId)

  await prisma.payrollAccounts.update({
    where: { id: payrollAccountId },
    data: { balance, updatedAt: new Date() },
  })

  return balance
}

/**
 * Get payroll account balance with transaction summary
 * @param payrollAccountId - The payroll account ID
 */
export async function getPayrollAccountBalanceSummary(payrollAccountId: string) {
  const [account, depositsSum, paymentsSum, depositsCount, paymentsCount] = await Promise.all([
    prisma.payrollAccounts.findUnique({ where: { id: payrollAccountId } }),
    prisma.payrollAccountDeposits.aggregate({
      where: { payrollAccountId },
      _sum: { amount: true },
    }),
    prisma.payrollPayments.aggregate({
      where: { payrollAccountId },
      _sum: { amount: true },
    }),
    prisma.payrollAccountDeposits.count({ where: { payrollAccountId } }),
    prisma.payrollPayments.count({ where: { payrollAccountId } }),
  ])

  const totalDeposits = Number(depositsSum._sum.amount || 0)
  const totalPayments = Number(paymentsSum._sum.amount || 0)
  const calculatedBalance = totalDeposits - totalPayments

  return {
    accountId: payrollAccountId,
    balance: account?.balance || 0,
    calculatedBalance,
    totalDeposits,
    totalPayments,
    depositsCount,
    paymentsCount,
    isBalanced: Number(account?.balance || 0) === calculatedBalance,
  }
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
 * Debit business account (used when making deposits to payroll account)
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
      referenceType: 'PAYROLL_DEPOSIT',
    },
  })

  return { newBalance, debitedAmount: amount }
}

/**
 * Generate auto note for deposit
 * @param businessName - The business name
 * @param transactionType - The transaction type
 */
export function generateDepositNote(businessName: string, transactionType: string = 'PAYROLL_EXPENSE'): string {
  if (transactionType === 'PAYROLL_EXPENSE') {
    return `Deposit from ${businessName} payroll expense`
  }
  return `Manual transfer from ${businessName}`
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
 * Validate payment amount
 * @param amount - The amount to validate
 */
export function validatePaymentAmount(amount: number): { valid: boolean; error?: string } {
  return validateDepositAmount(amount) // Same validation rules
}

/**
 * Check if payroll account has sufficient balance for payment
 * @param payrollAccountId - The payroll account ID
 * @param amount - The amount to pay
 */
export async function checkPayrollAccountBalance(payrollAccountId: string, amount: number): Promise<boolean> {
  const account = await prisma.payrollAccounts.findUnique({
    where: { id: payrollAccountId },
    select: { balance: true },
  })

  if (!account) {
    return false
  }

  return Number(account.balance) >= amount
}

/**
 * Get recent deposits for payroll account
 * @param payrollAccountId - The payroll account ID
 * @param limit - Number of deposits to retrieve
 */
export async function getRecentDeposits(payrollAccountId: string, limit: number = 10) {
  return await prisma.payrollAccountDeposits.findMany({
    where: { payrollAccountId },
    include: {
      businesses: {
        select: { id: true, name: true, type: true },
      },
      users: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { depositDate: 'desc' },
    take: limit,
  })
}

/**
 * Get recent payments for payroll account
 * @param payrollAccountId - The payroll account ID
 * @param limit - Number of payments to retrieve
 */
export async function getRecentPayments(payrollAccountId: string, limit: number = 10) {
  return await prisma.payrollPayments.findMany({
    where: { payrollAccountId },
    include: {
      employees: {
        select: { id: true, employeeNumber: true, firstName: true, lastName: true },
      },
      users_created: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { paymentDate: 'desc' },
    take: limit,
  })
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
 * Get payroll account statistics
 * @param payrollAccountId - The payroll account ID
 * @param startDate - Start date for statistics
 * @param endDate - End date for statistics
 */
export async function getPayrollAccountStats(
  payrollAccountId: string,
  startDate?: Date,
  endDate?: Date
) {
  const dateFilter: any = {}
  if (startDate) dateFilter.gte = startDate
  if (endDate) dateFilter.lte = endDate

  const [depositsThisPeriod, paymentsThisPeriod, pendingPaymentsCount] = await Promise.all([
    prisma.payrollAccountDeposits.aggregate({
      where: {
        payrollAccountId,
        ...(Object.keys(dateFilter).length > 0 && { depositDate: dateFilter }),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payrollPayments.aggregate({
      where: {
        payrollAccountId,
        ...(Object.keys(dateFilter).length > 0 && { paymentDate: dateFilter }),
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payrollPayments.count({
      where: { payrollAccountId, status: 'PENDING' },
    }),
  ])

  return {
    depositsThisPeriod: Number(depositsThisPeriod._sum.amount || 0),
    depositsCount: depositsThisPeriod._count,
    paymentsThisPeriod: Number(paymentsThisPeriod._sum.amount || 0),
    paymentsCount: paymentsThisPeriod._count,
    pendingPaymentsCount,
  }
}
