import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-account/deposit-sources
 * List all active deposit sources (defaults + user-created)
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sources = await prisma.personalDepositSources.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, data: { sources } })
  } catch (error) {
    console.error('Error fetching deposit sources:', error)
    return NextResponse.json({ error: 'Failed to fetch deposit sources' }, { status: 500 })
  }
}

/**
 * POST /api/expense-account/deposit-sources
 * Create a custom deposit source
 * Body: { name: string, emoji?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, emoji = '💰' } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const source = await prisma.personalDepositSources.create({
      data: {
        name: name.trim(),
        emoji,
        isDefault: false,
        isUserCreated: true,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, data: { source } }, { status: 201 })
  } catch (error) {
    console.error('Error creating deposit source:', error)
    return NextResponse.json({ error: 'Failed to create deposit source' }, { status: 500 })
  }
}
