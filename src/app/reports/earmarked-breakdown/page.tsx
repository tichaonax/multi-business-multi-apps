'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ListSearchFilterBar } from '@/components/ui/list-search-filter-bar'

interface EarmarkedRow {
  businessId: string
  businessName: string
  businessType: string
  purpose: string
  entryType: string
  lifetimeContributed: number
  lifetimeDisbursed: number
  stillAvailable: number
}

const money = (n: number) => `$${n.toFixed(2)}`

/**
 * Drill-down for the homepage business cards' "🔒 Earmarked" badge — the
 * per-purpose, per-business breakdown of what's still set aside and not yet
 * disbursed, same MBM-299 search + mobile-card/desktop-table template as
 * every other report.
 */
export default function EarmarkedBreakdownPage() {
  const searchParams = useSearchParams()
  const businessType = searchParams.get('businessType')
  const returnTo = searchParams.get('returnTo')

  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<EarmarkedRow[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ ...(businessType ? { businessType } : {}) })
      const res = await fetch(`/api/reports/earmarked-breakdown?${params}`)
      const json = await res.json()
      if (json.success) { setRows(json.data); setTotal(json.total) }
      else setError(json.error ?? 'Failed to load report')
    } catch {
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [businessType])

  useEffect(() => { load() }, [load])

  const q = search.toLowerCase().trim()
  const filtered = (rows ?? []).filter(r =>
    !q ||
    r.purpose.toLowerCase().includes(q) ||
    r.businessName.toLowerCase().includes(q) ||
    r.businessType.toLowerCase().includes(q)
  )
  const filteredTotal = filtered.reduce((s, r) => s + r.stillAvailable, 0)

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="p-4 md:p-6 pb-0">
        <Link href={returnTo || '/dashboard'} className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary hover:underline mb-2">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-primary">🔒 Earmarked Breakdown{businessType ? ` — ${businessType.charAt(0).toUpperCase()}${businessType.slice(1)}` : ''}</h1>
        <p className="text-sm text-secondary mt-0.5">Cash still in the box but reserved for allocation or payroll funding, not yet disbursed.</p>
      </div>

      <div className="sticky top-14 sm:top-16 z-20 bg-gray-50 dark:bg-gray-900 pt-3 pb-2 px-4 md:px-6 no-print">
        <ListSearchFilterBar
          onSearchChange={setSearch}
          searchLoading={loading}
          searchPlaceholder="Search by purpose or business…"
        />
      </div>

      <div className="px-4 md:px-6 pb-4">
        <div className="mb-4">
          <div className="inline-block bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-secondary">Still earmarked</p>
            <p className="text-2xl font-bold text-amber-600">{money(q ? filteredTotal : total)}</p>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 mb-4">{error}</div>}
        {loading && <div className="text-center py-12 text-secondary">Loading…</div>}

        {!loading && rows && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border">
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">Nothing currently earmarked.</div>
              ) : (
                filtered.map((r, i) => (
                  <div key={`${r.businessId}-${r.purpose}-${i}`} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-primary">{r.purpose}</p>
                      <p className="font-semibold text-amber-600">{money(r.stillAvailable)}</p>
                    </div>
                    <p className="text-xs text-secondary">{r.businessName}</p>
                    <p className="text-[10px] text-secondary">Contributed {money(r.lifetimeContributed)} · Disbursed {money(r.lifetimeDisbursed)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="hidden sm:block overflow-x-auto">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-secondary text-sm">Nothing currently earmarked.</div>
              ) : (
                <table className="w-full text-sm border-separate border-spacing-0">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wide">
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Purpose</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-left">Business</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Lifetime Contributed</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Lifetime Disbursed</th>
                      <th className="bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-right">Still Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((r, i) => (
                      <tr key={`${r.businessId}-${r.purpose}-${i}`}>
                        <td className="px-3 py-2.5 text-primary">{r.purpose}</td>
                        <td className="px-3 py-2.5 text-secondary">{r.businessName}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{money(r.lifetimeContributed)}</td>
                        <td className="px-3 py-2.5 text-right text-secondary">{money(r.lifetimeDisbursed)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-amber-600">{money(r.stillAvailable)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
