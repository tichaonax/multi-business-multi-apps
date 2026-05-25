import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

// Auto-generate a short name from a long Chinese product description
function generateShortName(fullName: string): string {
  if (!fullName) return ''
  // Take text before first comma, dash, em-dash, or parenthesis
  const trimmed = fullName.replace(/^[\s—\-,]+/, '').trim()
  const match = trimmed.match(/^([^,\-—(（[—–]+)/)
  const short = match ? match[1].trim() : trimmed
  return short.slice(0, 60)
}

// Parse a date string like "2026-05-22" safely
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

// Parse integer, return null for blank or "—"
function parseInt2(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '—') return null
  const n = parseInt(String(val), 10)
  return isNaN(n) ? null : n
}

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Permission check
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

    // Parse batch number from filename (e.g. "Import-To-MBMA-batch_29_2026-05-25.xlsx" → "batch_29")
    const batchNumberMatch = file.name.match(/batch[_-](\d+)/i)
    const batchNumber = batchNumberMatch ? `batch_${batchNumberMatch[1]}` : null
    const batchName = batchNameOverride || (batchNumber ? `${batchNumber} — ${new Date().toISOString().slice(0, 10)}` : file.name)

    // Parse data with SheetJS — robust, handles Excel files with charts/drawings that ExcelJS can't load
    const xlsxWb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = xlsxWb.SheetNames[0]
    if (!sheetName) return NextResponse.json({ error: 'No worksheet found in file' }, { status: 400 })
    const sheet = xlsxWb.Sheets[sheetName]
    const allSheetRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

    // Debug: log header + first 3 data rows so we can verify column mapping
    console.log('=== WAREHOUSE IMPORT COLUMN DEBUG ===')
    console.log('Header row (row 0):', JSON.stringify(allSheetRows[0]))
    console.log('Data row 1 (row 1):', JSON.stringify(allSheetRows[1]))
    console.log('Data row 2 (row 2):', JSON.stringify(allSheetRows[2]))
    console.log('Data row 3 (row 3):', JSON.stringify(allSheetRows[3]))
    console.log('Total rows from SheetJS:', allSheetRows.length)
    console.log('=====================================')

    // Extract embedded images directly from the xlsx ZIP (avoids ExcelJS drawing parser,
    // which crashes on files containing chart anchors alongside image anchors)
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

      // 1. Find first worksheet path
      const wbRels = await zip.file('xl/_rels/workbook.xml.rels')?.async('text') ?? ''
      const sheetRel = wbRels.match(/Type="[^"]*\/worksheet"[^>]*Target="([^"]+)"/)
      const sheetPath = sheetRel ? xlsxResolve('xl/workbook.xml', sheetRel[1]) : 'xl/worksheets/sheet1.xml'

      // 2. Find drawing path from sheet rels
      const sheetFileName = sheetPath.split('/').pop()!
      const sheetRels = await zip.file(`xl/worksheets/_rels/${sheetFileName}.rels`)?.async('text') ?? ''
      const drawingRel = sheetRels.match(/Type="[^"]*\/drawing"[^>]*Target="([^"]+)"/)
      if (!drawingRel) throw new Error('no drawing in sheet')
      const drawingPath = xlsxResolve(sheetPath, drawingRel[1])
      console.log('Drawing path:', drawingPath)

      // 3. Build rId → media path from drawing rels
      const drawingRelsPath = xlsxResolve(drawingPath, `_rels/${drawingPath.split('/').pop()}.rels`)
      const drawingRels = await zip.file(drawingRelsPath)?.async('text') ?? ''
      console.log('Drawing rels path:', drawingRelsPath, '— found:', !!zip.file(drawingRelsPath))
      const rIdToMedia: Record<string, string> = {}
      for (const rel of drawingRels.matchAll(/<Relationship\s[^>]*/g)) {
        const block = rel[0]
        if (!block.includes('/image')) continue
        const id = block.match(/Id="(rId\d+)"/)
        const target = block.match(/Target="([^"]+)"/)
        if (id && target) rIdToMedia[id[1]] = xlsxResolve(drawingPath, target[1])
      }
      console.log('rId→media map:', JSON.stringify(rIdToMedia))

      // 4. Parse drawing XML: row → image. xdr: prefix is optional (files may use default namespace).
      const drawingXml = await zip.file(drawingPath)?.async('text') ?? ''
      console.log('Drawing XML length:', drawingXml.length, '— first 300 chars:', drawingXml.slice(0, 300))
      const anchorRe = /<(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:xdr:)?(?:twoCellAnchor|oneCellAnchor)>/g
      let anchorCount = 0
      for (const [, block] of drawingXml.matchAll(anchorRe)) {
        anchorCount++
        const fromBlock = block.match(/<(?:xdr:)?from>([\s\S]*?)<\/(?:xdr:)?from>/)
        const blipRid   = block.match(/r:embed="(rId\d+)"/)
        if (!fromBlock || !blipRid) continue // chart anchor — no blip, skip cleanly

        const rowMatch = fromBlock[1].match(/<(?:xdr:)?row>(\d+)<\/(?:xdr:)?row>/)
        if (!rowMatch) continue

        const rowNum = parseInt(rowMatch[1], 10) + 1 // xlsx rows are 0-indexed
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

    // Collect raw rows, skipping header (row index 0 = row 1) and footers
    interface RawRow {
      rowNum: number
      orderNumber: string
      trackingNumber: string | null
      productName: string
      qty: string | null
      costUsd: number | null
      orderDate: Date | null
      priceYuan: number | null
      rowNumber: number | null
      rate: number | null
      stage: string | null
      shipment: string | null
      location: string | null
      courierName: string | null
      courierStatus: string | null
      courierTime: Date | null
      parentOrder: string | null
      parcelNumber: number | null
    }
    const rawRows: RawRow[] = []

    allSheetRows.forEach((row, i) => {
      const rowIndex = i + 1 // 1-indexed to match image map keys
      if (rowIndex === 1) return // skip header

      // SheetJS: row[0]=col A, row[1]=col B, row[3]=col D, etc.
      const col0 = String(row[0] ?? '').trim() // Col A — image / footer label
      const col1 = String(row[1] ?? '').trim() // Col B — Order #
      const col3 = String(row[3] ?? '').trim() // Col D — Product name

      // Detect summary footer rows
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

      // Skip blank rows and rows without an order number
      if (!col1 || !col3) return

      rawRows.push({
        rowNum: rowIndex,
        orderNumber: col1,
        trackingNumber: String(row[2] ?? '').trim() || null,  // Col C
        productName: col3,
        qty: String(row[4] ?? '').trim() || null,             // Col E
        costUsd: parseDecimal(row[5]),                         // Col F
        orderDate: parseDate(row[6]),                          // Col G
        priceYuan: parseDecimal(row[7]),                       // Col H
        rowNumber: parseInt2(row[8]),                          // Col I
        rate: parseDecimal(row[9]),                            // Col J
        stage: String(row[10] ?? '').trim() || null,          // Col K
        shipment: String(row[11] ?? '').trim() || null,       // Col L
        location: String(row[12] ?? '').trim() || null,       // Col M
        courierName: String(row[13] ?? '').trim() || null,    // Col N
        courierStatus: String(row[14] ?? '').trim() || null,  // Col O
        courierTime: parseDate(row[15]),                       // Col P
        parentOrder: String(row[16] ?? '').trim() || null,    // Col Q
        parcelNumber: parseInt2(row[17]),                      // Col R
      })
    })

    // Merge sub-parcels into primary rows
    // Group by parent order: _p1 is primary, _p2+ are sub-parcels
    const primaryMap = new Map<string, RawRow & { additionalTracking: string[] }>()
    const orderedPrimaries: string[] = []

    for (const row of rawRows) {
      const orderNo = row.orderNumber

      // Check if it's a sub-parcel by looking for _p2, _p3 etc. OR parent order column set
      const subParcelMatch = orderNo.match(/^(.+)_p(\d+)$/)
      if (subParcelMatch && parseInt(subParcelMatch[2]) > 1) {
        // This is _p2 or higher — merge tracking number into primary
        const primaryKey = subParcelMatch[1] + '_p1'
        const existing = primaryMap.get(primaryKey) || primaryMap.get(subParcelMatch[1])
        if (existing && row.trackingNumber) {
          existing.additionalTracking.push(row.trackingNumber)
        }
        continue
      }

      // Strip _p1 suffix from primary order number
      const cleanOrderNo = orderNo.replace(/_p1$/, '')
      const entry = { ...row, orderNumber: cleanOrderNo, additionalTracking: [] as string[] }
      primaryMap.set(orderNo, entry)
      orderedPrimaries.push(orderNo)
    }

    const mergedRows = orderedPrimaries.map(k => primaryMap.get(k)!).filter(Boolean)

    // Order number dedup check (against existing warehouse items)
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
        fileHash,
        originalFileName: file.name,
        notes,
      }
    })

    // Store images and create warehouse items
    let createdCount = 0
    for (const row of mergedRows) {
      let imageId: string | null = null

      // Store embedded image if present
      const imgData = imagesByRow.get(row.rowNum)
      if (imgData) {
        const imgRecord = await (prisma as any).images.create({
          data: {
            data: imgData.data,
            mimeType: imgData.mimeType,
            size: imgData.data.length,
          }
        })
        imageId = imgRecord.id
      }

      const isSubParcelQty = row.qty === '—' || row.qty === null
      const quantity = isSubParcelQty ? null : parseInt2(row.qty)

      await (prisma as any).warehouseItems.create({
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
