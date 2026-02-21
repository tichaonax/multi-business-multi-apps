import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ periodId: string }>
}

/**
 * POST /api/payroll/periods/[periodId]/zimra/submit
 * Records that the ZIMRA P2 form has been submitted and the total tax due has been paid.
 * Body: { paymentReference?: string, notes?: string }
 *
 * Levy must have been processed first (status = LEVY_PROCESSED).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodId } = await params
    const body = await request.json()
    const { paymentReference, notes } = body

    const remittance = await prisma.payrollZimraRemittances.findUnique({
      where: { payrollPeriodId: periodId },
    })
    if (!remittance) {
      return NextResponse.json({ error: 'ZIMRA remittance record not found' }, { status: 404 })
    }
    if (remittance.status !== 'LEVY_PROCESSED') {
      return NextResponse.json(
        { error: `Cannot mark as submitted — AIDS levy must be processed first (current status: ${remittance.status})` },
        { status: 400 }
      )
    }

    const updated = await prisma.payrollZimraRemittances.update({
      where: { id: remittance.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedBy: user.id,
        paymentReference: paymentReference || null,
        notes: notes || remittance.notes,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'ZIMRA P2 submission recorded',
      remittance: {
        id: updated.id,
        status: updated.status,
        submittedAt: updated.submittedAt,
        paymentReference: updated.paymentReference,
      },
    })
  } catch (error) {
    console.error('Error recording ZIMRA submission:', error)
    return NextResponse.json({ error: 'Failed to record ZIMRA submission' }, { status: 500 })
  }
}
