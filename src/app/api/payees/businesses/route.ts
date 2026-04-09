import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasUserPermission } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/payees/businesses
 * Create a new business payee
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'admin' && !hasUserPermission(user, 'canCreatePayees')) {
      return NextResponse.json({ error: 'You do not have permission to create payees' }, { status: 403 })
    }

    const { name, type, phone, address } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }
    if (!type?.trim()) {
      return NextResponse.json({ error: 'Business type is required' }, { status: 400 })
    }

    const business = await prisma.businesses.create({
      data: {
        name: name.trim(),
        type: type.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        isActive: true,
        isUmbrellaBusiness: false,
      },
      select: { id: true, name: true, type: true, phone: true, address: true, isActive: true },
    })

    return NextResponse.json({ success: true, data: business }, { status: 201 })
  } catch (error) {
    console.error('Error creating business payee:', error)
    return NextResponse.json({ error: 'Failed to create business payee' }, { status: 500 })
  }
}
