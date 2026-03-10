import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/customers/scan-lookup?barcode=RES-CUST-000001
 * Look up a customer by their customerNumber (used as barcode value on loyalty cards).
 * Returns customer + business info so the caller can route to the correct POS.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barcode = searchParams.get('barcode')?.trim()

    if (!barcode) {
      return NextResponse.json({ error: 'barcode is required' }, { status: 400 })
    }

    const customer = await prisma.businessCustomers.findFirst({
      where: {
        customerNumber: { equals: barcode, mode: 'insensitive' },
        isActive: true,
      },
      select: {
        id: true,
        customerNumber: true,
        name: true,
        phone: true,
        email: true,
        customerType: true,
        businessId: true,
        businesses: {
          select: { type: true, name: true }
        }
      }
    })

    if (!customer) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      customer: {
        id: customer.id,
        customerNumber: customer.customerNumber,
        name: customer.name,
        phone: customer.phone ?? undefined,
        email: customer.email ?? undefined,
        customerType: customer.customerType,
        businessId: customer.businessId,
        businessType: customer.businesses?.type ?? 'other',
        businessName: customer.businesses?.name ?? '',
      }
    })
  } catch (error) {
    console.error('[Customer Scan Lookup] Error:', error)
    return NextResponse.json({ error: 'Failed to lookup customer' }, { status: 500 })
  }
}
