import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { randomUUID } from 'crypto'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    // Query parameters
    const search = searchParams.get('search')
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

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

    // ONE-WAY SUPPLIER ISOLATION:
    // - Suppliers are shared by businessType
    // - Demo businesses see ALL suppliers of that type
    // - Real businesses only see suppliers from real businesses or shared (businessId=null)
    const supplierFilter: any = {
      businessType: business.type,
      OR: [
        { businessId: null }, // Shared suppliers (no owner) always visible
        ...(business.isDemo
          ? [{ businessId: { not: null } }] // Demo sees all suppliers
          : [
              { businesses: { isDemo: false } }, // Real only sees real business suppliers
              { businesses: null } // Include suppliers with no business link
            ]
        )
      ]
    }

    if (isActive !== null) {
      supplierFilter.isActive = isActive === 'true'
    }

    if (search) {
      supplierFilter.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { supplierNumber: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    }

    // Get suppliers with product count (shared across all businesses of same type)
    const suppliers = await prisma.businessSuppliers.findMany({
      where: supplierFilter,
      include: {
        businesses: {
          select: {
            isDemo: true
          }
        },
        _count: {
          select: {
            business_products: true,
            supplier_products: true
          }
        }
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await prisma.businessSuppliers.count({ where: supplierFilter })

    // Transform response
    const items = suppliers.map(supplier => ({
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
    }))

    return NextResponse.json({
      suppliers: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        search,
        isActive
      }
    })

  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Supplier name is required' },
        { status: 400 }
      )
    }

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

    // Check for duplicate supplier by name and businessType (shared suppliers)
    const existingSupplier = await prisma.businessSuppliers.findFirst({
      where: {
        businessType: business.type,
        name: {
          equals: body.name,
          mode: 'insensitive'
        }
      }
    })

    if (existingSupplier) {
      return NextResponse.json(
        {
          error: 'Duplicate supplier',
          message: `A supplier named "${body.name}" already exists for ${business.type} businesses. Suppliers are shared across all businesses of the same type.`
        },
        { status: 409 }
      )
    }

    // Generate supplier number if not provided
    let supplierNumber = body.supplierNumber
    if (!supplierNumber) {
      // Get the highest supplier number for this businessType
      const lastSupplier = await prisma.businessSuppliers.findFirst({
        where: { businessType: business.type },
        orderBy: { supplierNumber: 'desc' },
        select: { supplierNumber: true }
      })

      if (lastSupplier && lastSupplier.supplierNumber) {
        // Try to extract number from format like "SUP-001"
        const match = lastSupplier.supplierNumber.match(/(\d+)$/)
        if (match) {
          const nextNum = parseInt(match[1]) + 1
          const prefix = business.type.substring(0, 3).toUpperCase()
          supplierNumber = `${prefix}-SUP-${String(nextNum).padStart(3, '0')}`
        } else {
          const prefix = business.type.substring(0, 3).toUpperCase()
          supplierNumber = `${prefix}-SUP-001`
        }
      } else {
        const prefix = business.type.substring(0, 3).toUpperCase()
        supplierNumber = `${prefix}-SUP-001`
      }
    }

    // Create the supplier (shared across all businesses of same type)
    const supplier = await prisma.businessSuppliers.create({
      data: {
        id: randomUUID(),
        businessId,
        supplierNumber,
        name: body.name,
        emoji: body.emoji || null,
        contactPerson: body.contactPerson || null,
        email: body.email || null,
        phone: body.phone || null,
        taxId: body.taxId || null,
        address: body.address || null,
        paymentTerms: body.paymentTerms || null,
        creditLimit: body.creditLimit ? parseFloat(body.creditLimit) : null,
        accountBalance: body.accountBalance ? parseFloat(body.accountBalance) : 0,
        notes: body.notes || null,
        isActive: body.isActive !== false,
        businessType: business.type,
        attributes: body.attributes || {},
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      message: 'Supplier created successfully',
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
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error creating supplier:', error)

    // Handle Prisma unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Duplicate supplier',
          message: 'A supplier with this number already exists for this business type. Suppliers are shared across all businesses of the same type.'
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to create supplier',
        message: 'Unable to create the supplier. Please check your input and try again.'
      },
      { status: 500 }
    )
  }
}
