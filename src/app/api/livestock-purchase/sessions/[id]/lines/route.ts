import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: sessionId } = await params
  const body = await request.json()
  const { categoryName, weightKg, pricePerKg, notes } = body

  if (!categoryName || weightKg == null || pricePerKg == null) {
    return NextResponse.json({ error: 'categoryName, weightKg, pricePerKg required' }, { status: 400 })
  }

  // Verify session exists and is OPEN
  const purchaseSession = await prisma.livestockPurchaseSessions.findUnique({ where: { id: sessionId } })
  if (!purchaseSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (purchaseSession.status !== 'OPEN') return NextResponse.json({ error: 'Session is not open' }, { status: 400 })

  const totalAmount = Number(weightKg) * Number(pricePerKg)

  const line = await prisma.livestockPurchaseLines.create({
    data: {
      sessionId,
      categoryName: categoryName.trim(),
      weightKg,
      pricePerKg,
      totalAmount,
      notes: notes || null,
    },
  })

  // Update session totals
  await prisma.livestockPurchaseSessions.update({
    where: { id: sessionId },
    data: {
      totalWeightKg: { increment: Number(weightKg) },
      totalAmount: { increment: totalAmount },
    },
  })

  return NextResponse.json(line, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: sessionId } = await params
  const lineId = request.nextUrl.searchParams.get('lineId')
  if (!lineId) return NextResponse.json({ error: 'lineId query param required' }, { status: 400 })

  const line = await prisma.livestockPurchaseLines.findUnique({ where: { id: lineId } })
  if (!line || line.sessionId !== sessionId) return NextResponse.json({ error: 'Line not found' }, { status: 404 })

  await prisma.livestockPurchaseLines.delete({ where: { id: lineId } })

  // Update session totals
  await prisma.livestockPurchaseSessions.update({
    where: { id: sessionId },
    data: {
      totalWeightKg: { decrement: Number(line.weightKg) },
      totalAmount: { decrement: Number(line.totalAmount) },
    },
  })

  return NextResponse.json({ ok: true })
}
