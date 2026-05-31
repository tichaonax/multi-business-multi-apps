import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name, emoji, pricePerKg, sortOrder, isActive } = await request.json()

  const updated = await prisma.livestockVendorProfiles.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(emoji !== undefined && { emoji }),
      ...(pricePerKg !== undefined && { pricePerKg: parseFloat(pricePerKg) }),
      ...(sortOrder !== undefined && { sortOrder }),
      ...(isActive !== undefined && { isActive }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.livestockVendorProfiles.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
