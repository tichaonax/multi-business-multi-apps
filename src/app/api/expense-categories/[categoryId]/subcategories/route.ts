import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-categories/[categoryId]/subcategories
 * Fetch the next level down for whatever id is passed — callers in
 * payment-form.tsx / quick-payment-modal.tsx reuse the same "load the next
 * cascade level" function for an id that may be an ExpenseDomains.id, an
 * ExpenseCategories.id, or (via the global-category, no-domain path) an
 * ExpenseSubcategories.id, depending on which picker the user went through.
 * Three-tier fallback so it's correct no matter which level it actually is:
 *   1. domainId       → its ExpenseCategories
 *   2. ExpenseCategory.id    → its ExpenseSubcategories
 *   3. ExpenseSubcategory.id → its ExpenseSubSubcategories
 *
 * Query params:
 * - includeUserCreated: Include user-created categories (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const includeUserCreated = searchParams.get('includeUserCreated') !== 'false';

    // First try: treat as a domainId (domain-backed categories)
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
      // Fallback: treat as a global ExpenseCategory ID — return its ExpenseSubcategories
      const globalCategory = await prisma.expenseCategories.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true },
      });

      if (!globalCategory) {
        // Second fallback: treat as an ExpenseSubcategory ID — return its
        // ExpenseSubSubcategories (same "subcategories" response key for
        // caller compatibility, even though these are one level deeper).
        const globalSubcategory = await prisma.expenseSubcategories.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true },
        });

        if (!globalSubcategory) {
          return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        const subSubcategories = await prisma.expenseSubSubcategories.findMany({
          where: {
            subcategoryId: categoryId,
            ...(includeUserCreated ? {} : { isUserCreated: false }),
          },
          select: { id: true, name: true, emoji: true, isUserCreated: true, createdAt: true },
          orderBy: { name: 'asc' },
        });

        return NextResponse.json({
          category: globalSubcategory,
          subcategories: subSubcategories,
          count: subSubcategories.length,
        });
      }

      const subcategories = await prisma.expenseSubcategories.findMany({
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
        },
        orderBy: { name: 'asc' },
      });

      // If no subcategories found, check if this global category maps to a domain
      // (e.g. "Business Expenses" → domain-business categories)
      if (subcategories.length === 0) {
        const GLOBAL_CATEGORY_DOMAIN_MAP: Record<string, string> = {
          'category-business-expenses': 'domain-business',
          'category-clothing': 'domain-clothing',
        }
        const mappedDomainId = GLOBAL_CATEGORY_DOMAIN_MAP[categoryId]
        if (mappedDomainId) {
          const domainCategories = await prisma.expenseCategories.findMany({
            where: {
              domainId: mappedDomainId,
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
            },
            orderBy: { name: 'asc' },
          })
          return NextResponse.json({
            category: globalCategory,
            subcategories: domainCategories,
            count: domainCategories.length,
          })
        }
      }

      return NextResponse.json({
        category: globalCategory,
        subcategories,
        count: subcategories.length,
      });
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