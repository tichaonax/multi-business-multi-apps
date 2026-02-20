import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function generateLoanNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 900000) + 100000
  return `OL-${year}-${random}`
}

/**
 * GET /api/expense-account/[accountId]/outgoing-loans
 * List all outgoing loans for a specific account
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = { expenseAccountId: params.accountId }
    if (status) where.status = status

    const loans = await prisma.accountOutgoingLoans.findMany({
      where,
      include: {
        recipientPerson: { select: { id: true, fullName: true } },
        recipientBusiness: { select: { id: true, name: true } },
        recipientEmployee: { select: { id: true, fullName: true, employeeNumber: true } },
        approvedByEmployee: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        loans: loans.map((l: any) => ({
          id: l.id,
          loanNumber: l.loanNumber,
          loanType: l.loanType,
          recipientName: l.recipientPerson?.fullName ?? l.recipientBusiness?.name ?? l.recipientEmployee?.fullName ?? 'Unknown',
          recipientEmployee: l.recipientEmployee,
          principalAmount: Number(l.principalAmount),
          remainingBalance: Number(l.remainingBalance),
          monthlyInstallment: l.monthlyInstallment ? Number(l.monthlyInstallment) : null,
          totalMonths: l.totalMonths,
          remainingMonths: l.remainingMonths,
          interestRate: l.interestRate ? Number(l.interestRate) : null,
          disbursementDate: l.disbursementDate.toISOString(),
          dueDate: l.dueDate?.toISOString() ?? null,
          status: l.status,
          purpose: l.purpose,
          paymentType: l.paymentType,
          contractSigned: l.contractSigned,
          contractSignedAt: l.contractSignedAt?.toISOString() ?? null,
          approvedByEmployee: l.approvedByEmployee,
          createdAt: l.createdAt.toISOString(),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching outgoing loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/[accountId]/outgoing-loans
 * Create a new outgoing loan from this expense account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — canManageLending required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      loanType,
      recipientPersonId,
      recipientBusinessId,
      recipientEmployeeId,
      principalAmount,
      monthlyInstallment,
      totalMonths,
      interestRate,
      disbursementDate,
      dueDate,
      purpose,
      notes,
      paymentType = 'MANUAL',
    } = body

    if (!loanType || !['PERSON', 'BUSINESS', 'EMPLOYEE'].includes(loanType)) {
      return NextResponse.json({ error: 'Invalid loanType' }, { status: 400 })
    }
    if (!principalAmount || Number(principalAmount) <= 0) {
      return NextResponse.json({ error: 'Invalid principal amount' }, { status: 400 })
    }
    if (!disbursementDate) {
      return NextResponse.json({ error: 'disbursementDate is required' }, { status: 400 })
    }

    // Validate recipient by type
    if (loanType === 'PERSON' && !recipientPersonId) {
      return NextResponse.json({ error: 'recipientPersonId required for PERSON loan' }, { status: 400 })
    }
    if (loanType === 'BUSINESS' && !recipientBusinessId) {
      return NextResponse.json({ error: 'recipientBusinessId required for BUSINESS loan' }, { status: 400 })
    }
    if (loanType === 'EMPLOYEE') {
      if (!recipientEmployeeId) {
        return NextResponse.json({ error: 'recipientEmployeeId required for EMPLOYEE loan' }, { status: 400 })
      }
      if (!monthlyInstallment || !totalMonths) {
        return NextResponse.json({ error: 'monthlyInstallment and totalMonths required for EMPLOYEE loan' }, { status: 400 })
      }
      // One active loan per employee rule
      const existingLoan = await prisma.accountOutgoingLoans.findFirst({
        where: {
          recipientEmployeeId,
          status: { in: ['PENDING_APPROVAL', 'PENDING_CONTRACT', 'ACTIVE'] },
        },
      })
      if (existingLoan) {
        return NextResponse.json({
          error: 'Employee already has an active loan. Only one loan per employee is allowed at a time.',
        }, { status: 409 })
      }
    }

    const account = await prisma.expenseAccounts.findUnique({
      where: { id: params.accountId },
      select: { id: true, balance: true, accountName: true, accountNumber: true },
    })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const amount = Number(principalAmount)

    // For PERSON and BUSINESS: check balance and disburse immediately (status = ACTIVE)
    // For EMPLOYEE: no balance check yet — disburse after contract signed (status = PENDING_APPROVAL)
    const initialStatus = loanType === 'EMPLOYEE' ? 'PENDING_APPROVAL' : 'ACTIVE'

    if (loanType !== 'EMPLOYEE' && Number(account.balance) < amount) {
      return NextResponse.json({
        error: `Insufficient balance. Account balance: $${Number(account.balance).toFixed(2)}`,
      }, { status: 400 })
    }

    // Generate unique loan number with retry
    let loanNumber = generateLoanNumber()
    let attempts = 0
    while (attempts < 5) {
      const exists = await prisma.accountOutgoingLoans.findUnique({ where: { loanNumber } })
      if (!exists) break
      loanNumber = generateLoanNumber()
      attempts++
    }

    const loan = await prisma.$transaction(async (tx: any) => {
      const newLoan = await tx.accountOutgoingLoans.create({
        data: {
          loanNumber,
          expenseAccountId: params.accountId,
          loanType,
          recipientPersonId: recipientPersonId ?? null,
          recipientBusinessId: recipientBusinessId ?? null,
          recipientEmployeeId: recipientEmployeeId ?? null,
          principalAmount: amount,
          remainingBalance: amount,
          monthlyInstallment: monthlyInstallment ? Number(monthlyInstallment) : null,
          totalMonths: totalMonths ?? null,
          remainingMonths: totalMonths ?? null,
          interestRate: interestRate ? Number(interestRate) : null,
          disbursementDate: new Date(disbursementDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          status: initialStatus,
          purpose: purpose ?? null,
          notes: notes ?? null,
          paymentType,
          createdBy: user.id,
        },
      })

      // For non-employee loans, disburse immediately
      if (loanType !== 'EMPLOYEE') {
        // Determine payeeType and payeeId for the disbursement payment
        const payeeType = loanType === 'PERSON' ? 'PERSON' : 'BUSINESS'

        const payment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: params.accountId,
            payeeType,
            payeePersonId: recipientPersonId ?? null,
            payeeBusinessId: recipientBusinessId ?? null,
            amount,
            paymentDate: new Date(disbursementDate),
            notes: `🤝 Loan disbursement — ${purpose ?? 'No purpose specified'}`,
            isFullPayment: true,
            status: 'SUBMITTED',
            paymentType: 'LOAN_DISBURSEMENT',
            outgoingLoanId: newLoan.id,
            createdBy: user.id,
          },
        })

        // Deduct from account balance
        await tx.expenseAccounts.update({
          where: { id: params.accountId },
          data: { balance: { decrement: amount } },
        })

        // For BUSINESS loans: auto-credit the recipient business's primary expense account
        if (loanType === 'BUSINESS' && recipientBusinessId) {
          const recipientAccount = await tx.expenseAccounts.findFirst({
            where: { businessId: recipientBusinessId, isActive: true, isSibling: false },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          })
          if (recipientAccount) {
            await tx.expenseAccountDeposits.create({
              data: {
                expenseAccountId: recipientAccount.id,
                sourceType: 'LOAN_RECEIVED',
                amount,
                depositDate: new Date(disbursementDate),
                autoGeneratedNote: `🤝 Loan received — ${purpose ?? newLoan.loanNumber}`,
                createdBy: user.id,
              },
            })
            await tx.expenseAccounts.update({
              where: { id: recipientAccount.id },
              data: { balance: { increment: amount } },
            })
          }
        }

        // Link disbursement payment back to loan
        await tx.accountOutgoingLoans.update({
          where: { id: newLoan.id },
          data: { disbursementPaymentId: payment.id },
        })
      }

      return newLoan
    })

    return NextResponse.json({
      success: true,
      data: {
        loan: {
          id: loan.id,
          loanNumber: loan.loanNumber,
          status: loan.status,
          principalAmount: Number(loan.principalAmount),
          loanType: loan.loanType,
        },
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating outgoing loan:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
