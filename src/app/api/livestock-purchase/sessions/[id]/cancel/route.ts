import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: sessionId } = await params

  const purchaseSession = await prisma.livestockPurchaseSessions.findUnique({ where: { id: sessionId } })
  if (!purchaseSession) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (purchaseSession.status !== 'OPEN') return NextResponse.json({ error: 'Session already closed' }, { status: 400 })

  const updated = await prisma.livestockPurchaseSessions.update({
    where: { id: sessionId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })

  return NextResponse.json({ success: true, data: updated })
}
