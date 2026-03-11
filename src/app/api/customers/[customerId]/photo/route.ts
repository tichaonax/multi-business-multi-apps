import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission } from '@/lib/permission-utils'

// PATCH /api/customers/[customerId]/photo
// Body: { photoUrl: string }
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(user, 'canAccessCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { customerId } = await context.params
    const { photoUrl } = await request.json()

    if (!photoUrl) {
      return NextResponse.json({ error: 'photoUrl is required' }, { status: 400 })
    }

    const customer = await prisma.businessCustomers.update({
      where: { id: customerId },
      data: { photoUrl },
      select: { id: true, name: true, photoUrl: true },
    })

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    console.error('Customer photo update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/customers/[customerId]/photo — remove photo
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasPermission(user, 'canAccessCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { customerId } = await context.params

    const customer = await prisma.businessCustomers.update({
      where: { id: customerId },
      data: { photoUrl: null },
      select: { id: true, name: true, photoUrl: true },
    })

    return NextResponse.json({ success: true, customer })
  } catch (error) {
    console.error('Customer photo delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
