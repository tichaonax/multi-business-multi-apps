import { NextRequest, NextResponse } from 'next/server'
import { canAddInventoryFromModal } from '@/lib/permission-utils'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()

    if (!user) {
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

    if (user.role === 'admin') {
      // System admins can access all active businesses of the requested type
      businesses = await prisma.businesses.findMany({
        where: {
          type: inventoryType,
          isActive: true
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
          userId: user.id,
          isActive: true,
          businesses: {
            type: inventoryType,
            isActive: true
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
          return canAddInventoryFromModal(user as any, membership.businesses.id)
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
  }
}