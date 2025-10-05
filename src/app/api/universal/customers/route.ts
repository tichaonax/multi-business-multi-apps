import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { z } from 'zod'

// Validation schemas
const CreateCustomerSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().datetime().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  customerType: z.enum(['INDIVIDUAL', 'BUSINESS', 'CONTRACTOR', 'WHOLESALE', 'VIP']).default('INDIVIDUAL'),
  segment: z.string().optional(), // Business-specific segmentation
  businessType: z.string().min(1),
  attributes: z.record(z.string(), z.any()).optional() // Business-specific customer data
})

const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  id: z.string().min(1)
})

// Generate customer number based on business type
function generateCustomerNumber(businessType: string, customerCount: number): string {
  const prefix = {
    clothing: 'CL',
    hardware: 'HW',
    grocery: 'GR',
    restaurant: 'RT',
    consulting: 'CS'
  }[businessType] || 'CU'

  const counter = String(customerCount + 1).padStart(6, '0')
  return `${prefix}${counter}`
}

// GET - Fetch customers for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const customerType = searchParams.get('customerType')
    const segment = searchParams.get('segment')
    const search = searchParams.get('search')
    const includeOrders = searchParams.get('includeOrders') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const where: any = { businessId, isActive: true }

    if (customerType) where.customerType = customerType as any
    if (segment) where.segment = segment

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { customerNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [customers, totalCount] = await Promise.all([
      prisma.businessCustomer.findMany({
        where,
        include: {
          business: {
            select: { name: true, type: true }
          },
          ...(includeOrders && {
            businessOrders: {
              select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                status: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' },
              take: 10 // Latest 10 orders
            }
          }),
          _count: {
            select: {
              businessOrders: true
            }
          }
        },
        orderBy: [
          { totalSpent: 'desc' },
          { name: 'asc' }
        ],
        skip,
        take: limit
      }),
      prisma.businessCustomer.count({ where })
    ])

    // Calculate summary statistics
    const summary = await prisma.businessCustomer.aggregate({
      where,
      _sum: {
        totalSpent: true,
        loyaltyPoints: true
      },
      _count: true
    })

    return NextResponse.json({
      success: true,
      data: customers,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: skip + customers.length < totalCount,
        summary: {
          totalCustomers: summary._count,
          totalSpent: summary._sum.totalSpent || 0,
          totalLoyaltyPoints: summary._sum.loyaltyPoints || 0
        }
      }
    })

  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateCustomerSchema.parse(body)

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Check for duplicate email within the business if email provided
    if (validatedData.email) {
      const existingCustomer = await prisma.businessCustomer.findFirst({
        where: {
          businessId: validatedData.businessId,
          email: validatedData.email
        }
      })

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Customer with this email already exists in this business' },
          { status: 409 }
        )
      }
    }

    // Get current customer count for customer number generation
    const customerCount = await prisma.businessCustomer.count({
      where: { businessId: validatedData.businessId }
    })

    const customerNumber = generateCustomerNumber(validatedData.businessType, customerCount)

    const customer = await prisma.businessCustomer.create({
      data: {
        id: randomUUID(),
        updatedAt: new Date(),
        ...validatedData,
        customerNumber,
        businessType: validatedData.businessType || business.type,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        loyaltyPoints: 0,
        totalSpent: 0
      },
      include: {
        business: {
          select: { name: true, type: true }
        },
        _count: {
          select: {
            businessOrders: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT - Update customer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = UpdateCustomerSchema.parse(body)

    const { id, ...updateData } = validatedData

    // Verify customer exists
    const existingCustomer = await prisma.businessCustomer.findUnique({
      where: { id }
    })

    if (!existingCustomer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check for duplicate email if email is being updated
    if (updateData.email && updateData.email !== existingCustomer.email) {
      const duplicateCustomer = await prisma.businessCustomer.findFirst({
        where: {
          businessId: existingCustomer.businessId,
          email: updateData.email,
          id: { not: id }
        }
      })

      if (duplicateCustomer) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 409 }
        )
      }
    }

    const customer = await prisma.businessCustomer.update({
      where: { id },
      data: {
        ...updateData,
        dateOfBirth: updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : undefined
      },
      include: {
        business: {
          select: { name: true, type: true }
        },
        _count: {
          select: {
            businessOrders: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete customer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Check if customer has orders
    const customerWithOrders = await prisma.businessCustomer.findUnique({
      where: { id },
      include: {
        businessOrders: {
          where: {
            status: {
              notIn: ['COMPLETED', 'CANCELLED', 'REFUNDED']
            }
          },
          select: { id: true, orderNumber: true, status: true }
        }
      }
    })

    if (!customerWithOrders) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    if (customerWithOrders.businessOrders.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete customer with active orders. Complete or cancel orders first.',
          activeOrders: customerWithOrders.businessOrders
        },
        { status: 409 }
      )
    }

    // Soft delete the customer
    await prisma.businessCustomer.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Customer deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}