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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to access personal finance
    if (!hasUserPermission(user, 'canAccessPersonalFinance')) {
      return NextResponse.json({ error: 'Insufficient permissions to access personal finance' }, { status: 403 })
    }

    const categories = await prisma.expenseCategories.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' }
    })

    // If no categories exist, create default ones
    if (categories.length === 0) {
      const defaultCategories = [
        { name: 'Food & Dining', emoji: '🍽️', color: '#EF4444' },
        { name: 'Transportation', emoji: '🚗', color: '#3B82F6' },
        { name: 'Utilities', emoji: '💡', color: '#F59E0B' },
        { name: 'Entertainment', emoji: '🎬', color: '#8B5CF6' },
        { name: 'Shopping', emoji: '🛒', color: '#10B981' },
        { name: 'Healthcare', emoji: '🏥', color: '#EC4899' },
        { name: 'Education', emoji: '📚', color: '#6366F1' },
        { name: 'Loan', emoji: '💳', color: '#F97316' },
        { name: 'Other', emoji: '💰', color: '#6B7280' },
      ]

      const createdCategories = await Promise.all(
        defaultCategories.map(cat => 
          prisma.expenseCategories.create({
            data: {
              userId: session.user.id,
              name: cat.name,
              emoji: cat.emoji,
              color: cat.color,
              isDefault: true
            }
          })
        )
      )

      return NextResponse.json(createdCategories)
    }

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to manage personal categories
    if (!hasUserPermission(user, 'canManagePersonalCategories')) {
      return NextResponse.json({ error: 'Insufficient permissions to manage categories' }, { status: 403 })
    }

    const { name, emoji, color } = await request.json()

    if (!name || !emoji) {
      return NextResponse.json({ error: 'Name and emoji are required' }, { status: 400 })
    }

    const category = await prisma.expenseCategories.create({
      data: {
        userId: session.user.id,
        name,
        emoji,
        color: color || '#3B82F6',
        isDefault: false
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}