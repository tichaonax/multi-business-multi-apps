import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateUniqueShortName } from '@/lib/business-shortname'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser

    // System admins can see all businesses
    if (isSystemAdmin(user)) {
      const businesses = await prisma.businesses.findMany({
        orderBy: { createdAt: 'desc' }
      })
      return NextResponse.json(businesses)
    }

    // Regular users see only their businesses
    const userMemberships = await prisma.businessMemberships.findMany({
      where: {
        userId: session.users.id,
        isActive: true
      },
      include: {
        businesses: true
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
    if (!session?.users?.id) {
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

    const shortName = await generateUniqueShortName(prisma as any, name.trim())
    const business = await prisma.businesses.create({
      // Cast to any because local Prisma client may not include the newly added shortName field yet
      data: ({
        name: name.trim(),
        type: type.trim(),
        description: description?.trim() || null,
        shortName,
        isActive: true,
        settings: {},
        createdBy: session.users.id
      } as any)
    })

    // Create audit log
    await prisma.auditLogs.create({
      // Cast to any to avoid strict Prisma typing for optional fields like id
      data: ({
        action: 'BUSINESS_CREATED',
        entityType: 'Business',
        entityId: business.id,
        userId: session.users.id,
        details: {
          businessName: business.name,
          businessType: business.type
        }
      } as any)
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