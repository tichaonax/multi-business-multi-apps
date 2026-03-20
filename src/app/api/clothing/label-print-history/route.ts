import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * POST /api/clothing/label-print-history
 * Log a label print job.
 * Body: { businessId, baleId?, productId?, templateId?, quantity, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, baleId, productId, templateId, quantity, notes } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!quantity || quantity < 1) return NextResponse.json({ error: 'quantity must be >= 1' }, { status: 400 })

    const id = `lph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = new Date()

    await prisma.$executeRaw`
      INSERT INTO clothing_label_print_history
        (id, "businessId", "baleId", "productId", "templateId", quantity, "printedBy", "printedAt", notes)
      VALUES
        (${id}, ${businessId}, ${baleId ?? null}, ${productId ?? null}, ${templateId ?? null},
         ${quantity}, ${user.id}, ${now}, ${notes ?? null})
    `

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[label-print-history POST]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log print job' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/clothing/label-print-history?baleId=xxx
 * Fetch print history for a bale (or by productId).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const baleId = searchParams.get('baleId')
    const productId = searchParams.get('productId')

    if (!baleId && !productId) {
      return NextResponse.json({ error: 'baleId or productId is required' }, { status: 400 })
    }

    type PrintHistoryRow = {
      id: string
      businessId: string
      baleId: string | null
      productId: string | null
      templateId: string | null
      quantity: number
      printedBy: string
      printedAt: Date
      notes: string | null
      printerName: string | null
      templateName: string | null
    }

    let rows: PrintHistoryRow[]

    if (baleId) {
      rows = await prisma.$queryRaw<PrintHistoryRow[]>`
        SELECT
          h.id, h."businessId", h."baleId", h."productId", h."templateId",
          h.quantity, h."printedBy", h."printedAt", h.notes,
          u.name AS "printerName",
          bt.name AS "templateName"
        FROM clothing_label_print_history h
        LEFT JOIN users u ON u.id = h."printedBy"
        LEFT JOIN barcode_templates bt ON bt.id = h."templateId"
        WHERE h."baleId" = ${baleId}
        ORDER BY h."printedAt" DESC
      `
    } else {
      rows = await prisma.$queryRaw<PrintHistoryRow[]>`
        SELECT
          h.id, h."businessId", h."baleId", h."productId", h."templateId",
          h.quantity, h."printedBy", h."printedAt", h.notes,
          u.name AS "printerName",
          bt.name AS "templateName"
        FROM clothing_label_print_history h
        LEFT JOIN users u ON u.id = h."printedBy"
        LEFT JOIN barcode_templates bt ON bt.id = h."templateId"
        WHERE h."productId" = ${productId}
        ORDER BY h."printedAt" DESC
      `
    }

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error('[label-print-history GET]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch print history' },
      { status: 500 }
    )
  }
}
