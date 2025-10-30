import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

// Admin PUT/DELETE for /api/admin/businesses/[id]
interface RouteParams {
  params: { id: string }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only system administrators can update businesses' }, { status: 403 })
    }

    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing business id' }, { status: 400 })

    const payload = await req.json()
    const name = typeof payload.name === 'string' ? payload.name.trim() : undefined
    const type = typeof payload.type === 'string' ? payload.type.trim() : undefined
    const description = payload.description == null ? null : String(payload.description).trim()

    const updateData: any = {}
    if (name) updateData.name = name
    if (type) updateData.type = type
    if (payload.hasOwnProperty('description')) updateData.description = description
    if (payload.hasOwnProperty('isActive')) updateData.isActive = !!payload.isActive

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const existing = await prisma.businesses.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const updated = await prisma.businesses.update({ where: { id }, data: updateData })

    // Best-effort audit log
    try {
      await prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_UPDATED',
          entityType: 'Business',
          entityId: updated.id,
          userId: session.user.id,
          details: {
            before: { name: existing.name, type: existing.type, description: existing.description || null },
            after: { name: updated.name, type: updated.type, description: updated.description || null }
          }
        } as any
      })
    } catch (e) {
      console.warn('Failed to create audit log', e)
    }

    return NextResponse.json({ message: 'Business updated', business: updated })
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = session.user as SessionUser
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Only system administrators can delete businesses' }, { status: 403 })

    const id = params.id
    if (!id) return NextResponse.json({ error: 'Missing business id' }, { status: 400 })

    const existing = await prisma.businesses.findUnique({ where: { id }, include: { business_memberships: true, employees: true } })
    if (!existing) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const activeMemberships = (existing.business_memberships || []).filter((m: any) => m.isActive)
    const activeEmployees = (existing.employees || []).filter((e: any) => e.isActive)
    if (activeMemberships.length > 0 || activeEmployees.length > 0) {
      return NextResponse.json({ error: 'Cannot delete business with active memberships or employees. Deactivate them first.' }, { status: 400 })
    }

    const deleted = await prisma.businesses.update({ where: { id }, data: { isActive: false, updatedAt: new Date() } })

    try {
      await prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_DELETED',
          entityType: 'Business',
          entityId: deleted.id,
          userId: session.user.id,
          details: { name: deleted.name }
        } as any
      })
    } catch (e) {
      console.warn('Failed to create audit log', e)
    }

    return NextResponse.json({ message: 'Business deactivated', business: deleted })
  } catch (error) {
    console.error('Error deleting business:', error)
    return NextResponse.json({ error: 'Failed to deactivate business' }, { status: 500 })
  }
}
