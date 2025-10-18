import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { z } from 'zod'

// Customer update schema
const UpdateCustomerSchema = z.object({
  type: z.enum(['INDIVIDUAL', 'BUSINESS', 'EMPLOYEE', 'USER', 'GOVERNMENT', 'NGO']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  companyName: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  primaryEmail: z.string().email().optional().nullable(),
  primaryPhone: z.string().optional(),
  alternatePhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional(),
  postalCode: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  passportNumber: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
})

// GET - Get customer details
export async function GET(
  request: NextRequest,
  paramsPromise: Promise<{ params: { customerId: string } }>
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

  const { params } = await paramsPromise
  const { customerId } = params

    // Fetch customer with all relations
    const customer = await prisma.businessCustomers.findUnique({
      where: { id: customerId },
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        business_orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: {
          select: {
            business_orders: true
          }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })

  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// PUT - Update customer
export async function PUT(
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
    const validatedData = UpdateCustomerSchema.parse(body)

    // Check if customer exists
    const existing = await prisma.businessCustomers.findUnique({
      where: { id: customerId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check for email conflicts (if email is being changed)
    if (validatedData.primaryEmail && validatedData.primaryEmail !== existing.primaryEmail) {
      const emailConflict = await prisma.businessCustomers.findFirst({
        where: {
          primaryEmail: validatedData.primaryEmail,
          id: { not: customerId }
        }
      })
      if (emailConflict) {
        return NextResponse.json(
          { error: 'Customer with this email already exists' },
          { status: 400 }
        )
      }
    }

    // Check for national ID conflicts (if national ID is being changed)
    if (validatedData.nationalId && validatedData.nationalId !== existing.nationalId) {
      const idConflict = await prisma.businessCustomers.findFirst({
        where: {
          nationalId: validatedData.nationalId,
          id: { not: customerId }
        }
      })
      if (idConflict) {
        return NextResponse.json(
          { error: 'Customer with this national ID already exists' },
          { status: 400 }
        )
      }
    }

    // Update customer
    const customer = await prisma.businessCustomers.update({
      where: { id: customerId },
      data: {
        type: validatedData.type,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        fullName: validatedData.fullName,
        companyName: validatedData.companyName,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
        gender: validatedData.gender,
        primaryEmail: validatedData.primaryEmail,
        primaryPhone: validatedData.primaryPhone,
        alternatePhone: validatedData.alternatePhone,
        address: validatedData.address,
        city: validatedData.city,
        state: validatedData.state,
        country: validatedData.country,
        postalCode: validatedData.postalCode,
        nationalId: validatedData.nationalId,
        passportNumber: validatedData.passportNumber,
        taxNumber: validatedData.taxNumber,
        tags: validatedData.tags,
        isActive: validatedData.isActive,
        updatedAt: new Date()
      },
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        business_orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true
          },
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    return NextResponse.json({
      success: true,
      customer,
      message: 'Customer updated successfully'
    })

  } catch (error) {
    console.error('Error updating customer:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete customer
export async function DELETE(
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

    // Check if customer exists
    const existing = await prisma.businessCustomers.findUnique({
      where: { id: customerId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await prisma.businessCustomers.update({
      where: { id: customerId },
      data: { isActive: false, updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      message: 'Customer deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
