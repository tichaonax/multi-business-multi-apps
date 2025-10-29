import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    const user = session.user as SessionUser

    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Get supplier with product count
    const supplier = await prisma.businessSuppliers.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        _count: {
          select: {
            business_products: true,
            supplier_products: true
          }
        }
      }
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        businessId: supplier.businessId,
        supplierNumber: supplier.supplierNumber,
        name: supplier.name,
        emoji: supplier.emoji,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        taxId: supplier.taxId,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit ? parseFloat(supplier.creditLimit.toString()) : null,
        accountBalance: supplier.accountBalance ? parseFloat(supplier.accountBalance.toString()) : 0,
        notes: supplier.notes,
        isActive: supplier.isActive,
        productCount: supplier._count.business_products + supplier._count.supplier_products,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      }
    })

  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    const body = await request.json()

    const user = session.user as SessionUser

    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Check if supplier exists
    const existingSupplier = await prisma.businessSuppliers.findFirst({
      where: {
        id,
        businessId
      }
    })

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Update the supplier
    const updateData: any = {
      updatedAt: new Date()
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.emoji !== undefined) updateData.emoji = body.emoji
    if (body.contactPerson !== undefined) updateData.contactPerson = body.contactPerson
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.taxId !== undefined) updateData.taxId = body.taxId
    if (body.address !== undefined) updateData.address = body.address
    if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms
    if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit ? parseFloat(body.creditLimit) : null
    if (body.accountBalance !== undefined) updateData.accountBalance = parseFloat(body.accountBalance)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    if (body.attributes !== undefined) updateData.attributes = body.attributes

    const supplier = await prisma.businessSuppliers.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      message: 'Supplier updated successfully',
      supplier: {
        id: supplier.id,
        businessId: supplier.businessId,
        supplierNumber: supplier.supplierNumber,
        name: supplier.name,
        emoji: supplier.emoji,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        taxId: supplier.taxId,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
        creditLimit: supplier.creditLimit ? parseFloat(supplier.creditLimit.toString()) : null,
        accountBalance: supplier.accountBalance ? parseFloat(supplier.accountBalance.toString()) : 0,
        notes: supplier.notes,
        isActive: supplier.isActive,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      }
    })

  } catch (error: any) {
    console.error('Error updating supplier:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Duplicate supplier',
          message: 'A supplier with this number already exists in this business.'
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to update supplier',
        message: 'Unable to update the supplier. Please try again.'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId, id } = await params
    const user = session.user as SessionUser

    // Verify business access
    let business: any = null
    if (isSystemAdmin(user)) {
      business = await prisma.businesses.findUnique({
        where: { id: businessId }
      })
    } else {
      business = await prisma.businesses.findFirst({
        where: {
          id: businessId,
          business_memberships: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }
      })
    }

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found or access denied' },
        { status: 404 }
      )
    }

    // Check if supplier exists
    const supplier = await prisma.businessSuppliers.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        _count: {
          select: {
            business_products: true,
            supplier_products: true
          }
        }
      }
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    // Check if supplier is being used
    const productCount = supplier._count.business_products + supplier._count.supplier_products
    if (productCount > 0) {
      return NextResponse.json(
        {
          error: 'Supplier in use',
          message: `Cannot delete supplier. It is currently linked to ${productCount} product(s). Please remove these associations first.`
        },
        { status: 400 }
      )
    }

    // Delete the supplier
    await prisma.businessSuppliers.delete({
      where: { id }
    })

    return NextResponse.json({
      message: 'Supplier deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete supplier',
        message: 'Unable to delete the supplier. Please try again.'
      },
      { status: 500 }
    )
  }
}
