import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'
import { validateBusinessBalance, processBusinessTransaction } from '@/lib/business-balance-utils'

import { randomBytes } from 'crypto';
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    let businessIds: string[] = []

    // System admins can see all loans
    if (isSystemAdmin(user)) {
      // Get all business IDs for system admin
      const allBusinesses = await prisma.businesses.findMany({
        select: { id: true }
      })
      businessIds = allBusinesses.map(b => b.id)
    } else {
      // Get user's business memberships to determine which loans they can see
      const userBusinesses = await prisma.businessMemberships.findMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        select: { businessId: true }
      })
      businessIds = userBusinesses.map(membership => membership.businessId)
    }

    // Get loans where user's businesses are either lenders or borrowers
    const loans = await prisma.interBusinessLoans.findMany({
      where: {
        OR: [
          { borrowerBusinessId: { in: businessIds } }, // Loans received by user's businesses
          { lenderBusinessId: { in: businessIds } }    // Loans given by user's businesses
        ]
      },
      include: {
        businesses_inter_business_loans_borrowerBusinessIdTobusinesses: {
          select: { name: true }
        },
        businesses_inter_business_loans_lenderBusinessIdTobusinesses: {
          select: { name: true }
        },
        loan_transactions: {
          orderBy: { transactionDate: 'desc' },
          include: {
            personal_expenses: {
              select: { id: true, description: true }
            },
            users: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Convert Decimal amounts to numbers for proper JSON serialization and add frontend-compatible aliases
    const loansWithConvertedAmounts = loans.map(loan => ({
      ...loan,
      principalAmount: Number(loan.principalAmount),
      remainingBalance: Number(loan.remainingBalance),
      totalAmount: Number(loan.totalAmount),
      interestRate: Number(loan.interestRate),
      // Frontend-compatible property aliases
      borrowerBusiness: loan.businesses_inter_business_loans_borrowerBusinessIdTobusinesses,
      lenderBusiness: loan.businesses_inter_business_loans_lenderBusinessIdTobusinesses,
      loanTransactions: loan.loan_transactions.map(transaction => ({
        ...transaction,
        amount: Number(transaction.amount),
        personalExpense: transaction.personal_expenses,
        creator: transaction.users
      }))
    }))

    return NextResponse.json(loansWithConvertedAmounts)
  } catch (error) {
    console.error('Business loans fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business loans' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const {
      lenderBusinessId,
      borrowerBusinessId,
      principalAmount,
      interestRate = 0,
      terms,
      notes,
      loanDate,
      dueDate,
      transferType = 'loan'
    } = await request.json()

    // Validation
    if (!lenderBusinessId || !borrowerBusinessId || !principalAmount || principalAmount <= 0) {
      return NextResponse.json(
        { error: 'Lender business, borrower business, and principal amount are required' },
        { status: 400 }
      )
    }

    // Prevent self-loans
    if (lenderBusinessId === borrowerBusinessId) {
      return NextResponse.json(
        { error: 'A business cannot loan money to itself' },
        { status: 400 }
      )
    }

    // Verify user has access to the lender business
    let hasLenderAccess = false
    if (isSystemAdmin(user)) {
      hasLenderAccess = true
    } else {
      // Check if user is a member of the lender business
      const lenderMembership = await prisma.businessMemberships.findFirst({
        where: {
          userId: session.user.id,
          businessId: lenderBusinessId,
          isActive: true
        }
      })
      hasLenderAccess = !!lenderMembership
    }

    if (!hasLenderAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to create loans for the selected lender business' },
        { status: 403 }
      )
    }

    // Verify borrower business exists
    const borrowerBusiness = await prisma.businesses.findUnique({
      where: { id: borrowerBusinessId },
      select: { name: true }
    })

    if (!borrowerBusiness) {
      return NextResponse.json(
        { error: 'Borrower business not found' },
        { status: 404 }
      )
    }

    // Validate lender business has sufficient balance for the loan
    const principal = parseFloat(principalAmount)
    const balanceValidation = await validateBusinessBalance(lenderBusinessId, principal)

    if (!balanceValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Insufficient funds to create loan',
          details: balanceValidation.message,
          currentBalance: balanceValidation.currentBalance,
          requiredAmount: balanceValidation.requiredAmount,
          shortfall: balanceValidation.shortfall
        },
        { status: 400 }
      )
    }

    // Generate loan number
    const loanCount = await prisma.interBusinessLoans.count()
    const loanNumber = `BL${String(loanCount + 1).padStart(6, '0')}`

    // Calculate total amount (principal + interest if applicable)
    const rate = parseFloat(interestRate) || 0
    const totalAmount = rate > 0 ? principal * (1 + rate / 100) : principal

    // For profit transfers, force interest rate to 0 and update terms
    const finalInterestRate = transferType === 'profit_transfer' ? 0 : rate
    const finalTerms = transferType === 'profit_transfer'
      ? `${terms || ''} [PROFIT_TRANSFER]`.trim()
      : terms

    // Create the loan
    const loan = await prisma.interBusinessLoans.create({
      data: {
        loanNumber,
        principalAmount: principal,
        interestRate: finalInterestRate,
        totalAmount: finalInterestRate > 0 ? principal * (1 + finalInterestRate / 100) : principal,
        remainingBalance: finalInterestRate > 0 ? principal * (1 + finalInterestRate / 100) : principal,
        lenderType: 'business',
        borrowerType: 'business',
        lenderBusinessId: lenderBusinessId,
        borrowerBusinessId,
        loanDate: new Date(loanDate || new Date()),
        dueDate: dueDate ? new Date(dueDate) : null,
        terms: finalTerms || null,
        notes: notes || null,
        createdBy: session.user.id
      },
      include: {
        borrowerBusiness: {
          select: { name: true }
        },
        lenderBusiness: {
          select: { name: true }
        }
      }
    })

    // Deduct loan amount from lender business balance
    const transactionResult = await processBusinessTransaction({
      businessId: lenderBusinessId,
      amount: principal,
      type: 'loan_disbursement',
      description: `Loan disbursement to ${borrowerBusiness.name} - ${loanNumber}`,
      referenceId: loan.id,
      referenceType: 'loan',
      notes: `${transferType === 'profit_transfer' ? 'Profit transfer' : 'Business loan'} disbursement`,
      createdBy: session.user.id
    })

    if (!transactionResult.success) {
      // Rollback the loan creation if balance deduction fails
      await prisma.interBusinessLoans.delete({
        where: { id: loan.id }
      })

      return NextResponse.json(
        {
          error: 'Failed to process loan disbursement',
          details: transactionResult.error
        },
        { status: 500 }
      )
    }

    // Convert Decimal amounts to numbers for response
    const loanResponse = {
      ...loan,
      principalAmount: Number(loan.principalAmount),
      remainingBalance: Number(loan.remainingBalance),
      totalAmount: Number(loan.totalAmount),
      interestRate: Number(loan.interestRate)
    }

    return NextResponse.json(loanResponse)
  } catch (error) {
    console.error('Business loan creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create business loan' },
      { status: 500 }
    )
  }
}