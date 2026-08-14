'use client'

import { useState, useEffect } from 'react'

interface Employee {
  id: string
  fullName: string
}

export interface ReassignResult {
  reassigned: string[]
  blocked: Array<{ orderId: string; reason: string }>
  alreadyCorrect: string[]
  skippedNoSalesperson: string[]
}

interface ReassignSalespersonModalProps {
  businessId: string
  /** Explicit order id selection. Mutually exclusive with `filter`. */
  orderIds?: string[]
  /** Apply to every sale matching this filter (same params as receipts/search), not just the loaded page. */
  filter?: { query?: string; startDate?: string; endDate?: string }
  /** How many sales this action targets, for the confirmation copy. */
  targetCount: number
  onClose: () => void
  onComplete: (result: ReassignResult) => void
}

export function ReassignSalespersonModal({
  businessId,
  orderIds,
  filter,
  targetCount,
  onClose,
  onComplete,
}: ReassignSalespersonModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(true)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ReassignResult | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/employees/pos-selector?businessId=${businessId}`)
      .then(res => (res.ok ? res.json() : { employees: [] }))
      .then(data => { if (!cancelled) setEmployees(data.employees || []) })
      .catch(() => { if (!cancelled) setEmployees([]) })
      .finally(() => { if (!cancelled) setLoadingEmployees(false) })
    return () => { cancelled = true }
  }, [businessId])

  const handleSubmit = async () => {
    if (!selectedEmployeeId) { setError('Select a salesperson to reassign to'); return }
    if (!reason.trim()) { setError('A reason is required'); return }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/universal/receipts/reassign-salesperson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          orderIds,
          filter,
          toEmployeeId: selectedEmployeeId,
          reason: reason.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to reassign salesperson')
        return
      }
      setResult(data)
    } catch {
      setError('Connection error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDone = () => {
    if (result) onComplete(result)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={submitting ? undefined : onClose}
        />
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reassign Salesperson</h3>
          </div>

          <div className="px-6 py-4 space-y-4">
            {!result && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Reassigning <span className="font-semibold">{targetCount}</span> sale{targetCount === 1 ? '' : 's'} to a different salesperson.
                  Sales already covered by a submitted/approved EOD report for their current salesperson will be skipped.
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Reassign to
                  </label>
                  <select
                    value={selectedEmployeeId}
                    onChange={e => setSelectedEmployeeId(e.target.value)}
                    disabled={loadingEmployees}
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{loadingEmployees ? 'Loading employees...' : 'Select an employee'}</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Reason
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Sale was processed under the wrong logged-in user"
                    className="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </>
            )}

            {result && (
              <div className="space-y-3 text-sm">
                <p className="text-green-700 dark:text-green-400 font-medium">
                  ✓ Reassigned {result.reassigned.length} sale{result.reassigned.length === 1 ? '' : 's'}
                </p>
                {result.alreadyCorrect.length > 0 && (
                  <p className="text-gray-500 dark:text-gray-400">
                    {result.alreadyCorrect.length} already assigned to this employee — skipped.
                  </p>
                )}
                {result.skippedNoSalesperson.length > 0 && (
                  <p className="text-gray-500 dark:text-gray-400">
                    {result.skippedNoSalesperson.length} had no salesperson to reassign from — skipped.
                  </p>
                )}
                {result.blocked.length > 0 && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <p className="text-amber-800 dark:text-amber-300 font-medium mb-1">
                      {result.blocked.length} blocked — EOD already closed for the current salesperson on that date
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Contact an admin if these need to be corrected.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            {!result ? (
              <>
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || loadingEmployees}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium"
                >
                  {submitting ? 'Reassigning...' : 'Reassign'}
                </button>
              </>
            ) : (
              <button
                onClick={handleDone}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
