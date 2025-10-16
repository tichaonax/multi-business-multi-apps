import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

import { randomBytes } from 'crypto';
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
    const { id } = await params

    // Only system admins can update businesses
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only system administrators can update businesses' }, { status: 403 })
    }

    const { name, type, description, isActive } = await req.json()

    if (!name || !type) {
      return NextResponse.json({ error: 'Business name and type are required' }, { status: 400 })
    }

    // Check if business exists
    const existingBusiness = await prisma.businesses.findUnique({
      where: { id }
    })

    if (!existingBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Update the business
    const updatedBusiness = await prisma.businesses.update({
      where: { id },
      data: {
        name: name.trim(),
        type: type.trim(),
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : existingBusiness.isActive,
        updatedAt: new Date()
      }
    })

    // Create audit log
    await prisma.auditLogs.create({
      data: {
        action: 'BUSINESS_UPDATED',
        entityType: 'Business',
        entityId: updatedBusiness.id,
        userId: session.user.id,
        details: {
          businessName: updatedBusiness.name,
          businessType: updatedBusiness.type,
          changes: {
            name: existingBusiness.name !== updatedBusiness.name ? { from: existingBusiness.name, to: updatedBusiness.name } : undefined,
            type: existingBusiness.type !== updatedBusiness.type ? { from: existingBusiness.type, to: updatedBusiness.type } : undefined,
            description: existingBusiness.description !== updatedBusiness.description ? { from: existingBusiness.description, to: updatedBusiness.description } : undefined,
            isActive: existingBusiness.isActive !== updatedBusiness.isActive ? { from: existingBusiness.isActive, to: updatedBusiness.isActive } : undefined
          }
        }
      }
    }).catch(error => {
      console.error('Failed to create audit log:', error)
    })

    return NextResponse.json({
      message: 'Business updated successfully',
      business: updatedBusiness
    })
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { id } = await params

    // Only system admins can delete businesses
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only system administrators can delete businesses' }, { status: 403 })
    }

    // Check if business exists
    const existingBusiness = await prisma.businesses.findUnique({
      where: { id },
      include: {
        business_memberships: true,
        employees: true
      }
    })

    if (!existingBusiness) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if business has active memberships or employees
    const activeMemberships = existingBusiness.business_memberships.filter(m => m.isActive)
    const activeEmployees = existingBusiness.employees.filter(e => e.isActive)

    if (activeMemberships.length > 0 || activeEmployees.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete business with active memberships or employees. Please deactivate all users and employees first.' 
      }, { status: 400 })
    }

    // Soft delete - just mark as inactive
    const deletedBusiness = await prisma.businesses.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    })

    // Create audit log
    await prisma.auditLogs.create({
      data: {
        action: 'BUSINESS_DELETED',
        entityType: 'Business',
        entityId: deletedBusiness.id,
        userId: session.user.id,
        details: {
          businessName: deletedBusiness.name,
          businessType: deletedBusiness.type
        }
      }
    }).catch(error => {
      console.error('Failed to create audit log:', error)
    })

    return NextResponse.json({
      message: 'Business deactivated successfully',
      business: deletedBusiness
    })
  } catch (error) {
    console.error('Error deleting business:', error)
    return NextResponse.json({ error: 'Failed to delete business' }, { status: 500 })
  }
}