import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/stock-take/drafts?businessId=
 * Returns all active DRAFTs for the current user + business (metadata only, no items).
 *
 * POST /api/stock-take/drafts
 * Body: { businessId, title }
 * Creates a new DRAFT. Multiple drafts per user+business are allowed.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = request.nextUrl.searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const drafts = await prisma.stockTakeDrafts.findMany({
      where: { businessId, createdById: user.id, status: 'DRAFT' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        createdAt: true,
        isStockTakeMode: true,
        _count: { select: { items: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ success: true, drafts })
  } catch (error) {
    console.error('[stock-take/drafts GET]', error)
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, title, isStockTakeMode } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!title?.trim()) return NextResponse.json({ error: 'title is required' }, { status: 400 })

    const draft = await prisma.stockTakeDrafts.create({
      data: {
        businessId,
        createdById: user.id,
        title: title.trim(),
        status: 'DRAFT',
        isStockTakeMode: Boolean(isStockTakeMode),
      },
    })

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('[stock-take/drafts POST]', error)
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
  }
}
