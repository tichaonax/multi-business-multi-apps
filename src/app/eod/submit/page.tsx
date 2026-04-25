'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

type Step = 'form' | 'confirm' | 'done'

function localDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getPosUrl(businessType?: string) {
  switch (businessType) {
    case 'restaurant': return '/restaurant/pos'
    case 'grocery':    return '/grocery/pos'
    case 'clothing':   return '/clothing/pos'
    case 'hardware':   return '/hardware/pos'
    default:           return '/universal/pos'
  }
}

export default function EodSubmitPage() {
  const { currentBusinessId, currentBusiness } = useBusinessPermissionsContext()
  const router = useRouter()

  const today = localDateString()
  const dateLabel = (() => {
    const [y, m, d] = today.split('-').map(Number)
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
    const dow = days[new Date(y, m - 1, d).getDay()]
    return `${dow}, ${String(d).padStart(2,'0')} ${months[m-1]} ${y}`
  })()

  const [step, setStep] = useState<Step>('form')
  const [cashAmount, setCashAmount] = useState('')
  const [ecocashAmount, setEcocashAmount] = useState('0.00')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if already submitted today
  const [todayStatus, setTodayStatus] = useState<string | null>(null)
  const [todaySubmittedAt, setTodaySubmittedAt] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const checkStatus = useCallback(async () => {
    if (!currentBusinessId) return
    setLoadingStatus(true)
    try {
      const res = await fetch(`/api/eod/salesperson/pending?businessId=${currentBusinessId}`)
      const json = await res.json()
      if (json.success) {
        setTodayStatus(json.todayStatus)
        setTodaySubmittedAt(json.todaySubmittedAt ?? null)
        setEcocashAmount((json.todayEcocashAmount ?? 0).toFixed(2))
      }
    } catch { /* silent */ } finally {
      setLoadingStatus(false)
    }
  }, [currentBusinessId])

  useEffect(() => { checkStatus() }, [checkStatus])

  async function handleSubmit() {
    if (!currentBusinessId) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/eod/salesperson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          reportDate: today,
          cashAmount: parseFloat(cashAmount) || 0,
          ecocashAmount: parseFloat(ecocashAmount) || 0,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to submit EOD report'); setStep('form'); return }
      setStep('done')
    } catch {
      setError('Network error — please try again')
      setStep('form')
    } finally {
      setSubmitting(false)
    }
  }

  // Guard: not a salesperson business
  if (!loadingStatus && currentBusiness && !currentBusiness.requireSalespersonEod) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="text-lg font-semibold">Salesperson EOD is not enabled for this business.</p>
          <Link href="/dashboard" className="mt-3 inline-block text-blue-600 dark:text-blue-400 text-sm hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Back link */}
        <Link href={getPosUrl(currentBusiness?.businessType)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">
          ← POS
        </Link>

        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-neutral-700">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">📋 End-of-Day Report</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{dateLabel}</p>
            {currentBusiness?.businessName && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{currentBusiness.businessName}</p>
            )}
          </div>

          {loadingStatus ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">Checking status…</div>

          ) : todayStatus === 'SUBMITTED' || todayStatus === 'OVERRIDDEN' ? (
            /* Already submitted */
            <div className="px-6 py-10 text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="font-semibold text-green-700 dark:text-green-400">
                {todayStatus === 'OVERRIDDEN' ? 'EOD submitted by manager' : 'EOD already submitted for today'}
              </p>
              {todaySubmittedAt && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Submitted at {new Date(todaySubmittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                New sales are counting towards tomorrow&apos;s report.
              </p>
              <Link href="/eod/history" className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View EOD History →
              </Link>
            </div>

          ) : step === 'done' ? (
            /* Success */
            <div className="px-6 py-10 text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="font-semibold text-green-700 dark:text-green-400">EOD report submitted successfully</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Any sales you make from now on will count towards tomorrow&apos;s report.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <Link href="/eod/history" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  View History
                </Link>
                <Link href={getPosUrl(currentBusiness?.businessType)} className="px-4 py-2 text-sm bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600">
                  Go to POS
                </Link>
              </div>
            </div>

          ) : step === 'confirm' ? (
            /* Step 2 — Confirmation */
            <div className="px-6 py-6 space-y-5">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">⚠️ Confirm EOD Submission</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You are about to submit your end-of-day report for <span className="font-semibold">{dateLabel}</span>.
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc list-inside space-y-1 mt-1">
                  <li>This report <span className="font-semibold">cannot be undone</span>.</li>
                  <li>Any sales you make after submitting will count towards <span className="font-semibold">tomorrow&apos;s</span> EOD report.</li>
                </ul>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 border border-gray-100 dark:border-neutral-700 rounded-lg px-4 py-3">
                <div className="flex justify-between"><span>Cash Collected</span><span className="font-medium">${(parseFloat(cashAmount) || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>EcoCash Collected</span><span className="font-medium">${(parseFloat(ecocashAmount) || 0).toFixed(2)}</span></div>
                {notes.trim() && <div className="text-xs text-gray-400 pt-1 border-t border-gray-100 dark:border-neutral-700 mt-1">Notes: {notes}</div>}
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Yes, Submit'}
                </button>
              </div>
            </div>

          ) : (
            /* Step 1 — Form */
            <div className="px-6 py-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the total cash you collected today. EcoCash is automatically calculated from system records.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cash Collected <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={cashAmount} onChange={e => setCashAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  EcoCash Collected
                  <span className="ml-1.5 text-xs font-normal text-gray-400">(auto-filled from system)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number" readOnly tabIndex={-1}
                    value={ecocashAmount}
                    className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 cursor-default"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3} placeholder="Any discrepancies or comments for the manager…"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Link
                  href={getPosUrl(currentBusiness?.businessType)}
                  className="flex-1 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600"
                >
                  Cancel
                </Link>
                <button
                  onClick={() => { setError(null); setStep('confirm') }}
                  disabled={cashAmount === '' && ecocashAmount === ''}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review & Submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
