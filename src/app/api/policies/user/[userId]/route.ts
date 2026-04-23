import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type Ctx = { params: Promise<{ userId: string }> }

// GET /api/policies/user/[userId]
// Returns all policies acknowledged by this user, grouped by business.
// The requesting user may only view their own history, or a manager may view any member.
export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params

  // Allow self-view or system-admin
  if (user.id !== userId && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const acks = await prisma.policyAcknowledgment.findMany({
    where: { userId },
    include: {
      business: { select: { id: true, name: true } },
      assignment: {
        include: { policy: { select: { id: true, title: true, category: true, contentType: true } } },
      },
    },
    orderBy: { acknowledgedAt: 'desc' },
  })

  // Fetch the version content for each ack so user can view what they signed
  const result = await Promise.all(
    acks.map(async a => {
      const version = await prisma.policyVersion.findFirst({
        where: { policyId: a.policyId, version: a.policyVersion },
        select: { content: true, fileId: true },
      })
      return {
        ...a,
        policy: (a.assignment as any)?.policy ?? null,
        versionContent: version?.content ?? null,
        versionFileId: version?.fileId ?? null,
      }
    })
  )

  return NextResponse.json(result)
}
