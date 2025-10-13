import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UniversalSupplier } from '@/types/supplier'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
)
 {

    const { supplierId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Find the business
    const business = await prisma.businesses.findFirst({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get suppliers from business metadata
    const suppliers = (business.metadata as any)?.suppliers || []
    const supplier = suppliers.find((s: UniversalSupplier) => s.id === supplierId)

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    return NextResponse.json({ supplier })
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
)
 {

    const { supplierId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierData: Partial<UniversalSupplier> = await request.json()

    if (!supplierData.businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Find the business
    const business = await prisma.businesses.findFirst({
      where: { id: supplierData.businessId }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get suppliers from business metadata
    const currentMetadata = business.metadata as any || {}
    const suppliers = currentMetadata.suppliers || []
    const supplierIndex = suppliers.findIndex((s: UniversalSupplier) => s.id === supplierId)

    if (supplierIndex === -1) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Update the supplier
    const updatedSupplier = {
      ...suppliers[supplierIndex],
      ...supplierData,
      id: supplierId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: session.users.id
    }

    suppliers[supplierIndex] = updatedSupplier

    // Update business metadata
    await prisma.businesses.update({
      where: { id: business.id },
      data: {
        metadata: {
          ...currentMetadata,
          suppliers
        }
      }
    })

    return NextResponse.json({ supplier: updatedSupplier })
  } catch (error) {
    console.error('Error updating supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
)
 {

    const { supplierId } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 })
    }

    // Find the business
    const business = await prisma.businesses.findFirst({
      where: { id: businessId }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get suppliers from business metadata
    const currentMetadata = business.metadata as any || {}
    const suppliers = currentMetadata.suppliers || []
    const supplierIndex = suppliers.findIndex((s: UniversalSupplier) => s.id === supplierId)

    if (supplierIndex === -1) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    // Remove the supplier
    suppliers.splice(supplierIndex, 1)

    // Update business metadata
    await prisma.businesses.update({
      where: { id: business.id },
      data: {
        metadata: {
          ...currentMetadata,
          suppliers
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}