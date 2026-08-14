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
    const tasks = await getEligibleTasks(contractorId, periodStart, periodEnd)

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
