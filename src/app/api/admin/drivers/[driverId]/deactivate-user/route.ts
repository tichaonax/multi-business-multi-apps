import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'

interface RouteParams {
  params: Promise<{ driverId: string }>
}

// PUT - Deactivate user account linked to driver
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to manage business users
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { driverId } = await params

    // Find driver with linked user
    const driver = await prisma.vehicleDriver.findUnique({
      where: { id: driverId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true
          }
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    if (!driver.userId || !driver.users) {
      return NextResponse.json({
        error: 'Driver does not have a linked user account'
      }, { status: 400 })
    }

    if (!driver.users.isActive) {
      return NextResponse.json({
        error: 'User account is already deactivated',
        user: driver.users
      }, { status: 409 })
    }

    // Deactivate the user account
    const deactivatedUser = await prisma.user.update({
      where: { id: driver.users.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Driver user account deactivated successfully',
      driverName: driver.fullName,
      deactivatedUser: {
        id: deactivatedUser.id,
        email: deactivatedUser.email,
        name: deactivatedUser.name,
        isActive: deactivatedUser.isActive,
        deactivatedAt: deactivatedUser.updatedAt
      }
    })

  } catch (error) {
    console.error('Error deactivating driver user:', error)
    return NextResponse.json({
      error: 'Failed to deactivate user account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Reactivate user account linked to driver
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Check if user has permission to manage business users
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { driverId } = await params

    // Find driver with linked user
    const driver = await prisma.vehicleDriver.findUnique({
      where: { id: driverId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true
          }
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    if (!driver.userId || !driver.users) {
      return NextResponse.json({
        error: 'Driver does not have a linked user account'
      }, { status: 400 })
    }

    if (driver.users.isActive) {
      return NextResponse.json({
        error: 'User account is already active',
        user: driver.users
      }, { status: 409 })
    }

    // Reactivate the user account
    const reactivatedUser = await prisma.user.update({
      where: { id: driver.users.id },
      data: {
        isActive: true,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Driver user account reactivated successfully',
      driverName: driver.fullName,
      reactivatedUser: {
        id: reactivatedUser.id,
        email: reactivatedUser.email,
        name: reactivatedUser.name,
        isActive: reactivatedUser.isActive,
        reactivatedAt: reactivatedUser.updatedAt
      }
    })

  } catch (error) {
    console.error('Error reactivating driver user:', error)
    return NextResponse.json({
      error: 'Failed to reactivate user account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}