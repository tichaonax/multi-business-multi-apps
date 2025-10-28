import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { z } from 'zod'

import { randomBytes } from 'crypto';
// Customer creation schema
const CreateCustomerSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'BUSINESS', 'EMPLOYEE', 'USER', 'GOVERNMENT', 'NGO']).default('INDIVIDUAL'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().min(1, 'Full name is required'),
  companyName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  primaryEmail: z.string().email().optional(),
  // allow creating customers without a phone number; empty string is accepted
  primaryPhone: z.string().optional(),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default('Zimbabwe'),
  postalCode: z.string().optional(),
  nationalId: z.string().optional(),
  passportNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  linkedUserId: z.string().optional(),
  linkedEmployeeId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // Division account details
  businessId: z.string().optional(),
  divisionCustomerNumber: z.string().optional(),
  accountType: z.string().optional(),
  segment: z.string().optional(),
  allowLayby: z.boolean().default(true),
  allowCredit: z.boolean().default(false)
})

// GET - List/search customers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user, 'canAccessCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const businessId = searchParams.get('businessId')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      isActive: true
    }

    // Search filter
    if (search) {
      where.OR = [
        { customerNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ]
    }

    // Type filter
    if (type) {
      where.type = type
    }

    // Business filter - if businessId provided, only show customers with accounts in that business
    if (businessId) {
      where.divisionAccounts = {
        some: {
          businessId,
          isActive: true
        }
      }
    }

    // Fetch customers
    const [customersRaw, total] = await Promise.all([
      prisma.businessCustomers.findMany({
        where,
        include: {
          businesses: {
            select: { id: true, name: true, type: true }
          },
          business_orders: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              totalAmount: true,
              createdAt: true
            },
            take: 5, // Limit to recent orders
            orderBy: { createdAt: 'desc' }
          },
          customer_laybys: {
            select: { id: true, status: true }
          },
          _count: {
            select: {
              business_orders: true,
              customer_laybys: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.businessCustomers.count({ where })
    ])

    // Map to expected format for frontend
    const customers = customersRaw.map((customer) => ({
      id: customer.id,
      customerNumber: customer.customerNumber,
      type: customer.customerType || 'INDIVIDUAL',
      fullName: customer.name,
      companyName: (customer.attributes as any)?.companyName || null,
      primaryEmail: customer.email,
      primaryPhone: customer.phone,
      address: customer.address,
      city: customer.city,
      isActive: customer.isActive,
      divisionAccounts: [], // Not using division accounts in this context
      linkedUser: null,
      linkedEmployee: null,
      _count: {
        divisionAccounts: 1, // Each customer has one business account
        laybys: customer._count.customer_laybys,
        creditApplications: 0 // Credit applications feature not yet implemented
      }
    }))

    return NextResponse.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST - Create new customer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user, 'canManageCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = CreateCustomerSchema.parse(body)

    // Check for existing customer by email or phone
    if (validatedData.primaryEmail) {
      const existing = await prisma.businessCustomers.findFirst({
        where: { email: validatedData.primaryEmail }
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Customer with this email already exists', existingCustomerId: existing.id },
          { status: 400 }
        )
      }
    }

    // Check for existing customer by phone
    if (validatedData.primaryPhone) {
      const existingByPhone = await prisma.businessCustomers.findFirst({ where: { phone: validatedData.primaryPhone } })
      if (existingByPhone) {
        return NextResponse.json(
          { error: 'Customer with this phone number already exists', existingCustomerId: existingByPhone.id },
          { status: 400 }
        )
      }
    }

    // Require businessId for customer creation
    if (!validatedData.businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      )
    }

    // Get business details
    const business = await prisma.businesses.findUnique({
      where: { id: validatedData.businessId },
      select: { type: true, name: true }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Generate customer number
    const count = await prisma.businessCustomers.count({
      where: { businessId: validatedData.businessId }
    })
    const customerNumber = `${business.type.substring(0, 3).toUpperCase()}-CUST-${String(count + 1).padStart(6, '0')}`

    // Create customer matching actual BusinessCustomers schema
    const customer = await prisma.businessCustomers.create({
      data: {
        id: randomBytes(16).toString('hex'),
        businessId: validatedData.businessId,
        customerNumber,
        name: validatedData.fullName,
        email: validatedData.primaryEmail || null,
        phone: validatedData.primaryPhone || null,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        country: validatedData.country || 'Zimbabwe',
        customerType: validatedData.type as any,
        segment: validatedData.segment || null,
        businessType: business.type,
        attributes: {
          allowLayby: validatedData.allowLayby,
          allowCredit: validatedData.allowCredit,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          companyName: validatedData.companyName,
          gender: validatedData.gender,
          alternatePhone: validatedData.alternatePhone,
          state: validatedData.state,
          postalCode: validatedData.postalCode,
          nationalId: validatedData.nationalId,
          passportNumber: validatedData.passportNumber,
          taxNumber: validatedData.taxNumber
        },
        updatedAt: new Date()
      }
    })

    // Fetch complete customer with relations
    const completeCustomer = await prisma.businessCustomers.findUnique({
      where: { id: customer.id },
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        business_orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      customer: completeCustomer,
      message: `Customer created successfully: ${customerNumber}`
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating customer:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}
