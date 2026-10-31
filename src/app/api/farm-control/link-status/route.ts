import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * MBM-331 — POST /api/farm-control/link-status { ok: boolean, farmControlName? }
 * The user's browser reports how its Farm Control sign-in went, so admins can
 * see who is linked: ok → LINKED (with Farm Control's name for the user),
 * refused (401) → REFUSED. Only the caller's own status changes.
 */
export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const now = new Date()
  const data = body.ok === true
    ? { status: 'LINKED', lastSessionAt: now, farmControlName: typeof body.farmControlName === 'string' ? body.farmControlName.slice(0, 120) : null }
    : { status: 'REFUSED', lastRefusedAt: now }
  await prisma.farmControlUserLinks.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  })
  return NextResponse.json({ success: true })
}
