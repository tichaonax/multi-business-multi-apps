import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { hasUserPermission } from '@/lib/permission-utils';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/inventory/subcategories?categoryIds=id1,id2,...
 * Fetch inventory subcategories for one or more categories (batch)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const categoryIds = request.nextUrl.searchParams.get('categoryIds')?.split(',').filter(Boolean) ?? [];
    if (categoryIds.length === 0) {
      return NextResponse.json({ subcategories: [] });
    }

    const subcategories = await prisma.inventorySubcategories.findMany({
      where: { categoryId: { in: categoryIds } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ subcategories });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json({ error: 'Failed to fetch subcategories' }, { status: 500 });
  }
}

/**
 * POST /api/inventory/subcategories
 * Create a new inventory subcategory
 *
 * Request body:
 * {
 *   categoryId: string;
 *   name: string;
 *   emoji?: string;
 *   description?: string;
 *   displayOrder?: number;
 * }
 *
 * Requires permission: canCreateInventorySubcategories
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Check permission
    if (!hasUserPermission(user, 'canCreateInventorySubcategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to create inventory subcategories' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { categoryId, name, emoji, description, displayOrder } = body;

    // Validate required fields
    if (!categoryId || !name) {
      return NextResponse.json(
        { error: 'categoryId and name are required' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.businessCategories.findUnique({
      where: { id: categoryId },
      include: {
        businesses: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // For business-specific categories, verify user has access to that business
    // Type-based categories (businessId is null) are accessible to all users with permission
    if (category.businessId) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: category.businessId,
          isActive: true,
        },
      });

      if (!membership && user.role !== 'admin') {
        return NextResponse.json(
          { error: 'You do not have access to this business' },
          { status: 403 }
        );
      }
    }

    // Check for duplicate subcategory name within this category (case-insensitive)
    const existingSubcategory = await prisma.inventorySubcategories.findFirst({
      where: {
        categoryId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingSubcategory) {
      return NextResponse.json(
        { error: 'A subcategory with this name already exists in this category' },
        { status: 409 }
      );
    }

    // Create the subcategory
    const subcategory = await prisma.inventorySubcategories.create({
      data: {
        id: randomUUID(),
        categoryId,
        name: name.trim(),
        emoji: emoji || null,
        description: description || null,
        displayOrder: displayOrder ?? 0,
        isDefault: false,
        isUserCreated: true,
        createdBy: user.id,
      },
      include: {
        category: {
          include: {
            domain: true,
            businesses: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
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
        message: 'Subcategory created successfully',
        subcategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}
