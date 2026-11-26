// MBM-344 follow-up: how many of each inventory list item sold in a period —
// shown under the stock in the inventory list (month to date by default; a
// row's own range from its popup).
//
// GET ?ids=inv_<barcodeItemId>,<productId>,…&start=<ISO>&end=<ISO>
// → { success, data: { [id]: quantity } }
//
// Completed and other non-cancelled sales, on the sale's own date
// (transactionDate, else createdAt) — the same day rule as the daily sales
// report; returns (negative quantities) are netted in.
//   inv_<id>  — a barcode inventory item: order lines carrying its
//               inventoryItemId (every matched line has it since MBM-344)
//   otherwise — a product: lines on any of its variants
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { businessId } = await params
    const sp = new URL(request.url).searchParams
    const ids = (sp.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 200)
    const start = new Date(sp.get('start') || '')
    const end = new Date(sp.get('end') || '')
    if (!ids.length) return NextResponse.json({ success: true, data: {} })
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'start and end (ISO dates, end after start) are required' }, { status: 400 })
    }

    const invIds = ids.filter(i => i.startsWith('inv_')).map(i => i.slice(4))
    const productIds = ids.filter(i => !i.startsWith('inv_'))
    const data: Record<string, number> = Object.fromEntries(ids.map(i => [i, 0]))

    const inPeriod = Prisma.sql`o."businessId" = ${businessId} AND o.status <> 'CANCELLED' AND o."orderType" = 'SALE'
      AND COALESCE(o."transactionDate", o."createdAt") >= ${start} AND COALESCE(o."transactionDate", o."createdAt") < ${end}`

    if (invIds.length) {
      const rows = await prisma.$queryRaw<{ id: string; qty: number }[]>`
        SELECT oi.attributes->>'inventoryItemId' AS id, COALESCE(SUM(oi.quantity), 0)::int AS qty
        FROM business_order_items oi JOIN business_orders o ON o.id = oi."orderId"
        WHERE ${inPeriod} AND oi.attributes->>'inventoryItemId' IN (${Prisma.join(invIds)})
        GROUP BY 1`
      for (const r of rows) data[`inv_${r.id}`] = Number(r.qty)
    }
    if (productIds.length) {
      const rows = await prisma.$queryRaw<{ id: string; qty: number }[]>`
        SELECT v."productId" AS id, COALESCE(SUM(oi.quantity), 0)::int AS qty
        FROM business_order_items oi
        JOIN business_orders o ON o.id = oi."orderId"
        JOIN product_variants v ON v.id = oi."productVariantId"
        WHERE ${inPeriod} AND v."productId" IN (${Prisma.join(productIds)})
        GROUP BY 1`
      for (const r of rows) data[r.id] = Number(r.qty)
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[inventory/sold] error:', error)
    return NextResponse.json({ error: 'Failed to load quantities sold' }, { status: 500 })
  }
}
