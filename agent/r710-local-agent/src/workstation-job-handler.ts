/**
 * MBM-275: executes scale and print jobs dispatched by the central server
 * against devices attached to this workstation. Mirrors the shape of
 * job-handler.ts (R710), but is otherwise independent — a separate job-type
 * union, a separate handler function, dispatched over the workstation
 * socket connection rather than the R710 one.
 *
 * MBM-276: profile-aware. Multiple profiles (one per paired server) can be
 * simultaneously connected on this same agent process — printing has no
 * exclusivity concern at all (see plan Section 2a: the Windows print
 * spooler already queues concurrent jobs to one printer safely), but the
 * scale is a single physical serial port, an exclusive OS-level resource.
 * Ownership (scale-owner.ts) is enforced here: whichever profile connects
 * first owns the open handle; any other profile's SCALE_CONNECT is
 * rejected with a clear reason rather than silently stealing the port.
 * Weight/status events are relayed ONLY to the owning profile's socket
 * (via workstation-clients-registry.ts) — never broadcast to every
 * connected profile, which would leak one business's live scale readings
 * to another business's server.
 */

import { ScaleDriver } from './scale-driver'
import { printRawData, listPrinters } from './print-driver'
import { getScaleOwner, setScaleOwner, clearScaleOwner } from './scale-owner'
import { readProfileMeta } from './profile-store'
import { getWorkstationClient } from './workstation-clients-registry'
import { isAutoStartEnabled, setAutoStart } from './tray'

export type WorkstationAgentJobType =
  | 'SCALE_LIST_PORTS'
  | 'SCALE_CONNECT'
  | 'SCALE_DISCONNECT'
  | 'SCALE_RELEASE'
  | 'SCALE_TARE'
  | 'SCALE_DETECT_BAUD'
  | 'PRINT_RECEIPT'
  | 'PRINT_LIST_PRINTERS'
  | 'AGENT_SET_AUTO_START'

export interface WorkstationAgentJob {
  jobId: string
  jobType: WorkstationAgentJobType
  params?: unknown
}

export interface WorkstationAgentJobResult {
  jobId: string
  success: boolean
  data?: unknown
  error?: string
}

// One scale per agent process — matches electron/scale-service.js's
// module-level single-instance assumption (a workstation has at most one
// physical scale attached), shared across every profile. Which profile's
// socket receives its events is governed by ownership (scale-owner.ts),
// not by which profile happens to be listening.
export const scaleDriver = new ScaleDriver()

function ownerLabel(profileId: string): string {
  return readProfileMeta(profileId)?.label || profileId
}

// Shared by the SCALE_RELEASE job case (triggered remotely, from any
// profile's admin UI) and the tray's local "Release" click (triggered
// directly at the workstation — no server round trip needed since the
// tray runs inside this same agent process).
export function releaseScale(): void {
  clearScaleOwner()
  scaleDriver.disconnect()
}

// The one and only subscription to scaleDriver's events for the whole
// process — relays to whichever profile's socket is the current owner,
// looked up fresh on every event (so a mid-stream ownership change, e.g.
// via SCALE_RELEASE, takes effect on the very next reading with no separate
// re-subscribe step needed).
scaleDriver.on('weight', (reading) => {
  const owner = getScaleOwner()
  if (!owner) return
  getWorkstationClient(owner.profileId)?.emitScaleWeight(reading)
})
scaleDriver.on('status', (status) => {
  const owner = getScaleOwner()
  if (!owner) return
  getWorkstationClient(owner.profileId)?.emitScaleStatus(status)
})

export async function handleWorkstationJob(profileId: string, job: WorkstationAgentJob): Promise<WorkstationAgentJobResult> {
  try {
    switch (job.jobType) {
      case 'SCALE_LIST_PORTS': {
        // Read-only, no exclusivity concern.
        const ports = await scaleDriver.listPorts()
        return { jobId: job.jobId, success: true, data: { ports } }
      }

      case 'SCALE_CONNECT': {
        const owner = getScaleOwner()
        if (owner && owner.profileId !== profileId) {
          return { jobId: job.jobId, success: false, error: `Scale is in use by ${ownerLabel(owner.profileId)}` }
        }
        const params = job.params as { comPort: string; baudRate?: number }
        setScaleOwner(profileId)
        scaleDriver.connect(params.comPort, params.baudRate)
        return { jobId: job.jobId, success: true }
      }

      case 'SCALE_DISCONNECT': {
        // No-op success if this profile isn't the current owner — nothing
        // is connected on this profile's behalf to disconnect.
        const owner = getScaleOwner()
        if (!owner || owner.profileId !== profileId) {
          return { jobId: job.jobId, success: true }
        }
        clearScaleOwner()
        scaleDriver.disconnect()
        return { jobId: job.jobId, success: true }
      }

      // Explicit, visible hand-off — lets a DIFFERENT profile force-release
      // the scale from whoever currently owns it (see plan Section 5's
      // tray "Release" action). Deliberately a separate job type from
      // SCALE_DISCONNECT (which only ever affects the caller's own
      // ownership) so this always-cross-profile-capable action can't be
      // triggered by accident.
      case 'SCALE_RELEASE': {
        releaseScale()
        return { jobId: job.jobId, success: true }
      }

      case 'SCALE_TARE': {
        const owner = getScaleOwner()
        if (!owner || owner.profileId !== profileId) {
          return { jobId: job.jobId, success: false, error: 'Scale is not connected for this profile' }
        }
        const ok = scaleDriver.tare()
        return { jobId: job.jobId, success: ok, ...(ok ? {} : { error: 'Scale not connected' }) }
      }

      case 'SCALE_DETECT_BAUD': {
        // detectBaud() closes any currently-open port internally while it
        // probes — must not be allowed to yank the connection out from
        // under a different profile that currently owns it.
        const owner = getScaleOwner()
        if (owner && owner.profileId !== profileId) {
          return { jobId: job.jobId, success: false, error: `Scale is in use by ${ownerLabel(owner.profileId)} — cannot detect baud rate while it's connected elsewhere` }
        }
        const params = job.params as { comPort: string }
        const result = await scaleDriver.detectBaud(params.comPort)
        return { jobId: job.jobId, success: true, data: result }
      }

      case 'PRINT_RECEIPT': {
        // No exclusivity concern at all — see file header comment.
        const params = job.params as { content: string; printerName: string; copies?: number }
        await printRawData(params.content, { printerName: params.printerName, copies: params.copies })
        return { jobId: job.jobId, success: true }
      }

      case 'PRINT_LIST_PRINTERS': {
        const printers = listPrinters()
        return { jobId: job.jobId, success: true, data: { printers } }
      }

      case 'AGENT_SET_AUTO_START': {
        // Process-level setting, not scoped to this profile — affects
        // whether the whole agent (every paired server) launches at sign-in.
        const params = job.params as { enabled: boolean }
        setAutoStart(params.enabled)
        return { jobId: job.jobId, success: true, data: { autoStartEnabled: isAutoStartEnabled() } }
      }

      default:
        return { jobId: job.jobId, success: false, error: `Unknown job type: ${job.jobType}` }
    }
  } catch (error) {
    return { jobId: job.jobId, success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
