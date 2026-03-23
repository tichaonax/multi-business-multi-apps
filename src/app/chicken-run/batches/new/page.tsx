'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useAlert } from '@/components/ui/confirm-modal'
import { DateInput } from '@/components/ui/date-input'
import { SupplierSelector } from '@/components/suppliers/supplier-selector'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function addWeeks(isoDate: string, weeks: number) {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().split('T')[0]
}

export default function NewBatchPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [form, setForm] = useState({
    purchaseDate: todayStr(),
    initialCount: '',
    costPerChick: '',
    purchaseCostTotal: '',
    expectedCullDate: addWeeks(todayStr(), 6),
    notes: '',
  })
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin') }
  }, [session, status, router])

  // Auto-compute cost per chick from total cost and quantity; auto-set cull date from purchase date
  const handleChange = (field: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'purchaseDate' && value) {
        next.expectedCullDate = addWeeks(value, 6)
      }
      if (field === 'initialCount' || field === 'purchaseCostTotal') {
        const count = parseFloat(field === 'initialCount' ? value : prev.initialCount)
        const total = parseFloat(field === 'purchaseCostTotal' ? value : prev.purchaseCostTotal)
        if (!isNaN(count) && !isNaN(total) && count > 0) {
          next.costPerChick = (total / count).toFixed(4)
        }
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusinessId) return

    if (!form.purchaseDate || !form.initialCount || !form.purchaseCostTotal) {
      await alert({ title: 'Validation Error', description: 'Please fill in all required fields.' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-run/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentBusinessId,
          purchaseDate: form.purchaseDate,
          initialCount: form.initialCount,
          supplierId: supplierId || undefined,
          costPerChick: form.costPerChick,
          purchaseCostTotal: form.purchaseCostTotal,
          expectedCullDate: form.expectedCullDate || undefined,
          notes: form.notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create batch')
      router.push(`/chicken-run/batches/${json.data.id}`)
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading' || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated) return null

  return (
    <ContentLayout title="New Batch">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Link href="/chicken-run" className="hover:text-gray-700 dark:hover:text-gray-200">Chicken Run</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">New Batch</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">New Batch</h1>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
          {/* Purchase Date */}
          <div>
            <DateInput
              value={form.purchaseDate}
              onChange={(d) => handleChange('purchaseDate', d)}
              label="Purchase Date"
              required={true}
              compact={true}
            />
          </div>

          {/* Number of Chicks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Number of Chicks <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.initialCount}
              onChange={e => handleChange('initialCount', e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Supplier <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <SupplierSelector
              businessId={currentBusinessId!}
              value={supplierId}
              onChange={setSupplierId}
              canCreate={true}
              placeholder="Select supplier..."
            />
          </div>

          {/* Total Purchase Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Purchase Cost ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.10"
              min="0"
              value={form.purchaseCostTotal}
              onChange={e => handleChange('purchaseCostTotal', e.target.value)}
              placeholder="e.g. 750.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Cost Per Chick — auto-calculated */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cost Per Chick ($)
              <span className="ml-1 text-xs text-gray-400 font-normal">Auto-calculated from total ÷ quantity</span>
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={form.costPerChick}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 cursor-default"
              placeholder="Auto-calculated"
            />
          </div>

          {/* Expected Cull Date */}
          <div>
            <DateInput
              value={form.expectedCullDate}
              onChange={(d) => handleChange('expectedCullDate', d)}
              label="Expected Cull Date (optional)"
              compact={true}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => handleChange('notes', e.target.value)}
              placeholder="Any additional notes about this batch..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Batch'}
            </button>
            <Link
              href="/chicken-run"
              className="flex-1 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </ContentLayout>
  )
}
