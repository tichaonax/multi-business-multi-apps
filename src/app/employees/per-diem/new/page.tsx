'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PURPOSES = ['Lodging', 'Meals', 'Incidentals', 'Travel', 'Other'] as const

interface EntryRow {
  id: number
  date: string
  amount: string
  purpose: string
  notes: string
}

let rowCounter = 0
function newRow(defaultDate: string): EntryRow {
  return { id: ++rowCounter, date: defaultDate, amount: '', purpose: 'Meals', notes: '' }
}

export default function PerDiemBatchEntryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId } = useBusinessPermissionsContext()

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [employeeId, setEmployeeId] = useState('')
  const [employees, setEmployees] = useState<any[]>([])
  const [rows, setRows] = useState<EntryRow[]>([newRow(todayStr)])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
  }, [session, status, router])

  const fetchEmployees = useCallback(async () => {
    if (!currentBusinessId) return
    try {
      const res = await fetch(`/api/employees?businessId=${currentBusinessId}&isActive=true`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load employees')
      const list = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : [])
      setEmployees(list)
      if (list.length > 0) setEmployeeId(list[0].id)
    } catch (e: any) {
      toast.error(e.message)
    }
  }, [currentBusinessId, toast])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  function addRow() {
    setRows(r => [...r, newRow(todayStr)])
  }

  function removeRow(id: number) {
    setRows(r => r.length === 1 ? r : r.filter(row => row.id !== id))
  }

  function updateRow(id: number, field: keyof EntryRow, value: string) {
    setRows(r => r.map(row => row.id === id ? { ...row, [field]: value } : row))
  }

  async function handleSubmit() {
    if (!employeeId) { toast.error('Select an employee'); return }
    if (!currentBusinessId) { toast.error('No business selected'); return }

    // Validate rows
    for (const row of rows) {
      if (!row.date) { toast.error('All rows need a date'); return }
      if (!row.amount || isNaN(Number(row.amount)) || Number(row.amount) <= 0) {
        toast.error('All rows need a valid amount greater than 0'); return
      }
      // Check date is within selected month/year
      const d = new Date(row.date + 'T00:00:00')
      if (d.getMonth() + 1 !== month || d.getFullYear() !== year) {
        toast.error(`Date ${row.date} is outside ${MONTHS[month - 1]} ${year}`); return
      }
    }

    setSubmitting(true)
    try {
      const body = {
        employeeId,
        businessId: currentBusinessId,
        payrollMonth: month,
        payrollYear: year,
        entries: rows.map(row => ({
          date: row.date,
          amount: parseFloat(row.amount),
          purpose: row.purpose,
          notes: row.notes || undefined,
        })),
      }
      const res = await fetch('/api/per-diem/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      toast.push(`Saved ${json.data.count} entries — total ${json.data.total}`, { type: 'success' })
      router.push('/employees/per-diem')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

  return (
    <ContentLayout title="New Per Diem Entry">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Per Diem Entry</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter travel allowance for an employee</p>
          </div>
          <Link href="/employees/per-diem" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            ← Back
          </Link>
        </div>

        {/* Employee & Period */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Employee & Period</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Employee</label>
              <select
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {employees.length === 0 && <option value="">No employees found</option>}
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Month</label>
              <select
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Year</label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Entry Rows */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Daily Entries</h2>
          </div>

          {/* Header row */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-400">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Purpose</div>
            <div className="col-span-5">Notes (optional)</div>
            <div className="col-span-1" />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {rows.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <div className="col-span-12 sm:col-span-2">
                  <label className="block sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={row.date}
                    onChange={e => updateRow(row.id, 'date', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="block sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={row.amount}
                    onChange={e => updateRow(row.id, 'amount', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="block sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1">Purpose</label>
                  <select
                    value={row.purpose}
                    onChange={e => updateRow(row.id, 'purpose', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="col-span-11 sm:col-span-5">
                  <label className="block sm:hidden text-xs text-gray-500 dark:text-gray-400 mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    value={row.notes}
                    onChange={e => updateRow(row.id, 'notes', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="text-red-400 hover:text-red-600 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed text-lg leading-none"
                    title="Remove row"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={addRow}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              + Add Row
            </button>
            {totalAmount > 0 && (
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Total: {totalAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </span>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/employees/per-diem" className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={submitting || employees.length === 0}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : `Save ${rows.length} ${rows.length === 1 ? 'Entry' : 'Entries'}`}
          </button>
        </div>
      </div>
    </ContentLayout>
  )
}
