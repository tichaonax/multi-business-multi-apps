import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/fund-sources
 * List all active fund sources for the current user, sorted by usageCount DESC
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sources = await prisma.fundSources.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: sources })
  } catch (error) {
    console.error('Error fetching fund sources:', error)
    return NextResponse.json({ error: 'Failed to fetch fund sources' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/fund-sources
 * Create a new fund source for the current user
 * Body: { name: string, emoji?: string, description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, emoji = '👤', description } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const source = await prisma.fundSources.create({
      data: {
        name: name.trim(),
        emoji,
        description: description?.trim() || null,
        userId: user.id,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, data: source }, { status: 201 })
  } catch (error) {
    console.error('Error creating fund source:', error)
    return NextResponse.json({ error: 'Failed to create fund source' }, { status: 500 })
  }
}
