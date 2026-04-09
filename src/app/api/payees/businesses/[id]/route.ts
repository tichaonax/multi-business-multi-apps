import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/payees/businesses/[id]
 * Fetch a single business payee for editing
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.role !== 'admin' && !hasUserPermission(user, 'canViewPayees')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const business = await prisma.businesses.findUnique({
      where: { id },
      select: { id: true, name: true, type: true, phone: true, address: true, isActive: true, isUmbrellaBusiness: true },
    })

    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    if (business.isUmbrellaBusiness) return NextResponse.json({ error: 'Not a payee business' }, { status: 400 })

    return NextResponse.json({ success: true, data: business })
  } catch (error) {
    console.error('Error fetching business payee:', error)
    return NextResponse.json({ error: 'Failed to fetch business payee' }, { status: 500 })
  }
}

/**
 * PUT /api/payees/businesses/[id]
 * Update a business payee (name, type, phone, address)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (user.role !== 'admin' && !hasUserPermission(user, 'canEditPayees')) {
      return NextResponse.json({ error: 'You do not have permission to edit payees' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.businesses.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    if (existing.isUmbrellaBusiness) return NextResponse.json({ error: 'Cannot edit umbrella business' }, { status: 400 })

    const { name, type, phone, address } = await request.json()

    if (!name?.trim()) return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    if (!type?.trim()) return NextResponse.json({ error: 'Business type is required' }, { status: 400 })

    const updated = await prisma.businesses.update({
      where: { id },
      data: {
        name: name.trim(),
        type: type.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        updatedAt: new Date(),
      },
      select: { id: true, name: true, type: true, phone: true, address: true, isActive: true },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating business payee:', error)
    return NextResponse.json({ error: 'Failed to update business payee' }, { status: 500 })
  }
}
