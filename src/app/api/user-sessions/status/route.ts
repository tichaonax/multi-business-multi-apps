import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * MBM-351 — GET /api/user-sessions/status?sid=<sessionId>
 *
 * Polled by SessionEndWatcher (every 30 s) as the backup to the socket push:
 * is this session being signed out, when, and with what message. No sign-in
 * check on purpose — once the session has ended the cookie is already gone,
 * and the screen still needs the message. The session id is random and this
 * only ever returns the sign-out notice for it, nothing else.
 */
export async function GET(request: NextRequest) {
  const sid = request.nextUrl.searchParams.get('sid')
  if (!sid || sid.length > 200) return NextResponse.json({ status: 'unknown' })
  try {
    const row = await prisma.userSessions.findUnique({
      where: { id: sid },
      select: { endedAt: true, endReason: true, endMessage: true, endedBy: true },
    })
    if (!row || !row.endedAt) return NextResponse.json({ status: 'active' })
    // Only manager-initiated endings carry a notice; the user's own sign-out or expiry doesn't
    if (row.endReason !== 'FORCED' && row.endReason !== 'SUSPENDED') return NextResponse.json({ status: 'ended' })
    const by = row.endedBy
      ? await prisma.users.findUnique({ where: { id: row.endedBy }, select: { name: true } })
      : null
    return NextResponse.json({
      status: row.endedAt.getTime() > Date.now() ? 'ending' : 'ended',
      endsAt: row.endedAt.toISOString(),
      reason: row.endReason,
      message: row.endMessage,
      byName: by?.name ?? null,
    })
  } catch {
    return NextResponse.json({ status: 'unknown' })
  }
}
