import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasUserPermission } from '@/lib/permission-utils';
import { SessionUser } from '@/lib/permission-utils';

/**
 * PUT /api/inventory/subcategories/[id]
 * Update an existing inventory subcategory
 *
 * Request body:
 * {
 *   name?: string;
 *   emoji?: string;
 *   description?: string;
 *   displayOrder?: number;
 * }
 *
 * Requires permission: canEditInventorySubcategories
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

    // Check permission
    if (!hasUserPermission(user, 'canEditInventorySubcategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to edit inventory subcategories' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Fetch existing subcategory with category info
    const existingSubcategory = await prisma.inventorySubcategories.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!existingSubcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    // For business-specific categories, verify user has access to that business
    // Type-based categories (businessId is null) are accessible to all users with permission
    if (existingSubcategory.category.businessId) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: existingSubcategory.category.businessId,
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

    // Parse request body
    const body = await request.json();
    const { name, emoji, description, displayOrder } = body;

    // If name is being changed, check for duplicates
    if (name && name !== existingSubcategory.name) {
      const duplicate = await prisma.inventorySubcategories.findFirst({
        where: {
          categoryId: existingSubcategory.categoryId,
          name: {
            equals: name,
            mode: 'insensitive',
          },
          id: {
            not: id,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'A subcategory with this name already exists in this category' },
          { status: 409 }
        );
      }
    }

    // Update the subcategory
    const updatedSubcategory = await prisma.inventorySubcategories.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(emoji !== undefined && { emoji }),
        ...(description !== undefined && { description }),
        ...(displayOrder !== undefined && { displayOrder }),
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

    return NextResponse.json({
      message: 'Subcategory updated successfully',
      subcategory: updatedSubcategory,
    });
  } catch (error) {
    console.error('Error updating subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to update subcategory' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inventory/subcategories/[id]
 * Delete an inventory subcategory
 *
 * Checks:
 * - Subcategory has no associated products (when implemented)
 *
 * Requires permission: canDeleteInventorySubcategories
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;

    // Check permission
    if (!hasUserPermission(user, 'canDeleteInventorySubcategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to delete inventory subcategories' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Fetch existing subcategory
    const existingSubcategory = await prisma.inventorySubcategories.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!existingSubcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    // For business-specific categories, verify user has access to that business
    // Type-based categories (businessId is null) are accessible to all users with permission
    if (existingSubcategory.category.businessId) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: existingSubcategory.category.businessId,
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

    // TODO: Check if subcategory has associated products when that relation is implemented
    // For now, we'll allow deletion

    // Delete the subcategory (hard delete as per Prisma cascade)
    await prisma.inventorySubcategories.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Subcategory deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to delete subcategory' },
      { status: 500 }
    );
  }
}
