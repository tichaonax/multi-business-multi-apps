import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET - List all demo businesses with summary statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all demo businesses with counts
    const demoBusinesses = await prisma.businesses.findMany({
      where: {
        isDemo: true,
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
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get additional counts for each demo business
    const businessesWithDetails = await Promise.all(
      demoBusinesses.map(async (business: any) => {
        // Count product variants
        const variantCount = await prisma.productVariants.count({
          where: {
            business_products: {
              businessId: business.id
            }
          }
        });

        // Count stock movements
        const stockMovementCount = await prisma.businessStockMovements.count({
          where: {
            businessId: business.id
          }
        });

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
        };
      })
    );

    return NextResponse.json({
      businesses: businessesWithDetails,
      total: businessesWithDetails.length
    });

  } catch (error) {
    console.error('Failed to fetch demo businesses:', error);
    return NextResponse.json({
      error: 'Failed to fetch demo businesses',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
