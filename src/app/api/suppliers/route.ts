import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UniversalSupplier, BusinessType } from '@/types/supplier'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const businessType = searchParams.get('businessType') as BusinessType

    if (!businessId || !businessType) {
      return NextResponse.json({ error: 'Business ID and type are required' }, { status: 400 })
    }

    // For now, we'll store suppliers in a simple JSON structure in the database
    // This can be expanded to use a proper relational structure later
    let business = await prisma.businesses.findFirst({
      where: {
        id: businessId,
        businessType: businessType
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Get suppliers from business metadata or return empty array
    const suppliers = (business.metadata as any)?.suppliers || []

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supplierData: Partial<UniversalSupplier> = await request.json()

    if (!supplierData.businessId || !supplierData.businessType) {
      return NextResponse.json({ error: 'Business ID and type are required' }, { status: 400 })
    }

    // Find the business
    let business = await prisma.businesses.findFirst({
      where: {
        id: supplierData.businessId,
        businessType: supplierData.businessType
      }
    })

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    // Generate ID if not provided
    const newSupplier: UniversalSupplier = {
      id: supplierData.id || `supplier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      businessId: supplierData.businessId,
      businessType: supplierData.businessType,
      name: supplierData.name || '',
      code: supplierData.code || '',
      category: supplierData.category || '',
      contact: supplierData.contact || {
        primaryContact: '',
        phone: '',
        email: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA'
        }
      },
      terms: supplierData.terms || {
        paymentTerms: 'net_30',
        minimumOrder: 0,
        currency: 'USD',
        leadTimeDays: 7
      },
      performance: supplierData.performance || {
        onTimeDeliveryPercent: 95,
        qualityScore: 8.5,
        totalOrders: 0,
        totalSpent: 0,
        reliability: 'good',
        averageLeadTime: 7,
        issueCount: 0,
        responseTimeHours: 24
      },
      certifications: supplierData.certifications || [],
      attributes: supplierData.attributes || {},
      status: supplierData.status || 'active',
      tags: supplierData.tags || [],
      notes: supplierData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.id,
      lastUpdatedBy: user.id
    }

    // Get existing suppliers and add new one
    const currentMetadata = business.metadata as any || {}
    const suppliers = currentMetadata.suppliers || []
    suppliers.push(newSupplier)

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

    return NextResponse.json({ supplier: newSupplier }, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}