import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

/**
 * POST /api/expense-categories/sub-subcategories
 * Create a new business-wide sub-subcategory
 *
 * Request body:
 * {
 *   subcategoryId: string;
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
        { error: 'You do not have permission to create expense sub-subcategories' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { subcategoryId, name, emoji, description } = body;

    // Validate required fields
    if (!subcategoryId || !name) {
      return NextResponse.json(
        { error: 'subcategoryId and name are required' },
        { status: 400 }
      );
    }

    // Verify subcategory exists
    const subcategory = await prisma.expenseSubcategories.findUnique({
      where: { id: subcategoryId },
      include: {
        category: {
          include: {
            domain: true,
          },
        },
      },
    });

    if (!subcategory) {
      return NextResponse.json({ error: 'Subcategory not found' }, { status: 404 });
    }

    // Check for duplicate sub-subcategory name within this subcategory
    const existingSubSubcategory = await prisma.expenseSubSubcategories.findFirst({
      where: {
        subcategoryId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingSubSubcategory) {
      return NextResponse.json(
        { error: 'A sub-subcategory with this name already exists in this subcategory' },
        { status: 409 }
      );
    }

    // Create the sub-subcategory (business-wide, auto-approved)
    const subSubcategory = await prisma.expenseSubSubcategories.create({
      data: {
        id: randomUUID(),
        subcategoryId,
        name: name.trim(),
        emoji: emoji || null,
        description: description || `${name.trim()} expenses`,
        isDefault: false,
        isUserCreated: true,
        createdBy: userId,
      },
      include: {
        subcategory: {
          include: {
            category: {
              include: {
                domain: true,
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
      message: 'Sub-subcategory created successfully',
      subSubcategory,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating sub-subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to create sub-subcategory' },
      { status: 500 }
    );
  }
}