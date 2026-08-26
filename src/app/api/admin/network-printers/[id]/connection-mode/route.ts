/**
 * MBM-275: sets a printer's connectionMode (DIRECT/AGENT) and, for AGENT,
 * which paired workstation relays its print jobs. Deliberately narrow —
 * this app has no general printer-editing admin UI/route to extend, so
 * this only covers the two new fields this feature adds rather than
 * building a full printer CRUD surface unprompted.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'
import { workstationAgentHub } from '@/lib/workstation-agents/agent-hub'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user)) return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })

    const { id } = await params
    const { connectionMode, workstationAgentId, printerName } = await request.json() as {
      connectionMode?: 'DIRECT' | 'AGENT'
      workstationAgentId?: string | null
      printerName?: string
    }

    if (connectionMode !== 'DIRECT' && connectionMode !== 'AGENT') {
      return NextResponse.json({ error: "connectionMode must be 'DIRECT' or 'AGENT'" }, { status: 400 })
    }
    if (connectionMode === 'AGENT' && !workstationAgentId) {
      return NextResponse.json({ error: 'workstationAgentId is required when connectionMode is AGENT' }, { status: 400 })
    }

    const printer = await prisma.networkPrinters.findUnique({ where: { id } })
    if (!printer) return NextResponse.json({ error: 'Printer not found' }, { status: 404 })

    const updated = await prisma.networkPrinters.update({
      where: { id },
      data: {
        connectionMode,
        workstationAgentId: connectionMode === 'AGENT' ? workstationAgentId : null,
        // Switching to AGENT mode commonly means pointing this printer row
        // at a printer installed on a *different* machine than whatever
        // originally registered it — its Windows printer name there may not
        // match. Optional: the setup UI passes this from PRINT_LIST_PRINTERS
        // once an admin picks the actual printer on the target workstation.
        ...(printerName ? { printerName } : {}),
      },
    })

    // Without this, the agent (and anyone looking at its tray) keeps
    // showing whatever it learned at its last periodic sync — up to 10
    // minutes stale — even though this printer routing just changed right
    // now. Request both the printer's new workstation AND its old one (if
    // switching away from AGENT mode, or between two different
    // workstations) so neither is left showing outdated info.
    if (updated.workstationAgentId) workstationAgentHub.requestSync(updated.workstationAgentId)
    if (printer.workstationAgentId && printer.workstationAgentId !== updated.workstationAgentId) {
      workstationAgentHub.requestSync(printer.workstationAgentId)
    }

    return NextResponse.json({ success: true, printer: updated })
  } catch (error) {
    console.error('[Network Printers] connection-mode PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update printer connection mode' }, { status: 500 })
  }
}
