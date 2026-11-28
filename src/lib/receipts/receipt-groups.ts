// MBM-359: Receipt History — the receipts filter (search text + date range),
// shared by /api/universal/receipts/search and /api/universal/receipts/groups,
// and the "Group by" key of a receipt: its day / week / month / year in the
// business's time zone, its salesperson or its payment method. Both APIs use
// the same two functions, so a group's total always matches the receipts it
// opens.
import { prisma } from '@/lib/prisma'

export const RECEIPT_GROUP_BYS = ['day', 'week', 'month', 'year', 'salesperson', 'payment'] as const
export type ReceiptGroupBy = typeof RECEIPT_GROUP_BYS[number]
export const isReceiptGroupBy = (v: string | null | undefined): v is ReceiptGroupBy =>
  !!v && (RECEIPT_GROUP_BYS as readonly string[]).includes(v)

/** The Prisma where clause for the receipts of a business, a search text and a date range */
export async function buildReceiptWhere(businessId: string, query: string, startDate: string | null, endDate: string | null) {
  const whereClause: any = { businessId }

  // Searches receipt #, customer name, salesperson name, order notes, and
  // purchased item names.
  //
  // Customer/salesperson names are NOT reliably on the linked relations:
  // orders made by an admin/owner with no Employees record fall back to
  // attributes.employeeName/soldByName (see /api/universal/orders — it
  // always persists one of these when employeeId can't be resolved), and
  // meal-program orders with no real customer store attributes.participantName
  // instead. Searching only the relations misses most real-world rows, so
  // both the relation AND its JSON-attribute fallback are matched here.
  // Item "description" search walks business_order_items -> the product's
  // name (via its variant), with the same attributes.productName fallback
  // used when an item isn't linked to a real product/variant.
  if (query) {
    const asNumber = parseFloat(query)
    // MBM-338: names kept in JSON attributes (item names, WiFi package names
    // and codes, salesperson fallbacks) were matched case-sensitively by
    // Prisma's string_contains, so e.g. "pass" missed "8 Hour Pass" and
    // "wifi" matched nothing (WiFi items are named "📶 8 Hour Pass"). Match
    // them case-insensitively in SQL; "wifi"/"wi-fi" finds every WiFi sale.
    const like = `%${query.replace(/[\\%_]/g, m => '\\' + m)}%`
    const wantsWifi = /wi-?fi/i.test(query)
    const jsonMatches = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT o.id FROM business_orders o
      LEFT JOIN business_order_items i ON i."orderId" = o.id
      WHERE o."businessId" = ${businessId}
        AND (
          o.attributes->>'employeeName' ILIKE ${like}
          OR o.attributes->>'soldByName' ILIKE ${like}
          OR o.attributes->>'participantName' ILIKE ${like}
          OR i.attributes->>'productName' ILIKE ${like}
          OR i.attributes->>'packageName' ILIKE ${like}
          OR (i.attributes->'tokenCodes')::text ILIKE ${like}
          OR (${wantsWifi} AND (i.attributes->>'r710Token' = 'true' OR i.attributes->>'wifiToken' = 'true'))
        )
      LIMIT 5000`
    whereClause.OR = [
      ...(jsonMatches.length > 0 ? [{ id: { in: jsonMatches.map(r => r.id) } }] : []),
      { orderNumber: { contains: query, mode: 'insensitive' } },
      { notes: { contains: query, mode: 'insensitive' } },
      { business_customers: { name: { contains: query, mode: 'insensitive' } } },
      { employees: { fullName: { contains: query, mode: 'insensitive' } } },
      { attributes: { path: ['employeeName'], string_contains: query } },
      { attributes: { path: ['soldByName'], string_contains: query } },
      { attributes: { path: ['participantName'], string_contains: query } },
      {
        business_order_items: {
          some: {
            OR: [
              { product_variants: { name: { contains: query, mode: 'insensitive' } } },
              { product_variants: { business_products: { name: { contains: query, mode: 'insensitive' } } } },
              { attributes: { path: ['productName'], string_contains: query } },
            ],
          },
        },
      },
      ...(isNaN(asNumber) ? [] : [{ totalAmount: { equals: asNumber } }]),
    ]
  }

  if (startDate || endDate) {
    whereClause.createdAt = {}
    if (startDate) whereClause.createdAt.gte = new Date(startDate)
    if (endDate) whereClause.createdAt.lte = new Date(endDate)
  }
  return whereClause
}

/** The fields groupOf() needs */
export const RECEIPT_GROUP_SELECT = {
  id: true,
  orderNumber: true,
  createdAt: true,
  totalAmount: true,
  status: true,
  paymentMethod: true,
  employeeId: true,
  employees: { select: { fullName: true } },
  attributes: true,
} as const

export interface ReceiptGroupRow {
  id: string
  orderNumber: string
  createdAt: Date
  totalAmount: unknown
  status: string | null
  paymentMethod: string | null
  employeeId: string | null
  employees: { fullName: string } | null
  attributes: unknown
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', ECOCASH: 'EcoCash', MOBILE_MONEY: 'Mobile money', BANK_TRANSFER: 'Bank transfer',
  STORE_CREDIT: 'Store credit', LAYAWAY: 'Layaway', NET_30: 'Net 30', CHECK: 'Cheque',
  EXPENSE_ACCOUNT: 'Expense account', PAYROLL_DEDUCTION: 'Payroll deduction', ADMIN_ISSUED: 'Admin issued',
}

const ymdIn = (d: Date, tz: string) => {
  // en-CA gives YYYY-MM-DD
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const [y, m, day] = s.split('-').map(Number)
  return { y, m, day }
}
const fmt = (y: number, m: number, d: number, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)))
const pad = (n: number) => String(n).padStart(2, '0')

/** A receipt's group: `key` (stable, sortable for dates) and `label` */
export function groupOf(o: ReceiptGroupRow, groupBy: ReceiptGroupBy, tz: string): { key: string; label: string } {
  if (groupBy === 'payment') {
    const p = o.paymentMethod || ''
    return { key: p || '-', label: p ? (PAYMENT_LABEL[p] || p.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())) : 'Not recorded' }
  }
  if (groupBy === 'salesperson') {
    if (o.employeeId) return { key: `e:${o.employeeId}`, label: o.employees?.fullName || 'Unknown' }
    const a = (o.attributes as any) || {}
    const name = (a.employeeName || a.soldByName || '').trim()
    return name ? { key: `n:${name}`, label: name } : { key: '-', label: 'Not recorded' }
  }
  const { y, m, day } = ymdIn(new Date(o.createdAt), tz)
  if (groupBy === 'year') return { key: `${y}`, label: `${y}` }
  if (groupBy === 'month') return { key: `${y}-${pad(m)}`, label: fmt(y, m, 1, { month: 'long', year: 'numeric' }) }
  if (groupBy === 'week') {
    // weeks start on Monday
    const d = new Date(Date.UTC(y, m - 1, day))
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
    const [wy, wm, wd] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]
    return { key: `${wy}-${pad(wm)}-${pad(wd)}`, label: `Week of ${fmt(wy, wm, wd, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}` }
  }
  return { key: `${y}-${pad(m)}-${pad(day)}`, label: fmt(y, m, day, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }
}

/** A valid IANA time zone, else UTC */
export function safeTimeZone(tz: string | null | undefined): string {
  try { if (tz) { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz } } catch { /* invalid */ }
  return 'UTC'
}
