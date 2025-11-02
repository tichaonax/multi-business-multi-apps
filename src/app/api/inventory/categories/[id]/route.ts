import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { hasUserPermission } from '@/lib/permission-utils';
import { SessionUser } from '@/lib/permission-utils';

const prisma = new PrismaClient();

/**
 * PUT /api/inventory/categories/[id]
 * Update an existing inventory category
 *
 * Request body:
 * {
 *   name?: string;
 *   emoji?: string;
 *   color?: string;
 *   description?: string;
 *   domainId?: string;
 *   parentId?: string;
 *   displayOrder?: number;
 *   isActive?: boolean;
 * }
 *
 * Requires permission: canEditInventoryCategories
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
    if (!hasUserPermission(user, 'canEditInventoryCategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to edit inventory categories' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Fetch existing category
    const existingCategory = await prisma.businessCategories.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // For business-specific categories, verify user has access to that business
    // Type-based categories (businessId is null) are accessible to all users with permission
    if (existingCategory.businessId) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: existingCategory.businessId,
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
    const {
      name,
      emoji,
      color,
      description,
      domainId,
      parentId,
      displayOrder,
      isActive
    } = body;

    // If name is being changed, check for duplicates
    if (name && name !== existingCategory.name) {
      const duplicate = await prisma.businessCategories.findFirst({
        where: {
          businessId: existingCategory.businessId,
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
          { error: 'A category with this name already exists in this business' },
          { status: 409 }
        );
      }
    }

    // Update the category
    const updatedCategory = await prisma.businessCategories.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(emoji !== undefined && { emoji }),
        ...(color !== undefined && { color }),
        ...(description !== undefined && { description }),
        ...(domainId !== undefined && { domainId }),
        ...(parentId !== undefined && { parentId }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
      },
      include: {
        domain: true,
        users: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            business_products: true,
            inventory_subcategories: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/inventory/categories/[id]
 * Soft delete an inventory category
 *
 * Checks:
 * - Category has no active subcategories
 * - Category has no associated products
 *
 * Requires permission: canDeleteInventoryCategories
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
    if (!hasUserPermission(user, 'canDeleteInventoryCategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to delete inventory categories' },
        { status: 403 }
      );
    }

    const { id } = params;

    // Fetch existing category
    const existingCategory = await prisma.businessCategories.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            business_products: true,
            inventory_subcategories: true,
          },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // For business-specific categories, verify user has access to that business
    // Type-based categories (businessId is null) are accessible to all users with permission
    if (existingCategory.businessId) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: existingCategory.businessId,
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

    // Check if category has active subcategories
    if (existingCategory._count.inventory_subcategories > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with active subcategories. Please delete subcategories first.' },
        { status: 400 }
      );
    }

    // Check if category has associated products
    if (existingCategory._count.business_products > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with associated products. Please reassign or delete products first.' },
        { status: 400 }
      );
    }

    // Soft delete the category
    await prisma.businessCategories.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
