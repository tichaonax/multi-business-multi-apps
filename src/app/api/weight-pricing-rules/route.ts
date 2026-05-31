import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const rules = await prisma.weightPricingRules.findMany({
    where: { businessId },
    orderBy: [{ ruleType: 'asc' }, { categoryName: 'asc' }],
  })

  return NextResponse.json(rules)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { businessId, categoryName, ruleType, pricePerKg, emoji } = body

  if (!businessId || !categoryName || !ruleType || pricePerKg == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rule = await prisma.weightPricingRules.create({
    data: {
      businessId,
      categoryName: categoryName.trim(),
      ruleType,
      pricePerKg,
      emoji: emoji || '📦',
      isActive: true,
    },
  })

  return NextResponse.json(rule, { status: 201 })
}
