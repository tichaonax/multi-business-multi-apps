/**
 * MBM-275: routes a print job either DIRECT (server calls the Windows
 * Spooler itself, today's exact behavior — printer.connectionMode is
 * 'DIRECT' for every printer that existed before this feature and stays
 * that way unless an admin explicitly re-registers it against a paired
 * workstation) or AGENT (relayed to the paired workstation, which prints
 * locally against a printer only it can reach).
 */

import { printRawData } from './windows-raw-printer'
import { WorkstationAgentDispatchError } from '@/lib/workstation-agents/agent-hub'
import { dispatchWorkstationJobWithLog } from '@/lib/workstation-agents/request-log'
import { prisma } from '@/lib/prisma'

interface PrinterForDispatch {
  printerName: string
  connectionMode: string
  workstationAgentId: string | null
}

export class PrinterAuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrinterAuthorizationError'
  }
}

/**
 * MBM-283 Phase 1: the single place that decides whether `businessId` is
 * allowed to print to `printerId` at all, before any dispatch happens.
 * Both branches of POST /api/print/receipt previously resolved the printer
 * with a bare `findUnique` and never checked this — a print request naming
 * a DIFFERENT business's AGENT-relayed printer was dispatched with nothing
 * rejecting it. DIRECT-mode printers are unchanged here: no business field
 * exists for them yet (a separate, pre-existing gap, out of this
 * project's scope) — only AGENT-mode printers, which already carry a real
 * business via their owning workstation agent, are validated.
 *
 * MBM-283 Phase 2: also enforces `remoteEnabled`. Deliberately enforced
 * uniformly for every caller, not just "remote" ones — there is no reliable
 * way to tell a request from the printer's own physically-local workstation
 * apart from one made by a phone across the building (both are just an
 * authenticated HTTP call from someone in the business); a flag that only
 * gated the picker's listing, and not dispatch itself, would be a UI
 * convenience, not a real access control, and the original request was
 * explicit that only opted-in printers "may receive requests." Existing
 * AGENT printers are unaffected: the migration adding this column set it
 * true for every printer already in AGENT mode at that point (see its own
 * comment) — this only requires a NEW opt-in step for AGENT configurations
 * created from here on.
 *
 * MBM-283 follow-up: two independent AGENT-mode flags now, not one —
 * remotePrintingEnabled (does the server relay to this printer at all —
 * unconditional, no bypass, "paused" means unreachable for everyone) and
 * remoteEnabled/"share" (can devices OTHER than this printer's own
 * workstation also route to it). `requestingWorkstationAgentId` — the
 * caller's own probed machine identity, when known — lets that printer's
 * own workstation bypass the share check for its own printer; every other
 * caller (mismatched id, or none at all) still needs remoteEnabled.
 */
export async function resolvePrinterForBusiness(printerId: string, businessId: string, requestingWorkstationAgentId?: string | null) {
  const printer = await prisma.networkPrinters.findUnique({
    where: { id: printerId },
    include: { workstation_agent: { select: { businessId: true } } },
  })
  if (!printer) throw new PrinterAuthorizationError('Printer not found')

  if (printer.connectionMode === 'AGENT') {
    if (!printer.workstation_agent || printer.workstation_agent.businessId !== businessId) {
      throw new PrinterAuthorizationError(`Printer "${printer.printerName}" is not assigned to this business`)
    }
    if (!printer.remotePrintingEnabled) {
      throw new PrinterAuthorizationError(`Printer "${printer.printerName}" has remote printing turned off on its workstation`)
    }
    const isOwnWorkstation = !!requestingWorkstationAgentId && requestingWorkstationAgentId === printer.workstationAgentId
    if (!printer.remoteEnabled && !isOwnWorkstation) {
      throw new PrinterAuthorizationError(`Printer "${printer.printerName}" is not shared for use by other devices — ask an admin to enable it in Workstation Agents`)
    }
  }

  return printer
}

export async function printViaConnectionMode(
  printer: PrinterForDispatch,
  content: string,
  copies: number,
  requestedBy?: string
): Promise<void> {
  if (printer.connectionMode !== 'AGENT') {
    // Unchanged code path — every printer before MBM-275, and any printer
    // an admin hasn't explicitly moved to AGENT mode.
    await printRawData(content, { printerName: printer.printerName, copies })
    return
  }

  if (!printer.workstationAgentId) {
    throw new Error(`Printer "${printer.printerName}" is set to AGENT mode but has no paired workstation configured`)
  }

  try {
    const result = await dispatchWorkstationJobWithLog(
      printer.workstationAgentId,
      'PRINT_RECEIPT',
      { content, printerName: printer.printerName, copies },
      requestedBy
    )

    if (!result.success) {
      throw new Error(result.error || `Agent-relayed print failed for "${printer.printerName}"`)
    }
  } catch (error) {
    if (error instanceof WorkstationAgentDispatchError) {
      throw new Error(
        error.code === 'AGENT_OFFLINE'
          ? `Printer "${printer.printerName}" is unavailable — the local agent for its workstation is offline. Contact IT.`
          : `Printer "${printer.printerName}" did not respond in time. Please try again.`
      )
    }
    throw error
  }
}
