'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { generatePerDiemRequestFormPDF } from '@/lib/pdf-utils'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface Employee {
  id: string
  fullName: string
  employeeNumber: string
  jobTitle?: string | null
}

export default function PerDiemRequestFormPage() {
  const { status } = useSession()

  const now = new Date()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/per-diem/employees', { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) {
        setFetchError(json.error ?? 'Failed to load employees')
        return
      }
      setEmployees(json.data ?? [])
    } catch {
      setFetchError('Network error loading employees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchEmployees()
  }, [status, fetchEmployees])

  const selected = employees.find(e => e.id === selectedId)

  const handleGenerate = (action: 'save' | 'print') => {
    const prefill = selected ? {
      employeeName: selected.fullName,
      employeeNumber: selected.employeeNumber,
      jobTitle: selected.jobTitle ?? undefined,
      month: MONTHS[month - 1],
      year: String(year),
    } : undefined
    generatePerDiemRequestFormPDF(action, prefill)
  }

  const handleBlank = (action: 'save' | 'print') => {
    generatePerDiemRequestFormPDF(action)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 max-w-lg w-full space-y-6">

        <div className="text-center">
          <div className="text-4xl mb-2">🗂️</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Per Diem Request Form</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Optionally select an employee to pre-fill their details, or generate a blank form.
          </p>
        </div>

        {/* Employee selector */}
        <div className="space-y-4">
          {fetchError && (
            <p className="text-xs text-red-500">{fetchError}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Employee <span className="font-normal text-gray-400">(optional)</span></label>
            <SearchableSelect
              options={employees.map(e => ({ value: e.id, label: `${e.fullName} (${e.employeeNumber})` }))}
              value={selectedId}
              onChange={setSelectedId}
              placeholder={loading ? 'Loading employees…' : 'Search employee…'}
              allLabel="— No employee (blank form) —"
            />
          </div>

          {/* Month / Year — only shown when employee is selected */}
          {selectedId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Month</label>
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Year</label>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Primary actions */}
        <div className="space-y-2">
          {selectedId ? (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Pre-filled for <span className="font-semibold text-gray-700 dark:text-gray-300">{selected?.fullName}</span> — {MONTHS[month - 1]} {year}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerate('save')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Save PDF
                </button>
                <button
                  onClick={() => handleGenerate('print')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleBlank('save')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Save Blank PDF
              </button>
              <button
                onClick={() => handleBlank('print')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Blank
              </button>
            </div>
          )}
        </div>

        {/* When employee is selected, still offer blank option */}
        {selectedId && (
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
            <p className="text-xs text-gray-400 mb-2">Or generate a blank form instead:</p>
            <div className="flex gap-2">
              <button onClick={() => handleBlank('save')} className="flex-1 py-1.5 px-3 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs">
                Save Blank
              </button>
              <button onClick={() => handleBlank('print')} className="flex-1 py-1.5 px-3 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-xs">
                Print Blank
              </button>
            </div>
          </div>
        )}

        <a href="/employees/per-diem" className="block text-center text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          ← Back to Per Diem
        </a>
      </div>
    </div>
  )
}
