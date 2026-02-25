import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// GET /api/supplier-payments/reports/overdue
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const allBusinesses = searchParams.get('all') === 'true'

    if (!businessId && !allBusinesses) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const permissions = getEffectivePermissions(user, businessId || undefined)
    if (!permissions.canViewSupplierPaymentReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    if (allBusinesses && !permissions.canViewCrossBusinessReports) {
      return NextResponse.json({ error: 'Cross-business reporting requires elevated permissions' }, { status: 403 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const where: any = {
      dueDate: { lt: today },
      status: { in: ['PENDING', 'APPROVED', 'PARTIAL'] },
    }
    if (!allBusinesses) where.businessId = businessId

    const requests = await prisma.supplierPaymentRequests.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, emoji: true } },
        submitter: { select: { id: true, name: true } },
        expenseAccount: { select: { id: true, accountName: true } },
      },
      orderBy: { dueDate: 'asc' }, // most overdue first
    })

    const now = new Date()
    const items = requests.map((r: typeof requests[0]) => {
      const amount = parseFloat(r.amount.toString())
      const paid = parseFloat(r.paidAmount.toString())
      const remaining = amount - paid
      const daysOverdue = Math.floor((now.getTime() - r.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      return {
        id: r.id,
        businessId: r.businessId,
        supplier: r.supplier,
        submitter: r.submitter,
        expenseAccount: r.expenseAccount,
        amount,
        paidAmount: paid,
        remainingAmount: remaining,
        dueDate: r.dueDate.toISOString(),
        submittedAt: r.submittedAt.toISOString(),
        status: r.status,
        daysOverdue,
        notes: r.notes,
        denialNote: r.denialNote,
      }
    }).sort((a: { daysOverdue: number }, b: { daysOverdue: number }) => b.daysOverdue - a.daysOverdue)

    const totalOverdueAmount = items.reduce((s: number, i: typeof items[0]) => s + i.remainingAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        requests: items,
        count: items.length,
        totalOverdueAmount,
      },
    })
  } catch (error) {
    console.error('Error fetching overdue report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
