import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/expense-categories
 * Fetch all expense domains, categories, and subcategories
 *
 * Query params:
 * - domainId: Filter by specific domain (optional)
 * - includeUserCreated: Include user-created categories (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const domainId = searchParams.get('domainId');
    const includeUserCreated = searchParams.get('includeUserCreated') !== 'false';

    // Fetch all domains with their categories and subcategories
    const domains = await prisma.expenseDomains.findMany({
      where: {
        isActive: true,
        ...(domainId ? { id: domainId } : {}),
      },
      include: {
        expense_categories: {
          where: includeUserCreated ? {} : { isUserCreated: false },
          include: {
            expense_subcategories: {
              where: includeUserCreated ? {} : { isUserCreated: false },
              orderBy: {
                name: 'asc',
              },
            },
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
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      domains,
      count: {
        domains: domains.length,
        categories: domains.reduce((sum, d) => sum + d.expense_categories.length, 0),
        subcategories: domains.reduce(
          (sum, d) =>
            sum +
            d.expense_categories.reduce(
              (catSum, cat) => catSum + cat.expense_subcategories.length,
              0
            ),
          0
        ),
      },
    });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense categories' },
      { status: 500 }
    );
  }
}
