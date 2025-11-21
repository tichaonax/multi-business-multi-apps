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
      lenderType,
      lenderBusinessId,
      lenderPersonId,
      borrowerType,
      borrowerBusinessId,
      borrowerPersonId,
      principalAmount,
      interestRate = 0,
      terms,
      notes,
      loanDate,
      dueDate,
      transferType = 'loan'
    } = await request.json()

    // Validation
    if (!principalAmount || principalAmount <= 0) {
      return NextResponse.json(
        { error: 'Principal amount is required and must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate lender
    if (!lenderType || (lenderType === 'business' && !lenderBusinessId) || (lenderType === 'person' && !lenderPersonId)) {
      return NextResponse.json(
        { error: 'Valid lender information is required' },
        { status: 400 }
      )
    }

    // Validate borrower
    if (!borrowerType || (borrowerType === 'business' && !borrowerBusinessId) || (borrowerType === 'person' && !borrowerPersonId)) {
      return NextResponse.json(
        { error: 'Valid borrower information is required' },
        { status: 400 }
      )
    }

    // Prevent self-loans (business lending to itself)
    if (lenderType === 'business' && borrowerType === 'business' && lenderBusinessId === borrowerBusinessId) {
      return NextResponse.json(
        { error: 'A business cannot loan money to itself' },
        { status: 400 }
      )
    }

    // Permission check: User must have admin/manager/owner role
    let hasPermission = false
    if (isSystemAdmin(user)) {
      hasPermission = true
    } else {
      // For business-related loans, check if user has required role in the business
      const businessIdToCheck = lenderType === 'business' ? lenderBusinessId : borrowerBusinessId

      if (businessIdToCheck) {
        const membership = await prisma.businessMemberships.findFirst({
          where: {
            userId: session.user.id,
            businessId: businessIdToCheck,
            isActive: true,
            role: { in: ['admin', 'manager', 'owner'] }
          }
        })
        hasPermission = !!membership
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins, managers, and owners can create loans.' },
        { status: 403 }
      )
    }

    // Get lender name
    let lenderName = 'External Lender'
    if (lenderType === 'business' && lenderBusinessId) {
      const lenderBusiness = await prisma.businesses.findUnique({
        where: { id: lenderBusinessId },
        select: { name: true }
      })
      if (!lenderBusiness) {
        return NextResponse.json({ error: 'Lender business not found' }, { status: 404 })
      }
      lenderName = lenderBusiness.name
    } else if (lenderType === 'person' && lenderPersonId) {
      const lenderPerson = await prisma.persons.findUnique({
        where: { id: lenderPersonId },
        select: { fullName: true }
      })
      if (!lenderPerson) {
        return NextResponse.json({ error: 'Lender not found' }, { status: 404 })
      }
      lenderName = lenderPerson.fullName
    }

    // Get borrower name
    let borrowerName = 'External Borrower'
    if (borrowerType === 'business' && borrowerBusinessId) {
      const borrowerBusiness = await prisma.businesses.findUnique({
        where: { id: borrowerBusinessId },
        select: { name: true }
      })
      if (!borrowerBusiness) {
        return NextResponse.json({ error: 'Borrower business not found' }, { status: 404 })
      }
      borrowerName = borrowerBusiness.name
    } else if (borrowerType === 'person' && borrowerPersonId) {
      const borrowerPerson = await prisma.persons.findUnique({
        where: { id: borrowerPersonId },
        select: { fullName: true }
      })
      if (!borrowerPerson) {
        return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
      }
      borrowerName = borrowerPerson.fullName
    }

    const principal = parseFloat(principalAmount)

    // Only validate balance if lender is a business
    // External lenders (persons/banks) manage their own funds
    if (lenderType === 'business' && lenderBusinessId) {
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
        lenderType: lenderType,
        borrowerType: borrowerType,
        lenderBusinessId: lenderType === 'business' ? lenderBusinessId : null,
        lenderPersonId: lenderType === 'person' ? lenderPersonId : null,
        borrowerBusinessId: borrowerType === 'business' ? borrowerBusinessId : null,
        borrowerPersonId: borrowerType === 'person' ? borrowerPersonId : null,
        loanDate: new Date(loanDate || new Date()),
        dueDate: dueDate ? new Date(dueDate) : null,
        terms: finalTerms || null,
        notes: notes || null,
        createdBy: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        businesses_inter_business_loans_borrowerBusinessIdTobusinesses: {
          select: { name: true }
        },
        businesses_inter_business_loans_lenderBusinessIdTobusinesses: {
          select: { name: true }
        },
        persons_lender: {
          select: { fullName: true }
        },
        persons_borrower: {
          select: { fullName: true }
        }
      }
    })

    // Only deduct balance if lender is a business
    // External lenders (persons/banks) manage their own funds
    if (lenderType === 'business' && lenderBusinessId) {
      const transactionResult = await processBusinessTransaction({
        businessId: lenderBusinessId,
        amount: principal,
        type: 'loan_disbursement',
        description: `Loan disbursement to ${borrowerName} - ${loanNumber}`,
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
    }

    // ADD balance to borrower if borrower is a business
    // This credits the loan proceeds to the borrower's account
    if (borrowerType === 'business' && borrowerBusinessId) {
      const creditResult = await processBusinessTransaction({
        businessId: borrowerBusinessId,
        amount: principal,
        type: 'loan_received',
        description: `Loan received from ${lenderName} - ${loanNumber}`,
        referenceId: loan.id,
        referenceType: 'loan',
        notes: `Loan proceeds received - Principal: $${principal}`,
        createdBy: session.user.id
      })

      if (!creditResult.success) {
        console.error('Failed to credit borrower balance:', creditResult.error)
        // Don't fail the loan - just log the error
        // The loan is still valid, balance tracking can be fixed later
      }
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