import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/expense-categories/hierarchical
 * Fetch only top-level expense domains (as categories) without their subcategories/sub-subcategories
 * This is optimized for initial loading to reduce traffic
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

    // Fetch all domains as top-level categories
    const domains = await prisma.expenseDomains.findMany({
      where: {
        isActive: true,
        ...(domainId ? { id: domainId } : {}),
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        description: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            expense_categories: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // ALSO fetch global flat categories (domainId = null)
    const globalCategories = await prisma.expenseCategories.findMany({
      where: {
        domainId: null, // Global categories not tied to any domain
        ...(includeUserCreated ? {} : { isUserCreated: false }),
      },
      select: {
        id: true,
        name: true,
        emoji: true,
        color: true,
        description: true,
        isDefault: true,
        isUserCreated: true,
        createdBy: true,
        requiresSubcategory: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Combine domains and global categories
    const domainCategories = domains.map(domain => ({
      ...domain,
      color: '#3B82F6', // Default color for domains
      isDefault: false,
      isUserCreated: false,
      createdBy: null,
      users: null,
      requiresSubcategory: true, // Domains typically have subcategories
    }));

    const allCategories = [...globalCategories, ...domainCategories];

    // Return all categories
    return NextResponse.json({
      domains: [{
        expense_categories: allCategories
      }],
      count: {
        domains: 1,
        categories: allCategories.length,
      },
    });
  } catch (error) {
    console.error('Error fetching hierarchical expense categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense categories' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}