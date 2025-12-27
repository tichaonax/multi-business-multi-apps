import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

// Admin PUT/DELETE for /api/admin/businesses/[id]
interface RouteParams {
  params: Promise<{ id: string }>
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

    const { id } = await params
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
    if (payload.hasOwnProperty('wifiIntegrationEnabled')) updateData.wifiIntegrationEnabled = !!payload.wifiIntegrationEnabled

    // Business contact information
    if (payload.hasOwnProperty('address')) {
      updateData.address = payload.address?.trim() || null
    }
    if (payload.hasOwnProperty('phone')) {
      updateData.phone = payload.phone?.trim() || null
    }

    // Receipt configuration fields
    if (payload.hasOwnProperty('receiptReturnPolicy')) {
      updateData.receiptReturnPolicy = payload.receiptReturnPolicy?.trim() || null
    }
    if (payload.hasOwnProperty('taxIncludedInPrice')) {
      updateData.taxIncludedInPrice = !!payload.taxIncludedInPrice
    }
    if (payload.hasOwnProperty('taxRate')) {
      updateData.taxRate = payload.taxRate ? parseFloat(payload.taxRate) : null
    }
    if (payload.hasOwnProperty('taxLabel')) {
      updateData.taxLabel = payload.taxLabel?.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const existing = await prisma.businesses.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const updated = await prisma.businesses.update({ where: { id }, data: updateData })

    // Best-effort audit log
    try {
      // Determine if this is a reactivation (inactive -> active)
      const isReactivation = !existing.isActive && updateData.isActive === true
      
      await prisma.auditLogs.create({
        data: {
          action: isReactivation ? 'BUSINESS_REACTIVATED' : 'BUSINESS_UPDATED',
          entityType: 'Business',
          entityId: updated.id,
          userId: session.user.id,
          details: {
            before: { 
              name: existing.name, 
              type: existing.type, 
              description: existing.description || null,
              isActive: existing.isActive
            },
            after: { 
              name: updated.name, 
              type: updated.type, 
              description: updated.description || null,
              isActive: updated.isActive
            }
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

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing business id' }, { status: 400 })

    // Check if hard delete is requested (only for demo businesses)
    const { searchParams } = new URL(req.url)
    const hardDelete = searchParams.get('hardDelete') === 'true'

    const existing = await prisma.businesses.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const isDemoBusiness = existing.name.includes('[Demo]')

    // Verify the user exists in database (handle stale sessions after DB reset)
    const userExists = await prisma.users.findUnique({ where: { id: session.user.id } })
    const validUserId = userExists ? session.user.id : null

    // Hard delete (permanent) - only for demo businesses
    if (hardDelete) {
      if (!isDemoBusiness) {
        return NextResponse.json({ 
          error: 'Hard delete is only allowed for demo businesses. Use soft delete (deactivation) for real businesses.' 
        }, { status: 400 })
      }

      // Import deletion service
      const { deleteBusinessHard } = await import('@/lib/business-deletion-service')
      const result = await deleteBusinessHard(id, validUserId)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }

      return NextResponse.json({ 
        message: 'Business permanently deleted', 
        deletedCounts: result.deletedCounts 
      })
    }

    // Soft delete (deactivation) - for all businesses
    const { deleteBusinessSoft } = await import('@/lib/business-deletion-service')
    const result = await deleteBusinessSoft(id, validUserId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ message: 'Business deactivated' })
  } catch (error) {
    console.error('Error deleting business:', error)
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 })
  }
}
