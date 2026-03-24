import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isSystemAdmin(session.user as any)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const drafts = await prisma.stockTakeDrafts.findMany({
    where: { isStockTakeMode: true, status: 'DRAFT' },
    include: {
      business: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ success: true, data: drafts })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !isSystemAdmin(session.user as any)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Draft ID required' }, { status: 400 })

  await prisma.stockTakeDrafts.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
