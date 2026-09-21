/**
 * Shared types + small presentational bits between the full-page Daily
 * Detail report (src/app/reports/daily-detail/page.tsx) and the dashboard's
 * modal version (src/components/dashboard/daily-detail-modal.tsx) — both
 * render the exact same GET /api/business/[businessId]/daily-detail
 * response, just in a page vs. a modal shell.
 */

export type FilterTab = 'all' | 'sales' | 'expenses' | 'setaside'

export interface SaleRow {
  id: string
  orderNumber: string | null
  time: string
  amount: number
  paymentMethod: string
  servedBy: string | null
  businessName: string | null
  items: { label: string; qty: number; unitPrice: number }[]
}

export interface ExpenseRow {
  id: string
  expenseAccountId: string
  time: string
  amount: number
  payee: string | null
  description: string | null
  paymentChannel: string | null
  category: string | null
  subcategory: string | null
  status: string | null
  createdBy: string | null
  businessName: string | null
}

export interface SetAsideRow {
  id: string
  time: string
  amount: number
  purpose: string
  entryType: string
  createdBy: string | null
  businessName: string | null
}

export interface DailyDetail {
  date: string
  summary: {
    totalSales: number
    totalExpenses: number
    totalSetAside: number
    orderCount: number
    expenseCount: number
    setAsideCount: number
  }
  sales: SaleRow[]
  expenses: ExpenseRow[]
  setAside: SetAsideRow[]
}

export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null
  const map: Record<string, string> = {
    PAID: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    SUBMITTED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    APPROVED: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    PENDING_APPROVAL: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    QUEUED: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }
  const cls = map[status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
  const label = status.replace('_', ' ')
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{label}</span>
}

export function PaymentBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    CASH: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    ECOCASH: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    CARD: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    TRANSFER: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  }
  const cls = map[method.toUpperCase()] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {method}
    </span>
  )
}

/** Adds `days` to a YYYY-MM-DD date string, staying entirely in local-time
 * arithmetic — mixing this with `.toISOString()` (UTC) to extract the
 * result breaks for any timezone with a non-zero offset (e.g. a server/
 * browser running under Africa/Harare, UTC+2: local midnight of "tomorrow"
 * still falls on UTC "today", so `next` silently no-ops and `prev` skips 2
 * days instead of 1). Local getters in, local getters out avoids that. */
export function shiftDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Today's date as YYYY-MM-DD in local time — same local-getters approach,
 * not `.toISOString()`, for the same reason as shiftDateString above. */
export function todayDateString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`
}

const RECORDER_COLORS = [
  'text-blue-600 dark:text-blue-400',
  'text-violet-600 dark:text-violet-400',
  'text-teal-600 dark:text-teal-400',
  'text-orange-600 dark:text-orange-400',
  'text-pink-600 dark:text-pink-400',
  'text-indigo-600 dark:text-indigo-400',
  'text-amber-600 dark:text-amber-400',
  'text-cyan-600 dark:text-cyan-400',
]

export function buildRecorderColorMap(expenses: { createdBy: string | null }[]): Map<string, string> {
  const map = new Map<string, string>()
  let idx = 0
  for (const e of expenses) {
    if (e.createdBy && !map.has(e.createdBy)) {
      map.set(e.createdBy, RECORDER_COLORS[idx % RECORDER_COLORS.length])
      idx++
    }
  }
  return map
}
