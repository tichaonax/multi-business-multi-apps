import { PersonalExpense, User } from '@prisma/client'
import { isSystemAdmin } from './permission-utils'

export interface DeletionPermissionResult {
  canDelete: boolean
  reason?: string
  isTimeRestricted?: boolean
  hoursRemaining?: number
}

export function canDeletePersonalExpense(
  user: User,
  expense: PersonalExpense,
  isAdmin?: boolean
): DeletionPermissionResult {
  const actualIsAdmin = isAdmin ?? isSystemAdmin(user)
  const creationDate = new Date(expense.createdAt)
  const now = new Date()
  const hoursSinceCreation = (now.getTime() - creationDate.getTime()) / (1000 * 60 * 60)
  const isWithin24Hours = hoursSinceCreation <= 24

  // System admins can delete any expense
  if (actualIsAdmin) {
    return {
      canDelete: true,
      reason: 'Admin can delete any expense'
    }
  }

  // Check if user is the creator
  if (expense.userId !== user.id) {
    return {
      canDelete: false,
      reason: 'You can only delete expenses you created'
    }
  }

  // Check 24-hour time restriction for regular users
  if (!isWithin24Hours) {
    return {
      canDelete: false,
      reason: 'You can only delete expenses created within the last 24 hours. Contact an administrator for older entries.',
      isTimeRestricted: true,
      hoursRemaining: 0
    }
  }

  // User can delete their own expense within 24 hours
  const hoursRemaining = Math.max(0, 24 - hoursSinceCreation)
  return {
    canDelete: true,
    reason: `You can delete this expense (${hoursRemaining.toFixed(1)} hours remaining)`,
    isTimeRestricted: true,
    hoursRemaining
  }
}

export interface RollbackCalculation {
  budgetAdjustment: number
  projectAdjustments: Array<{
    projectId: string
    projectName: string
    amount: number
  }>
  loanAdjustments: Array<{
    loanId: string
    amount: number
  }>
  totalRollback: number
}

export function calculateRollbackAmounts(
  expense: PersonalExpense & {
    projectTransactions?: Array<{
      id: string
      personalExpense?: { amount: number }
      constructionProject?: { id: string, name: string }
    }>
    loanTransactions?: Array<{
      id: string
      amount: number
      loanId: string
    }>
  }
): RollbackCalculation {
  const result: RollbackCalculation = {
    budgetAdjustment: 0,
    projectAdjustments: [],
    loanAdjustments: [],
    totalRollback: 0
  }

  const expenseAmount = Number(expense.amount)

  // Calculate project transaction rollbacks
  if (expense.projectTransactions && expense.project_transactions.length > 0) {
    expense.project_transactions.forEach(transaction => {
      const projectAmount = Number(transaction.personalExpense?.amount || 0)
      if (projectAmount > 0 && transaction.constructionProject) {
        result.projectAdjustments.push({
          projectId: transaction.constructionProject.id,
          projectName: transaction.constructionProject.name,
          amount: projectAmount
        })
        result.totalRollback += projectAmount
      }
    })
  }

  // Calculate loan transaction rollbacks
  if (expense.loanTransactions && expense.loanTransactions.length > 0) {
    expense.loanTransactions.forEach(loanTransaction => {
      const loanAmount = Number(loanTransaction.amount)
      if (loanAmount > 0) {
        result.loanAdjustments.push({
          loanId: loanTransaction.loanId,
          amount: loanAmount
        })
        result.totalRollback += loanAmount
      }
    })
  }

  // Calculate budget adjustment (remaining amount after project/loan rollbacks)
  result.budgetAdjustment = expenseAmount - result.totalRollback

  return result
}

export function validateDeletionSafety(expense: PersonalExpense): {
  safe: boolean
  warnings: string[]
  blockers: string[]
} {
  const warnings: string[] = []
  const blockers: string[] = []

  // Check for high-value transactions
  const amount = Number(expense.amount)
  if (amount > 10000) {
    warnings.push(`High-value transaction: $${amount.toFixed(2)}`)
  }

  // Check for system-generated expenses (contractor payments)
  if (expense.tags && expense.tags.includes('contractor:')) {
    warnings.push('This is a contractor payment transaction')
  }

  // Check for expense age
  const daysSinceCreation = (new Date().getTime() - new Date(expense.date).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSinceCreation > 30) {
    warnings.push(`Transaction is ${daysSinceCreation.toFixed(0)} days old`)
  }

  // No hard blockers currently defined, but framework is ready
  const safe = blockers.length === 0

  return { safe, warnings, blockers }
}