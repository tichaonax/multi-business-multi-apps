import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // System admins can see all businesses
    if (isSystemAdmin(user)) {
      const businesses = await prisma.business.findMany({
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(businesses)
    }

    // Regular users see only their businesses
    const userMemberships = await prisma.businessMembership.findMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      include: {
        business: true
      }
    })

    const businesses = userMemberships.map(membership => membership.business)
    return NextResponse.json(businesses)
  } catch (error) {
    console.error('Error fetching businesses:', error)
    return NextResponse.json({ error: 'Failed to fetch businesses' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // Only system admins can create businesses
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only system administrators can create businesses' }, { status: 403 })
    }

    const { name, type, description } = await req.json()

    if (!name || !type) {
      return NextResponse.json({ error: 'Business name and type are required' }, { status: 400 })
    }

    const business = await prisma.business.create({
      data: {
        name: name.trim(),
        type: type.trim(),
        description: description?.trim() || null,
        isActive: true,
        settings: {},
        createdBy: session.user.id
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BUSINESS_CREATED',
        entityType: 'Business',
        entityId: business.id,
        userId: session.user.id,
        details: {
          businessName: business.name,
          businessType: business.type
        }
      }
    }).catch(error => {
      console.error('Failed to create audit log:', error)
    })

    return NextResponse.json({
      message: 'Business created successfully',
      business
    })
  } catch (error) {
    console.error('Error creating business:', error)
    return NextResponse.json({ error: 'Failed to create business' }, { status: 500 })
  }
}