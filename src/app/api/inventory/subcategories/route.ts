import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { hasUserPermission } from '@/lib/permission-utils';
import { SessionUser } from '@/lib/permission-utils';

const prisma = new PrismaClient();

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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

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

    // Verify user has access to this business
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
  } finally {
    await prisma.$disconnect();
  }
}
