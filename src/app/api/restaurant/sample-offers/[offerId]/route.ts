import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { canAccessBusiness, getSampleOfferReceiptData } from '@/lib/sample-offers'

// MBM-329 — sample receipt data (used for reprint from the report)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { offerId } = await params
  const data = await getSampleOfferReceiptData(offerId)
  if (!data) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (!canAccessBusiness(user, data.businessId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ success: true, data })
}
