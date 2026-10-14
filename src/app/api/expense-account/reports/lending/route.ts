import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { isLoanOverdue } from '@/lib/loans/overdue-loan-sweep'

/**
 * GET /api/expense-account/reports/lending
 * Lending portfolio report — system-wide with breakdown by type.
 *
 * MBM-312 additions (BUSINESS-type loans only, since the overdue/approval
 * workflow is scoped to inter-business lending): per-loan isOverdue /
 * daysSinceLastActivity, a byRecipientBusiness / bySourceAccount grouping
 * ("who owes what to whom" at a glance), and a requestLog of every loan and
 * repayment request with its approval status — the audit trail the
 * approval gate makes possible.
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
        repayments: {
          select: {
            amount: true, status: true, paymentDate: true, createdAt: true,
            approvedAt: true, rejectedAt: true, rejectionReason: true,
            recorder: { select: { name: true } },
            approver: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const totalDisbursed = loans.reduce((s: number, l: any) => s + Number(l.principalAmount), 0)
    const totalOutstanding = loans.reduce((s: number, l: any) => s + Number(l.remainingBalance), 0)
    const totalRepaid = loans.reduce((s: number, l: any) => s + l.repayments.filter((r: any) => r.status === 'APPROVED').reduce((rs: number, r: any) => rs + Number(r.amount), 0), 0)
    const activeCount = loans.filter((l: any) => l.status === 'ACTIVE').length
    const paidOffCount = loans.filter((l: any) => l.status === 'PAID_OFF').length
    const pendingCount = loans.filter((l: any) => ['PENDING_APPROVAL', 'PENDING_CONTRACT'].includes(l.status)).length

    const byType = {
      PERSON: loans.filter((l: any) => l.loanType === 'PERSON').length,
      BUSINESS: loans.filter((l: any) => l.loanType === 'BUSINESS').length,
      EMPLOYEE: loans.filter((l: any) => l.loanType === 'EMPLOYEE').length,
    }

    const now = new Date()
    const byRecipientMap = new Map<string, { businessId: string; businessName: string; loanCount: number; totalOutstanding: number }>()
    const bySourceMap = new Map<string, { accountId: string; accountName: string; loanCount: number; totalOutstanding: number }>()
    const requestLog: any[] = []
    let overdueCount = 0

    const loanRows = loans.map((l: any) => {
      const approvedRepayments = l.repayments.filter((r: any) => r.status === 'APPROVED')
      const lastActivity: Date = approvedRepayments.length > 0
        ? approvedRepayments.reduce((latest: Date, r: any) => (r.paymentDate > latest ? r.paymentDate : latest), approvedRepayments[0].paymentDate)
        : l.disbursementDate
      const overdue = l.loanType === 'BUSINESS' && l.status === 'ACTIVE' && isLoanOverdue(lastActivity, now)
      if (overdue) overdueCount++

      if (l.loanType === 'BUSINESS') {
        if (l.recipientBusiness) {
          const key = l.recipientBusiness.id
          if (!byRecipientMap.has(key)) byRecipientMap.set(key, { businessId: key, businessName: l.recipientBusiness.name, loanCount: 0, totalOutstanding: 0 })
          const entry = byRecipientMap.get(key)!
          entry.loanCount++
          if (l.status === 'ACTIVE') entry.totalOutstanding += Number(l.remainingBalance)
        }
        const srcKey = l.expenseAccountId
        if (srcKey) {
          if (!bySourceMap.has(srcKey)) bySourceMap.set(srcKey, { accountId: srcKey, accountName: l.expenseAccount.accountName, loanCount: 0, totalOutstanding: 0 })
          const entry = bySourceMap.get(srcKey)!
          entry.loanCount++
          if (l.status === 'ACTIVE') entry.totalOutstanding += Number(l.remainingBalance)
        }

        requestLog.push({
          loanId: l.id, loanNumber: l.loanNumber, type: 'loan_request',
          amount: Number(l.principalAmount), status: l.status,
          createdAt: l.createdAt.toISOString(), approvedAt: l.approvedAt?.toISOString() ?? null,
        })
        for (const r of l.repayments) {
          requestLog.push({
            loanId: l.id, loanNumber: l.loanNumber, type: 'repayment_request',
            amount: Number(r.amount), status: r.status,
            requestedBy: r.recorder?.name ?? null, approvedBy: r.approver?.name ?? null,
            createdAt: r.createdAt.toISOString(), approvedAt: r.approvedAt?.toISOString() ?? null,
            rejectedAt: r.rejectedAt?.toISOString() ?? null, rejectionReason: r.rejectionReason,
          })
        }
      }

      return {
        id: l.id,
        loanNumber: l.loanNumber,
        loanType: l.loanType,
        accountName: l.expenseAccount.accountName,
        accountNumber: l.expenseAccount.accountNumber,
        expenseAccountId: l.expenseAccountId,
        recipientName: l.recipientPerson?.fullName ?? l.recipientBusiness?.name ?? l.recipientEmployee?.fullName ?? 'Unknown',
        principalAmount: Number(l.principalAmount),
        remainingBalance: Number(l.remainingBalance),
        totalRepaid: l.repayments.filter((r: any) => r.status === 'APPROVED').reduce((s: number, r: any) => s + Number(r.amount), 0),
        monthlyInstallment: l.monthlyInstallment ? Number(l.monthlyInstallment) : null,
        disbursementDate: l.disbursementDate.toISOString(),
        dueDate: l.dueDate?.toISOString() ?? null,
        status: l.status,
        purpose: l.purpose,
        paymentType: l.paymentType,
        contractSigned: l.contractSigned,
        isOverdue: overdue,
        daysSinceLastActivity: l.loanType === 'BUSINESS' ? Math.floor((now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)) : null,
      }
    })

    requestLog.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      data: {
        loans: loanRows,
        summary: {
          totalDisbursed,
          totalOutstanding,
          totalRepaid,
          activeCount,
          paidOffCount,
          pendingCount,
          overdueCount,
          byType,
        },
        byRecipientBusiness: Array.from(byRecipientMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding),
        bySourceAccount: Array.from(bySourceMap.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding),
        requestLog,
      },
    })
  } catch (error) {
    console.error('Error fetching lending report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
