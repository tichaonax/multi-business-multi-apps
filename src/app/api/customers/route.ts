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
    if (!session?.users?.id) {
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
        { fullName: { contains: search, mode: 'insensitive' } },
        { primaryEmail: { contains: search, mode: 'insensitive' } },
        { primaryPhone: { contains: search } },
        { nationalId: { contains: search } }
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
    const [customers, total] = await Promise.all([
      prisma.universalCustomer.findMany({
        where,
        include: {
          divisionAccounts: {
            where: businessId ? { businessId } : undefined,
            include: {
              businesses: {
                select: { id: true, name: true, type: true }
              }
            }
          },
          linkedUser: {
            select: { id: true, name: true, email: true }
          },
          linkedEmployee: {
            select: { id: true, employeeNumber: true, fullName: true }
          },
          _count: {
            select: {
              divisionAccounts: true,
              laybys: true,
              creditApplications: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.universalCustomer.count({ where })
    ])

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
    if (!session?.users?.id) {
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
      const existing = await prisma.universalCustomer.findFirst({
        where: { primaryEmail: validatedData.primaryEmail }
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
      const existingByPhone = await prisma.universalCustomer.findFirst({ where: { primaryPhone: validatedData.primaryPhone } })
      if (existingByPhone) {
        return NextResponse.json(
          { error: 'Customer with this phone number already exists', existingCustomerId: existingByPhone.id },
          { status: 400 }
        )
      }
    }

    // Check for existing customer by national ID
    if (validatedData.nationalId) {
      const existing = await prisma.universalCustomer.findFirst({
        where: { nationalId: validatedData.nationalId }
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Customer with this national ID already exists', existingCustomerId: existing.id },
          { status: 400 }
        )
      }
    }

    // Generate customer number
    const count = await prisma.universalCustomer.count()
    const customerNumber = `UCST-${String(count + 1).padStart(6, '0')}`

    // Create customer and division account in transaction
    const customer = await prisma.$transaction(async (tx) => {
      // Create universal customer
      const newCustomer = await tx.universalCustomer.create({
        data: {
          customerNumber,
          type: validatedData.type,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          fullName: validatedData.fullName,
          companyName: validatedData.companyName,
          dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
          gender: validatedData.gender,
          primaryEmail: validatedData.primaryEmail,
          // primaryPhone is non-nullable in the DB schema; ensure we always send a string
          primaryPhone: validatedData.primaryPhone ?? '',
          // alternatePhone may be nullable - store null when not provided
          alternatePhone: validatedData.alternatePhone || null,
          address: validatedData.address,
          city: validatedData.city,
          state: validatedData.state,
          country: validatedData.country,
          postalCode: validatedData.postalCode,
          nationalId: validatedData.nationalId,
          passportNumber: validatedData.passportNumber,
          taxNumber: validatedData.taxNumber,
          linkedUserId: validatedData.linkedUserId,
          linkedEmployeeId: validatedData.linkedEmployeeId,
          tags: validatedData.tags || [],
          createdBy: session.users.id
        }
      })

      // Create division account if businessId provided
      if (validatedData.businessId) {
        const businessCount = await tx.customerDivisionAccount.count({
          where: { businessId: validatedData.businessId }
        })

        const business = await tx.businesses.findUnique({
          where: { id: validatedData.businessId },
          select: { type: true }
        })

        const divisionPrefix = business?.type.substring(0, 3).toUpperCase() || 'DIV'
        const divisionCustomerNumber = validatedData.divisionCustomerNumber ||
          `${divisionPrefix}-CUST-${String(businessCount + 1).padStart(6, '0')}`

        await tx.customerDivisionAccount.create({
          data: {
            universalCustomerId: newCustomer.id,
            businessId: validatedData.businessId,
            divisionCustomerNumber,
            accountType: validatedData.accountType,
            segment: validatedData.segment,
            allowLayby: validatedData.allowLayby,
            allowCredit: validatedData.allowCredit,
            createdBy: session.users.id
          }
        })
      }

      return newCustomer
    })

    // Fetch complete customer with relations
    const completeCustomer = await prisma.universalCustomer.findUnique({
      where: { id: customer.id },
      include: {
        divisionAccounts: {
          include: {
            businesses: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        linkedUser: {
          select: { id: true, name: true, email: true }
        },
        linkedEmployee: {
          select: { id: true, employeeNumber: true, fullName: true }
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
