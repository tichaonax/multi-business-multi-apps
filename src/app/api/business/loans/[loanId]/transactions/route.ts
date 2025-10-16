import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateBusinessBalance, processBusinessTransaction } from '@/lib/business-balance-utils'

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

    // Verify the loan exists and user has access to it
    const userBusinesses = await prisma.business_memberships.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      select: { businessId: true }
    })

    const businessIds = userBusinesses.map(membership => membership.businessId)

    const loan = await prisma.interBusinessLoans.findFirst({
      where: {
        id: loanId,
        status: 'active',
        OR: [
          { borrowerBusinessId: { in: businessIds } }, // User's business is borrower
          { lenderBusinessId: { in: businessIds } }    // User's business is lender
        ]
      }
    })

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found or access denied' }, { status: 404 })
    }

    // Determine which business is making the transaction and validate balance for payments
    let payingBusinessId: string | null = null

    if (transactionType === 'payment') {
      // For payments, the borrower business pays the lender business
      if (loan.borrowerBusinessId && businessIds.includes(loan.borrowerBusinessId)) {
        payingBusinessId = loan.borrowerBusinessId
      } else {
        return NextResponse.json(
          { error: 'Only the borrower business can make loan payments' },
          { status: 403 }
        )
      }

      // Validate borrower business has sufficient balance for payment
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
    } else if (transactionType === 'advance') {
      // For advances, the lender business provides additional funds
      if (loan.lenderBusinessId && businessIds.includes(loan.lenderBusinessId)) {
        payingBusinessId = loan.lenderBusinessId
      } else {
        return NextResponse.json(
          { error: 'Only the lender business can provide loan advances' },
          { status: 403 }
        )
      }

      // Validate lender business has sufficient balance for advance
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
    const businessTransaction = await prisma.loan_transactions.create({
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

    // Process business balance transaction for the paying business
    if (payingBusinessId) {
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
        await prisma.loan_transactions.delete({
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

    const reciprocalTransaction = await prisma.loan_transactions.create({
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