import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

/**
 * POST /api/expense-categories/subcategories
 * Create a new business-wide subcategory
 *
 * Request body:
 * {
 *   categoryId: string;
 *   name: string;
 *   emoji?: string;
 *   description?: string;
 * }
 *
 * Requires permission: canCreateExpenseSubcategories
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check permission (admins always have access)
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { permissions: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin';
    const permissions = user.permissions as any;
    if (!isAdmin && !permissions?.canCreateExpenseSubcategories) {
      return NextResponse.json(
        { error: 'You do not have permission to create expense subcategories' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { categoryId, name, emoji, description } = body;

    // Validate required fields
    if (!categoryId || !name) {
      return NextResponse.json(
        { error: 'categoryId and name are required' },
        { status: 400 }
      );
    }

    // Verify category exists
    const category = await prisma.expenseCategories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check for duplicate subcategory name within this category
    const existingSubcategory = await prisma.expenseSubcategories.findFirst({
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

    // Create the subcategory (business-wide, auto-approved)
    const subcategory = await prisma.expenseSubcategories.create({
      data: {
        id: randomUUID(),
        categoryId,
        name: name.trim(),
        emoji: emoji || null,
        description: description || `${name.trim()} expenses`,
        isDefault: false,
        isUserCreated: true,
        createdBy: userId,
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
      message: 'Subcategory created successfully',
      subcategory,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to create subcategory' },
      { status: 500 }
    );
  }
}
