import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/policies/[id]/archive
export async function POST(_req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const policy = await prisma.policy.findUnique({ where: { id } })
  if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (policy.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Only PUBLISHED policies can be archived.' }, { status: 400 })
  }

  const membership = await prisma.businessMemberships.findFirst({
    where: { userId: user.id, businessId: policy.businessId, isActive: true },
  })
  const canManage = ['business-owner', 'business-manager', 'system-admin'].includes(membership?.role ?? '')
  if (!canManage) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.policy.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  })
  return NextResponse.json(updated)
}
