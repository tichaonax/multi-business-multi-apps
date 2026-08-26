/**
 * QZ Tray printer config — DB-backed (not just browser localStorage).
 *
 * QZ Tray's printer selection has always lived purely in the saving
 * browser's own localStorage (qz-tray-printer.ts) — fast and simple, but
 * invisible to the server, and therefore invisible to a paired Workstation
 * Agent's own tray/Manage Profiles display, which had no way to show
 * "this machine's QZ printer is X" even when that's exactly the printer an
 * admin cares about seeing. This route persists that same selection
 * server-side too, scoped by (businessId, workstationAgentId) when the
 * saving browser is on a machine that also has a paired Workstation Agent
 * for the current server — giving an exact, per-machine fact the agent can
 * read back via its own periodic sync (see handleSync() in
 * workstation-agents/agent-hub.ts). When no workstation agent is paired on
 * that machine, workstationAgentId is omitted/null and the row acts as a
 * business-wide default — the common case for a small, single-terminal
 * business with nothing paired at all.
 *
 * localStorage remains the actual print-time read path (qz-tray-printer.ts,
 * unchanged) — this is additive, not a replacement, so print calls stay
 * synchronous and don't depend on this endpoint being reachable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { workstationAgentHub } from '@/lib/workstation-agents/agent-hub'

function hasBusinessAccess(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || (user.businessMemberships?.some(m => m.businessId === businessId && m.isActive) ?? false)
}

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  const workstationAgentId = searchParams.get('workstationAgentId') || undefined
  if (!businessId) return NextResponse.json({ error: 'businessId parameter required' }, { status: 400 })
  if (!hasBusinessAccess(user, businessId)) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })

  // Prefer the exact per-workstation row (this specific paired machine's
  // own printer) when one exists; fall back to the business-wide default
  // (workstationAgentId: null) otherwise — same fallback shape whether or
  // not the caller's machine has an agent paired at all.
  const config = workstationAgentId
    ? await prisma.qzPrinterConfigs.findFirst({ where: { businessId, workstationAgentId } })
      ?? await prisma.qzPrinterConfigs.findFirst({ where: { businessId, workstationAgentId: null } })
    : await prisma.qzPrinterConfigs.findFirst({ where: { businessId, workstationAgentId: null } })

  return NextResponse.json({ success: true, config: config ? { printerName: config.printerName } : null })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, workstationAgentId, printerName } = await request.json() as {
      businessId?: string
      workstationAgentId?: string | null
      printerName?: string
    }

    if (!businessId || !printerName?.trim()) {
      return NextResponse.json({ error: 'businessId and printerName are required' }, { status: 400 })
    }
    if (!hasBusinessAccess(user, businessId)) {
      return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    const existing = await prisma.qzPrinterConfigs.findFirst({
      where: { businessId, workstationAgentId: workstationAgentId ?? null },
    })

    const config = existing
      ? await prisma.qzPrinterConfigs.update({
          where: { id: existing.id },
          data: { printerName: printerName.trim(), updatedBy: user.id },
        })
      : await prisma.qzPrinterConfigs.create({
          data: { businessId, workstationAgentId: workstationAgentId ?? null, printerName: printerName.trim(), updatedBy: user.id },
        })

    // Without this, a connected agent (and its tray/Manage Profiles page)
    // keeps showing whatever it learned at its last periodic sync — up to
    // 10 minutes stale — even though this was just saved right now. Same
    // fix as the printer connection-mode route already has.
    if (workstationAgentId) {
      workstationAgentHub.requestSync(workstationAgentId)
    } else {
      // A business-wide default was just saved (or changed) — any of this
      // business's connected agents that don't have their own
      // workstation-specific row fall back to this one, so all of them
      // need to hear about it, not just one.
      const agents = await prisma.workstationAgents.findMany({ where: { businessId, revokedAt: null }, select: { id: true } })
      for (const agent of agents) workstationAgentHub.requestSync(agent.id)
    }

    return NextResponse.json({ success: true, config: { printerName: config.printerName } })
  } catch (error) {
    console.error('[QZ Printer Config] POST error:', error)
    return NextResponse.json({ error: 'Failed to save QZ printer config' }, { status: 500 })
  }
}
