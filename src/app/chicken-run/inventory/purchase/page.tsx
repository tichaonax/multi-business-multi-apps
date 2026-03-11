'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useAlert } from '@/components/ui/confirm-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { DateInput } from '@/components/ui/date-input'
import { SupplierSelector } from '@/components/suppliers/supplier-selector'

const todayStr = () => new Date().toISOString().split('T')[0]

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const SUBMIT_CLS = 'px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'

export default function PurchaseInventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const alert = useAlert()
  const { currentBusinessId, isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [form, setForm] = useState({
    entryDate: todayStr(),
    weightEntryMode: 'INDIVIDUAL',
    notes: '',
  })
  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentBusinessId) {
      await alert({ title: 'No business selected', description: 'Please select a business first.' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/chicken-run/inventory/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: currentBusinessId,
          supplierId: supplierId || null,
          entryDate: form.entryDate,
          weightEntryMode: form.weightEntryMode,
          notes: form.notes || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create inventory entry')
      router.push(`/chicken-run/inventory/${json.data.id}/weigh`)
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
    <ContentLayout title="Add Purchased Stock">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Link href="/chicken-run" className="hover:text-gray-700 dark:hover:text-gray-200">Chicken Run</Link>
          <span>/</span>
          <Link href="/chicken-run/inventory" className="hover:text-gray-700 dark:hover:text-gray-200">Inventory</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Add Purchased Stock</span>
        </nav>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5"
        >
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Purchased Stock</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create a weighing session for stock you purchased. You will weigh birds after submitting this form.
          </p>

          <div className="space-y-4">
            <div>
              <label className={LABEL_CLS}>Supplier (optional)</label>
              <SupplierSelector
                businessId={currentBusinessId!}
                value={supplierId}
                onChange={setSupplierId}
                canCreate={true}
                placeholder="Select supplier..."
              />
            </div>

            <div>
              <DateInput
                value={form.entryDate}
                onChange={(d) => setForm(p => ({ ...p, entryDate: d }))}
                label="Entry Date"
                required={true}
                compact={true}
              />
            </div>

            <div>
              <label className={LABEL_CLS}>Weight Entry Mode</label>
              <select
                value={form.weightEntryMode}
                onChange={e => setForm(p => ({ ...p, weightEntryMode: e.target.value }))}
                className={INPUT_CLS}
              >
                <option value="INDIVIDUAL">Individual (weigh each bird)</option>
                <option value="BULK_LIST">Bulk List (paste list of weights)</option>
                <option value="BULK_TOTAL">Bulk Total (count + total kg)</option>
              </select>
            </div>

            <div>
              <label className={LABEL_CLS}>Notes (optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className={INPUT_CLS}
                placeholder="Any notes about this purchase"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className={SUBMIT_CLS}>
              {submitting ? 'Creating...' : 'Start Weighing Session'}
            </button>
            <Link
              href="/chicken-run/inventory"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </ContentLayout>
  )
}
