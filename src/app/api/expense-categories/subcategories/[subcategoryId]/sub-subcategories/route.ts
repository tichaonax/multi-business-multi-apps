import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-categories/subcategories/[subcategoryId]/sub-subcategories
 * Fetch sub-subcategories (expense_sub_subcategories) for a given expense_subcategories.id
 * Called when a user selects a subcategory (e.g. "Masonry") to load its sub-subcategories
 *
 * Query params:
 * - includeUserCreated: Include user-created entries (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subcategoryId: string }> }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subcategoryId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeUserCreated = searchParams.get('includeUserCreated') !== 'false';

    // Verify subcategory exists
    const subcategory = await prisma.expenseSubcategories.findUnique({
      where: { id: subcategoryId },
      select: { id: true, name: true },
    });

    if (!subcategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Fetch sub-subcategories for this subcategory
    const subSubcategories = await prisma.expenseSubSubcategories.findMany({
      where: {
        subcategoryId,
        ...(includeUserCreated ? {} : { isUserCreated: false }),
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        isUserCreated: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      subcategory,
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