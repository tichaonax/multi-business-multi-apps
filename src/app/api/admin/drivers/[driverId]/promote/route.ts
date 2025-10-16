import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { z } from 'zod'
import { hasPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { DRIVER_PERMISSIONS } from '@/types/permissions'

interface RouteParams {
  params: Promise<{ driverId: string }>
}

const PromoteDriverSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Valid email is required').optional(),
  sendInvite: z.boolean().default(false),
  businessId: z.string().optional(), // For business assignment
})

// POST - Promote driver to user with trip logging access
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
    const body = await request.json()
    const validatedData = PromoteDriverSchema.parse(body)

    // Check if driver exists
    const driver = await prisma.vehicleDrivers.findUnique({
      where: { id: driverId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Check if driver already has a user account
    if (driver.userId || driver.users) {
      return NextResponse.json({
        error: 'Driver already has a user account',
        existingUser: driver.users
      }, { status: 409 })
    }

    // Use driver's email if provided, otherwise use the submitted email
    const userEmail = driver.emailAddress || validatedData.email
    if (!userEmail) {
      return NextResponse.json({
        error: 'Email address is required. Driver has no email on file.'
      }, { status: 400 })
    }

    // Check if email is already in use
    const existingUserByEmail = await prisma.users.findUnique({
      where: { email: userEmail }
    })

    if (existingUserByEmail) {
      return NextResponse.json({
        error: 'Email address is already in use by another user'
      }, { status: 409 })
    }

    // Check if username is already in use
    const existingUserByUsername = await prisma.users.findUnique({
      where: { username: validatedData.username }
    })

    if (existingUserByUsername) {
      return NextResponse.json({
        error: 'Username is already in use by another user'
      }, { status: 409 })
    }

    // Hash the password
    const hashedPassword = await hash(validatedData.password, 12)

    // Use the driver permission preset (trip logging + maintenance recording)
    const driverPermissions = DRIVER_PERMISSIONS

    const userId = randomUUID()

    // Create user and link to driver in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const newUser = await tx.users.create({
        data: {
          id: randomBytes(12).toString('hex'),
          id: userId,
          email: userEmail,
          username: validatedData.username,
          name: driver.fullName,
          passwordHash: hashedPassword,
          role: 'user',
          isActive: true,
          permissions: driverPermissions,
        }
      })

      // Link driver to user
      await tx.vehicleDriver.update({
        where: { id: driverId },
        data: { userId: newUser.id }
      })

      // Create business membership if businessId provided
      if (validatedData.businessId) {
        // Verify business exists
        const business = await tx.businesses.findUnique({
          where: { id: validatedData.businessId }
        })

        if (business) {
          await tx.business_memberships.create({
        data: {
          id: randomBytes(12).toString('hex'),
              id: randomUUID(),
              userId: newUser.id,
              businessId: validatedData.businessId,
              role: 'employee',
              permissions: {}, // No business-specific permissions
              isActive: true,
              joinedAt: new Date(),
            }
          })
        }
      }

      return newUser
    })

    // TODO: Send invitation email if sendInvite is true
    // This would integrate with your email service
    if (validatedData.sendInvite) {
      console.log(`TODO: Send invitation email to ${userEmail} with credentials`)
    }

    return NextResponse.json({
      success: true,
      message: 'Driver successfully promoted to trip logger',
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        // Don't return password in response for security
        loginUrl: '/auth/signin',
        permissions: ['Trip Logging', 'Maintenance Recording']
      },
      credentials: {
        username: validatedData.username,
        email: result.email,
        password: validatedData.password, // Return for admin to provide to driver
        note: 'Driver can login with either username or email and the provided password'
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Error promoting driver to user:', error)
    return NextResponse.json({
      error: 'Failed to promote driver',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Check if driver can be promoted (status check)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessUsers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { driverId } = await params

    const driver = await prisma.vehicleDrivers.findUnique({
      where: { id: driverId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true
          }
        }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const canPromote = !driver.userId && !driver.users
    const hasEmail = !!driver.emailAddress

    return NextResponse.json({
      success: true,
      driverId: driver.id,
      driverName: driver.fullName,
      driverEmail: driver.emailAddress,
      canPromote,
      hasUserAccount: !!driver.users,
      userAccount: driver.users || null,
      requiresEmail: !hasEmail,
      status: driver.users
        ? (driver.users.isActive ? 'active_user' : 'inactive_user')
        : 'no_user'
    })

  } catch (error) {
    console.error('Error checking driver promotion status:', error)
    return NextResponse.json({
      error: 'Failed to check promotion status'
    }, { status: 500 })
  }
}