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

    // This endpoint is deprecated - categories are now managed via /api/expense-categories
    // Return empty array to maintain backward compatibility with old code
    // that might still call this endpoint
    return NextResponse.json([])
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

    // This endpoint is deprecated
    // Categories are now managed via the 3-level hierarchy system
    // Direct category creation is no longer supported
    return NextResponse.json(
      { error: 'This endpoint is deprecated. Please use the category hierarchy system.' },
      { status: 410 } // 410 Gone
    )
  } catch (error) {
    console.error('Category creation error:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}