import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasUserPermission } from '@/lib/permission-utils';
import { SessionUser } from '@/lib/permission-utils';

/**
 * PUT /api/business/subcategories/[id]
 * Update an existing business expense subcategory
 *
 * Request body:
 * {
 *   name?: string;
 *   emoji?: string;
 *   description?: string;
 * }
 *
 * Requires permission: canEditBusinessSubcategories
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
    if (!hasUserPermission(user, 'canEditBusinessSubcategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to edit business subcategories' },
        { status: 403 }
      );
    }

    const subcategoryId = params.id;

    // Verify subcategory exists
    const existingSubcategory = await prisma.expenseSubcategories.findUnique({
      where: { id: subcategoryId },
      include: {
        category: {
          include: {
            domain: true,
          },
        },
      },
    });

    if (!existingSubcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, emoji, description } = body;

    // If name is being changed, check for duplicates within the category
    if (name && name.trim() !== existingSubcategory.name) {
      const duplicateSubcategory = await prisma.expenseSubcategories.findFirst({
        where: {
          categoryId: existingSubcategory.categoryId,
          name: {
            equals: name.trim(),
            mode: 'insensitive',
          },
          id: {
            not: subcategoryId,
          },
        },
      });

      if (duplicateSubcategory) {
        return NextResponse.json(
          { error: 'A subcategory with this name already exists in this category' },
          { status: 409 }
        );
      }
    }

    // Update the subcategory
    const updatedSubcategory = await prisma.expenseSubcategories.update({
      where: { id: subcategoryId },
      data: {
        ...(name && { name: name.trim() }),
        ...(emoji !== undefined && { emoji }),
        ...(description !== undefined && { description }),
      },
      include: {
        category: {
          include: {
            domain: true,
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
 * DELETE /api/business/subcategories/[id]
 * Delete a business expense subcategory
 *
 * Validation:
 * - Subcategory must not be in use by any expenses
 *
 * Requires permission: canDeleteBusinessSubcategories
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
    if (!hasUserPermission(user, 'canDeleteBusinessSubcategories')) {
      return NextResponse.json(
        { error: 'You do not have permission to delete business subcategories' },
        { status: 403 }
      );
    }

    const subcategoryId = params.id;

    // Verify subcategory exists
    const subcategory = await prisma.expenseSubcategories.findUnique({
      where: { id: subcategoryId },
      include: {
        personal_expenses: {
          select: {
            id: true,
          },
          take: 1, // Only need to know if any exist
        },
      },
    });

    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    // Check if subcategory is in use by any expenses
    if (subcategory.personal_expenses.length > 0) {
      // Count total expenses using this subcategory
      const expenseCount = await prisma.personalExpenses.count({
        where: {
          subcategoryId: subcategoryId,
        },
      });

      return NextResponse.json(
        {
          error: `Cannot delete subcategory: it is used by ${expenseCount} expense${expenseCount === 1 ? '' : 's'}. Please reassign or delete the expenses first.`,
          expenseCount,
        },
        { status: 409 }
      );
    }

    // Delete the subcategory
    await prisma.expenseSubcategories.delete({
      where: { id: subcategoryId },
    });

    return NextResponse.json(
      { message: 'Subcategory deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to delete subcategory' },
      { status: 500 }
    );
  }
}
