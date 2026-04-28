import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/eod/salesperson?businessId=&date=YYYY-MM-DD
 * Returns the calling user's EOD record for the given date (defaults to today).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const dateParam = searchParams.get('date')

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    const reportDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date()
    reportDate.setHours(0, 0, 0, 0)

    const record = await prisma.salespersonEodReport.findUnique({
      where: {
        businessId_salespersonId_reportDate: {
          businessId,
          salespersonId: user.id,
          reportDate,
        },
      },
      include: {
        submittedBy: { select: { id: true, name: true } },
      },
    })

    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: record })
  } catch (error: any) {
    console.error('[eod/salesperson GET]', error)
    return NextResponse.json({ error: 'Failed to fetch EOD record' }, { status: 500 })
  }
}

/**
 * POST /api/eod/salesperson
 * Submit an EOD report. Salespersons submit for themselves; users with canCloseBooks
 * can pass salespersonId to submit on behalf of another (override path).
 *
 * Body: { businessId, reportDate, cashAmount, ecocashAmount, notes?, salespersonId? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, reportDate, cashAmount, ecocashAmount, notes, salespersonId: targetSalespersonId } = body

    if (!businessId || !reportDate) {
      return NextResponse.json({ error: 'businessId and reportDate are required' }, { status: 400 })
    }

    const perms = getEffectivePermissions(user, businessId)
    const canOverride = user.role === 'admin' || perms.canCloseBooks

    // Determine who this report is for
    const salespersonId = targetSalespersonId && canOverride ? targetSalespersonId : user.id
    const isManagerOverride = !!(targetSalespersonId && targetSalespersonId !== user.id && canOverride)

    // If not an override, the submitter must be a salesperson/associate or have canCloseBooks
    if (!isManagerOverride) {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
        select: { role: true },
      })
      const SALESPERSON_ROLES = new Set(['salesperson', 'grocery-associate', 'restaurant-associate', 'clothing-associate'])
      const isSalesperson = !!(membership?.role && SALESPERSON_ROLES.has(membership.role))
      if (!isSalesperson && !canOverride) {
        return NextResponse.json({ error: 'Only salespersons or managers can submit EOD reports' }, { status: 403 })
      }
    }

    if (isManagerOverride && !body.overrideReason?.trim()) {
      return NextResponse.json({ error: 'Override reason is required when submitting on behalf of a salesperson' }, { status: 400 })
    }

    const parsedDate = new Date(reportDate + 'T00:00:00')
    parsedDate.setHours(0, 0, 0, 0)

    // Block re-submission unless this is a manager override
    if (!isManagerOverride) {
      const existing = await prisma.salespersonEodReport.findUnique({
        where: {
          businessId_salespersonId_reportDate: { businessId, salespersonId, reportDate: parsedDate },
        },
        select: { status: true },
      })
      if (existing?.status === 'SUBMITTED' || existing?.status === 'OVERRIDDEN') {
        return NextResponse.json({ error: 'EOD report already submitted for this date' }, { status: 409 })
      }
    }

    const record = await prisma.salespersonEodReport.upsert({
      where: {
        businessId_salespersonId_reportDate: {
          businessId,
          salespersonId,
          reportDate: parsedDate,
        },
      },
      update: {
        cashAmount: parseFloat(cashAmount) || 0,
        ecocashAmount: parseFloat(ecocashAmount) || 0,
        notes: notes?.trim() || null,
        status: isManagerOverride ? 'OVERRIDDEN' : 'SUBMITTED',
        submittedAt: new Date(),
        submittedById: user.id,
        isManagerOverride,
        overrideReason: isManagerOverride ? body.overrideReason?.trim() : null,
      },
      create: {
        businessId,
        salespersonId,
        reportDate: parsedDate,
        cashAmount: parseFloat(cashAmount) || 0,
        ecocashAmount: parseFloat(ecocashAmount) || 0,
        notes: notes?.trim() || null,
        status: isManagerOverride ? 'OVERRIDDEN' : 'SUBMITTED',
        submittedAt: new Date(),
        submittedById: user.id,
        isManagerOverride,
        overrideReason: isManagerOverride ? body.overrideReason?.trim() : null,
      },
    })

    // Notify all canCloseBooks members (non-blocking)
    notifyManagers(businessId, salespersonId, parsedDate, isManagerOverride, user.id).catch(() => {})

    return NextResponse.json({ success: true, data: record })
  } catch (error: any) {
    console.error('[eod/salesperson POST]', error)
    return NextResponse.json({ error: 'Failed to submit EOD report' }, { status: 500 })
  }
}

// Roles that have canCloseBooks by default
const CLOSE_BOOKS_ROLES = new Set(['admin', 'owner', 'business-owner', 'manager'])

async function notifyManagers(
  businessId: string,
  salespersonId: string,
  reportDate: Date,
  isOverride: boolean,
  submittedById: string
) {
  const [salesperson, members] = await Promise.all([
    prisma.users.findUnique({ where: { id: salespersonId }, select: { name: true } }),
    prisma.businessMemberships.findMany({
      where: { businessId, isActive: true },
      select: { userId: true, role: true, permissions: true },
    }),
  ])

  const dateStr = reportDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const spName = salesperson?.name ?? 'Salesperson'

  const managerUserIds = members
    .filter(m => {
      if (m.userId === submittedById) return false // don't notify the submitter
      if (CLOSE_BOOKS_ROLES.has(m.role)) return true
      const perms = m.permissions as Record<string, boolean> | null
      return perms?.canCloseBooks === true
    })
    .map(m => m.userId)

  if (managerUserIds.length === 0) return

  const title = isOverride
    ? `EOD Override — ${spName}`
    : `EOD Submitted — ${spName}`
  const message = isOverride
    ? `A manager submitted the ${dateStr} EOD report on behalf of ${spName}.`
    : `${spName} submitted their ${dateStr} EOD report. Review before closing the books.`

  await prisma.appNotification.createMany({
    data: managerUserIds.map(userId => ({
      userId,
      type: 'SALESPERSON_EOD_SUBMITTED',
      title,
      message,
      linkUrl: '/eod/manager',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })),
    skipDuplicates: true,
  })
}
