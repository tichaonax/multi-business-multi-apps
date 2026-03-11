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

    // Collect all businessIds to search across (this business + umbrella/siblings if any)
    const businessIds: string[] = [businessId]

    try {
      const business = await prisma.businesses.findUnique({
        where: { id: businessId },
        select: { umbrellaBusinessId: true }
      })

      if (business?.umbrellaBusinessId) {
        // Include umbrella + all siblings under the same umbrella
        const siblings = await prisma.businesses.findMany({
          where: { umbrellaBusinessId: business.umbrellaBusinessId, isActive: true },
          select: { id: true }
        })
        siblings.forEach(s => { if (!businessIds.includes(s.id)) businessIds.push(s.id) })
        if (!businessIds.includes(business.umbrellaBusinessId)) {
          businessIds.push(business.umbrellaBusinessId)
        }
      }
    } catch {
      // Non-critical: fall back to just this business
    }

    // Build search where clause
    const searchWhere: any = search.length >= 2
      ? {
          OR: [
            { customerNumber: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ]
        }
      : {}

    const customers = await prisma.businessCustomers.findMany({
      where: {
        businessId: { in: businessIds },
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
