import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/inventory/categories/[id]/subcategories
 * Fetch all subcategories for a specific category
 *
 * Query params:
 * - includeProducts: Include product counts (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeProducts = searchParams.get('includeProducts') !== 'false';

    // Verify category exists
    const category = await prisma.businessCategories.findUnique({
      where: { id },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Fetch subcategories
    const subcategories = await prisma.inventorySubcategories.findMany({
      where: {
        categoryId: id,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
          },
        },
        ...(includeProducts && {
          _count: {
            select: {
              // Note: products would need to be linked to subcategories
              // This is a placeholder for when that relation exists
            },
          },
        }),
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      subcategories,
      total: subcategories.length,
      categoryId: id,
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}
