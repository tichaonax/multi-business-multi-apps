import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'
import { z } from 'zod'
import { getServerUser } from '@/lib/get-server-user'

// Division account update schema
const UpdateDivisionAccountSchema = z.object({
  accountType: z.string().optional(),
  segment: z.string().optional(),
  creditLimit: z.number().optional(),
  allowLayby: z.boolean().optional(),
  allowCredit: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']).optional(),
  isActive: z.boolean().optional()
})

// GET - Get division account details
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string; accountId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(user, 'canAccessCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { customerId, accountId } = params

    // Fetch account with verification
    const account = await prisma.customerDivisionAccount.findFirst({
      where: {
        id: accountId,
        universalCustomerId: customerId
      },
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        },
        universalCustomer: {
          select: { id: true, customerNumber: true, fullName: true, primaryEmail: true, primaryPhone: true }
        },
        _count: {
          select: {
            businessOrders: true
          }
        }
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Division account not found' }, { status: 404 })
    }

    return NextResponse.json({ account })

  } catch (error) {
    console.error('Error fetching division account:', error)
    return NextResponse.json(
      { error: 'Failed to fetch division account' },
      { status: 500 }
    )
  }
}

// PUT - Update division account
export async function PUT(
  request: NextRequest,
  { params }: { params: { customerId: string; accountId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(user, 'canManageCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { customerId, accountId } = params
    const body = await request.json()
    const validatedData = UpdateDivisionAccountSchema.parse(body)

    // Verify account exists and belongs to customer
    const existing = await prisma.customerDivisionAccount.findFirst({
      where: {
        id: accountId,
        universalCustomerId: customerId
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Division account not found' }, { status: 404 })
    }

    // Update account
    const account = await prisma.customerDivisionAccount.update({
      where: { id: accountId },
      data: {
        accountType: validatedData.accountType,
        segment: validatedData.segment,
        creditLimit: validatedData.creditLimit,
        allowLayby: validatedData.allowLayby,
        allowCredit: validatedData.allowCredit,
        status: validatedData.status,
        isActive: validatedData.isActive,
        updatedAt: new Date()
      },
      include: {
        businesses: {
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
      message: 'Division account updated successfully'
    })

  } catch (error) {
    console.error('Error updating division account:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update division account' },
      { status: 500 }
    )
  }
}

// DELETE - Close division account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { customerId: string; accountId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(user, 'canManageCustomers')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { customerId, accountId } = params

    // Verify account exists and belongs to customer
    const existing = await prisma.customerDivisionAccount.findFirst({
      where: {
        id: accountId,
        universalCustomerId: customerId
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Division account not found' }, { status: 404 })
    }

    // Check for active laybys or credit
    const activeLaybys = await prisma.customerLayby.count({
      where: {
        universalCustomerId: customerId,
        businessId: existing.businessId,
        status: { in: ['ACTIVE', 'PENDING'] }
      }
    })

    if (activeLaybys > 0) {
      return NextResponse.json(
        { error: 'Cannot close account with active laybys' },
        { status: 400 }
      )
    }

    // Soft delete by marking as closed and inactive
    await prisma.customerDivisionAccount.update({
      where: { id: accountId },
      data: {
        status: 'CLOSED',
        isActive: false,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Division account closed successfully'
    })

  } catch (error) {
    console.error('Error closing division account:', error)
    return NextResponse.json(
      { error: 'Failed to close division account' },
      { status: 500 }
    )
  }
}
