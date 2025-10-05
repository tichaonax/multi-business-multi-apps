import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { z } from 'zod'

// Division account creation schema
const CreateDivisionAccountSchema = z.object({
  businessId: z.string().min(1, 'Business ID is required'),
  divisionCustomerNumber: z.string().optional(),
  accountType: z.string().optional(),
  segment: z.string().optional(),
  creditLimit: z.number().default(0),
  allowLayby: z.boolean().default(true),
  allowCredit: z.boolean().default(false)
})

// GET - List customer's division accounts
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user, 'canAccessCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { customerId } = params

    // Verify customer exists
    const customer = await prisma.universalCustomer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Fetch division accounts
    const accounts = await prisma.customerDivisionAccount.findMany({
      where: { universalCustomerId: customerId },
      include: {
        business: {
          select: { id: true, name: true, type: true }
        },
        _count: {
          select: {
            businessOrders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ accounts })

  } catch (error) {
    console.error('Error fetching division accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch division accounts' },
      { status: 500 }
    )
  }
}

// POST - Create new division account for customer
export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user, 'canManageCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { customerId } = params
    const body = await request.json()
    const validatedData = CreateDivisionAccountSchema.parse(body)

    // Verify customer exists
    const customer = await prisma.universalCustomer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Verify business exists
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
      select: { id: true, name: true, type: true }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Check if account already exists for this business
    const existingAccount = await prisma.customerDivisionAccount.findFirst({
      where: {
        universalCustomerId: customerId,
        businessId: validatedData.businessId
      }
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Customer already has an account with this business' },
        { status: 400 }
      )
    }

    // Generate division customer number if not provided
    let divisionCustomerNumber = validatedData.divisionCustomerNumber
    if (!divisionCustomerNumber) {
      const accountCount = await prisma.customerDivisionAccount.count({
        where: { businessId: validatedData.businessId }
      })
      const businessPrefix = business.type.substring(0, 3).toUpperCase()
      divisionCustomerNumber = `${businessPrefix}-CUST-${String(accountCount + 1).padStart(6, '0')}`
    }

    // Create division account
    const account = await prisma.customerDivisionAccount.create({
      data: {
        universalCustomerId: customerId,
        businessId: validatedData.businessId,
        divisionCustomerNumber,
        accountType: validatedData.accountType,
        segment: validatedData.segment,
        creditLimit: validatedData.creditLimit,
        allowLayby: validatedData.allowLayby,
        allowCredit: validatedData.allowCredit,
        createdBy: session.user.id
      },
      include: {
        business: {
          select: { id: true, name: true, type: true }
        },
        universalCustomer: {
          select: { id: true, customerNumber: true, fullName: true }
        }
      }
    })

    return NextResponse.json({
      success: true,
      account,
      message: `Division account created: ${divisionCustomerNumber}`
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating division account:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create division account' },
      { status: 500 }
    )
  }
}
