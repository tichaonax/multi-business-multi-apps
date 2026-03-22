import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/stock-take/drafts?businessId=
 * Returns the single active DRAFT for the current user + business, or null.
 *
 * POST /api/stock-take/drafts
 * Body: { businessId, title? }
 * Creates a new DRAFT. Errors if an active DRAFT already exists for this user + business.
 */

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = request.nextUrl.searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    const draft = await prisma.stockTakeDrafts.findFirst({
      where: { businessId, createdById: user.id, status: 'DRAFT' },
      include: {
        items: { orderBy: { displayOrder: 'asc' } },
      },
    })

    return NextResponse.json({ success: true, draft: draft ?? null })
  } catch (error) {
    console.error('[stock-take/drafts GET]', error)
    return NextResponse.json({ error: 'Failed to fetch draft' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, title } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    // Only one active DRAFT per user per business
    const existing = await prisma.stockTakeDrafts.findFirst({
      where: { businessId, createdById: user.id, status: 'DRAFT' },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'An active draft already exists. Delete it before creating a new one.', draftId: existing.id },
        { status: 409 }
      )
    }

    const draft = await prisma.stockTakeDrafts.create({
      data: {
        businessId,
        createdById: user.id,
        title: title?.trim() || null,
        status: 'DRAFT',
      },
    })

    return NextResponse.json({ success: true, draft })
  } catch (error) {
    console.error('[stock-take/drafts POST]', error)
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 })
  }
}
