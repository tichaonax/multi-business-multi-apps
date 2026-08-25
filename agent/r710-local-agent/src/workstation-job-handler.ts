/**
 * MBM-275: executes scale and print jobs dispatched by the central server
 * against devices attached to this workstation. Mirrors the shape of
 * job-handler.ts (R710), but is otherwise independent — a separate job-type
 * union, a separate handler function, dispatched over the workstation
 * socket connection rather than the R710 one. See workstation-socket-client.ts
 * for how scale weight/status streaming is wired up (this file only handles
 * one-shot request/response jobs; streaming is the socket client's job).
 */

import { ScaleDriver } from './scale-driver'
import { printRawData, listPrinters } from './print-driver'

export type WorkstationAgentJobType =
  | 'SCALE_LIST_PORTS'
  | 'SCALE_CONNECT'
  | 'SCALE_DISCONNECT'
  | 'SCALE_TARE'
  | 'SCALE_DETECT_BAUD'
  | 'PRINT_RECEIPT'
  | 'PRINT_LIST_PRINTERS'

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
// physical scale attached). Exported so workstation-socket-client.ts can
// subscribe to its 'weight'/'status' events for streaming.
export const scaleDriver = new ScaleDriver()

export async function handleWorkstationJob(job: WorkstationAgentJob): Promise<WorkstationAgentJobResult> {
  try {
    switch (job.jobType) {
      case 'SCALE_LIST_PORTS': {
        const ports = await scaleDriver.listPorts()
        return { jobId: job.jobId, success: true, data: { ports } }
      }

      case 'SCALE_CONNECT': {
        const params = job.params as { comPort: string; baudRate?: number }
        scaleDriver.connect(params.comPort, params.baudRate)
        return { jobId: job.jobId, success: true }
      }

      case 'SCALE_DISCONNECT': {
        scaleDriver.disconnect()
        return { jobId: job.jobId, success: true }
      }

      case 'SCALE_TARE': {
        const ok = scaleDriver.tare()
        return { jobId: job.jobId, success: ok, ...(ok ? {} : { error: 'Scale not connected' }) }
      }

      case 'SCALE_DETECT_BAUD': {
        const params = job.params as { comPort: string }
        const result = await scaleDriver.detectBaud(params.comPort)
        return { jobId: job.jobId, success: true, data: result }
      }

      case 'PRINT_RECEIPT': {
        const params = job.params as { content: string; printerName: string; copies?: number }
        await printRawData(params.content, { printerName: params.printerName, copies: params.copies })
        return { jobId: job.jobId, success: true }
      }

      case 'PRINT_LIST_PRINTERS': {
        const printers = listPrinters()
        return { jobId: job.jobId, success: true, data: { printers } }
      }

      default:
        return { jobId: job.jobId, success: false, error: `Unknown job type: ${job.jobType}` }
    }
  } catch (error) {
    return { jobId: job.jobId, success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
