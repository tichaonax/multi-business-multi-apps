import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET /api/business/[businessId]/tags
 * Lists this business's own tags — powers the gallery filter's autocomplete
 * (MBM-294 §9.3).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { businessId } = await params
  const isAdmin = isSystemAdmin(user)
  if (!isAdmin) {
    const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId, isActive: true } })
    if (!membership) return NextResponse.json({ error: 'You do not have access to this business' }, { status: 403 })
  }

  const tags = await prisma.tags.findMany({
    where: { businessId },
    select: { id: true, name: true, _count: { select: { image_tags: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({
    success: true,
    tags: tags.map(t => ({ id: t.id, name: t.name, imageCount: t._count.image_tags })),
  })
}
