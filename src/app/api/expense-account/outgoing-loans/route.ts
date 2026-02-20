import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/outgoing-loans
 * System-wide list of all outgoing loans (for reports)
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
    const status = searchParams.get('status')
    const loanType = searchParams.get('loanType')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (loanType && loanType !== 'ALL') where.loanType = loanType

    const loans = await prisma.accountOutgoingLoans.findMany({
      where,
      include: {
        expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
        recipientPerson: { select: { id: true, fullName: true } },
        recipientBusiness: { select: { id: true, name: true } },
        recipientEmployee: { select: { id: true, fullName: true, employeeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalDisbursed = loans.reduce((s: number, l: any) => s + Number(l.principalAmount), 0)
    const totalOutstanding = loans.reduce((s: number, l: any) => s + Number(l.remainingBalance), 0)
    const activeCount = loans.filter((l: any) => l.status === 'ACTIVE').length

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
          monthlyInstallment: l.monthlyInstallment ? Number(l.monthlyInstallment) : null,
          disbursementDate: l.disbursementDate.toISOString(),
          dueDate: l.dueDate?.toISOString() ?? null,
          status: l.status,
          purpose: l.purpose,
          paymentType: l.paymentType,
          contractSigned: l.contractSigned,
          createdAt: l.createdAt.toISOString(),
        })),
        summary: {
          totalDisbursed,
          totalOutstanding,
          activeCount,
          totalCount: loans.length,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching outgoing loans:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
