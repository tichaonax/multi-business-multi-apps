import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { randomBytes } from 'crypto';
// Validation schemas
const CreateCategorySchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.number().int().min(0).default(0),
  businessType: z.string().min(1),
  attributes: z.record(z.unknown()).optional()
})

const UpdateCategorySchema = CreateCategorySchema.partial().extend({
  id: z.string().min(1)
})

// GET - Fetch categories for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const businessType = searchParams.get('businessType')
    const parentId = searchParams.get('parentId')
    const includeProducts = searchParams.get('includeProducts') === 'true'

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const where: any = { businessId, isActive: true }

    if (businessType) {
      where.businessType = businessType
    }

    if (parentId !== null) {
      where.parentId = parentId || null
    }

    const categories = await prisma.businessCategories.findMany({
      where,
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        parentCategory: {
          select: { id: true, name: true }
        },
        childCategories: {
          select: { id: true, name: true, displayOrder: true },
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        },
        ...(includeProducts && {
          businessProducts: {
            select: {
              id: true,
              name: true,
              sku: true,
              basePrice: true,
              isActive: true
            },
            where: { isActive: true }
          }
        })
      },
      orderBy: { displayOrder: 'asc' }
    })

    // Map canonical relation names back to legacy API shape (parent, children, products)
    const mapped = (categories as any[]).map((c) => {
      const { parentCategory, childCategories, businessProducts, ...rest } = c || {}
      return {
        ...rest,
        parent: parentCategory ?? null,
        children: childCategories ?? [],
        products: businessProducts ?? []
      }
    })

    return NextResponse.json({
      success: true,
      data: mapped,
      meta: {
        total: mapped.length,
        businessId,
        businessType
      }
    })

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateCategorySchema.parse(body)

    // Verify business exists and user has access
    const business = await prisma.businesses.findUnique({
      where: { id: validatedData.businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check for duplicate name within the business
    const existingCategory = await prisma.businessCategories.findFirst({
      where: {
        businessId: validatedData.businessId,
        name: validatedData.name,
        parentId: validatedData.parentId || null
      }
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category with this name already exists in this business' },
        { status: 409 }
      )
    }

    // Verify parent category exists if specified
    if (validatedData.parentId) {
      const parentCategory = await prisma.businessCategories.findFirst({
        where: {
          id: validatedData.parentId,
          businessId: validatedData.businessId
        }
      })

      if (!parentCategory) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 404 }
        )
      }
    }

    const category = await prisma.businessCategories.create({
      data: {
        ...validatedData,
        businessType: validatedData.businessType || business.type
      } as any,
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        parentCategory: {
          select: { id: true, name: true }
        },
        childCategories: {
          select: { id: true, name: true, displayOrder: true },
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UpdateCategorySchema.parse(body)

    const { id, ...updateData } = validatedData

    // Verify category exists
    const existingCategory = await prisma.businessCategories.findUnique({
      where: { id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check for duplicate name if name is being updated
    if (updateData.name) {
      const duplicateCategory = await prisma.businessCategories.findFirst({
        where: {
          businessId: existingCategory.businessId,
          name: updateData.name,
          parentId: updateData.parentId || existingCategory.parentId,
          id: { not: id }
        }
      })

      if (duplicateCategory) {
        return NextResponse.json(
          { error: 'Category with this name already exists' },
          { status: 409 }
        )
      }
    }

    const category = await prisma.businessCategories.update({
      where: { id },
      data: updateData as any,
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        parentCategory: {
          select: { id: true, name: true }
        },
        childCategories: {
          select: { id: true, name: true, displayOrder: true },
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category has products
    const categoryWithProducts = await prisma.businessCategories.findUnique({
      where: { id },
      include: {
        businessProducts: {
          where: { isActive: true },
          select: { id: true }
        },
        childCategories: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    })

    if (!categoryWithProducts) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    if ((categoryWithProducts.businessProducts ?? []).length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with active products. Move or deactivate products first.' },
        { status: 409 }
      )
    }

    if ((categoryWithProducts.childCategories ?? []).length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with active child categories. Move or deactivate child categories first.' },
        { status: 409 }
      )
    }

    // Soft delete the category
    await prisma.businessCategories.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Category deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}