import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('businessId')
  const purchaseType = request.nextUrl.searchParams.get('purchaseType')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const rules = await prisma.weightPricingRules.findMany({
    where: { businessId, ...(purchaseType ? { purchaseType } : {}) },
    orderBy: [{ ruleType: 'asc' }, { categoryName: 'asc' }],
    include: { _count: { select: { business_products: true } } },
  })

  return NextResponse.json(rules)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    businessId, categoryName, ruleType, pricePerKg, emoji,
    purchaseType,
    derivedFromUnitPrice, derivedFromUnitCount, derivedFromSampleWeightKg,
  } = body

  if (!businessId || !categoryName || !ruleType || pricePerKg == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rule = await prisma.weightPricingRules.create({
    data: {
      businessId,
      categoryName: categoryName.trim(),
      ruleType,
      purchaseType: purchaseType || 'LIVESTOCK',
      pricePerKg,
      emoji: emoji || '📦',
      isActive: true,
      ...(derivedFromUnitPrice != null && { derivedFromUnitPrice }),
      ...(derivedFromUnitCount != null && { derivedFromUnitCount }),
      ...(derivedFromSampleWeightKg != null && { derivedFromSampleWeightKg }),
    },
  })

  return NextResponse.json(rule, { status: 201 })
}
