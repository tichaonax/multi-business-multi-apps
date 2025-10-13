import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

import { randomBytes } from 'crypto';
// Validation schemas
const CreateBrandSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
  website: z.string().url().optional(),
  businessType: z.string().min(1),
  attributes: z.record(z.string(), z.unknown()).optional()
})

const UpdateBrandSchema = CreateBrandSchema.partial().extend({
  id: z.string().min(1)
})

// GET - Fetch brands for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const businessType = searchParams.get('businessType')
    const search = searchParams.get('search')
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

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const brands = await prisma.businessBrands.findMany({
      where,
      include: {
        businesses: {
          select: { name: true, type: true }
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
        }),
        _count: {
          select: {
            businessProducts: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: brands,
      meta: {
        total: brands.length,
        businessId,
        businessType
      }
    })

  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new brand
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateBrandSchema.parse(body)

    // Verify business exists
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
    const existingBrand = await prisma.businessBrands.findFirst({
      where: {
        businessId: validatedData.businessId,
        name: validatedData.name
      }
    })

    if (existingBrand) {
      return NextResponse.json(
        { error: 'Brand with this name already exists in this business' },
        { status: 409 }
      )
    }

    const brand = await prisma.businessBrands.create({
      data: {
        ...validatedData,
        businessType: validatedData.businessType || business.type
      } as any,
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        _count: {
          select: {
            businessProducts: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: brand,
      message: 'Brand created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating brand:', error)
    return NextResponse.json(
      { error: 'Failed to create brand', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update brand
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UpdateBrandSchema.parse(body)

    const { id, ...updateData } = validatedData

    // Verify brand exists
    const existingBrand = await prisma.businessBrands.findUnique({
      where: { id }
    })

    if (!existingBrand) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== existingBrand.name) {
      const duplicateBrand = await prisma.businessBrands.findFirst({
        where: {
          businessId: existingBrand.businessId,
          name: updateData.name,
          id: { not: id }
        }
      })

      if (duplicateBrand) {
        return NextResponse.json(
          { error: 'Brand with this name already exists' },
          { status: 409 }
        )
      }
    }

    const brand = await prisma.businessBrands.update({
      where: { id },
      data: updateData as any,
      include: {
        businesses: {
          select: { name: true, type: true }
        },
        _count: {
          select: {
            businessProducts: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: brand,
      message: 'Brand updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating brand:', error)
    return NextResponse.json(
      { error: 'Failed to update brand', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete brand
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      )
    }

    // Check if brand has products
    const brandWithProducts = await prisma.businessBrands.findUnique({
      where: { id },
      include: {
        businessProducts: {
          where: { isActive: true },
          select: { id: true }
        }
      }
    })

    if (!brandWithProducts) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    if ((brandWithProducts.businessProducts ?? []).length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete brand with active products. Move products to another brand or deactivate them first.',
          productCount: (brandWithProducts.businessProducts ?? []).length
        },
        { status: 409 }
      )
    }

    // Soft delete the brand
    await prisma.businessBrands.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Brand deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting brand:', error)
    return NextResponse.json(
      { error: 'Failed to delete brand', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}