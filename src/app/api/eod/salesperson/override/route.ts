import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * POST /api/eod/salesperson/override
 * Manager submits an EOD report on behalf of a salesperson.
 * Body: { businessId, salespersonId, reportDate, cashAmount, ecocashAmount, notes?, overrideReason }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, salespersonId, reportDate, cashAmount, ecocashAmount, notes, overrideReason } = body

    if (!businessId || !salespersonId || !reportDate) {
      return NextResponse.json({ error: 'businessId, salespersonId and reportDate are required' }, { status: 400 })
    }

    const perms = getEffectivePermissions(user, businessId)
    if (user.role !== 'admin' && !perms.canCloseBooks) {
      return NextResponse.json({ error: 'Only managers or admins can submit override EOD reports' }, { status: 403 })
    }

    if (!overrideReason?.trim()) {
      return NextResponse.json({ error: 'Override reason is required' }, { status: 400 })
    }

    const parsedDate = new Date(reportDate + 'T00:00:00')
    parsedDate.setHours(0, 0, 0, 0)

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
        status: 'OVERRIDDEN',
        submittedAt: new Date(),
        submittedById: user.id,
        isManagerOverride: true,
        overrideReason: overrideReason.trim(),
      },
      create: {
        businessId,
        salespersonId,
        reportDate: parsedDate,
        cashAmount: parseFloat(cashAmount) || 0,
        ecocashAmount: parseFloat(ecocashAmount) || 0,
        notes: notes?.trim() || null,
        status: 'OVERRIDDEN',
        submittedAt: new Date(),
        submittedById: user.id,
        isManagerOverride: true,
        overrideReason: overrideReason.trim(),
      },
      include: {
        salesperson: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } },
      },
    })

    // Notify the salesperson that their EOD was submitted on their behalf (non-blocking)
    prisma.appNotification.create({
      data: {
        userId: salespersonId,
        type: 'SALESPERSON_EOD_OVERRIDDEN',
        title: 'EOD Report Submitted by Manager',
        message: `Your end-of-day report for ${parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} was submitted on your behalf.`,
        linkUrl: '/eod/history',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, data: record })
  } catch (error: any) {
    console.error('[eod/salesperson/override POST]', error)
    return NextResponse.json({ error: 'Failed to submit override EOD' }, { status: 500 })
  }
}
