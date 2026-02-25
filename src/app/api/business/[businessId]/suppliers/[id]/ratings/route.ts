import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// POST /api/business/[businessId]/suppliers/[id]/ratings
// Upsert a rating for a supplier (one per user per supplier per business).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, id: supplierId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canApproveSupplierPayments && !permissions.canEditSuppliers) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const rating = Number(body.rating)
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }
    const comment: string | undefined = body.comment ?? undefined

    const result = await prisma.supplierRatings.upsert({
      where: {
        supplierId_businessId_ratedBy: {
          supplierId,
          businessId,
          ratedBy: user.id,
        },
      },
      update: { rating, comment: comment ?? null, updatedAt: new Date() },
      create: { supplierId, businessId, ratedBy: user.id, rating, comment: comment ?? null },
    })

    return NextResponse.json({ success: true, rating: result })
  } catch (error) {
    console.error('Error saving supplier rating:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
