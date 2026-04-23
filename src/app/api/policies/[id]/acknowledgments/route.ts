import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/policies/[id]/acknowledgments
export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const acks = await prisma.policyAcknowledgment.findMany({
    where: { policyId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      waivedBy: { select: { id: true, name: true } },
      assignment: { select: { scope: true, roleTarget: true, dueDate: true, notes: true } },
    },
    orderBy: { acknowledgedAt: 'desc' },
  })

  return NextResponse.json(acks)
}
