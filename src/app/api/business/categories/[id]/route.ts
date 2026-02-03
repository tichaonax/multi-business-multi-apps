import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasUserPermission } from '@/lib/permission-utils';
import { SessionUser } from '@/lib/permission-utils';

/**
 * PUT /api/business/categories/[id]
 * Update an existing business expense category
 *
 * Request body:
 * {
 *   name?: string;
 *   emoji?: string;
 *   description?: string;
 *   color?: string;
 * }
 *
 * Requires permission: canEditBusinessCategories
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
    if (!hasUserPermission(user, 'canEditBusinessCategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to edit business categories' },
        { status: 403 }
      );
    }

    const categoryId = params.id;

    // Verify category exists
    const existingCategory = await prisma.expenseCategories.findUnique({
      where: { id: categoryId },
      include: { domain: true },
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, emoji, description, color } = body;

    // If name is being changed, check for duplicates within the domain
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await prisma.expenseCategories.findFirst({
        where: {
          domainId: existingCategory.domainId,
          name: {
            equals: name.trim(),
            mode: 'insensitive',
          },
          id: {
            not: categoryId,
          },
        },
      });

      if (duplicateCategory) {
        return NextResponse.json(
          { error: 'A category with this name already exists in this domain' },
          { status: 409 }
        );
      }
    }

    // Update the category
    const updatedCategory = await prisma.expenseCategories.update({
      where: { id: categoryId },
      data: {
        ...(name && { name: name.trim() }),
        ...(emoji && { emoji }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
      },
      include: {
        domain: true,
        users: {
          select: {
            id: true,
            name: true,
          },
        },
        expense_subcategories: {
          select: {
            id: true,
            name: true,
            emoji: true,
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
  }
}

/**
 * DELETE /api/business/categories/[id]
 * Delete a business expense category
 *
 * Validation:
 * - Category must have no subcategories
 * - Category must not be in use by any expenses
 *
 * Requires permission: canDeleteBusinessCategories
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
    if (!hasUserPermission(user, 'canDeleteBusinessCategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to delete business categories' },
        { status: 403 }
      );
    }

    const categoryId = params.id;

    // Verify category exists
    const category = await prisma.expenseCategories.findUnique({
      where: { id: categoryId },
      include: {
        expense_subcategories: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if category has subcategories
    if (category.expense_subcategories.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category: it has ${category.expense_subcategories.length} subcategories. Please delete or reassign all subcategories first.`,
          subcategoriesCount: category.expense_subcategories.length,
        },
        { status: 409 }
      );
    }

    // Check if category is in use by any expenses
    // Note: Subcategories are linked to expenses, not categories directly
    // But we need to check if any subcategories of this category are in use
    // Since we already checked there are no subcategories, category is safe to delete

    // Delete the category
    await prisma.expenseCategories.delete({
      where: { id: categoryId },
    });

    return NextResponse.json(
      { message: 'Category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
