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

  const sessions = await prisma.livestockPurchaseSessions.findMany({
    where: { businessId },
    include: {
      business_suppliers: { select: { id: true, name: true } },
      livestock_purchase_lines: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(sessions)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { businessId, supplierId, notes } = body

  if (!businessId || !supplierId) {
    return NextResponse.json({ error: 'businessId and supplierId required' }, { status: 400 })
  }

  const purchaseSession = await prisma.livestockPurchaseSessions.create({
    data: {
      businessId,
      supplierId,
      notes: notes || null,
      status: 'OPEN',
      totalWeightKg: 0,
      totalAmount: 0,
      createdBy: (session.user as any)?.id ?? 'unknown',
    },
    include: {
      business_suppliers: { select: { id: true, name: true } },
      livestock_purchase_lines: true,
    },
  })

  return NextResponse.json(purchaseSession, { status: 201 })
}
