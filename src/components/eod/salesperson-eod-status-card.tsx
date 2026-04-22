'use client'

import { useState, useEffect } from 'react'
import { SalespersonEodModal } from './salesperson-eod-modal'

interface Props {
  businessId: string
}

interface EodRecord {
  status: string
  submittedAt: string | null
  cashAmount: number
  ecocashAmount: number
  isManagerOverride: boolean
  submittedBy: { name: string } | null
}

export function SalespersonEodStatusCard({ businessId }: Props) {
  const [record, setRecord] = useState<EodRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  async function fetchRecord() {
    try {
      const res = await fetch(`/api/eod/salesperson?businessId=${businessId}&date=${today}`)
      if (res.ok) {
        const json = await res.json()
        setRecord(json.data)
      } else {
        setRecord(null)
      }
    } catch {
      setRecord(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRecord() }, [businessId])

  if (loading) return null

  const isSubmitted = record && record.status !== 'PENDING'
  const submittedTime = record?.submittedAt
    ? new Date(record.submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <div className="mt-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">📋 End-of-Day Report</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">Today</span>
        </div>

        {isSubmitted ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {record.isManagerOverride ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                  Overridden by manager
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  ✓ Submitted {submittedTime && `at ${submittedTime}`}
                </span>
              )}
            </div>
            {record.isManagerOverride && record.submittedBy && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Submitted by {record.submittedBy.name}
              </p>
            )}
            <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>Cash: <span className="font-medium text-gray-900 dark:text-neutral-100">${Number(record.cashAmount).toFixed(2)}</span></span>
              <span>EcoCash: <span className="font-medium text-gray-900 dark:text-neutral-100">${Number(record.ecocashAmount).toFixed(2)}</span></span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
              You have not submitted your end-of-day report yet.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit EOD Report
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <SalespersonEodModal
          businessId={businessId}
          reportDate={today}
          onClose={() => setShowModal(false)}
          onSuccess={fetchRecord}
        />
      )}
    </>
  )
}
