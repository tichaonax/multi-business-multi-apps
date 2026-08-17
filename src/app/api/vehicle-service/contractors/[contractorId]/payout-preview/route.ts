import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'
import { getEligibleTasks } from '@/lib/vehicle-service/payout-eligibility'

function canManagePayouts(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canAccessFinancialData || perms.canCloseBooks
}

// GET /api/vehicle-service/contractors/[contractorId]/payout-preview?periodStart=&periodEnd=
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const { searchParams } = new URL(request.url)
    const periodStartStr = searchParams.get('periodStart')
    const periodEndStr = searchParams.get('periodEnd')
    const payoutId = searchParams.get('payoutId') // edit mode: also show this payout's current tasks
    if (!periodStartStr || !periodEndStr) {
      return NextResponse.json({ error: 'periodStart and periodEnd are required' }, { status: 400 })
    }

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      select: { businessId: true, persons: { select: { fullName: true } } },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })

    if (!isSystemAdmin(user) && !canManagePayouts(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const periodStart = new Date(periodStartStr)
    const periodEnd = new Date(periodEndStr + 'T23:59:59.999')
    const eligibleTasks = await getEligibleTasks(contractorId, periodStart, periodEnd)
    const tasks = eligibleTasks.map(t => ({ ...t, alreadyIncluded: false }))

    // Edit mode: a task already attached to this specific payout has payoutItem set,
    // so getEligibleTasks() correctly excludes it — pull those in separately and merge
    // them in as pre-checked, since they're still a valid part of this voucher.
    if (payoutId) {
      const payout = await prisma.vehicleServiceContractorPayouts.findUnique({
        where: { id: payoutId },
        select: { contractorId: true, voidedAt: true, payment: { select: { status: true } } },
      })
      if (!payout || payout.contractorId !== contractorId) {
        return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
      }
      if (payout.voidedAt || payout.payment.status !== 'SUBMITTED') {
        return NextResponse.json({ error: 'This payout can no longer be amended' }, { status: 409 })
      }

      const currentItems = await prisma.vehicleServiceContractorPayoutItems.findMany({
        where: { payoutId },
        select: {
          task: {
            select: {
              id: true,
              agreedFeeAmount: true,
              contractorFeeOverride: true,
              subcategory: { select: { name: true } },
              job: {
                select: {
                  id: true,
                  vehicleMake: true,
                  vehicleModel: true,
                  business_orders: { select: { orderNumber: true, createdAt: true } },
                },
              },
            },
          },
        },
      })
      for (const item of currentItems) {
        const t = item.task
        tasks.push({
          taskId: t.id,
          amount: Number(t.contractorFeeOverride ?? t.agreedFeeAmount),
          serviceName: t.subcategory.name,
          jobId: t.job.id,
          vehicle: [t.job.vehicleMake, t.job.vehicleModel].filter(Boolean).join(' ') || null,
          orderNumber: t.job.business_orders!.orderNumber,
          orderDate: t.job.business_orders!.createdAt,
          alreadyIncluded: true,
        })
      }
    }

    return NextResponse.json({
      contractorName: contractor.persons.fullName,
      tasks,
      totalAmount: tasks.reduce((sum, t) => sum + t.amount, 0),
    })
  } catch (error) {
    console.error('Payout preview error:', error)
    return NextResponse.json({ error: 'Failed to load payout preview' }, { status: 500 })
  }
}
