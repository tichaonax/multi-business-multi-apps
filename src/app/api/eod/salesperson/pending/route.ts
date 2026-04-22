import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/eod/salesperson/pending?businessId=
 *
 * For salespersons in businesses with requireSalespersonEod:
 * 1. Auto-creates today's PENDING record if none exists (lazy creation, idempotent).
 * 2. Checks for any PENDING record from a date BEFORE today (the blocking condition).
 *
 * Returns:
 *   { hasPending, pendingDate, deadlinePassed, deadlineTime, todayStatus }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

    // Fetch business settings
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { requireSalespersonEod: true, eodDeadlineTime: true },
    })

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // If feature is off, return fast — no blocking, no auto-creation
    if (!business.requireSalespersonEod) {
      return NextResponse.json({
        success: true,
        hasPending: false,
        pendingDate: null,
        deadlinePassed: false,
        deadlineTime: null,
        todayStatus: null,
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Auto-create today's PENDING record if it doesn't exist
    await prisma.salespersonEodReport.upsert({
      where: {
        businessId_salespersonId_reportDate: {
          businessId,
          salespersonId: user.id,
          reportDate: today,
        },
      },
      update: {}, // already exists — no change needed
      create: {
        businessId,
        salespersonId: user.id,
        reportDate: today,
        cashAmount: 0,
        ecocashAmount: 0,
        status: 'PENDING',
      },
    })

    // Check for any prior-day PENDING records (the blocking condition)
    const priorPending = await prisma.salespersonEodReport.findFirst({
      where: {
        businessId,
        salespersonId: user.id,
        status: 'PENDING',
        reportDate: { lt: today },
      },
      orderBy: { reportDate: 'asc' },
      select: { reportDate: true },
    })

    // Get today's record status
    const todayRecord = await prisma.salespersonEodReport.findUnique({
      where: {
        businessId_salespersonId_reportDate: {
          businessId,
          salespersonId: user.id,
          reportDate: today,
        },
      },
      select: { status: true },
    })

    // Check if deadline has passed
    let deadlinePassed = false
    const deadlineTime = business.eodDeadlineTime ?? null
    if (deadlineTime) {
      const [hours, minutes] = deadlineTime.split(':').map(Number)
      const now = new Date()
      deadlinePassed = now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)
    }

    return NextResponse.json({
      success: true,
      hasPending: !!priorPending,
      pendingDate: priorPending ? priorPending.reportDate.toISOString().split('T')[0] : null,
      deadlinePassed,
      deadlineTime,
      todayStatus: todayRecord?.status ?? 'PENDING',
    })
  } catch (error: any) {
    console.error('[eod/salesperson/pending GET]', error)
    return NextResponse.json({ error: 'Failed to check pending EOD' }, { status: 500 })
  }
}
