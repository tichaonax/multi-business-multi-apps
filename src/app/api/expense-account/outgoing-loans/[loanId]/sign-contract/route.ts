import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/expense-account/outgoing-loans/[loanId]/sign-contract
 * Records contract signing — moves PENDING_CONTRACT → ACTIVE, disburses loan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { loanId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageLending && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — canManageLending required' }, { status: 403 })
    }

    const body = await request.json()
    const { consentForPayrollDeduction } = body

    if (!consentForPayrollDeduction) {
      return NextResponse.json({ error: 'Payroll deduction consent is required' }, { status: 400 })
    }

    const loan = await prisma.accountOutgoingLoans.findUnique({
      where: { id: params.loanId },
      include: {
        expenseAccount: { select: { id: true, balance: true, accountName: true } },
        recipientEmployee: { select: { id: true, fullName: true, employeeNumber: true } },
      },
    })

    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    if (loan.status !== 'PENDING_CONTRACT') {
      return NextResponse.json({ error: `Cannot sign contract for loan in status: ${loan.status}` }, { status: 400 })
    }

    const amount = Number(loan.principalAmount)
    if (Number(loan.expenseAccount.balance) < amount) {
      return NextResponse.json({
        error: `Insufficient account balance. Available: $${Number(loan.expenseAccount.balance).toFixed(2)}`,
      }, { status: 400 })
    }

    // Build contract terms snapshot
    const contractTerms = {
      loanNumber: loan.loanNumber,
      lenderAccountName: loan.expenseAccount.accountName,
      borrowerName: loan.recipientEmployee?.fullName ?? 'Unknown',
      borrowerEmployeeNumber: loan.recipientEmployee?.employeeNumber ?? null,
      principalAmount: amount,
      monthlyInstallment: loan.monthlyInstallment ? Number(loan.monthlyInstallment) : null,
      totalMonths: loan.totalMonths,
      disbursementDate: loan.disbursementDate.toISOString(),
      dueDate: loan.dueDate?.toISOString() ?? null,
      purpose: loan.purpose,
      consentForPayrollDeduction: true,
      signedAt: new Date().toISOString(),
      signedByUserId: user.id,
    }

    await prisma.$transaction(async (tx: any) => {
      // Create disbursement payment (deducts from account balance)
      const payment = await tx.expenseAccountPayments.create({
        data: {
          expenseAccountId: loan.expenseAccountId,
          payeeType: 'EMPLOYEE',
          payeeEmployeeId: loan.recipientEmployeeId,
          amount,
          paymentDate: loan.disbursementDate,
          notes: `🤝 Loan disbursement — ${loan.purpose ?? 'Employee loan'}`,
          isFullPayment: true,
          status: 'SUBMITTED',
          paymentType: 'LOAN_DISBURSEMENT',
          outgoingLoanId: loan.id,
          createdBy: user.id,
        },
      })

      // Deduct from account balance
      await tx.expenseAccounts.update({
        where: { id: loan.expenseAccountId },
        data: { balance: { decrement: amount } },
      })

      // Update loan: activate + store contract terms + link disbursement
      await tx.accountOutgoingLoans.update({
        where: { id: params.loanId },
        data: {
          status: 'ACTIVE',
          contractSigned: true,
          contractSignedAt: new Date(),
          contractSignedByUserId: user.id,
          contractTerms,
          disbursementPaymentId: payment.id,
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Contract signed and loan activated. Disbursement processed.' },
    })
  } catch (error) {
    console.error('Error signing contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
