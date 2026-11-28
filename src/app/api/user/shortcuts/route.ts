// MBM-360: "My shortcuts" — the signed-in user's own page visits.
// GET   → { shortcuts (top 6), hidden, pinnedPaths }
// POST  { path }                     → counts a visit to that page
// PATCH { path, pinned?, hidden? }   → pin / unpin, hide / restore a page
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { shortcutPath, shortcutLabel, pickShortcuts } from '@/lib/shortcuts/page-shortcuts'

const SELECT = { path: true, label: true, visitCount: true, lastVisitedAt: true, pinned: true, hidden: true } as const

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const rows = await prisma.userPageVisits.findMany({ where: { userId: user.id }, select: SELECT })
  return NextResponse.json({
    shortcuts: pickShortcuts(rows),
    hidden: rows.filter(r => r.hidden).map(r => ({ path: r.path, label: r.label })),
    pinnedPaths: rows.filter(r => r.pinned && !r.hidden).map(r => r.path),
  })
}

export async function POST(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const path = shortcutPath(String(body?.path || ''))
  if (!path) return NextResponse.json({ ok: true, skipped: true })
  await prisma.userPageVisits.upsert({
    where: { userId_path: { userId: user.id, path } },
    create: { userId: user.id, path, label: shortcutLabel(path), visitCount: 1, lastVisitedAt: new Date() },
    update: { visitCount: { increment: 1 }, lastVisitedAt: new Date(), label: shortcutLabel(path) },
  })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const path = shortcutPath(String(body?.path || ''))
  if (!path) return NextResponse.json({ error: 'This page can not be a shortcut' }, { status: 400 })
  const data: { pinned?: boolean; hidden?: boolean } = {}
  if (typeof body.pinned === 'boolean') data.pinned = body.pinned
  if (typeof body.hidden === 'boolean') data.hidden = body.hidden
  // pinning shows it again; hiding unpins it
  if (data.pinned) data.hidden = false
  if (data.hidden) data.pinned = false
  await prisma.userPageVisits.upsert({
    where: { userId_path: { userId: user.id, path } },
    create: { userId: user.id, path, label: shortcutLabel(path), visitCount: 0, ...data },
    update: data,
  })
  return NextResponse.json({ ok: true })
}
