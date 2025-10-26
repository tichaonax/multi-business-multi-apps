import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { hasUserPermission } from '@/lib/permission-utils';
import { SessionUser } from '@/lib/permission-utils';

const prisma = new PrismaClient();

/**
 * GET /api/business/categories
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
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/business/categories
 * Create a new business-wide expense category
 *
 * Request body:
 * {
 *   domainId: string;
 *   name: string;
 *   emoji: string;
 *   description?: string;
 *   color?: string;
 * }
 *
 * Requires permission: canCreateBusinessCategories
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

    // Check permission
    if (!hasUserPermission(user, 'canCreateBusinessCategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to create business categories' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { domainId, name, emoji, description, color } = body;

    // Validate required fields
    if (!domainId || !name || !emoji) {
      return NextResponse.json(
        { error: 'domainId, name, and emoji are required' },
        { status: 400 }
      );
    }

    // Verify domain exists
    const domain = await prisma.expenseDomains.findUnique({
      where: { id: domainId },
    });

    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Check for duplicate category name within this domain (case-insensitive)
    const existingCategory = await prisma.expenseCategories.findFirst({
      where: {
        domainId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'A category with this name already exists in this domain' },
        { status: 409 }
      );
    }

    // Create the category
    const category = await prisma.expenseCategories.create({
      data: {
        id: randomUUID(),
        domainId,
        name: name.trim(),
        emoji,
        description: description || `${name.trim()} expenses`,
        color: color || '#3B82F6',
        isDefault: false,
        isUserCreated: true,
        createdAt: new Date(),
        createdBy: user.id,
      },
      include: {
        domain: true,
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: 'Category created successfully',
        category,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
