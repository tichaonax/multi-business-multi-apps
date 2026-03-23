'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { formatDate, formatCurrency } from '@/lib/date-format'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

const INPUT_CLS = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
const LABEL_CLS = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
const SUBMIT_CLS = 'px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50'
const CARD_CLS = 'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4'
const TH_CLS = 'text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-3'
const TD_CLS = 'py-2 px-3 text-sm text-gray-900 dark:text-gray-100'

export default function WeighInventoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const inventoryId = params.inventoryId as string
  const alert = useAlert()
  const confirm = useConfirm()
  const { isAuthenticated, loading: bizLoading } = useBusinessPermissionsContext()

  const [inventory, setInventory] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Individual mode
  const [weightInput, setWeightInput] = useState('')
  const [weightSubmitting, setWeightSubmitting] = useState(false)
  const weightInputRef = useRef<HTMLInputElement>(null)

  // Bulk list mode
  const [bulkText, setBulkText] = useState('')
  const [bulkPreview, setBulkPreview] = useState<{ count: number; total: number; avg: number; min: number; max: number } | null>(null)

  // Bulk total mode
  const [bulkTotalBirds, setBulkTotalBirds] = useState('')
  const [bulkTotalKg, setBulkTotalKg] = useState('')

  // Close session
  const [totalCost, setTotalCost] = useState('')
  const [closing, setClosing] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)

  const fetchInventory = useCallback(async (silent = false) => {
    if (!inventoryId) return
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/chicken-run/inventory/${inventoryId}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load inventory')
      setInventory(json.data)
    } catch (e: any) {
      if (!silent) await alert({ title: 'Error', description: e.message })
    } finally {
      if (!silent) setLoading(false)
    }
  }, [inventoryId, alert])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
    fetchInventory()
  }, [session, status, router, fetchInventory])

  const handleAddWeight = async () => {
    if (!weightInput || Number(weightInput) <= 0) {
      await alert({ title: 'Invalid weight', description: 'Please enter a weight greater than 0.' })
      return
    }
    setWeightSubmitting(true)
    try {
      const res = await fetch(`/api/chicken-run/inventory/${inventoryId}/weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ weightKg: Number(weightInput) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add weight')
      setWeightInput('')
      // Use the returned inventory directly — no full-page reload needed
      setInventory(json.data.inventory)
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    } finally {
      setWeightSubmitting(false)
      // Re-focus input so user can immediately type next weight
      setTimeout(() => weightInputRef.current?.focus(), 0)
    }
  }

  const handleDeleteWeight = async (weightId: string) => {
    const ok = await confirm({ title: 'Delete weight entry?', description: 'This will remove this weight and recalculate totals.' })
    if (!ok) return
    try {
      const res = await fetch(`/api/chicken-run/inventory/${inventoryId}/weights/${weightId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete weight')
      fetchInventory(true) // silent refresh — no loading spinner
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    }
  }

  const handleBulkListPreview = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l !== '')
    const nums = lines.map(l => parseFloat(l)).filter(n => !isNaN(n) && n > 0)
    if (nums.length === 0) { setBulkPreview(null); return }
    const total = nums.reduce((s: number, n: number) => s + n, 0)
    setBulkPreview({ count: nums.length, total, avg: total / nums.length, min: Math.min(...nums), max: Math.max(...nums) })
  }

  const handleSubmitBulkList = async () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l !== '')
    const nums = lines.map(l => parseFloat(l)).filter(n => !isNaN(n) && n > 0)
    if (nums.length === 0) {
      await alert({ title: 'No valid weights', description: 'Please enter at least one valid weight.' })
      return
    }
    try {
      const res = await fetch(`/api/chicken-run/inventory/${inventoryId}/weights/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'BULK_LIST', weightList: nums }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit bulk weights')
      setBulkText('')
      setBulkPreview(null)
      fetchInventory()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    }
  }

  const handleSubmitBulkTotal = async () => {
    if (!bulkTotalBirds || Number(bulkTotalBirds) <= 0) {
      await alert({ title: 'Invalid input', description: 'Number of birds must be greater than 0.' })
      return
    }
    if (!bulkTotalKg || Number(bulkTotalKg) <= 0) {
      await alert({ title: 'Invalid input', description: 'Total weight must be greater than 0.' })
      return
    }
    try {
      const res = await fetch(`/api/chicken-run/inventory/${inventoryId}/weights/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mode: 'BULK_TOTAL', quantityWhole: Number(bulkTotalBirds), totalWeightKg: Number(bulkTotalKg) }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to submit bulk total')
      setBulkTotalBirds('')
      setBulkTotalKg('')
      fetchInventory()
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
    }
  }

  const handleCloseSession = async () => {
    if (!totalCost || Number(totalCost) <= 0) {
      await alert({ title: 'Invalid cost', description: 'Please enter a total cost greater than 0.' })
      return
    }
    const count = inventory.quantityWhole
    const total = Number(inventory.totalWeightKg)
    const cost = Number(totalCost)
    const ok = await confirm({
      title: 'Close weighing session?',
      description: `${count} birds · ${total.toFixed(3)} kg · Cost: ${formatCurrency(cost)} (${formatCurrency(cost / count)}/bird). This cannot be undone.`,
    })
    if (!ok) return
    setClosing(true)
    try {
      const res = await fetch(`/api/chicken-run/inventory/${inventoryId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ totalCost: cost }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to close session')
      router.push('/chicken-run/inventory')
    } catch (e: any) {
      await alert({ title: 'Error', description: e.message })
      setClosing(false)
    }
  }

  if (status === 'loading' || bizLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }
  if (!session || !isAuthenticated || !inventory) return null

  const isOpen = inventory.weighingStatus === 'OPEN'
  const count = inventory.quantityWhole
  const totalWeight = Number(inventory.totalWeightKg)
  const avgWeight = count > 0 ? totalWeight / count : 0

  return (
    <ContentLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Link href="/chicken-run" className="hover:text-gray-700 dark:hover:text-gray-200">Chicken Run</Link>
          <span>/</span>
          <Link href="/chicken-run/inventory" className="hover:text-gray-700 dark:hover:text-gray-200">Inventory</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">Weighing Session</span>
        </nav>

        {/* Session Header */}
        <div className={CARD_CLS}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Purchased Stock — Weighing Session
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {inventory.supplier?.name && `${inventory.supplier.name} · `}
                {formatDate(inventory.entryDate)} · Mode: {inventory.weightEntryMode}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isOpen
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
            }`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          {/* Running totals */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Birds</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Total kg</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalWeight.toFixed(3)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg kg</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{avgWeight.toFixed(3)}</p>
            </div>
          </div>
        </div>

        {!isOpen ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
            <p className="text-green-800 dark:text-green-300 font-medium">Session closed.</p>
            <Link href="/chicken-run/inventory" className="mt-2 inline-block text-sm text-green-600 dark:text-green-400 hover:underline">
              Back to Inventory →
            </Link>
          </div>
        ) : (
          <>
            {/* INDIVIDUAL mode */}
            {inventory.weightEntryMode === 'INDIVIDUAL' && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add Bird Weight</h2>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="Weight in kg (e.g. 1.850)"
                    ref={weightInputRef}
                    value={weightInput}
                    onChange={e => setWeightInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddWeight() } }}
                    disabled={weightSubmitting}
                    className={INPUT_CLS + (weightSubmitting ? ' opacity-50' : '')}
                  />
                  <button
                    onClick={handleAddWeight}
                    disabled={weightSubmitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
                  >
                    {weightSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Saving...
                      </>
                    ) : 'Add Bird'}
                  </button>
                </div>

                {inventory.birdWeights?.length > 0 && (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className={TH_CLS}>#</th>
                          <th className={TH_CLS}>Weight (kg)</th>
                          <th className={TH_CLS}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...inventory.birdWeights].reverse().map((w: any) => (
                          <tr key={w.id} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className={TD_CLS}>{w.sequenceNo}</td>
                            <td className={TD_CLS}>{Number(w.weightKg).toFixed(3)}</td>
                            <td className={TD_CLS}>
                              <button
                                onClick={() => handleDeleteWeight(w.id)}
                                className="text-red-500 hover:text-red-700 text-xs px-2 py-0.5 rounded"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* BULK_LIST mode */}
            {inventory.weightEntryMode === 'BULK_LIST' && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Bulk Weight List</h2>
                <label className={LABEL_CLS}>Enter one weight per line (in kg)</label>
                <textarea
                  rows={8}
                  value={bulkText}
                  onChange={e => { setBulkText(e.target.value); setBulkPreview(null) }}
                  placeholder={'1.850\n2.100\n1.750\n...'}
                  className={INPUT_CLS + ' font-mono'}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkListPreview}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Preview
                  </button>
                  {bulkPreview && (
                    <button
                      onClick={handleSubmitBulkList}
                      className={SUBMIT_CLS}
                    >
                      Save Weights
                    </button>
                  )}
                </div>
                {bulkPreview && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm space-y-1">
                    <p><span className="font-medium">Birds:</span> {bulkPreview.count}</p>
                    <p><span className="font-medium">Total:</span> {bulkPreview.total.toFixed(3)} kg</p>
                    <p><span className="font-medium">Avg:</span> {bulkPreview.avg.toFixed(3)} kg</p>
                    <p><span className="font-medium">Min:</span> {bulkPreview.min.toFixed(3)} kg · <span className="font-medium">Max:</span> {bulkPreview.max.toFixed(3)} kg</p>
                  </div>
                )}
              </div>
            )}

            {/* BULK_TOTAL mode */}
            {inventory.weightEntryMode === 'BULK_TOTAL' && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Bulk Total Entry</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Number of Birds</label>
                    <input
                      type="number"
                      min="1"
                      value={bulkTotalBirds}
                      onChange={e => setBulkTotalBirds(e.target.value)}
                      className={INPUT_CLS}
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Total Weight (kg)</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={bulkTotalKg}
                      onChange={e => setBulkTotalKg(e.target.value)}
                      className={INPUT_CLS}
                      placeholder="e.g. 95.500"
                    />
                  </div>
                </div>
                {bulkTotalBirds && bulkTotalKg && Number(bulkTotalBirds) > 0 && Number(bulkTotalKg) > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm">
                    <p><span className="font-medium">Avg:</span> {(Number(bulkTotalKg) / Number(bulkTotalBirds)).toFixed(3)} kg/bird</p>
                  </div>
                )}
                <button
                  onClick={handleSubmitBulkTotal}
                  className={SUBMIT_CLS}
                >
                  Save Totals
                </button>
              </div>
            )}

            {/* Close Session */}
            {count > 0 && (
              <div className={CARD_CLS}>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Close Weighing Session</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Once closed, you can transfer stock to the kitchen. Enter the total cost paid for this purchase.
                </p>
                {!showCloseForm ? (
                  <button
                    onClick={() => setShowCloseForm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Close Session
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className={LABEL_CLS}>Total Cost Paid</label>
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={totalCost}
                        onChange={e => setTotalCost(e.target.value)}
                        className={INPUT_CLS}
                        placeholder="e.g. 15000.00"
                        autoFocus
                      />
                      {totalCost && Number(totalCost) > 0 && count > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatCurrency(Number(totalCost) / count)}/bird
                          {totalWeight > 0 ? ` · ${formatCurrency(Number(totalCost) / totalWeight)}/kg` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCloseSession}
                        disabled={closing}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {closing ? 'Closing...' : 'Confirm & Close'}
                      </button>
                      <button
                        onClick={() => setShowCloseForm(false)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ContentLayout>
  )
}
