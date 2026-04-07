/**
 * POST /api/print/card
 * Print a scan card (loyalty card, employee ID card) to a thermal receipt printer.
 *
 * Accepts pre-built ESC/POS raster bytes (base64) from the client.
 * Uses the same queue + printRawData pattern as the receipt print API.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import { queuePrintJob } from '@/lib/printing/print-job-queue'
import { markJobAsProcessing, markJobAsCompleted, markJobAsFailed } from '@/lib/printing/print-job-queue'
import { checkPrinterConnectivity } from '@/lib/printing/printer-service'

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { printerId, businessId, escPosData } = body

    if (!printerId || !businessId || !escPosData) {
      return NextResponse.json(
        { error: 'Missing required fields: printerId, businessId, escPosData' },
        { status: 400 }
      )
    }

    // Look up printer and business
    const [printer, business] = await Promise.all([
      prisma.networkPrinters.findUnique({ where: { id: printerId } }),
      prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true, type: true } }),
    ])

    if (!printer) return NextResponse.json({ error: 'Printer not found' }, { status: 404 })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const businessType = business.type || 'other'

    // Queue the job for audit trail (same pattern as receipt printing)
    const printJob = await queuePrintJob(
      {
        printerId,
        jobType: 'label',
        jobData: { cardData: escPosData } as any,
        copies: 1,
      },
      businessId,
      businessType,
      user.id
    )

    // Immediately mark as processing so the background worker does not also pick it up
    await markJobAsProcessing(printJob.id)

    // Immediately attempt to print
    try {
      const { printRawData } = await import('@/lib/printing/windows-raw-printer')

      const isOnline = await checkPrinterConnectivity(printer.id)
      if (!isOnline) throw new Error(`Printer "${printer.printerName}" is offline or unreachable`)

      const rawBytes = Buffer.from(escPosData, 'base64').toString('binary')
      await printRawData(rawBytes, { printerName: printer.printerName, copies: 1 })

      await markJobAsCompleted(printJob.id)

      return NextResponse.json({ success: true, jobId: printJob.id })
    } catch (printError) {
      const errorMsg = printError instanceof Error ? printError.message : 'Unknown error'
      console.error('[POST /api/print/card] Immediate print failed:', errorMsg)
      await markJobAsFailed(printJob.id, errorMsg)

      return NextResponse.json(
        { success: false, jobId: printJob.id, error: errorMsg },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('[POST /api/print/card]', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
