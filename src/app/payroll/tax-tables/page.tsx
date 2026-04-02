'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'

const TABLE_TYPES = ['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUAL'] as const
type TableType = typeof TABLE_TYPES[number]

interface Bracket {
  id: string
  sortOrder: number
  lowerBound: number
  upperBound: number | null
  rate: number
  deductAmount: number
}

interface Constants {
  year: number
  aidsLevyRate: number
  nssaEmployeeRate: number
  nssaEmployerRate: number
}

interface TaxData {
  year: number
  tableType: string
  years: number[]
  brackets: Bracket[]
  constants: Constants | null
}

export default function TaxTablesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TaxTablesContent />
    </Suspense>
  )
}

function TaxTablesContent() {
  const { data: session } = useSession()
  const canManage = (session?.user as any)?.permissions?.canManagePayroll === true ||
    (session?.user as any)?.role === 'admin'

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedType, setSelectedType] = useState<TableType>('MONTHLY')
  const [data, setData] = useState<TaxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editBrackets, setEditBrackets] = useState<Bracket[]>([])
  const [editConstants, setEditConstants] = useState<Constants | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Live Calculator state
  const [calcGross, setCalcGross] = useState('')
  const [calcBasic, setCalcBasic] = useState('')
  const [calcResult, setCalcResult] = useState<{ paye: number; levy: number; nssa: number; net: number } | null>(null)

  // Add Year state
  const [showAddYear, setShowAddYear] = useState(false)
  const [newYear, setNewYear] = useState('')
  const [addingYear, setAddingYear] = useState(false)
  const [addYearError, setAddYearError] = useState('')

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedType])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/tax-tables?year=${selectedYear}&tableType=${selectedType}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setSelectedYear(json.year)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const startEdit = () => {
    if (!data) return
    setEditBrackets(data.brackets.map(b => ({ ...b })))
    setEditConstants(data.constants ? { ...data.constants } : {
      year: selectedYear,
      aidsLevyRate: 0.03,
      nssaEmployeeRate: 0.045,
      nssaEmployerRate: 0.045,
    })
    setSaveError('')
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
    setSaveError('')
  }

  const saveEdit = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/payroll/tax-tables', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          tableType: selectedType,
          brackets: editBrackets,
          constants: editConstants,
        }),
      })
      if (res.ok) {
        setEditMode(false)
        await fetchData()
      } else {
        const err = await res.json()
        setSaveError(err.error || 'Save failed')
      }
    } catch (e) {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleAddYear = async () => {
    const toYear = parseInt(newYear)
    if (!toYear || isNaN(toYear)) {
      setAddYearError('Enter a valid year')
      return
    }
    setAddingYear(true)
    setAddYearError('')
    try {
      const res = await fetch('/api/payroll/tax-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromYear: selectedYear, toYear }),
      })
      if (res.ok) {
        setShowAddYear(false)
        setNewYear('')
        setSelectedYear(toYear)
      } else {
        const err = await res.json()
        setAddYearError(err.error || 'Failed to add year')
      }
    } catch (e) {
      setAddYearError('Network error')
    } finally {
      setAddingYear(false)
    }
  }

  const runCalculator = () => {
    if (!data?.brackets || !data?.constants) return
    const gross = parseFloat(calcGross) || 0
    const basic = parseFloat(calcBasic) || gross

    // PAYE
    const sorted = [...data.brackets].sort((a, b) => a.sortOrder - b.sortOrder)
    let paye = 0
    for (const b of sorted) {
      if (gross >= b.lowerBound && (b.upperBound === null || gross <= b.upperBound)) {
        paye = Math.max(0, gross * b.rate - b.deductAmount)
        break
      }
    }
    paye = Math.round(paye * 100) / 100

    const levy = Math.round(paye * data.constants.aidsLevyRate * 100) / 100
    const nssa = Math.round(basic * data.constants.nssaEmployeeRate * 100) / 100
    const net = Math.max(0, gross - paye - levy - nssa)

    setCalcResult({ paye, levy, nssa, net: Math.round(net * 100) / 100 })
  }

  const fmt = (n: number) => `$${n.toFixed(2)}`
  const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`

  return (
    <ProtectedRoute>
      <ContentLayout title="📊 Tax Tables" description="ZIMRA PAYE brackets and statutory deduction rates">
        <div className="space-y-6">

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tax Year</label>
              <select
                value={selectedYear}
                onChange={e => { setSelectedYear(Number(e.target.value)); setEditMode(false) }}
                className="border rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600"
              >
                {(data?.years ?? [selectedYear]).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Table Type</label>
              <select
                value={selectedType}
                onChange={e => { setSelectedType(e.target.value as TableType); setEditMode(false) }}
                className="border rounded px-3 py-1.5 text-sm dark:bg-gray-700 dark:border-gray-600"
              >
                {TABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="ml-auto flex gap-2">
              {canManage && !editMode && (
                <>
                  <button
                    onClick={startEdit}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => { setShowAddYear(true); setAddYearError('') }}
                    className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ➕ Add Year
                  </button>
                </>
              )}
              {editMode && (
                <>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : '💾 Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {saveError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">{saveError}</div>
          )}

          {/* Add Year Modal */}
          {showAddYear && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-4 max-w-sm">
              <h3 className="font-semibold mb-3">Add New Tax Year</h3>
              <p className="text-sm text-gray-500 mb-3">
                Copies all brackets and rates from <strong>{selectedYear}</strong> to a new year.
              </p>
              <input
                type="number"
                placeholder="New year (e.g. 2026)"
                value={newYear}
                onChange={e => setNewYear(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-full mb-2 dark:bg-gray-700 dark:border-gray-600"
              />
              {addYearError && <p className="text-red-600 text-xs mb-2">{addYearError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddYear}
                  disabled={addingYear}
                  className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {addingYear ? 'Creating…' : 'Create'}
                </button>
                <button
                  onClick={() => { setShowAddYear(false); setAddYearError('') }}
                  className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Brackets Table */}
            <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b dark:border-gray-700">
                <h2 className="font-semibold">
                  {selectedYear} — {selectedType} PAYE Brackets
                </h2>
              </div>

              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading…</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">From</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">To</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Deduct</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-700">
                      {(editMode ? editBrackets : (data?.brackets ?? [])).map((b, i) => (
                        <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-2 text-gray-400">{b.sortOrder}</td>
                          {editMode ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={b.lowerBound}
                                  onChange={e => {
                                    const updated = [...editBrackets]
                                    updated[i] = { ...updated[i], lowerBound: parseFloat(e.target.value) || 0 }
                                    setEditBrackets(updated)
                                  }}
                                  className="border rounded px-2 py-1 text-xs w-24 text-right dark:bg-gray-700 dark:border-gray-600"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={b.upperBound ?? ''}
                                  placeholder="∞"
                                  onChange={e => {
                                    const updated = [...editBrackets]
                                    const val = e.target.value === '' ? null : parseFloat(e.target.value)
                                    updated[i] = { ...updated[i], upperBound: val }
                                    setEditBrackets(updated)
                                  }}
                                  className="border rounded px-2 py-1 text-xs w-24 text-right dark:bg-gray-700 dark:border-gray-600"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={b.rate}
                                  onChange={e => {
                                    const updated = [...editBrackets]
                                    updated[i] = { ...updated[i], rate: parseFloat(e.target.value) || 0 }
                                    setEditBrackets(updated)
                                  }}
                                  className="border rounded px-2 py-1 text-xs w-20 text-right dark:bg-gray-700 dark:border-gray-600"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={b.deductAmount}
                                  onChange={e => {
                                    const updated = [...editBrackets]
                                    updated[i] = { ...updated[i], deductAmount: parseFloat(e.target.value) || 0 }
                                    setEditBrackets(updated)
                                  }}
                                  className="border rounded px-2 py-1 text-xs w-24 text-right dark:bg-gray-700 dark:border-gray-600"
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-right font-mono">{fmt(b.lowerBound)}</td>
                              <td className="px-3 py-2 text-right font-mono">{b.upperBound !== null ? fmt(b.upperBound) : '∞'}</td>
                              <td className="px-3 py-2 text-right font-mono">{fmtPct(b.rate)}</td>
                              <td className="px-3 py-2 text-right font-mono">{fmt(b.deductAmount)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right column: Constants + Calculator */}
            <div className="space-y-4">
              {/* Constants Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">{selectedYear} Tax Rates</h3>
                {(() => {
                  const c = editMode ? editConstants : data?.constants
                  if (!c) return <p className="text-sm text-gray-500">No constants found</p>
                  return (
                    <div className="space-y-3 text-sm">
                      {[
                        { label: 'AIDS Levy', key: 'aidsLevyRate', desc: '% of PAYE' },
                        { label: 'NSSA Employee', key: 'nssaEmployeeRate', desc: '% of basic salary' },
                        { label: 'NSSA Employer', key: 'nssaEmployerRate', desc: '% of basic salary' },
                      ].map(({ label, key, desc }) => (
                        <div key={key} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{label}</p>
                            <p className="text-xs text-gray-400">{desc}</p>
                          </div>
                          {editMode && editConstants ? (
                            <input
                              type="number"
                              step="0.001"
                              value={(editConstants as any)[key]}
                              onChange={e => setEditConstants({ ...editConstants!, [key]: parseFloat(e.target.value) || 0 })}
                              className="border rounded px-2 py-1 text-xs w-20 text-right dark:bg-gray-700 dark:border-gray-600"
                            />
                          ) : (
                            <span className="font-mono font-semibold text-blue-600">{fmtPct((c as any)[key])}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Live Calculator */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="font-semibold mb-3">🧮 Live Calculator</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Taxable Gross ({selectedType.toLowerCase()})
                    </label>
                    <input
                      type="number"
                      value={calcGross}
                      onChange={e => { setCalcGross(e.target.value); setCalcResult(null) }}
                      placeholder="e.g. 1800"
                      className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Basic Salary (for NSSA — leave blank to use gross)
                    </label>
                    <input
                      type="number"
                      value={calcBasic}
                      onChange={e => { setCalcBasic(e.target.value); setCalcResult(null) }}
                      placeholder="e.g. 1500"
                      className="border rounded px-3 py-1.5 text-sm w-full dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <button
                    onClick={runCalculator}
                    disabled={!calcGross || !data?.brackets}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    Calculate
                  </button>
                </div>

                {calcResult && (
                  <div className="mt-4 border-t dark:border-gray-700 pt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gross</span>
                      <span className="font-mono">{fmt(parseFloat(calcGross) || 0)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>PAYE</span>
                      <span className="font-mono">−{fmt(calcResult.paye)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>AIDS Levy</span>
                      <span className="font-mono">−{fmt(calcResult.levy)}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>NSSA (Employee)</span>
                      <span className="font-mono">−{fmt(calcResult.nssa)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-green-600 border-t dark:border-gray-700 pt-2">
                      <span>Net Take-Home</span>
                      <span className="font-mono">{fmt(calcResult.net)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}
