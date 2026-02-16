import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-categories/[categoryId]/subcategories
 * Fetch categories for a specific domain (categoryId is actually domainId)
 * This is called when a user selects a domain to see its categories
 *
 * Query params:
 * - includeUserCreated: Include user-created categories (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = params;
    const searchParams = request.nextUrl.searchParams;
    const includeUserCreated = searchParams.get('includeUserCreated') !== 'false';

    // categoryId is actually domainId now
    const domainId = categoryId;

    // Verify domain exists
    const domain = await prisma.expenseDomains.findUnique({
      where: { id: domainId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Fetch categories for this domain
    const subcategories = await prisma.expenseCategories.findMany({
      where: {
        domainId,
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
        // Include count of subcategories
        _count: {
          select: {
            expense_subcategories: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      category: domain, // domain is now the "category" for compatibility
      subcategories,
      count: subcategories.length,
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    );
  }
}