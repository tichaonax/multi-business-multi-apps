import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAddInventoryFromModal } from '@/lib/permission-utils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const inventoryType = searchParams.get('inventoryType')

    if (!inventoryType) {
      return NextResponse.json(
        { success: false, error: 'inventoryType parameter is required' },
        { status: 400 }
      )
    }

    // Validate inventory type
    const validTypes = ['clothing', 'hardware', 'grocery', 'restaurant']
    if (!validTypes.includes(inventoryType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid inventory type' },
        { status: 400 }
      )
    }

    // Get user's business memberships or all businesses for system admins
    let businesses

    if (session.user.role === 'admin') {
      // System admins can access all businesses of the requested type
      businesses = await prisma.businesses.findMany({
        where: {
          type: inventoryType
        },
        select: {
          id: true,
          name: true,
          type: true
        }
      })

      // Map to expected format with canAddInventory flag
      businesses = businesses.map(business => ({
        id: business.id,
        name: business.name,
        type: business.type,
        canAddInventory: true // System admins can always add inventory
      }))
    } else {
      // Regular users: get their business memberships and filter by permissions
      const memberships = await prisma.businessMemberships.findMany({
        where: {
          userId: session.user.id,
          isActive: true,
          businesses: {
            type: inventoryType
          }
        },
        include: {
          businesses: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      })

      // Filter businesses where user can add inventory
      businesses = memberships
        .filter((membership: any) => {
          return canAddInventoryFromModal(session.user as any, membership.businesses.id)
        })
        .map((membership: any) => ({
          id: membership.businesses.id,
          name: membership.businesses.name,
          type: membership.businesses.type,
          canAddInventory: true
        }))
    }

    return NextResponse.json({
      success: true,
      businesses
    })

  } catch (error) {
    console.error('Error fetching user businesses for inventory:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}