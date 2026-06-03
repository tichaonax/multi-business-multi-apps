import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/scale-config?businessId=xxx
export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const businessId = request.nextUrl.searchParams.get('businessId')
  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  if (user.role !== 'admin') {
    const membership = await prisma.businessMemberships.findFirst({
      where: { businessId, userId: user.id, isActive: true },
    })
    if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const business = await prisma.businesses.findUnique({
    where: { id: businessId },
    select: { settings: true },
  })

  const settings = (business?.settings ?? {}) as Record<string, unknown>
  const scaleConfig = (settings.scaleConfig ?? null) as { comPort: string; baudRate: number } | null

  return NextResponse.json({ scaleConfig })
}

// PUT /api/scale-config
export async function PUT(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { businessId, comPort, baudRate } = body

  if (!businessId || !comPort || !baudRate) {
    return NextResponse.json({ error: 'businessId, comPort and baudRate required' }, { status: 400 })
  }

  if (user.role !== 'admin') {
    const membership = await prisma.businessMemberships.findFirst({
      where: { businessId, userId: user.id, isActive: true },
    })
    if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const business = await prisma.businesses.findUnique({
    where: { id: businessId },
    select: { settings: true },
  })

  const existing = (business?.settings ?? {}) as Record<string, unknown>
  const updated = { ...existing, scaleConfig: { comPort, baudRate } }

  await prisma.businesses.update({
    where: { id: businessId },
    data: { settings: updated },
  })

  return NextResponse.json({ ok: true })
}
