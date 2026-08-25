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

interface PrinterForDispatch {
  printerName: string
  connectionMode: string
  workstationAgentId: string | null
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
