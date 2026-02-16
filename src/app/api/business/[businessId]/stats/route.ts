import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin} from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Get stats
    const [products, activeProducts, categories, suppliers] = await Promise.all([
      prisma.businessProducts.count({
        where: { businessId: businessId }
      }),
      prisma.businessProducts.count({
        where: { businessId: businessId, isActive: true }
      }),
      prisma.businessCategories.count({
        where: {
          OR: [
            { businessId: businessId },
            { businessId: null, businessType: business.type }
          ],
          isActive: true
        }
      }),
      prisma.businessSuppliers.count({
        where: {
          businessType: business.type,
          isActive: true
        }
      })
    ])

    return NextResponse.json({
      products,
      activeProducts,
      categories,
      suppliers
    })

  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
