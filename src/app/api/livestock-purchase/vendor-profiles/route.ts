import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  const vendorId = searchParams.get('vendorId')

  if (!businessId) return NextResponse.json({ error: 'businessId required' }, { status: 400 })

  const where = { businessId, ...(vendorId ? { vendorId } : {}), isActive: true }

  const profiles = await prisma.livestockVendorProfiles.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(profiles)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId, vendorId, name, emoji, pricePerKg, sortOrder } = await request.json()

  if (!businessId || !vendorId || !name || pricePerKg == null) {
    return NextResponse.json({ error: 'businessId, vendorId, name, pricePerKg required' }, { status: 400 })
  }

  const profile = await prisma.livestockVendorProfiles.create({
    data: {
      businessId,
      vendorId,
      name,
      emoji: emoji || '📦',
      pricePerKg: parseFloat(pricePerKg),
      sortOrder: sortOrder ?? 0,
      isActive: true,
    },
  })

  return NextResponse.json(profile, { status: 201 })
}
