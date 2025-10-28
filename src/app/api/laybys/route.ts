import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

// Validation schemas
const CreateLaybyItemSchema = z.object({
  productVariantId: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0)
})

const CreateLaybySchema = z.object({
  businessId: z.string().min(1),
  customerId: z.string().min(1),
  items: z.array(CreateLaybyItemSchema).min(1),
  depositPercent: z.number().min(0).max(100),
  installmentAmount: z.number().min(0).optional(),
  installmentFrequency: z.enum(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'CUSTOM']).optional(),
  paymentDueDate: z.string().optional(), // ISO date string
  completionDueDate: z.string().optional(), // ISO date string
  serviceFee: z.number().min(0).default(0),
  administrationFee: z.number().min(0).default(0),
  notes: z.string().optional()
})

// Generate layby number based on business type
function generateLaybyNumber(businessType: string, laybyCount: number): string {
  const prefix = {
    clothing: 'LAY-CLO',
    hardware: 'LAY-HWD',
    grocery: 'LAY-GRC',
    restaurant: 'LAY-RST',
    construction: 'LAY-CON'
  }[businessType] || 'LAY-BIZ'

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const counter = String(laybyCount + 1).padStart(6, '0')
  return `${prefix}-${date}-${counter}`
}

// GET - Fetch laybys
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const customerId = searchParams.get('customerId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = (page - 1) * limit

    if (!businessId) {
      return NextResponse.json(
        { error: 'businessId is required' },
        { status: 400 }
      )
    }

    const where: any = { businessId }

    if (customerId) where.customerId = customerId
    if (status) where.status = status as any

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [laybys, totalCount] = await Promise.all([
      prisma.customerLayby.findMany({
        where,
        include: {
          business: {
            select: { name: true, type: true }
          },
          customer: {
            select: { id: true, name: true, customerNumber: true, phone: true, email: true }
          },
          creator: {
            select: { id: true, name: true }
          },
          _count: {
            select: { payments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.customerLayby.count({ where })
    ])

    return NextResponse.json({
      data: laybys,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching laybys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch laybys' },
      { status: 500 }
    )
  }
}

// POST - Create new layby
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateLaybySchema.parse(body)

    // Get business type
    const business = await prisma.businesses.findUnique({
      where: { id: validatedData.businessId },
      select: { type: true }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Verify customer exists and has layby enabled
    const customer = await prisma.businessCustomers.findUnique({
      where: { id: validatedData.customerId },
      select: { name: true, attributes: true }
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Check allowLayby from attributes JSON field
    const attributes = customer.attributes as any
    if (!attributes?.allowLayby) {
      return NextResponse.json(
        { error: 'Customer is not enabled for layby purchases' },
        { status: 400 }
      )
    }

    // Calculate totals
    const totalAmount = validatedData.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const depositAmount = (totalAmount * validatedData.depositPercent) / 100
    const balanceRemaining = totalAmount - depositAmount + validatedData.serviceFee + validatedData.administrationFee
    const totalFees = validatedData.serviceFee + validatedData.administrationFee

    // Generate layby number
    const existingLaybysCount = await prisma.customerLayby.count({
      where: { businessId: validatedData.businessId }
    })
    const laybyNumber = generateLaybyNumber(business.type, existingLaybysCount)

    // Get user ID from request (simplified - in production, get from auth session)
    const userId = request.headers.get('x-user-id') || 'system'

    // Create layby
    const layby = await prisma.customerLayby.create({
      data: {
        id: randomUUID(),
        laybyNumber,
        businessId: validatedData.businessId,
        customerId: validatedData.customerId,
        totalAmount,
        depositAmount,
        depositPercent: validatedData.depositPercent,
        balanceRemaining,
        totalPaid: 0,
        installmentAmount: validatedData.installmentAmount,
        installmentFrequency: validatedData.installmentFrequency,
        paymentDueDate: validatedData.paymentDueDate ? new Date(validatedData.paymentDueDate) : null,
        completionDueDate: validatedData.completionDueDate ? new Date(validatedData.completionDueDate) : null,
        serviceFee: validatedData.serviceFee,
        administrationFee: validatedData.administrationFee,
        totalFees,
        items: validatedData.items,
        notes: validatedData.notes,
        createdBy: userId,
        status: 'ACTIVE'
      },
      include: {
        business: {
          select: { name: true, type: true }
        },
        customer: {
          select: { id: true, name: true, customerNumber: true }
        },
        creator: {
          select: { id: true, name: true }
        }
      }
    })

    return NextResponse.json(
      { data: layby, message: 'Layby created successfully' },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating layby:', error)
    return NextResponse.json(
      { error: 'Failed to create layby' },
      { status: 500 }
    )
  }
}
