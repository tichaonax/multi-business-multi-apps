/**
 * MBM-283 follow-up: a paired workstation's OWN printer, declared and edited
 * right on its own row on the Workstation Agents page — replaces the old
 * flow where AGENT-mode routing was configured separately on the system-
 * admin-only "Printer Connection Mode" page (/admin/network-printers),
 * which required picking the workstation from a dropdown even though you
 * were already looking at that exact workstation's own card.
 *
 * Business-owner or system-admin only (same gate as auto-start, revoke,
 * etc. on this same agent) — deliberately NOT system-admin-only like the
 * old page was, since this is now just part of setting up your own
 * workstation, same as pairing or scale config.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, getUserRoleInBusiness } from '@/lib/permission-utils'
import { getServerUser } from '@/lib/get-server-user'
import { workstationAgentHub } from '@/lib/workstation-agents/agent-hub'

function isBusinessAdmin(user: Awaited<ReturnType<typeof getServerUser>>, businessId: string): boolean {
  if (!user) return false
  return isSystemAdmin(user) || getUserRoleInBusiness(user, businessId) === 'business-owner'
}

// The synthetic SyncNodes row every agent-declared printer hangs off of —
// NetworkPrinters.nodeId is a required FK left over from the legacy
// DIRECT-mode sync system (see printer-discovery.ts), which AGENT-mode
// printers never actually read (print-dispatch.ts routes AGENT jobs purely
// by workstationAgentId). Rather than requiring a real SyncNode to exist
// first, every printer created through this route shares one placeholder
// node instead of pulling in that unrelated legacy system.
const AGENT_PRINTER_NODE_ID = 'workstation-agents'

async function ensurePlaceholderNode() {
  await prisma.syncNodes.upsert({
    where: { nodeId: AGENT_PRINTER_NODE_ID },
    update: {},
    create: { nodeId: AGENT_PRINTER_NODE_ID, nodeName: 'Workstation Agents (AGENT-mode printers)' },
  })
}

// Two independent flags, not one — both stored directly, connectionMode
// stays 'AGENT' always for a row created through this route:
//  - "Remote printing" (remotePrintingEnabled) — the original MBM-275
//    behavior: does this workstation's printer receive jobs relayed from
//    the centralized server at all. Turning it off pauses that — the
//    printer's name and share setting are remembered for when it's turned
//    back on, not lost. Deliberately NOT modeled as connectionMode
//    AGENT/DIRECT: DIRECT printers are a genuinely different, cross-
//    business-visible legacy resource (see listPrinters()'s businessId
//    filter) — flipping to DIRECT would leak a paused printer into every
//    OTHER business's printer list.
//  - "Share this printer" (remoteEnabled) — MBM-283's addition: whether
//    OTHER devices/workstations in the business can also route jobs to
//    this printer, on top of remote printing being on. Meaningless (and
//    forced off) while remote printing itself is off — there's no relay
//    for another device to reach in that state.
// workstationAgentId always stays set on this row regardless of either
// flag — this row is "workstation X's printer," full stop.

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const agent = await prisma.workstationAgents.findUnique({ where: { id } })
  if (!agent || agent.revokedAt) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (!isBusinessAdmin(user, agent.businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  const printer = await prisma.networkPrinters.findFirst({
    where: { workstationAgentId: id },
    select: { id: true, printerName: true, remotePrintingEnabled: true, remoteEnabled: true },
  })

  let qzOverlap = false
  if (printer) {
    const qz = await prisma.qzPrinterConfigs.findFirst({
      where: { workstationAgentId: id, printerName: { equals: printer.printerName, mode: 'insensitive' } },
    })
    qzOverlap = !!qz
  }

  return NextResponse.json({ success: true, printer: printer ? { ...printer, qzOverlap } : null })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { printerName, remotePrintingEnabled, remoteEnabled } = await request.json() as {
    printerName?: string
    remotePrintingEnabled?: boolean
    remoteEnabled?: boolean
  }
  if (!printerName || !printerName.trim()) {
    return NextResponse.json({ error: 'printerName is required' }, { status: 400 })
  }

  const agent = await prisma.workstationAgents.findUnique({ where: { id } })
  if (!agent || agent.revokedAt) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  if (!isBusinessAdmin(user, agent.businessId)) {
    return NextResponse.json({ error: 'Forbidden: business admin access required' }, { status: 403 })
  }

  const effectiveRemotePrintingEnabled = !!remotePrintingEnabled
  // "Share this printer" only means anything while remote printing is on.
  const effectiveRemoteEnabled = effectiveRemotePrintingEnabled ? !!remoteEnabled : false

  const existing = await prisma.networkPrinters.findFirst({ where: { workstationAgentId: id } })

  const printer = existing
    ? await prisma.networkPrinters.update({
        where: { id: existing.id },
        data: { printerName: printerName.trim(), remotePrintingEnabled: effectiveRemotePrintingEnabled, remoteEnabled: effectiveRemoteEnabled },
      })
    : await (async () => {
        await ensurePlaceholderNode()
        return prisma.networkPrinters.create({
          data: {
            printerId: `agent-printer-${id}`,
            printerName: printerName.trim(),
            printerType: 'receipt',
            nodeId: AGENT_PRINTER_NODE_ID,
            connectionMode: 'AGENT',
            workstationAgentId: id,
            remotePrintingEnabled: effectiveRemotePrintingEnabled,
            remoteEnabled: effectiveRemoteEnabled,
            isShareable: true,
          },
        })
      })()

  // Without this, the agent (and anyone looking at its tray) keeps showing
  // whatever it learned at its last periodic sync — up to 10 minutes stale
  // — even though this printer's routing/name/flags just changed right now.
  workstationAgentHub.requestSync(id)

  return NextResponse.json({
    success: true,
    printer: { id: printer.id, printerName: printer.printerName, remotePrintingEnabled: printer.remotePrintingEnabled, remoteEnabled: printer.remoteEnabled },
  })
}
