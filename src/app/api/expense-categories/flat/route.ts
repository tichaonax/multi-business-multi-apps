import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/expense-categories/flat
 * Create a new flat expense category (no subcategories)
 *
 * Body:
 * - name: string (required)
 * - emoji: string (required)
 * - color: string (required, hex color)
 * - description?: string (optional)
 * - requiresSubcategory: boolean (default: false for flat categories)
 * - isUserCreated: boolean (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user permissions
    const permissions = getEffectivePermissions(user)
    if (!permissions.canCreateExpenseAccount) {
      // Using this permission as proxy for category management
      return NextResponse.json(
        { error: 'You do not have permission to create expense categories' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, emoji, color, description, requiresSubcategory, isUserCreated, domainId } = body

    // Validate required fields
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    if (!emoji || emoji.trim() === '') {
      return NextResponse.json(
        { error: 'Emoji is required' },
        { status: 400 }
      )
    }

    if (!color || color.trim() === '') {
      return NextResponse.json(
        { error: 'Color is required' },
        { status: 400 }
      )
    }

    // Validate color format (basic hex color validation)
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      return NextResponse.json(
        { error: 'Color must be a valid hex color (e.g., #3B82F6)' },
        { status: 400 }
      )
    }

    // Validate domain exists if provided
    if (domainId) {
      const domain = await prisma.expenseDomains.findUnique({ where: { id: domainId } })
      if (!domain) {
        return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
      }
    }

    // Check if category with same name already exists (within same domain scope)
    const existing = await prisma.expenseCategories.findFirst({
      where: {
        name: name.trim(),
        domainId: domainId || null,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      )
    }

    // Create flat category
    const category = await prisma.expenseCategories.create({
      data: {
        name: name.trim(),
        emoji: emoji.trim(),
        color: color.trim(),
        description: description?.trim() || null,
        requiresSubcategory: requiresSubcategory ?? false,
        isUserCreated: isUserCreated ?? true,
        isDefault: false,
        domainId: domainId || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Expense category created successfully',
        data: {
          category: {
            id: category.id,
            name: category.name,
            emoji: category.emoji,
            color: category.color,
            description: category.description,
            requiresSubcategory: category.requiresSubcategory,
            isUserCreated: category.isUserCreated,
            isDefault: category.isDefault,
            createdAt: category.createdAt.toISOString(),
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating flat expense category:', error)
    return NextResponse.json(
      { error: 'Failed to create expense category' },
      { status: 500 }
    )
  }
}
