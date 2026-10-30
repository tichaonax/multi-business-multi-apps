import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { canAccessBusiness, getSampleOfferSettings } from '@/lib/sample-offers'

// MBM-329 — free sample settings in Businesses.settings:
//   sampleOfferValidityDays — offer validity in days (new offers only; each offer stores its own expiry)
//   sampleMinPurchase       — purchase total needed before a sample can be given (default $4.00)
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const businessId = new URL(req.url).searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
  if (!canAccessBusiness(user, businessId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json({ success: true, ...(await getSampleOfferSettings(businessId)) })
}

export async function PUT(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { businessId, validityDays, minPurchase } = await req.json()
  if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

  // Same rule as editing business details: system admin or business owner
  const isOwner = user.businessMemberships?.some(m => m.businessId === businessId && m.isActive && m.role === 'owner')
  if (user.role !== 'admin' && !isOwner) {
    return NextResponse.json({ error: 'Only business owners or admins can change this setting.' }, { status: 403 })
  }
  const days = Number(validityDays)
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Validity must be a whole number of days between 1 and 365.' }, { status: 400 })
  }
  const min = Math.round(Number(minPurchase) * 100) / 100
  if (!Number.isFinite(min) || min < 0 || min > 100000) {
    return NextResponse.json({ error: 'Minimum purchase must be an amount of $0.00 or more.' }, { status: 400 })
  }

  const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { settings: true } })
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  await prisma.businesses.update({
    where: { id: businessId },
    data: { settings: { ...((business.settings as Record<string, unknown>) || {}), sampleOfferValidityDays: days, sampleMinPurchase: min } },
  })
  return NextResponse.json({ success: true, validityDays: days, minPurchase: min })
}
