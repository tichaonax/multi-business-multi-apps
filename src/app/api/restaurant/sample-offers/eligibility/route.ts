import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { canAccessBusiness, getSampleOfferSettings } from '@/lib/sample-offers'

// MBM-329 — which menu items a customer has already sampled (greyed out in the picker)
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URL(req.url).searchParams
  const businessId = params.get('businessId')
  const customerId = params.get('customerId')
  if (!businessId || !customerId) return NextResponse.json({ error: 'businessId and customerId are required' }, { status: 400 })
  if (!canAccessBusiness(user, businessId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [customer, previous, sampleSettings] = await Promise.all([
    prisma.businessCustomers.findFirst({ where: { id: customerId, businessId }, select: { id: true, phone: true } }),
    prisma.sampleOffers.findMany({
      where: { customerId },
      select: { sampledProductId: true, sampledProductName: true, issuedAt: true },
    }),
    getSampleOfferSettings(businessId),
  ])
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    hasPhone: !!customer.phone?.trim(),
    validityDays: sampleSettings.validityDays,
    minPurchase: sampleSettings.minPurchase,
    alreadySampled: previous.map(p => ({ productId: p.sampledProductId, productName: p.sampledProductName, issuedAt: p.issuedAt })),
  })
}
