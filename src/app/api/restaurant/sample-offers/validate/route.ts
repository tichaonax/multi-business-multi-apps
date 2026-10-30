import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { canAccessBusiness, validateOfferForRedemption, SampleOfferError } from '@/lib/sample-offers'

// MBM-329 — read-only redemption check. Never changes the offer: the claim
// happens only when the paid order is created (POST /api/restaurant/orders).
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, offerCode, phone } = await req.json()
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  if (!canAccessBusiness(user, businessId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!phone || !String(phone).trim()) {
    return NextResponse.json({ success: false, error: "Enter the customer's registered phone number." }, { status: 400 })
  }

  try {
    const offer = await validateOfferForRedemption(businessId, String(offerCode || ''), String(phone))

    // Current price + availability for the promoted item and the promised free items
    const productIds = [offer.sampledProductId, ...offer.promo_items.map(p => p.productId)]
    const products = await prisma.businessProducts.findMany({
      where: { id: { in: productIds }, businessId },
      select: { id: true, name: true, basePrice: true, isActive: true, isAvailable: true, categoryId: true },
    })
    const byId = new Map(products.map(p => [p.id, p]))
    const describe = (id: string, fallbackName: string) => {
      const p = byId.get(id)
      return { productId: id, name: p?.name || fallbackName, price: p ? Number(p.basePrice) : 0, available: !!p && p.isActive && p.isAvailable, categoryId: p?.categoryId || null }
    }

    return NextResponse.json({
      success: true,
      offer: {
        id: offer.id,
        offerCode: offer.offerCode,
        issuedAt: offer.issuedAt,
        expiresAt: offer.expiresAt,
        customer: offer.business_customers,
        promoted: describe(offer.sampledProductId, offer.sampledProductName),
        promoItems: offer.promo_items.map(p => ({ promoItemId: p.id, quantity: p.quantity, ...describe(p.productId, p.productName) })),
      },
    })
  } catch (err) {
    if (err instanceof SampleOfferError) return NextResponse.json({ success: false, error: err.message }, { status: err.status })
    console.error('[sample-offers/validate]', err)
    return NextResponse.json({ success: false, error: 'Could not check the sample offer.' }, { status: 500 })
  }
}
