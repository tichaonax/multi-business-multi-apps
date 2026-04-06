import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, getEffectivePermissions } from '@/lib/permission-utils'

/**
 * PATCH /api/ecocash-conversions/[id]/reject
 * Rejects a PENDING or APPROVED conversion. No ledger entries are created.
 * Body: { rejectionReason: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!isSystemAdmin(user) && !permissions.canSubmitPaymentBatch) {
      return NextResponse.json({ error: 'You do not have permission to reject ecocash conversions' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const rejectionReason = body.rejectionReason?.trim()

    if (!rejectionReason) {
      return NextResponse.json({ error: 'rejectionReason is required' }, { status: 400 })
    }

    const conversion = await prisma.ecocashConversion.findUnique({ where: { id } })
    if (!conversion) return NextResponse.json({ error: 'Conversion not found' }, { status: 404 })

    if (!['PENDING', 'APPROVED'].includes(conversion.status)) {
      return NextResponse.json(
        { error: `Only PENDING or APPROVED conversions can be rejected. Current status: ${conversion.status}` },
        { status: 400 }
      )
    }

    const updated = await prisma.ecocashConversion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: user.id,
        rejectedAt: new Date(),
        rejectionReason,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error rejecting ecocash conversion:', error)
    return NextResponse.json({ error: 'Failed to reject ecocash conversion' }, { status: 500 })
  }
}
