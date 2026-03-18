import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * Dedicated POS customer search endpoint.
 * Requires only authentication + a valid businessId that the user belongs to.
 * Also returns customers from the umbrella business if one exists.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    // Verify user has access to this business (any active membership)
    const isAdmin = user.role === 'admin'
    if (!isAdmin) {
      const membership = user.businessMemberships?.find(
        (m: any) => m.businessId === businessId && m.isActive
      )
      if (!membership) {
        return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
      }
    }

    // Build search where clause — no businessId restriction so customers from any
    // business can be found at checkout (cross-business customer lookup)
    const searchWhere: any = search.length >= 2
      ? {
          OR: [
            { customerNumber: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ]
        }
      : {}

    const customers = await prisma.businessCustomers.findMany({
      where: {
        isActive: true,
        ...searchWhere,
      },
      select: {
        id: true,
        customerNumber: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        customerType: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error('[POS Customer Search] Error:', error)
    return NextResponse.json(
      { error: 'Failed to search customers' },
      { status: 500 }
    )
  }
}
