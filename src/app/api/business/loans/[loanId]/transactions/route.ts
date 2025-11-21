import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateBusinessBalance, processBusinessTransaction } from '@/lib/business-balance-utils'
import { isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
interface RouteParams {
  params: Promise<{ loanId: string }>
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { loanId } = await params
    const {
      transactionType, // 'payment' or 'advance'
      amount,
      description,
      transactionDate,
      notes
    } = await req.json()

    // Validation
    if (!transactionType || !amount || !description || amount <= 0) {
      return NextResponse.json(
        { error: 'Transaction type, amount, and description are required' },
        { status: 400 }
      )
    }

    if (!['payment', 'advance'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'Transaction type must be payment or advance' },
        { status: 400 }
      )
    }

    // Get user's business memberships
    const userBusinesses = await prisma.businessMemberships.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: {
        businessId: true,
        role: true
      }
    })

    const businessIds = userBusinesses.map(membership => membership.businessId)

    // Fetch the loan with all relations
    const loan = await prisma.interBusinessLoans.findFirst({
      where: {
        id: loanId,
        status: 'active',
        OR: [
          { borrowerBusinessId: { in: businessIds } }, // User's business is borrower
          { lenderBusinessId: { in: businessIds } },   // User's business is lender
          // For person borrower/lender loans, check if user has any admin/manager/owner role
          ...(businessIds.length > 0 ? [
            { borrowerType: 'person' },
            { lenderType: 'person' }
          ] : [])
        ]
      },
      include: {
        businesses_inter_business_loans_borrowerBusinessIdTobusinesses: true,
        businesses_inter_business_loans_lenderBusinessIdTobusinesses: true,
        persons_lender: true,
        persons_borrower: true
      }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found or access denied' }, { status: 404 })
    }

    // Permission check: User must have admin/manager/owner role
    let hasPermission = false
    if (isSystemAdmin(user)) {
      hasPermission = true
    } else {
      // Check if user has required role in the business involved in the loan
      const relevantBusinessId = transactionType === 'payment'
        ? loan.borrowerBusinessId
        : loan.lenderBusinessId

      if (relevantBusinessId) {
        const membership = userBusinesses.find(m => m.businessId === relevantBusinessId)
        if (membership && ['admin', 'manager', 'owner'].includes(membership.role)) {
          hasPermission = true
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins, managers, and owners can process loan transactions.' },
        { status: 403 }
      )
    }

    // Determine which business (if any) is making the transaction and validate balance
    let payingBusinessId: string | null = null
    let requiresBalanceValidation = false

    if (transactionType === 'payment') {
      // For payments, the borrower pays the lender
      if (loan.borrowerType === 'business' && loan.borrowerBusinessId) {
        // Business borrower making payment
        if (businessIds.includes(loan.borrowerBusinessId)) {
          payingBusinessId = loan.borrowerBusinessId
          requiresBalanceValidation = true
        } else {
          return NextResponse.json(
            { error: 'Only the borrower business can make loan payments' },
            { status: 403 }
          )
        }
      } else if (loan.borrowerType === 'person') {
        // Person borrower making payment - no balance validation needed
        // External persons manage their own funds
        requiresBalanceValidation = false
      }

      // Validate borrower business has sufficient balance for payment (if business)
      if (requiresBalanceValidation && payingBusinessId) {
        const balanceValidation = await validateBusinessBalance(payingBusinessId, Number(amount))

        if (!balanceValidation.isValid) {
          return NextResponse.json(
            {
              error: 'Insufficient funds to make loan payment',
              details: balanceValidation.message,
              currentBalance: balanceValidation.currentBalance,
              requiredAmount: balanceValidation.requiredAmount,
              shortfall: balanceValidation.shortfall
            },
            { status: 400 }
          )
        }
      }
    } else if (transactionType === 'advance') {
      // For advances, the lender provides additional funds
      if (loan.lenderType === 'business' && loan.lenderBusinessId) {
        // Business lender providing advance
        if (businessIds.includes(loan.lenderBusinessId)) {
          payingBusinessId = loan.lenderBusinessId
          requiresBalanceValidation = true
        } else {
          return NextResponse.json(
            { error: 'Only the lender business can provide loan advances' },
            { status: 403 }
          )
        }
      } else if (loan.lenderType === 'person') {
        // Person lender providing advance - no balance validation needed
        // External lenders manage their own funds
        requiresBalanceValidation = false
      }

      // Validate lender business has sufficient balance for advance (if business)
      if (requiresBalanceValidation && payingBusinessId) {
        const balanceValidation = await validateBusinessBalance(payingBusinessId, Number(amount))

        if (!balanceValidation.isValid) {
          return NextResponse.json(
            {
              error: 'Insufficient funds to provide loan advance',
              details: balanceValidation.message,
              currentBalance: balanceValidation.currentBalance,
              requiredAmount: balanceValidation.requiredAmount,
              shortfall: balanceValidation.shortfall
            },
            { status: 400 }
          )
        }
      }
    }

    // Calculate new balance based on transaction type
    const currentBalance = Number(loan.remainingBalance)
    let newBalance: number

    if (transactionType === 'payment') {
      // Payment reduces the balance
      newBalance = Math.max(0, currentBalance - Number(amount))
    } else if (transactionType === 'advance') {
      // Advance increases the balance
      newBalance = currentBalance + Number(amount)
    } else {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
    }

    // Create the loan transaction record (business-initiated)
    const businessTransaction = await prisma.loanTransactions.create({
      data: {
        loanId,
        transactionType,
        amount: Number(amount),
        description: notes ? `${description} - ${notes}` : description,
        transactionDate: new Date(transactionDate || new Date()),
        personalExpenseId: null, // No personal expense for business transaction
        businessTransactionId: null, // TODO: Link to business transaction in future
        isAutoGenerated: false, // This is the original business transaction
        balanceAfter: newBalance,
        createdBy: session.user.id
      }
    })

    // Update the loan balance
    await prisma.interBusinessLoans.update({
      where: { id: loanId },
      data: { 
        remainingBalance: newBalance,
        updatedAt: new Date()
      }
    })

    // Update the loan status if it's fully paid
    if (newBalance === 0 && transactionType === 'payment') {
      await prisma.interBusinessLoans.update({
        where: { id: loanId },
        data: { status: 'paid' }
      })
    }

    // Process business balance transaction for the paying business (only if it's a business)
    if (payingBusinessId && requiresBalanceValidation) {
      const transactionResult = await processBusinessTransaction({
        businessId: payingBusinessId,
        amount: Number(amount),
        type: transactionType === 'payment' ? 'loan_payment' : 'loan_disbursement',
        description: transactionType === 'payment'
          ? `Loan payment - ${loan.loanNumber}: ${description}`
          : `Loan advance - ${loan.loanNumber}: ${description}`,
        referenceId: loanId,
        referenceType: 'loan',
        notes: notes ? `${notes} - Transaction ID: ${businessTransaction.id}` : `Transaction ID: ${businessTransaction.id}`,
        createdBy: session.user.id
      })

      if (!transactionResult.success) {
        // Rollback the loan transaction if balance deduction fails
        await prisma.loanTransactions.delete({
          where: { id: businessTransaction.id }
        })

        // Restore original loan balance
        await prisma.interBusinessLoans.update({
          where: { id: loanId },
          data: {
            remainingBalance: currentBalance,
            status: 'active' // Reset status if it was changed
          }
        })

        return NextResponse.json(
          {
            error: `Failed to process ${transactionType} transaction`,
            details: transactionResult.error
          },
          { status: 500 }
        )
      }
    }

    // Create automatic reciprocal transaction for the other side
    // This creates the "mirror" transaction so both sides see the transaction
    const reciprocalDescription = transactionType === 'payment' 
      ? `Auto: Loan payment received from Business account - ${description}`
      : `Auto: Loan advance from Business account - ${description}`

    const reciprocalTransaction = await prisma.loanTransactions.create({
      data: {
        loanId,
        transactionType,
        amount: Number(amount),
        description: reciprocalDescription,
        transactionDate: new Date(transactionDate || new Date()),
        personalExpenseId: null, // No personal expense for auto-generated transaction
        businessTransactionId: null, // TODO: Link to business transaction in future
        isAutoGenerated: true,
        autoGeneratedNote: `Auto-generated from Business ${transactionType} transaction. Reciprocal transaction for business transaction ${businessTransaction.id}`,
        balanceAfter: newBalance,
        createdBy: session.user.id
      }
    })

    // Convert Decimal amounts to numbers for response
    const transactionResponse = {
      ...businessTransaction,
      amount: Number(businessTransaction.amount),
      reciprocal: {
        ...reciprocalTransaction,
        amount: Number(reciprocalTransaction.amount)
      }
    }

    return NextResponse.json(transactionResponse)
  } catch (error) {
    console.error('Business loan transaction error:', error)
    return NextResponse.json(
      { error: 'Failed to process loan transaction' },
      { status: 500 }
    )
  }
}