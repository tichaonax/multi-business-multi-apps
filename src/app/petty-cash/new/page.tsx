'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

export default function NewPettyCashRequestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, currentBusiness, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentChannel, setPaymentChannel] = useState<'CASH' | 'ECOCASH'>('CASH')
  const [submitting, setSubmitting] = useState(false)
  const [canRequest, setCanRequest] = useState<boolean | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetch('/api/petty-cash/my-permissions', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setCanRequest(j.canRequest ?? false))
      .catch(() => setCanRequest(false))
  }, [session, status, router])

  if (status === 'loading' || bizLoading || canRequest === null) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" /></div>
  }

  if (!canRequest) {
    return (
      <ContentLayout title="New Petty Cash Request">
        <div className="max-w-xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-800 dark:text-red-300 font-medium">Access Denied</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">You do not have permission to submit petty cash requests.</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentBusinessId) { toast.error('No business selected'); return }
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!purpose.trim()) { toast.error('Purpose is required'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/petty-cash/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: currentBusinessId, requestedAmount: Number(amount), purpose: purpose.trim(), notes: notes.trim() || undefined, paymentChannel }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit')
      toast.push('Petty cash request submitted', { type: 'success' })
      router.push(`/petty-cash/${json.data.request.id}`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ContentLayout title="New Petty Cash Request">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Petty Cash Request</h1>
          {currentBusiness && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentBusiness.businessName}</p>}
        </div>

        {!currentBusinessId ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 text-center">
            <p className="text-amber-800 dark:text-amber-300">Please select a business from the sidebar first.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Requested <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="e.g. Office supplies, Delivery fuel"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                maxLength={200}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional details..."
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>

            {currentBusiness?.ecocashEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Channel</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={paymentChannel === 'CASH'} onChange={() => setPaymentChannel('CASH')} className="accent-blue-600" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">💵 Cash</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={paymentChannel === 'ECOCASH'} onChange={() => setPaymentChannel('ECOCASH')} className="accent-green-600" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">📱 EcoCash</span>
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ContentLayout>
  )
}
