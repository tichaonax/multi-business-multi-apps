import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    const fundSources = await prisma.fundSources.findMany({
      where: { userId: session.users.id },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(fundSources)
  } catch (error) {
    console.error('Fund sources fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch fund sources' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, emoji } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Clean emoji - just use first 2 characters to handle most emojis
    const cleanEmoji = emoji ? emoji.substring(0, 2) || '💰' : '💰'

    console.log('Creating fund source:', { name, originalEmoji: emoji, cleanEmoji })

    const fundSource = await prisma.fundSources.create({
      data: {
        userId: session.users.id,
        name,
        emoji: cleanEmoji,
        isDefault: false
      }
    })

    console.log('Fund source created successfully:', fundSource)
    return NextResponse.json(fundSource)
  } catch (error) {
    console.error('Fund source creation error:', error)
    return NextResponse.json({ error: 'Failed to create fund source' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    // Verify ownership
    const fundSource = await prisma.fundSources.findFirst({
      where: { id, userId: session.users.id }
    })

    if (!fundSource) {
      return NextResponse.json({ error: 'Fund source not found' }, { status: 404 })
    }

    if (fundSource.isDefault) {
      return NextResponse.json({ error: 'Cannot delete default fund source' }, { status: 400 })
    }

    await prisma.fundSources.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fund source deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete fund source' }, { status: 500 })
  }
}