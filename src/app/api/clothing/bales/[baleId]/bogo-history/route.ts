import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/clothing/bales/[baleId]/bogo-history
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ baleId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { baleId } = await params

    const history = await prisma.clothingBaleBogoHistory.findMany({
      where: { baleId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { changedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: history.map((h) => ({
        id: h.id,
        action: h.action,
        previousActive: h.previousActive,
        newActive: h.newActive,
        previousRatio: h.previousRatio,
        newRatio: h.newRatio,
        changedBy: h.user,
        changedAt: h.changedAt.toISOString(),
        notes: h.notes,
      })),
    })
  } catch (error) {
    console.error('BOGO history fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch BOGO history' }, { status: 500 })
  }
}
