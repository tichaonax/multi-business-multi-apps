import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

// Auto-generate a short name from a long Chinese product description
function generateShortName(fullName: string): string {
  if (!fullName) return ''
  const trimmed = fullName.replace(/^[\s—\-,]+/, '').trim()
  const match = trimmed.match(/^([^,\-—(（[—–]+)/)
  const short = match ? match[1].trim() : trimmed
  return short.slice(0, 60)
}

// Parse a date value safely (string, Date object, or Excel serial number)
function parseDate(val: any): Date | null {
  if (!val) return null
  if (val instanceof Date) return val
  const s = String(val).trim()
  if (!s || s === '—') return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// Parse a decimal, return null for blank or "—"
function parseDecimal(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '—') return null
  const n = Number(String(val).replace(/[^\d.-]/g, ''))
  return isNaN(n) ? null : n
}

// Parse integer, return null for blank or "—" or 0
function parseInt2(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '—') return null
  const n = parseInt(String(val), 10)
  return isNaN(n) ? null : n
}

// Build a column-name → index map from the header row, trimming whitespace.
// Returns a lookup function: get(row, 'Column Name') → cell value or null.
function buildColumnLookup(headerRow: any[]) {
  const colIdx: Record<string, number> = {}
  headerRow.forEach((h: any, i: number) => {
    if (h != null && h !== '') colIdx[String(h).trim()] = i
  })
  return function get(row: any[], name: string): any {
    const idx = colIdx[name]
    return idx !== undefined ? row[idx] ?? null : null
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = user.role === 'admin'
    const hasPermission = isAdmin || (user.permissions as any)?.canAccessWarehouse === true
    if (!hasPermission) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const batchNameOverride = formData.get('batchName') as string | null
    const notes = formData.get('notes') as string | null
    const pickedUpFromHarare = formData.get('pickedUpFromHarare') === 'true'
    const transportCostHarare = parseDecimal(formData.get('transportCostHarare'))
    const transactionFeePct = parseDecimal(formData.get('transactionFeePct'))

    // Read file bytes
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // SHA-256 dedup check
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')
    const existing = await (prisma as any).warehouseBatches.findUnique({ where: { fileHash } })
    if (existing) {
      return NextResponse.json({
        error: `This file was already imported`,
        existingBatch: { id: existing.id, batchName: existing.batchName, importedAt: existing.importedAt }
      }, { status: 409 })
    }

    // Parse batch number from filename (e.g. "batch_29_2026-05-25.xlsx" → "batch_29")
    const batchNumberMatch = file.name.match(/batch[_-](\d+)/i)
    const batchNumber = batchNumberMatch ? `batch_${batchNumberMatch[1]}` : null
    const batchName = batchNameOverride || (batchNumber ? `${batchNumber} — ${new Date().toISOString().slice(0, 10)}` : file.name)

    // Parse data with SheetJS
    const xlsxWb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = xlsxWb.SheetNames[0]
    if (!sheetName) return NextResponse.json({ error: 'No worksheet found in file' }, { status: 400 })
    const sheet = xlsxWb.Sheets[sheetName]
    const allSheetRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

    // Log headers so column mapping is always visible in server logs
    console.log('=== WAREHOUSE IMPORT COLUMNS ===')
    console.log('Header row:', JSON.stringify(allSheetRows[0]))
    console.log('Sample row 1:', JSON.stringify(allSheetRows[1]))
    console.log('================================')

    // Build header-based column lookup — order-independent
    const headerRow: any[] = allSheetRows[0] || []
    const get = buildColumnLookup(headerRow)

    // Extract embedded images from the xlsx ZIP
    const imagesByRow = new Map<number, { data: Buffer; mimeType: string }>()
    try {
      function xlsxResolve(base: string, rel: string): string {
        if (rel.startsWith('/')) return rel.slice(1)
        const parts = base.split('/')
        parts.pop()
        for (const p of rel.split('/')) {
          if (p === '..') parts.pop()
          else if (p !== '.') parts.push(p)
        }
        return parts.join('/')
      }

      const zip = await JSZip.loadAsync(buffer)

      const wbRels = await zip.file('xl/_rels/workbook.xml.rels')?.async('text') ?? ''
      const sheetRel = wbRels.match(/Type="[^"]*\/worksheet"[^>]*Target="([^"]+)"/)
      const sheetPath = sheetRel ? xlsxResolve('xl/workbook.xml', sheetRel[1]) : 'xl/worksheets/sheet1.xml'

      const sheetFileName = sheetPath.split('/').pop()!
      const sheetRels = await zip.file(`xl/worksheets/_rels/${sheetFileName}.rels`)?.async('text') ?? ''
      const drawingRel = sheetRels.match(/Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/)
      if (!drawingRel) throw new Error('no drawing in sheet')
      const drawingPath = xlsxResolve(sheetPath, drawingRel[1])

      const drawingRelsPath = xlsxResolve(drawingPath, `_rels/${drawingPath.split('/').pop()}.rels`)
      const drawingRels = await zip.file(drawingRelsPath)?.async('text') ?? ''
      const rIdToMedia: Record<string, string> = {}
      for (const rel of drawingRels.matchAll(/<Relationship\s[^>]*/g)) {
        const block = rel[0]
        if (!block.includes('/image')) continue
        const id = block.match(/Id="(rId\d+)"/)
        const target = block.match(/Target="([^"]+)"/)
        if (id && target) rIdToMedia[id[1]] = xlsxResolve(drawingPath, target[1])
      }

      const drawingXml = await zip.file(drawingPath)?.async('text') ?? ''
      const anchorRe = /<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/g
      for (const [, block] of drawingXml.matchAll(anchorRe)) {
        const fromBlock = block.match(/<(?:xdr:)?from>([\s\S]*?)<\/(?:xdr:)?from>/)
        const blipRid   = block.match(/r:embed="(rId\d+)"/)
        if (!fromBlock || !blipRid) continue
        const rowMatch = fromBlock[1].match(/<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/)
        if (!rowMatch) continue
        const rowNum = parseInt(rowMatch[1], 10) + 1
        const mediaPath = rIdToMedia[blipRid[1]]
        if (!mediaPath) continue
        const imgBuffer = await zip.file(mediaPath)?.async('nodebuffer')
        if (!imgBuffer) continue
        imagesByRow.set(rowNum, {
          data: imgBuffer,
          mimeType: mediaPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
        })
      }
      console.log(`Warehouse import: extracted ${imagesByRow.size} images`)
    } catch (imgErr: any) {
      console.warn('Image extraction skipped:', imgErr.message)
    }

    // Extract summary footer values and data rows
    let totalYuanCost: number | null = null
    let totalUsdCost: number | null = null
    let collectionFee: string | null = null

    interface RawRow {
      rowNum: number
      rowNumber: number | null
      orderNumber: string
      trackingNumber: string | null
      productName: string
      qty: string | null
      priceYuan: number | null
      costUsd: number | null
      rate: number | null
      stage: string | null
      shipment: string | null
      location: string | null
      courierName: string | null
      courierStatus: string | null
      orderDate: Date | null
      courierTime: Date | null
      parentOrder: string | null
      parcelNumber: number | null
      cbm: number | null
      weightKg: number | null
      invoiceName: string | null
      containerDate: Date | null
      manifestQty: number | null
      variantSpec: string | null
    }
    const rawRows: RawRow[] = []

    allSheetRows.forEach((row, i) => {
      const rowIndex = i + 1 // 1-indexed to match image map keys
      if (rowIndex === 1) return // skip header

      // Footer rows are identified by a known label in the first cell (always col A)
      const col0 = String(row[0] ?? '').trim()
      if (col0 === 'Total Cost (Yuan ¥)') {
        totalYuanCost = parseDecimal(String(row[1] ?? '').replace(/[¥,]/g, ''))
        return
      }
      if (col0 === 'Total Converted Cost (US$)') {
        totalUsdCost = parseDecimal(String(row[1] ?? '').replace(/[$,]/g, ''))
        return
      }
      if (col0 === 'Total Collection Fee (US$)') {
        collectionFee = String(row[1] ?? '').trim() || null
        return
      }

      // Use header-based lookup for all data fields
      const orderNumber = String(get(row, 'Order #') ?? '').trim()
      const productName = String(get(row, 'Product') ?? '').trim()
      if (!orderNumber || !productName) return // skip blank/footer rows

      rawRows.push({
        rowNum: rowIndex,
        rowNumber: parseInt2(get(row, 'Row #')),
        orderNumber,
        trackingNumber: String(get(row, 'Tracking #') ?? '').trim() || null,
        productName,
        qty: String(get(row, 'Qty') ?? '').trim() || null,
        priceYuan: parseDecimal(get(row, 'Price (¥)')),
        costUsd: parseDecimal(get(row, 'Cost (US$)')),
        rate: parseDecimal(get(row, 'Rate')),
        stage: String(get(row, 'Stage') ?? '').trim() || null,
        shipment: String(get(row, 'Shipment') ?? '').trim() || null,
        location: String(get(row, 'Location') ?? '').trim() || null,
        courierName: String(get(row, 'Courier') ?? '').trim() || null,
        courierStatus: String(get(row, 'Courier Status') ?? '').trim() || null,
        orderDate: parseDate(get(row, 'Order Date')),
        courierTime: parseDate(get(row, 'Courier Time')),
        parentOrder: String(get(row, 'Parent Order') ?? '').trim() || null,
        parcelNumber: parseInt2(get(row, 'Parcel #')),
        cbm: parseDecimal(get(row, 'CBM')),
        weightKg: parseDecimal(get(row, 'Weight (kg)')),
        invoiceName: String(get(row, 'Invoice Name') ?? '').trim() || null,
        containerDate: parseDate(get(row, 'Container Date')),
        manifestQty: parseInt2(get(row, 'Manifest Qty')),
        variantSpec: String(get(row, 'Variant/Spec') ?? '').trim() || null,
      })
    })

    // Merge sub-parcels into primary rows (_p2, _p3, etc. → merge tracking into _p1)
    const primaryMap = new Map<string, RawRow & { additionalTracking: string[] }>()
    const orderedPrimaries: string[] = []

    for (const row of rawRows) {
      const orderNo = row.orderNumber
      const subParcelMatch = orderNo.match(/^(.+)_p(\d+)$/)
      if (subParcelMatch && parseInt(subParcelMatch[2]) > 1) {
        const primaryKey = subParcelMatch[1] + '_p1'
        const existing = primaryMap.get(primaryKey) || primaryMap.get(subParcelMatch[1])
        if (existing && row.trackingNumber) existing.additionalTracking.push(row.trackingNumber)
        continue
      }
      const cleanOrderNo = orderNo.replace(/_p1$/, '')
      const entry = { ...row, orderNumber: cleanOrderNo, additionalTracking: [] as string[] }
      primaryMap.set(orderNo, entry)
      orderedPrimaries.push(orderNo)
    }

    const mergedRows = orderedPrimaries.map(k => primaryMap.get(k)!).filter(Boolean)

    // Order number dedup check
    const orderNumbers = mergedRows.map(r => r.orderNumber)
    const existingItems = await (prisma as any).warehouseItems.findMany({
      where: { orderNumber: { in: orderNumbers } },
      select: { orderNumber: true, batchId: true, warehouse_batches: { select: { batchName: true } } }
    })
    const overlappingOrders = existingItems.map((i: any) => ({
      orderNumber: i.orderNumber,
      batchName: i.warehouse_batches?.batchName
    }))

    const confirmOverlap = formData.get('confirmOverlap') === 'true'
    if (overlappingOrders.length > 0 && !confirmOverlap) {
      return NextResponse.json({
        warning: 'overlapping_orders',
        overlappingOrders,
        message: `${overlappingOrders.length} order(s) already exist in another batch`,
      }, { status: 200 })
    }

    // Create batch record
    const batch = await (prisma as any).warehouseBatches.create({
      data: {
        batchName,
        batchNumber,
        importedBy: user.id,
        status: 'ACTIVE',
        rowCount: mergedRows.length,
        totalYuanCost,
        totalUsdCost,
        collectionFee,
        pickedUpFromHarare,
        transportCostHarare,
        transactionFeePct,
        fileHash,
        originalFileName: file.name,
        notes,
      }
    })

    // Store images and create warehouse items
    let createdCount = 0
    for (const row of mergedRows) {
      let imageId: string | null = null
      const imgData = imagesByRow.get(row.rowNum)
      if (imgData) {
        const imgRecord = await (prisma as any).images.create({
          data: { data: imgData.data, mimeType: imgData.mimeType, size: imgData.data.length }
        })
        imageId = imgRecord.id
      }

      const isSubParcelQty = row.qty === '—' || row.qty === null
      const quantity = isSubParcelQty ? null : parseInt2(row.qty)

      const created = await (prisma as any).warehouseItems.create({
        data: {
          batchId: batch.id,
          rowNumber: row.rowNumber,
          orderNumber: row.orderNumber,
          trackingNumber: row.trackingNumber,
          additionalTrackingNumbers: row.additionalTracking.length > 0 ? row.additionalTracking : undefined,
          productName: row.productName,
          shortName: generateShortName(row.productName),
          quantity,
          priceYuan: row.priceYuan,
          costUsd: row.costUsd,
          exchangeRate: row.rate,
          orderDate: row.orderDate,
          stage: row.stage,
          shipment: row.shipment,
          location: row.location,
          courierName: row.courierName,
          courierStatus: row.courierStatus,
          courierTime: row.courierTime,
          imageId,
          isPersonal: false,
          status: 'IN_WAREHOUSE',
        }
      })

      // Set new columns via raw SQL — bypasses Prisma client validation until next prisma generate
      await prisma.$executeRaw`
        UPDATE warehouse_items SET
          cbm            = ${row.cbm},
          "weightKg"     = ${row.weightKg},
          "invoiceName"  = ${row.invoiceName},
          "containerDate"= ${row.containerDate}::date,
          "manifestQty"  = ${row.manifestQty},
          "variantSpec"  = ${row.variantSpec}
        WHERE id = ${created.id}
      `
      createdCount++
    }

    return NextResponse.json({
      success: true,
      batchId: batch.id,
      batchName: batch.batchName,
      itemsCreated: createdCount,
      overlappingOrdersImported: overlappingOrders.length,
    })
  } catch (error: any) {
    console.error('Warehouse import error:', error)
    return NextResponse.json({ error: 'Import failed: ' + error.message }, { status: 500 })
  }
}
