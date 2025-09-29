import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Transaction data interfaces
export interface ExpenseCreationData {
  amount: number
  description: string
  category?: string
  paymentType: 'category' | 'contractor' | 'project' | 'loan'
  businessType?: string
  projectType?: 'construction' | 'generic'
  projectTypeId?: string
  projectId?: string
  contractorId?: string
  projectSubType?: 'expense' | 'contractor'
  loanId?: string
  loanType?: string
  recipientType?: 'business' | 'person'
  interestRate?: number
  dueDate?: Date
  terms?: string
  notes?: string
  date: Date
  userId: string
  createdBy: string
}

export interface ExpenseRollbackData {
  expenseId: string
  userId: string
  rollbackReason: string
  auditNotes: string
}

export interface TransactionResult {
  success: boolean
  data?: any
  error?: string
  rollback?: {
    totalRollback: number
    budgetEntries: number
    projectTransactions: number
    loanTransactions: number
  }
}

// Main function to create expense with full transaction safety
export async function createExpenseWithTransaction(data: ExpenseCreationData): Promise<TransactionResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Create the main expense record
      const expense = await tx.personalExpense.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          description: data.description,
          category: data.paymentType === 'contractor' ? 'Contractor Payment'
            : data.paymentType === 'loan' ? 'Loan'
            : (data.category || 'Other'),
          date: data.date,
          tags: data.paymentType,
          notes: data.notes || null
        }
      })

      // Step 2: Create budget entry to deduct from available balance
      await tx.personalBudget.create({
        data: {
          userId: data.userId,
          amount: -data.amount, // Negative because it's an expense
          description: `Expense: ${data.description}`,
          type: 'expense'
        }
      })

      // Step 3: Handle payment-type specific operations
      await handlePaymentTypeOperations(tx, expense, data)

      // Step 4: Handle loan operations if applicable
      if (data.paymentType === 'loan' && data.loanId && data.loanType) {
        await handleLoanOperations(tx, expense, data)
      }

      return expense
    }, {
      maxWait: 5000,    // Maximum wait time
      timeout: 10000,   // Transaction timeout
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    })

    return {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Transaction failed during expense creation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown transaction error'
    }
  }
}

// Handle payment type specific operations within transaction
async function handlePaymentTypeOperations(
  tx: Prisma.TransactionClient,
  expense: any,
  data: ExpenseCreationData
) {
  switch (data.paymentType) {
    case 'contractor': {
      if (!data.contractorId) {
        throw new Error('Contractor ID is required for contractor payments')
      }

      // Verify contractor exists and is active
      const person = await tx.person.findUnique({
        where: { id: data.contractorId },
        select: {
          id: true,
          isActive: true,
          fullName: true
        }
      })

      if (!person) {
        throw new Error('Contractor not found')
      }

      if (!person.isActive) {
        throw new Error(`Cannot make payment to inactive person: ${person.fullName}. Please reactivate the person first.`)
      }

      // Update expense with contractor info in tags
      await tx.personalExpense.update({
        where: { id: expense.id },
        data: {
          tags: `contractor:${person.id}:${person.fullName}`
        }
      })
      break
    }

    case 'project': {
      if (!data.projectId) {
        throw new Error('Project ID is required for project payments')
      }

      // Handle enhanced project structure
      if (data.projectType === 'generic') {
        await handleGenericProjectPayment(tx, expense, data)
      } else {
        // Legacy construction project handling
        await handleConstructionProjectPayment(tx, expense, data)
      }
      break
    }

    case 'category': {
      // No additional operations needed for category expenses
      break
    }

    default: {
      if (data.paymentType !== 'loan') {
        throw new Error(`Unknown payment type: ${data.paymentType}`)
      }
      break
    }
  }
}

// Handle loan operations within transaction
async function handleLoanOperations(
  tx: Prisma.TransactionClient,
  expense: any,
  data: ExpenseCreationData
) {
  if (data.loanType === 'createNew') {
    await createNewLoanTransaction(tx, expense, data)
  } else if (data.loanType === 'existing') {
    await handleExistingLoanPayment(tx, expense, data)
  }
}

// Create new loan with all associated records
async function createNewLoanTransaction(
  tx: Prisma.TransactionClient,
  expense: any,
  data: ExpenseCreationData
) {
  const recipientId = data.loanId // loanId contains the recipient ID for new loans

  // Verify recipient exists
  let recipientName = ''
  if (data.recipientType === 'business') {
    const borrowerBusiness = await tx.business.findUnique({
      where: { id: recipientId },
      select: { name: true }
    })

    if (!borrowerBusiness) {
      throw new Error('Business not found')
    }
    recipientName = borrowerBusiness.name
  } else if (data.recipientType === 'person') {
    const borrowerPerson = await tx.person.findUnique({
      where: { id: recipientId },
      select: { fullName: true }
    })

    if (!borrowerPerson) {
      throw new Error('Person not found')
    }
    recipientName = borrowerPerson.fullName
  } else {
    throw new Error('Invalid recipient type')
  }

  // Generate loan number
  const loanCount = await tx.interBusinessLoan.count()
  const loanNumber = `PL${String(loanCount + 1).padStart(6, '0')}`

  // Calculate amounts
  const principal = data.amount
  const rate = Number(data.interestRate) || 0
  const totalAmount = rate > 0 ? principal * (1 + rate / 100) : principal

  // Create the new loan
  const newLoan = await tx.interBusinessLoan.create({
    data: {
      loanNumber,
      principalAmount: principal,
      interestRate: rate,
      totalAmount,
      remainingBalance: totalAmount,
      lenderType: 'personal',
      lenderUserId: data.userId,
      borrowerBusinessId: data.recipientType === 'business' ? recipientId : null,
      borrowerPersonId: data.recipientType === 'person' ? recipientId : null,
      borrowerType: data.recipientType,
      loanDate: data.date,
      dueDate: data.dueDate || null,
      terms: data.terms || null,
      notes: data.notes || null,
      createdBy: data.createdBy
    }
  })

  // Create loan disbursement transaction
  await tx.loanTransaction.create({
    data: {
      loanId: newLoan.id,
      transactionType: 'advance',
      amount: principal,
      description: data.notes ? `${data.description} - ${data.notes}` : data.description,
      transactionDate: data.date,
      personalExpenseId: expense.id,
      isAutoGenerated: false,
      createdBy: data.createdBy,
      balanceAfter: totalAmount
    }
  })

  // Create reciprocal transaction
  await tx.loanTransaction.create({
    data: {
      loanId: newLoan.id,
      transactionType: 'advance',
      amount: principal,
      description: `Auto: Loan received from Personal account (${recipientName}) - ${data.description}`,
      transactionDate: data.date,
      personalExpenseId: null,
      businessTransactionId: null,
      isAutoGenerated: true,
      autoGeneratedNote: `Auto-generated from Personal loan creation. Reciprocal transaction for personal expense ${expense.id}`,
      createdBy: data.createdBy,
      balanceAfter: totalAmount
    }
  })

  // Additional budget entry for loan disbursement
  await tx.personalBudget.create({
    data: {
      userId: data.userId,
      amount: -principal,
      description: `Loan disbursement to ${recipientName} - ${data.description}`,
      type: 'expense'
    }
  })
}

// Handle existing loan payment
async function handleExistingLoanPayment(
  tx: Prisma.TransactionClient,
  expense: any,
  data: ExpenseCreationData
) {
  // Find and validate loan
  const loan = await tx.interBusinessLoan.findFirst({
    where: {
      id: data.loanId,
      status: 'active',
      OR: [
        { lenderUserId: data.userId },
        {
            borrowerBusinessId: {
            in: (await tx.businessMembership.findMany({
              where: { userId: data.userId, isActive: true },
              select: { businessId: true }
            })).map((m: { businessId: string }) => m.businessId)
          }
        }
      ]
    }
  })

  if (!loan) {
    throw new Error('Loan not found or access denied')
  }

  // Calculate new balance
  const currentBalance = Number(loan.remainingBalance)
  const newBalance = Math.max(0, currentBalance - data.amount)

  // Create loan payment transaction
  await tx.loanTransaction.create({
    data: {
      loanId: data.loanId!,
      transactionType: 'payment',
      amount: data.amount,
      description: data.notes ? `${data.description} - ${data.notes}` : data.description,
      transactionDate: data.date,
      personalExpenseId: expense.id,
      isAutoGenerated: false,
      createdBy: data.createdBy,
      balanceAfter: newBalance
    }
  })

  // Update loan balance
  await tx.interBusinessLoan.update({
    where: { id: data.loanId },
    data: {
      remainingBalance: newBalance,
      status: newBalance === 0 ? 'paid' : 'active',
      updatedAt: new Date()
    }
  })

  // Create reciprocal transaction
  await tx.loanTransaction.create({
    data: {
      loanId: data.loanId!,
      transactionType: 'payment',
      amount: data.amount,
      description: `Auto: Loan payment received from Personal account - ${data.description}`,
      transactionDate: data.date,
      personalExpenseId: null,
      businessTransactionId: null,
      isAutoGenerated: true,
      autoGeneratedNote: `Auto-generated from Personal payment transaction. Reciprocal transaction for personal expense ${expense.id}`,
      createdBy: data.createdBy,
      balanceAfter: newBalance
    }
  })

  // Add payment amount back to budget
  await tx.personalBudget.create({
    data: {
      userId: data.userId,
      amount: data.amount,
      description: `Loan payment received - ${data.description}`,
      type: 'deposit'
    }
  })
}

// Main function to delete expense with complete rollback
export async function deleteExpenseWithRollback(data: ExpenseRollbackData): Promise<TransactionResult> {
  try {
    const rollbackResult = await prisma.$transaction(async (tx) => {
      // Find the expense with all related data
      const expense = await tx.personalExpense.findUnique({
        where: { id: data.expenseId },
        include: {
          projectTransactions: true,
          loanTransactions: {
            include: {
              loan: true
            }
          }
        }
      })

      if (!expense) {
        throw new Error('Expense not found')
      }

      if (expense.userId !== data.userId) {
        throw new Error('Unauthorized: Expense belongs to different user')
      }

      let totalRollback = 0
      let budgetEntries = 0
      let projectTransactions = 0
      let loanTransactions = 0

      // Rollback budget entries
      await tx.personalBudget.create({
        data: {
          userId: data.userId,
          amount: Number(expense.amount), // Positive to add money back
          description: `Rollback: ${expense.description}`,
          type: 'deposit'
        }
      })
      totalRollback += Number(expense.amount)
      budgetEntries += 1

      // Handle project transaction rollbacks
      for (const projectTx of expense.projectTransactions) {
        await tx.projectTransaction.delete({
          where: { id: projectTx.id }
        })
        projectTransactions += 1
      }

      // Handle loan transaction rollbacks
      for (const loanTx of expense.loanTransactions) {
        if (loanTx.transactionType === 'advance') {
          // This was a new loan creation - need to rollback the entire loan
          await rollbackLoanCreation(tx, loanTx.loan, data.userId)
          totalRollback += Number(loanTx.amount)
        } else if (loanTx.transactionType === 'payment') {
          // This was a loan payment - need to restore the loan balance
          await rollbackLoanPayment(tx, loanTx, data.userId)
          totalRollback += Number(loanTx.amount)
        }

        // Delete the loan transaction
        await tx.loanTransaction.delete({
          where: { id: loanTx.id }
        })
        loanTransactions += 1
      }

      // Delete the main expense
      await tx.personalExpense.delete({
        where: { id: data.expenseId }
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: data.userId,
          action: 'DELETE',
          entityType: 'PersonalExpense',
          entityId: data.expenseId,
          oldValues: {
            amount: expense.amount,
            description: expense.description,
            category: expense.category,
            date: expense.date
          },
          newValues: null,
          reason: data.rollbackReason,
          notes: data.auditNotes,
          ipAddress: null,
          userAgent: null
        }
      })

      return {
        totalRollback,
        budgetEntries,
        projectTransactions,
        loanTransactions
      }
    }, {
      maxWait: 5000,
      timeout: 15000, // Longer timeout for complex rollbacks
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    })

    return {
      success: true,
      rollback: rollbackResult
    }
  } catch (error) {
    console.error('Transaction failed during expense deletion:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown rollback error'
    }
  }
}

// Rollback loan creation
async function rollbackLoanCreation(tx: Prisma.TransactionClient, loan: any, userId: string) {
  // Delete all loan transactions
  await tx.loanTransaction.deleteMany({
    where: { loanId: loan.id }
  })

  // Create budget rollback for loan disbursement
  await tx.personalBudget.create({
    data: {
      userId: userId,
      amount: Number(loan.principalAmount), // Add money back
      description: `Loan rollback: ${loan.loanNumber}`,
      type: 'deposit'
    }
  })

  // Delete the loan
  await tx.interBusinessLoan.delete({
    where: { id: loan.id }
  })
}

// Rollback loan payment
async function rollbackLoanPayment(tx: Prisma.TransactionClient, loanTransaction: any, userId: string) {
  const loan = loanTransaction.loan

  // Restore loan balance
  const restoredBalance = Number(loan.remainingBalance) + Number(loanTransaction.amount)

  await tx.interBusinessLoan.update({
    where: { id: loan.id },
    data: {
      remainingBalance: restoredBalance,
      status: 'active', // Restore to active if it was marked as paid
      updatedAt: new Date()
    }
  })

  // Remove the payment from budget (subtract it back out)
  await tx.personalBudget.create({
    data: {
      userId: userId,
      amount: -Number(loanTransaction.amount), // Negative to remove money
      description: `Loan payment rollback: ${loan.loanNumber}`,
      type: 'expense'
    }
  })

  // Delete reciprocal transaction if it exists
  await tx.loanTransaction.deleteMany({
    where: {
      loanId: loan.id,
      amount: loanTransaction.amount,
      transactionDate: loanTransaction.transactionDate,
      isAutoGenerated: true
    }
  })
}

// Handle generic project payments with enhanced categorization
async function handleGenericProjectPayment(
  tx: Prisma.TransactionClient,
  expense: any,
  data: ExpenseCreationData
) {
  // Verify the generic project exists
  const project = await tx.project.findUnique({
    where: { id: data.projectId },
    select: {
      id: true,
      name: true,
      businessType: true
    }
  })

  if (!project) {
    throw new Error('Project not found')
  }

  if (data.projectSubType === 'contractor') {
    // This is a contractor payment tied to a project
    if (!data.contractorId) {
      throw new Error('Contractor ID is required for contractor payments')
    }

    // Verify project contractor exists and is valid
    const projectContractor = await tx.projectContractor.findUnique({
      where: { id: data.contractorId },
      select: {
        id: true,
        personId: true,
        projectId: true,
        person: {
          select: {
            isActive: true,
            fullName: true
          }
        }
      }
    })

    if (!projectContractor) {
      throw new Error('Project contractor not found')
    }

    if (projectContractor.projectId !== data.projectId) {
      throw new Error('Contractor is not assigned to the specified project')
    }

    if (!projectContractor.person?.isActive) {
      throw new Error(`Cannot make payment to inactive person: ${projectContractor.person.fullName}. Please reactivate the person first.`)
    }

    // Create project transaction for contractor payment
    await tx.projectTransaction.create({
      data: {
        projectId: data.projectId,
        personalExpenseId: expense.id,
        projectContractorId: projectContractor.id,
        recipientPersonId: projectContractor.personId,
        transactionType: 'contractor_payment',
        transactionSubType: 'contractor_payment',
        amount: data.amount,
        description: data.description,
        status: 'pending',
        createdBy: data.createdBy,
        notes: data.notes || null
      }
    })
  } else {
    // This is a general project expense (materials, supplies, fuel, etc.)
    await tx.projectTransaction.create({
      data: {
        projectId: data.projectId,
        personalExpenseId: expense.id,
        projectContractorId: null,
        recipientPersonId: null,
        transactionType: 'project_expense',
        transactionSubType: 'project_expense',
        amount: data.amount,
        description: data.description,
        status: 'pending',
        createdBy: data.createdBy,
        notes: data.notes || null
      }
    })
  }
}

// Handle legacy construction project payments
async function handleConstructionProjectPayment(
  tx: Prisma.TransactionClient,
  expense: any,
  data: ExpenseCreationData
) {
  if (!data.contractorId) {
    throw new Error('Contractor ID is required for construction project payments')
  }

  // Verify project contractor exists and is valid
  const projectContractor = await tx.projectContractor.findUnique({
    where: { id: data.contractorId },
    select: {
      id: true,
      personId: true,
      projectId: true,
      person: {
        select: {
          isActive: true,
          fullName: true
        }
      }
    }
  })

  if (!projectContractor) {
    throw new Error('Project contractor not found')
  }

  if (projectContractor.projectId !== data.projectId) {
    throw new Error('Contractor is not assigned to the specified project')
  }

  if (!projectContractor.person?.isActive) {
    throw new Error(`Cannot make payment to inactive person: ${projectContractor.person.fullName}. Please reactivate the person first.`)
  }

  // Create project transaction (legacy style)
  await tx.projectTransaction.create({
    data: {
      projectId: data.projectId,
      personalExpenseId: expense.id,
      projectContractorId: projectContractor.id,
      recipientPersonId: projectContractor.personId,
      transactionType: 'project_expense',
      transactionSubType: 'contractor_payment',
      amount: data.amount,
      description: data.description,
      status: 'pending',
      createdBy: data.createdBy,
      notes: data.notes || null
    }
  })
}