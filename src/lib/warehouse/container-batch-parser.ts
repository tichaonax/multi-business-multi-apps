import * as XLSX from 'xlsx'
import { extractImagesFromXlsx } from './xlsx-image-extraction'

// ── Cell parsing helpers (same conventions as the existing warehouse
// importer — "—" is this source tool's universal "not applicable" placeholder) ──

function parseDecimal(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '—') return null
  const n = Number(String(val).replace(/[^\d.-]/g, ''))
  return isNaN(n) ? null : n
}

function parseInt2(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '—') return null
  const n = parseInt(String(val).replace(/[^\d-]/g, ''), 10)
  return isNaN(n) ? null : n
}

function cleanStr(val: any): string | null {
  const s = String(val ?? '').trim()
  return s && s !== '—' ? s : null
}

// The "Est. Selling Price (US$)" column packs a margin % and a $ amount into
// one cell, separated by a newline (e.g. "+272%\n$73.36") — split them out.
function parseSellingPriceCell(val: any): { marginPct: string | null; sellingPrice: number | null } {
  const raw = String(val ?? '').trim()
  if (!raw || raw === '—') return { marginPct: null, sellingPrice: null }
  const parts = raw.split('\n').map(s => s.trim()).filter(Boolean)
  const marginPart = parts.find(p => p.includes('%')) ?? null
  const pricePart = parts.find(p => p.includes('$')) ?? parts[parts.length - 1]
  return { marginPct: marginPart, sellingPrice: parseDecimal(pricePart) }
}

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

// A child/indented product name is prefixed with an arrow or a box-drawing
// substitute glyph, depending on how the source tool rendered it — strip
// either so the stored name is clean either way.
function stripIndentMarker(name: string): string {
  return name.replace(/^[\s↳■▪]+/, '').trim()
}

export interface ParsedContainerBatchRow {
  rowIndex: number // matches extractImagesFromXlsx's keying (sheet_to_json row index + 1)
  isLineItem: boolean // has real cost data — an actual receivable line, not just a tracking-number summary
  trackingNumber: string | null
  orderNumber: string | null
  parcelSuffix: string | null // "_p1" / "_p2" split-shipment marker, if present
  productName: string
  unitCost: number | null
  clearancePerUnit: number | null
  shippingPerUnit: number | null
  landedCost: number | null
  estSellingPrice: number | null
  estMarginPct: string | null
  orderedQty: number | null // real per-unit quantity — the stock-quantity source of truth
  batchQty: number | null // clearing agent's box/package count — reference only
  diffQty: number | null
  cbm: number | null
  weightKg: number | null
  matchStatus: string | null
}

export interface ParsedContainerBatch {
  sourceBatchTitle: string | null
  batchStatus: string | null
  headerItemCount: number | null
  exchangeRateText: string | null // raw "¥6.80 = US$1", as printed in the file
  exchangeRateYuanPerUsd: number | null // 6.80
  generatedAt: string | null
  totalLandedCost: number | null
  totalProjectedSelling: number | null
  totalProjectedProfit: number | null
  profitMarginPct: string | null
  totalRowsInFile: number
  rows: ParsedContainerBatchRow[]
  imagesByRow: Map<number, { data: Buffer; mimeType: string }>
}

const REQUIRED_HEADERS = ['Tracking #', 'Order #', 'Product']

// The second header row reads like:
// "Status: Closed   |   54 items   |   Exchange Rate: ¥6.80 = US$1   |   Generated: 2026-09-25 14:04"
function parseHeaderMetaLine(line: string): {
  batchStatus: string | null
  headerItemCount: number | null
  exchangeRateText: string | null
  exchangeRateYuanPerUsd: number | null
  generatedAt: string | null
} {
  const result = {
    batchStatus: null as string | null,
    headerItemCount: null as number | null,
    exchangeRateText: null as string | null,
    exchangeRateYuanPerUsd: null as number | null,
    generatedAt: null as string | null,
  }
  const statusMatch = line.match(/Status:\s*([^|]+)/i)
  if (statusMatch) result.batchStatus = statusMatch[1].trim()
  const itemsMatch = line.match(/(\d+)\s+items?/i)
  if (itemsMatch) result.headerItemCount = parseInt(itemsMatch[1], 10)
  const rateMatch = line.match(/Exchange Rate:\s*([^|]+)/i)
  if (rateMatch) {
    result.exchangeRateText = rateMatch[1].trim()
    const numMatch = result.exchangeRateText.match(/([\d.]+)/)
    if (numMatch) result.exchangeRateYuanPerUsd = parseFloat(numMatch[1])
  }
  const generatedMatch = line.match(/Generated:\s*([^|]+)/i)
  if (generatedMatch) result.generatedAt = generatedMatch[1].trim()
  return result
}

const SUMMARY_LABELS: Record<string, 'totalLandedCost' | 'totalProjectedSelling' | 'totalProjectedProfit' | 'profitMarginPct'> = {
  'Total Inventory Landed Cost (US$)': 'totalLandedCost',
  'Total Projected Selling Price (US$)': 'totalProjectedSelling',
  'Total Projected Profit (US$)': 'totalProjectedProfit',
  'Profit Margin (%)': 'profitMarginPct',
}

/**
 * Parses a "Container Batch" .xlsx export (post-clearance economics: unit/
 * clearance/shipping cost breakdown, landed cost, est. selling price,
 * tracking#/order# reconciliation) — see MBM-300 plan for the full row-shape
 * analysis this is built against (parent tracking-summary rows vs. indented
 * child order rows vs. self-contained matched rows, and the `_p1`/`_p2`
 * split-shipment edge case).
 */
export async function parseContainerBatchXlsx(buffer: Buffer): Promise<ParsedContainerBatch> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })

  // Find the sheet whose header row actually looks like this format,
  // rather than assuming a fixed sheet name or row offset.
  let headerRowIndex = -1
  let allRows: any[][] = []
  for (const sheetName of wb.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null })
    const idx = rows.findIndex(r => REQUIRED_HEADERS.every(h => r.some(c => String(c ?? '').trim() === h)))
    if (idx !== -1) {
      headerRowIndex = idx
      allRows = rows
      break
    }
  }
  if (headerRowIndex === -1) {
    throw new Error('Could not find a header row containing Tracking #, Order #, and Product columns — is this a Container Batch export?')
  }

  // Batch title — first non-empty row above the header, first cell.
  let sourceBatchTitle: string | null = null
  let headerMeta = parseHeaderMetaLine('')
  let totalLandedCost: number | null = null
  let totalProjectedSelling: number | null = null
  let totalProjectedProfit: number | null = null
  let profitMarginPct: string | null = null

  for (let i = 0; i < headerRowIndex; i++) {
    const rowArr = allRows[i] ?? []
    const col0 = cleanStr(rowArr[0])
    if (!col0) continue
    if (sourceBatchTitle === null && !col0.match(/^(Status:|Total |Profit Margin|Based on)/i)) {
      sourceBatchTitle = col0
      continue
    }
    if (/^Status:/i.test(col0)) {
      headerMeta = parseHeaderMetaLine(col0)
      continue
    }
    const summaryKey = SUMMARY_LABELS[col0]
    if (summaryKey) {
      const value = cleanStr(rowArr.find((c, idx) => idx > 0 && cleanStr(c) !== null))
      if (summaryKey === 'profitMarginPct') {
        profitMarginPct = value
      } else {
        const num = parseDecimal(value)
        if (summaryKey === 'totalLandedCost') totalLandedCost = num
        else if (summaryKey === 'totalProjectedSelling') totalProjectedSelling = num
        else if (summaryKey === 'totalProjectedProfit') totalProjectedProfit = num
      }
    }
  }

  const get = buildColumnLookup(allRows[headerRowIndex])
  const imagesByRow = await extractImagesFromXlsx(buffer)

  const rows: ParsedContainerBatchRow[] = []
  let currentTracking: string | null = null

  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i]
    if (!row || row.every(c => c === null || c === '')) continue

    const productRaw = cleanStr(get(row, 'Product'))
    if (!productRaw) continue // footer/blank rows

    const trackingCell = cleanStr(get(row, 'Tracking #'))
    if (trackingCell) currentTracking = trackingCell
    const effectiveTracking = trackingCell ?? currentTracking

    let orderNumber = cleanStr(get(row, 'Order #'))
    let parcelSuffix: string | null = null
    if (orderNumber) {
      const parcelMatch = orderNumber.match(/^(.*)_p(\d+)$/)
      if (parcelMatch) {
        orderNumber = parcelMatch[1]
        parcelSuffix = `_p${parcelMatch[2]}`
      }
    }

    const landedCost = parseDecimal(get(row, 'Landed Cost (US$)'))
    const { marginPct, sellingPrice } = parseSellingPriceCell(get(row, 'Est. Selling Price (US$)'))
    const diffRaw = get(row, 'Diff')
    const diffQty = diffRaw === '✓' ? 0 : parseInt2(diffRaw)

    rows.push({
      rowIndex: i + 1,
      isLineItem: landedCost !== null,
      trackingNumber: effectiveTracking,
      orderNumber,
      parcelSuffix,
      productName: stripIndentMarker(productRaw),
      unitCost: parseDecimal(get(row, 'Unit Cost (US$)')),
      clearancePerUnit: parseDecimal(get(row, 'Clearance/Unit (US$)')),
      shippingPerUnit: parseDecimal(get(row, 'Shipping/Unit (US$)')),
      landedCost,
      estSellingPrice: sellingPrice,
      estMarginPct: marginPct,
      orderedQty: parseInt2(get(row, 'Ordered')),
      batchQty: parseInt2(get(row, 'Batch Qty')),
      diffQty,
      cbm: parseDecimal(get(row, 'CBM')),
      weightKg: parseDecimal(get(row, 'Wt (kg)')),
      matchStatus: cleanStr(get(row, 'Match')),
    })
  }

  return {
    sourceBatchTitle,
    batchStatus: headerMeta.batchStatus,
    headerItemCount: headerMeta.headerItemCount,
    exchangeRateText: headerMeta.exchangeRateText,
    exchangeRateYuanPerUsd: headerMeta.exchangeRateYuanPerUsd,
    generatedAt: headerMeta.generatedAt,
    totalLandedCost,
    totalProjectedSelling,
    totalProjectedProfit,
    profitMarginPct,
    totalRowsInFile: rows.length,
    rows,
    imagesByRow,
  }
}
