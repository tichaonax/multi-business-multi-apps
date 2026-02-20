import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/reports/lending
 * Lending portfolio report — system-wide with breakdown by type
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canViewExpenseReports && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // optional filter

    const where: any = {}
    if (status && status !== 'ALL') where.status = status

    const loans = await prisma.accountOutgoingLoans.findMany({
      where,
      include: {
        expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
        recipientPerson: { select: { id: true, fullName: true } },
        recipientBusiness: { select: { id: true, name: true } },
        recipientEmployee: { select: { id: true, fullName: true, employeeNumber: true } },
        repayments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalDisbursed = loans.reduce((s: number, l: any) => s + Number(l.principalAmount), 0)
    const totalOutstanding = loans.reduce((s: number, l: any) => s + Number(l.remainingBalance), 0)
    const totalRepaid = loans.reduce((s: number, l: any) => s + l.repayments.reduce((rs: number, r: any) => rs + Number(r.amount), 0), 0)
    const activeCount = loans.filter((l: any) => l.status === 'ACTIVE').length
    const paidOffCount = loans.filter((l: any) => l.status === 'PAID_OFF').length
    const pendingCount = loans.filter((l: any) => ['PENDING_APPROVAL', 'PENDING_CONTRACT'].includes(l.status)).length

    const byType = {
      PERSON: loans.filter((l: any) => l.loanType === 'PERSON').length,
      BUSINESS: loans.filter((l: any) => l.loanType === 'BUSINESS').length,
      EMPLOYEE: loans.filter((l: any) => l.loanType === 'EMPLOYEE').length,
    }

    return NextResponse.json({
      success: true,
      data: {
        loans: loans.map((l: any) => ({
          id: l.id,
          loanNumber: l.loanNumber,
          loanType: l.loanType,
          accountName: l.expenseAccount.accountName,
          accountNumber: l.expenseAccount.accountNumber,
          expenseAccountId: l.expenseAccountId,
          recipientName: l.recipientPerson?.fullName ?? l.recipientBusiness?.name ?? l.recipientEmployee?.fullName ?? 'Unknown',
          principalAmount: Number(l.principalAmount),
          remainingBalance: Number(l.remainingBalance),
          totalRepaid: l.repayments.reduce((s: number, r: any) => s + Number(r.amount), 0),
          monthlyInstallment: l.monthlyInstallment ? Number(l.monthlyInstallment) : null,
          disbursementDate: l.disbursementDate.toISOString(),
          dueDate: l.dueDate?.toISOString() ?? null,
          status: l.status,
          purpose: l.purpose,
          paymentType: l.paymentType,
          contractSigned: l.contractSigned,
        })),
        summary: {
          totalDisbursed,
          totalOutstanding,
          totalRepaid,
          activeCount,
          paidOffCount,
          pendingCount,
          byType,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching lending report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
