'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PURPOSE_STYLES: Record<string, string> = {
  Lodging:     'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  Meals:       'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  Incidentals: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  Travel:      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Other:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function PerDiemListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const confirm = useConfirm()
  const { currentBusinessId, currentBusiness, isAuthenticated } = useBusinessPermissionsContext()

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    // Check admin status via session role
    setIsAdmin((session?.user as any)?.role === 'admin')
  }, [session, status, router])

  const fetchEntries = useCallback(async () => {
    if (!currentBusinessId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ businessId: currentBusinessId, payrollMonth: String(month), payrollYear: String(year) })
      const res = await fetch(`/api/per-diem/entries?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setEntries(json.data.entries)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId, month, year, toast])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function handleDelete(entryId: string) {
    const ok = await confirm({ title: 'Delete Entry', description: 'Are you sure you want to delete this per diem entry? This cannot be undone.' })
    if (!ok) return
    try {
      const res = await fetch(`/api/per-diem/entries/${entryId}`, { method: 'DELETE', credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete')
      toast.push('Entry deleted', { type: 'success' })
      fetchEntries()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  // Group entries by employee
  const byEmployee: Record<string, { employee: any; entries: any[]; total: number }> = {}
  entries.forEach(e => {
    if (!byEmployee[e.employeeId]) {
      byEmployee[e.employeeId] = { employee: e.employee, entries: [], total: 0 }
    }
    byEmployee[e.employeeId].entries.push(e)
    byEmployee[e.employeeId].total += e.amount
  })
  const groups = Object.values(byEmployee)
  const grandTotal = entries.reduce((s, e) => s + e.amount, 0)

  return (
    <ContentLayout title="Per Diem">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Per Diem</h1>
            {currentBusiness && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>}
          </div>
          <div className="flex gap-2">
            <Link href="/employees/per-diem/request-form" className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
              🖨 Request Form
            </Link>
            <Link href="/employees/per-diem/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + New Entry
            </Link>
          </div>
        </div>

        {/* Period filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500">
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Summary bar */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Employees', value: groups.length, color: 'text-blue-700 dark:text-blue-400' },
              { label: 'Total Entries', value: entries.length, color: 'text-gray-900 dark:text-gray-100' },
              { label: 'Total Amount', value: fmt(grandTotal), color: 'text-green-600 dark:text-green-400' },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Entries grouped by employee */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-gray-500 dark:text-gray-400">No per diem entries for {MONTHS[month - 1]} {year}</p>
            <Link href="/employees/per-diem/new" className="mt-4 inline-block text-blue-600 dark:text-blue-400 text-sm hover:underline">Add the first entry</Link>
          </div>
        ) : groups.map(group => (
          <div key={group.employee.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Employee header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{group.employee.fullName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{group.employee.employeeNumber}{group.employee.jobTitle ? ` · ${group.employee.jobTitle}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{fmt(group.total)}</span>
                <Link
                  href={`/employees/per-diem/${group.employee.id}/form?payrollMonth=${month}&payrollYear=${year}&businessId=${currentBusinessId}`}
                  className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Print Form
                </Link>
              </div>
            </div>
            {/* Entry rows */}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Purpose</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Notes</th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600 dark:text-gray-400">Amount</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600 dark:text-gray-400">Entered by</th>
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {group.entries.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PURPOSE_STYLES[e.purpose] || PURPOSE_STYLES.Other}`}>{e.purpose}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-xs truncate">{e.notes || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-gray-900 dark:text-gray-100">{fmt(e.amount)}</td>
                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{e.cashier?.name || '—'}</td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 dark:text-red-400 hover:underline">Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </ContentLayout>
  )
}
