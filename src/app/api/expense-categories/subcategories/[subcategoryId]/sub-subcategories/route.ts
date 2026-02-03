import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/expense-categories/subcategories/[subcategoryId]/sub-subcategories
 * Fetch subcategories for a specific category (subcategoryId is actually categoryId)
 * This is called when a user selects a category to see its subcategories
 *
 * Query params:
 * - includeUserCreated: Include user-created subcategories (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { subcategoryId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subcategoryId } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeUserCreated = searchParams.get('includeUserCreated') !== 'false';

    // subcategoryId is actually categoryId now
    const categoryId = subcategoryId;

    // Verify category exists
    const category = await prisma.expenseCategories.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        domain: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Fetch subcategories for this category
    const subSubcategories = await prisma.expenseSubcategories.findMany({
      where: {
        categoryId,
        ...(includeUserCreated ? {} : { isUserCreated: false }),
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        description: true,
        isDefault: true,
        isUserCreated: true,
        createdAt: true,
        createdBy: true,
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      subcategory: category, // category is now the "subcategory" for compatibility
      subSubcategories,
      count: subSubcategories.length,
    });
  } catch (error) {
    console.error('Error fetching sub-subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sub-subcategories' },
      { status: 500 }
    );
  }
}