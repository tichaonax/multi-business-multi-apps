'use client'

/**
 * MBM-329 — Sample Offers report: free samples issued, their return-purchase
 * offers, redemptions, substitutions, resulting sales and conversion.
 * Issue dates and redemption dates are filtered separately.
 */
export const dynamic = 'force-dynamic'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { generateBarcodeEscPos } from '@/lib/printing/card-print-utils'
import { generateSampleOfferReceipt } from '@/lib/printing/receipt-templates'
import { useToastContext } from '@/components/ui/toast'
import { useSession } from 'next-auth/react'
import { getLocalPrintTargets, printRawEscPos, PrintTarget } from '@/lib/printing/raw-escpos-dispatch'

type Status = 'VALID' | 'EXPIRED' | 'REDEEMED' | 'VOIDED'
interface Row {
  id: string
  offerCode: string
  customer: { id: string; name: string; customerNumber: string }
  customerPhone: string
  sampledProductId: string
  sampledProductName: string
  issuedAt: string
  expiresAt: string
  salesperson: { id: string | null; name: string }
  issuedOrder: { orderNumber: string; voided: boolean } | null
  promisedItems: Array<{ name: string; quantity: number; suppliedName: string | null }>
  status: Status
  redeemedAt: string | null
  redemptionOrder: { orderNumber: string; orderTotal: number; voided: boolean; voidedAt: string | null; refundAmount: number | null; voidReason: string | null } | null
  itemsSupplied: Array<{ name: string; quantity: number; unitPrice: number; total: number; role: string; substitutedFrom: string | null }>
  substitutions: Array<{ id: string; lineRole: 'PAID' | 'FREE'; originalProductName: string; substituteProductName: string; substituteUnitPrice: number; customerAccepted: boolean; acceptedAt: string; processedBy: string; redemptionOrderNumber: string | null }>
  promotedSales: number
  substituteSales: number
}

const STATUS_BADGE: Record<Status, { text: string; cls: string }> = {
  VALID: { text: 'Valid', cls: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  EXPIRED: { text: 'Expired', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  REDEEMED: { text: 'Redeemed', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  VOIDED: { text: 'Redeemed — sale voided', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' },
}
const TABS = ['Summary', 'Offers', 'Substitutions', 'By menu item', 'By salesperson', 'Customer conversion'] as const
type Tab = typeof TABS[number]

const money = (n: number) => `$${n.toFixed(2)}`
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—')
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')
const selCls = 'px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const thCls = 'px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300'
const tdCls = 'px-3 py-2 text-sm text-gray-800 dark:text-gray-200 align-top'

function defaultRange(): DateRange {
  const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 30)
  return { start, end }
}

function groupStats(rows: Row[], keyOf: (r: Row) => string, labelOf: (r: Row) => string) {
  const m = new Map<string, { label: string; issued: number; redeemed: number; retainedSales: number; voidedSales: number }>()
  for (const r of rows) {
    const k = keyOf(r)
    if (!m.has(k)) m.set(k, { label: labelOf(r), issued: 0, redeemed: 0, retainedSales: 0, voidedSales: 0 })
    const g = m.get(k)!
    g.issued++
    if (r.status === 'REDEEMED') { g.redeemed++; g.retainedSales += r.promotedSales + r.substituteSales }
    if (r.status === 'VOIDED') g.voidedSales += r.promotedSales + r.substituteSales
  }
  return Array.from(m.values()).sort((a, b) => b.issued - a.issued)
}

export default function SampleOffersReportPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const toast = useToastContext()
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>('Summary')
  const [issuedAllTime, setIssuedAllTime] = useState(true)
  const [issuedRange, setIssuedRange] = useState<DateRange>(defaultRange)
  const [redeemedAllTime, setRedeemedAllTime] = useState(true)
  const [redeemedRange, setRedeemedRange] = useState<DateRange>(defaultRange)
  const [status, setStatus] = useState('')
  const [substitution, setSubstitution] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [productId, setProductId] = useState('')
  const [salespersonId, setSalespersonId] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [printers, setPrinters] = useState<PrintTarget[]>([])
  const [printerId, setPrinterId] = useState('')

  const load = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ businessId: currentBusinessId })
    const addRange = (r: DateRange, from: string, to: string) => {
      const s = new Date(r.start); s.setHours(0, 0, 0, 0)
      const e = new Date(r.end); e.setHours(23, 59, 59, 999)
      qs.set(from, s.toISOString()); qs.set(to, e.toISOString())
    }
    if (!issuedAllTime) addRange(issuedRange, 'issuedFrom', 'issuedTo')
    if (!redeemedAllTime) addRange(redeemedRange, 'redeemedFrom', 'redeemedTo')
    if (status) qs.set('status', status)
    if (substitution) qs.set('substitution', substitution)
    try {
      const res = await fetch(`/api/restaurant/reports/sample-offers?${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load'); setRows([])
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, issuedAllTime, issuedRange, redeemedAllTime, redeemedRange, status, substitution])

  useEffect(() => { load() }, [load])
  // Same printer choices as the receipt preview modal: local USB, QZ Tray, then network/agent printers
  const userId = (session?.user as any)?.id as string | undefined
  useEffect(() => {
    if (!currentBusinessId) return
    let cancelled = false
    ;(async () => {
      const local = await getLocalPrintTargets()
      const network: PrintTarget[] = await fetch('/api/printers?printerType=receipt&isOnline=true')
        .then(r => r.json())
        .then(d => ((d.printers || d.data || []) as any[]).map(p => ({ id: p.id, label: p.printerName || p.name })))
        .catch(() => [])
      if (cancelled) return
      const all = [...local, ...network]
      setPrinters(all)
      // Default to the printer last chosen in the receipt preview modal for this business
      const key = userId ? `lastSelectedPrinterId-${userId}-${currentBusinessId}` : `lastSelectedPrinterId-${currentBusinessId}`
      let last: string | null = null
      try { last = localStorage.getItem(key) } catch { /* ignore */ }
      setPrinterId(all.find(p => p.id === last)?.id || all[0]?.id || '')
    })()
    return () => { cancelled = true }
  }, [currentBusinessId, userId])

  // Dropdown options come from the loaded rows; these three filters are applied client-side
  const options = useMemo(() => {
    const uniq = (pairs: Array<[string, string]>) => Array.from(new Map(pairs).entries()).sort((a, b) => a[1].localeCompare(b[1]))
    return {
      customers: uniq(rows.map(r => [r.customer.id, `${r.customer.name} (${r.customer.customerNumber})`])),
      products: uniq(rows.map(r => [r.sampledProductId, r.sampledProductName])),
      salespeople: uniq(rows.filter(r => r.salesperson.id).map(r => [r.salesperson.id!, r.salesperson.name])),
    }
  }, [rows])
  const filtered = useMemo(() => rows.filter(r =>
    (!customerId || r.customer.id === customerId) &&
    (!productId || r.sampledProductId === productId) &&
    (!salespersonId || r.salesperson.id === salespersonId)
  ), [rows, customerId, productId, salespersonId])

  const summary = useMemo(() => {
    const count = (s: Status) => filtered.filter(r => r.status === s).length
    const redeemedRows = filtered.filter(r => r.status === 'REDEEMED')
    const voidedRows = filtered.filter(r => r.status === 'VOIDED')
    return {
      issued: filtered.length,
      valid: count('VALID'),
      expired: count('EXPIRED'),
      redeemed: redeemedRows.length,
      voided: voidedRows.length,
      promotedSales: redeemedRows.reduce((s, r) => s + r.promotedSales, 0),
      substituteSales: redeemedRows.reduce((s, r) => s + r.substituteSales, 0),
      voidedSales: voidedRows.reduce((s, r) => s + r.promotedSales + r.substituteSales, 0),
      substitutions: filtered.reduce((s, r) => s + r.substitutions.length, 0),
    }
  }, [filtered])

  const reprint = async (row: Row) => {
    if (!printerId) { toast.error('Select a receipt printer first.'); return }
    try {
      const res = await fetch(`/api/restaurant/sample-offers/${row.id}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Offer not found')
      const barcodeEscPos = await generateBarcodeEscPos(json.data.offerCode).catch(() => undefined)
      const esc = generateSampleOfferReceipt({ ...json.data, barcodeEscPos, isReprint: true })
      await printRawEscPos(printerId, esc, currentBusinessId!)
      toast.push('Sample receipt sent to printer.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reprint failed')
    }
  }

  if (currentBusiness && currentBusiness.businessType !== 'restaurant') {
    return <div className="p-6 text-gray-600 dark:text-gray-300">This report is available for restaurants only.</div>
  }

  const conversionCustomers = groupStats(filtered, r => r.customer.id, r => `${r.customer.name} (${r.customer.customerNumber})`)

  return (
    <div className="min-h-screen page-background p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🎁 Sample Offers</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Free samples given, return-purchase offers redeemed, substitutions and resulting sales.</p>
          </div>
          <Link href="/restaurant/reports" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">← Reports</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Sample issued date</div>
            <DateRangeSelector value={issuedRange} onChange={setIssuedRange} showAllTime allTime={issuedAllTime} onAllTimeChange={setIssuedAllTime} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Offer redeemed date</div>
            <DateRangeSelector value={redeemedRange} onChange={setRedeemedRange} showAllTime allTime={redeemedAllTime} onAllTimeChange={setRedeemedAllTime} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select className={selCls} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="VALID">Valid (unredeemed)</option>
            <option value="EXPIRED">Expired without redemption</option>
            <option value="REDEEMED">Redeemed</option>
            <option value="VOIDED">Redeemed — sale voided/refunded</option>
          </select>
          <select className={selCls} value={substitution} onChange={e => setSubstitution(e.target.value)}>
            <option value="">Any substitution status</option>
            <option value="none">No substitutions</option>
            <option value="any">With substitutions</option>
            <option value="paid">Paid-item substitution</option>
            <option value="free">Free-item substitution</option>
          </select>
          <select className={selCls} value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">All customers</option>
            {options.customers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select className={selCls} value={productId} onChange={e => setProductId(e.target.value)}>
            <option value="">All menu items</option>
            {options.products.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select className={selCls} value={salespersonId} onChange={e => setSalespersonId(e.target.value)}>
            <option value="">All salespeople</option>
            {options.salespeople.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm rounded-t-md ${tab === t ? 'bg-white dark:bg-gray-800 font-semibold text-teal-700 dark:text-teal-300 border border-b-0 border-gray-200 dark:border-gray-700' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading…</p>
        ) : error ? (
          <p className="text-center text-red-600 py-10">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10">No sample offers match these filters.</p>
        ) : (
          <>
            {tab === 'Summary' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Samples issued', String(summary.issued)],
                  ['Redeemed', String(summary.redeemed)],
                  ['Conversion rate', pct(summary.redeemed, summary.issued)],
                  ['Still valid', String(summary.valid)],
                  ['Expired unredeemed', String(summary.expired)],
                  ['Redeemed then voided/refunded', String(summary.voided)],
                  ['Retained sales — promoted items', money(summary.promotedSales)],
                  ['Retained sales — accepted substitutes', money(summary.substituteSales)],
                  ['Voided/refunded redemption sales', money(summary.voidedSales)],
                  ['Substitutions recorded', String(summary.substitutions)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                  </div>
                ))}
                <p className="col-span-full text-xs text-gray-500 dark:text-gray-400">
                  Conversion rate = redeemed offers ÷ issued offers (sales later voided or refunded are not counted as redeemed). Voided/refunded sales are shown separately and never added to retained sales.
                </p>
              </div>
            )}

            {tab === 'Offers' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <div className="flex items-center gap-2 p-3 text-sm text-gray-600 dark:text-gray-300">
                  Reprint printer:
                  <select className={selCls} value={printerId} onChange={e => setPrinterId(e.target.value)}>
                    {printers.length === 0 && <option value="">No receipt printers found (USB, QZ Tray or network)</option>}
                    {printers.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/60">
                    <tr>
                      {['Customer', 'Sampled item', 'Issued', 'Salesperson', 'Promised free items', 'Status', 'Expires / Redeemed', ''].map(h => <th key={h} className={thCls}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filtered.map(r => {
                      const open = !!expanded[r.id]
                      return (
                        <Fragment key={r.id}>
                          <tr className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={() => setExpanded(e => ({ ...e, [r.id]: !open }))}>
                            <td className={tdCls}>{open ? '▾' : '▸'} {r.customer.name}<div className="text-xs text-gray-500">{r.customer.customerNumber} · {r.customerPhone}</div></td>
                            <td className={tdCls}>{r.sampledProductName}<div className="text-xs text-gray-500">{r.offerCode}</div></td>
                            <td className={tdCls}>{dt(r.issuedAt)}<div className="text-xs text-gray-500">Order {r.issuedOrder?.orderNumber}{r.issuedOrder?.voided ? ' (issuing order voided)' : ''}</div></td>
                            <td className={tdCls}>{r.salesperson.name}</td>
                            <td className={tdCls}>{r.promisedItems.length ? r.promisedItems.map(p => `${p.quantity > 1 ? `${p.quantity} x ` : ''}${p.name}`).join(', ') : '—'}</td>
                            <td className={tdCls}>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[r.status].cls}`}>{STATUS_BADGE[r.status].text}</span>
                              {r.substitutions.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">substituted</span>}
                            </td>
                            <td className={tdCls}>{r.redeemedAt ? `Redeemed ${dt(r.redeemedAt)}` : `Expires ${dt(r.expiresAt)}`}</td>
                            <td className={tdCls}>
                              <button onClick={e => { e.stopPropagation(); reprint(r) }} className="text-xs text-teal-700 dark:text-teal-300 underline">Reprint</button>
                            </td>
                          </tr>
                          {open && (
                            <tr className="bg-gray-50 dark:bg-gray-900/40">
                              <td colSpan={8} className="px-6 py-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                                {r.redemptionOrder ? (
                                  <>
                                    <div>Return purchase: order <strong>{r.redemptionOrder.orderNumber}</strong> ({money(r.redemptionOrder.orderTotal)} total)</div>
                                    <div>Items supplied from the offer:</div>
                                    <ul className="ml-4 list-disc">
                                      {r.itemsSupplied.map((l, i) => (
                                        <li key={i}>{l.quantity} x {l.name} — {l.role === 'FREE_PROMO' ? 'FREE' : money(l.total)}{l.substitutedFrom ? ` (substitute for ${l.substitutedFrom})` : ''}</li>
                                      ))}
                                    </ul>
                                    {r.redemptionOrder.voided && (
                                      <div className="text-rose-700 dark:text-rose-300">
                                        Sale voided/refunded{r.redemptionOrder.voidedAt ? ` on ${dt(r.redemptionOrder.voidedAt)}` : ''}{r.redemptionOrder.refundAmount != null ? ` — refund ${money(r.redemptionOrder.refundAmount)}` : ''}{r.redemptionOrder.voidReason ? ` (${r.redemptionOrder.voidReason})` : ''}. The offer stays consumed.
                                      </div>
                                    )}
                                  </>
                                ) : <div>Not redeemed yet.</div>}
                                {r.substitutions.map(s => (
                                  <div key={s.id}>Substitution ({s.lineRole === 'PAID' ? 'paid item' : 'free item'}): {s.originalProductName} → {s.substituteProductName}{s.lineRole === 'PAID' ? ` at ${money(s.substituteUnitPrice)}` : ' (free)'} · customer accepted · by {s.processedBy}</div>
                                ))}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'Substitutions' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/60">
                    <tr>{['Date', 'Customer', 'Original item', 'Substitute', 'Type', 'Accepted', 'Processed by', 'Redemption order'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filtered.flatMap(r => r.substitutions.map(s => (
                      <tr key={s.id}>
                        <td className={tdCls}>{dt(s.acceptedAt)}</td>
                        <td className={tdCls}>{r.customer.name}</td>
                        <td className={tdCls}>{s.originalProductName}</td>
                        <td className={tdCls}>{s.substituteProductName}</td>
                        <td className={tdCls}>{s.lineRole === 'PAID' ? `Paid (${money(s.substituteUnitPrice)})` : 'Free'}</td>
                        <td className={tdCls}>{s.customerAccepted ? 'Yes' : 'No'}</td>
                        <td className={tdCls}>{s.processedBy}</td>
                        <td className={tdCls}>{s.redemptionOrderNumber || '—'}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
                {summary.substitutions === 0 && <p className="p-4 text-sm text-gray-500">No substitutions for these offers.</p>}
              </div>
            )}

            {(tab === 'By menu item' || tab === 'By salesperson' || tab === 'Customer conversion') && (() => {
              const groups = tab === 'By menu item'
                ? groupStats(filtered, r => r.sampledProductId, r => r.sampledProductName)
                : tab === 'By salesperson'
                  ? groupStats(filtered, r => r.salesperson.id || 'unknown', r => r.salesperson.name)
                  : conversionCustomers
              const label = tab === 'By menu item' ? 'Sampled menu item' : tab === 'By salesperson' ? 'Issuing salesperson' : 'Customer'
              return (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                  {tab === 'Customer conversion' && (
                    <p className="p-3 text-sm text-gray-600 dark:text-gray-300">
                      {conversionCustomers.filter(c => c.redeemed > 0).length} of {conversionCustomers.length} customers who received samples came back and completed a purchase with their offer ({pct(conversionCustomers.filter(c => c.redeemed > 0).length, conversionCustomers.length)}).
                    </p>
                  )}
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/60">
                      <tr>{[label, 'Samples issued', 'Offers redeemed', 'Conversion', 'Retained sales', 'Voided/refunded sales'].map(h => <th key={h} className={thCls}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {groups.map(g => (
                        <tr key={g.label}>
                          <td className={tdCls}>{g.label}</td>
                          <td className={tdCls}>{g.issued}</td>
                          <td className={tdCls}>{g.redeemed}</td>
                          <td className={tdCls}>{pct(g.redeemed, g.issued)}</td>
                          <td className={tdCls}>{money(g.retainedSales)}</td>
                          <td className={tdCls}>{g.voidedSales > 0 ? money(g.voidedSales) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
