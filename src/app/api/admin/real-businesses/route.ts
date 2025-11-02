import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionUser, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/admin/real-businesses
 * Lists all real (non-demo) businesses with comprehensive statistics
 * Admin only - used for selective backup/restore operations
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all real (non-demo) active businesses with counts
    const realBusinesses = await prisma.businesses.findMany({
      where: {
        isDemo: false,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            business_products: true,
            business_categories: true,
            business_suppliers: true,
            business_customers: true,
            employees: true,
            business_memberships: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get additional counts that require separate queries
    const businessesWithCounts = await Promise.all(
      realBusinesses.map(async (business: any) => {
        // Count variants
        const variantCount = await prisma.productVariants.count({
          where: {
            business_products: {
              businessId: business.id
            }
          }
        })

        // Count stock movements
        const stockMovementCount = await prisma.businessStockMovements.count({
          where: {
            businessId: business.id
          }
        })

        return {
          id: business.id,
          name: business.name,
          type: business.type,
          description: business.description,
          createdAt: business.createdAt,
          counts: {
            products: business._count.business_products,
            variants: variantCount,
            categories: business._count.business_categories,
            suppliers: business._count.business_suppliers,
            customers: business._count.business_customers,
            employees: business._count.employees,
            members: business._count.business_memberships,
            stockMovements: stockMovementCount
          }
        }
      })
    )

    return NextResponse.json({
      businesses: businessesWithCounts,
      total: businessesWithCounts.length
    })
  } catch (error) {
    console.error('Error fetching real businesses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch real businesses' },
      { status: 500 }
    )
  }
}
