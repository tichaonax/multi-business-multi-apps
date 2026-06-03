import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const {
    categoryName, ruleType, pricePerKg, isActive, emoji, purchaseType,
    derivedFromUnitPrice, derivedFromUnitCount, derivedFromSampleWeightKg,
  } = body

  const rule = await prisma.weightPricingRules.update({
    where: { id },
    data: {
      ...(categoryName !== undefined && { categoryName: categoryName.trim() }),
      ...(ruleType !== undefined && { ruleType }),
      ...(pricePerKg !== undefined && { pricePerKg }),
      ...(isActive !== undefined && { isActive }),
      ...(emoji !== undefined && { emoji }),
      ...(purchaseType !== undefined && { purchaseType }),
      ...(derivedFromUnitPrice !== undefined && { derivedFromUnitPrice }),
      ...(derivedFromUnitCount !== undefined && { derivedFromUnitCount }),
      ...(derivedFromSampleWeightKg !== undefined && { derivedFromSampleWeightKg }),
    },
  })

  return NextResponse.json(rule)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.weightPricingRules.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
