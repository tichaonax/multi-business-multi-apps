'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import fetchWithValidation from '@/lib/fetchWithValidation'

interface Supplier {
  id: string
  name: string
  emoji?: string | null
  hasSpecialInstructions?: boolean
  specialInstructions?: string | null
  posBlocked?: boolean
  discontinued?: boolean
}

interface CategoryItem {
  id: string
  name: string
  emoji?: string | null
}

interface LineItem {
  id: string
  description: string
  categoryId: string
  subcategoryId: string
  subcategoryItems: CategoryItem[]
  loadingSubcategories: boolean
  amount: string
  isTax?: boolean
}

// Map business type → domain name (matches SmartQuickPaymentModal)
function getDefaultDomainName(businessType: string): string {
  const map: Record<string, string> = {
    restaurant: 'Restaurant',
    grocery: 'Groceries',
    clothing: 'Clothing',
    hardware: 'Hardware',
    construction: 'Construction',
    vehicles: 'Vehicle',
  }
  return map[businessType] || ''
}

function makeLineItem(description = '', isTax = false): LineItem {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description,
    categoryId: '',
    subcategoryId: '',
    subcategoryItems: [],
    loadingSubcategories: false,
    amount: '',
    isTax,
  }
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default function SubmitSupplierPaymentRequestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const toast = useToastContext()
  const { currentBusinessId, loading: businessLoading, hasPermission, activeBusinesses } = useBusinessPermissionsContext()

  const canSubmit = hasPermission('canSubmitSupplierPaymentRequests')
  const canApprove = hasPermission('canApproveSupplierPayments')

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [subcategoriesMap, setSubcategoriesMap] = useState<Record<string, CategoryItem[]>>({})
  const [domainId, setDomainId] = useState<string>('')
  const [loadingData, setLoadingData] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const [supplierId, setSupplierId] = useState('')
  const [dueDate, setDueDate] = useState(todayStr)
  const [notes, setNotes] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [lines, setLines] = useState<LineItem[]>([makeLineItem()])

  const selectedSupplier = suppliers.find(s => s.id === supplierId) || null

  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: `${s.emoji ? s.emoji + ' ' : ''}${s.posBlocked ? `${s.name} (POS Blocked)` : s.name}`,
  }))

  const categoryOptions = categories.map(c => ({
    value: c.id,
    label: `${c.emoji ? c.emoji + ' ' : ''}${c.name}`,
  }))

  const total = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const totalTax = lines.filter(l => l.isTax).reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin')
  }, [status, router])

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return
    if (!canSubmit) { router.push('/'); return }
    loadData()
  }, [businessLoading, currentBusinessId, canSubmit])

  const loadData = async () => {
    setLoadingData(true)

    // Load suppliers
    try {
      const suppliersRes = await fetchWithValidation(`/api/business/${currentBusinessId}/suppliers`)
      const allSuppliers: Supplier[] = suppliersRes.suppliers || []
      setSuppliers(allSuppliers.filter(s => {
        if (s.discontinued) return false
        if (s.posBlocked && !canApprove) return false
        return true
      }))
    } catch (err: any) {
      toast.error(err.message || 'Failed to load suppliers')
    }

    // Load categories (non-fatal — form still usable without them)
    try {
      const catRes = await fetchWithValidation('/api/expense-categories')
      const domains: any[] = catRes.domains ?? []

      // Try to match domain by business type; fall back to all categories
      const businessType = activeBusinesses.find(b => b.businessId === currentBusinessId)?.businessType || ''
      const domainName = getDefaultDomainName(businessType).toLowerCase()
      const matchedDomain = domainName
        ? domains.find((d: any) => d.name?.toLowerCase() === domainName)
        : null

      if (matchedDomain) {
        setDomainId(matchedDomain.id)
        const cats = matchedDomain.expense_categories ?? []
        setCategories(cats.map((c: any) => ({ id: c.id, name: c.name, emoji: c.emoji ?? null })))
        const subMap: Record<string, CategoryItem[]> = {}
        for (const cat of cats) {
          subMap[cat.id] = (cat.expense_subcategories ?? []).map((s: any) => ({ id: s.id, name: s.name, emoji: s.emoji ?? null }))
        }
        setSubcategoriesMap(subMap)
      } else {
        // No matching domain — show all categories from all domains
        const allCats: CategoryItem[] = []
        const subMap: Record<string, CategoryItem[]> = {}
        for (const domain of domains) {
          for (const cat of (domain.expense_categories ?? [])) {
            allCats.push({ id: cat.id, name: cat.name, emoji: cat.emoji ?? null })
            subMap[cat.id] = (cat.expense_subcategories ?? []).map((s: any) => ({ id: s.id, name: s.name, emoji: s.emoji ?? null }))
          }
        }
        setCategories(allCats)
        setSubcategoriesMap(subMap)
      }
    } catch (err: any) {
      toast.error('Could not load expense categories: ' + (err.message || 'unknown error'))
    }

    // If editing, pre-populate from existing request
    if (editId) {
      try {
        const reqRes = await fetchWithValidation(`/api/supplier-payments/requests/${editId}`)
        const req = reqRes.data
        if (req) {
          setSupplierId(req.supplierId)
          setDueDate(req.dueDate?.slice(0, 10) || todayStr)
          setNotes(req.notes || '')
          setReceiptNumber(req.receiptNumber || '')

          if (req.items && req.items.length > 0) {
            const loadedLines: LineItem[] = await Promise.all(
              req.items.map(async (item: any) => {
                const line = makeLineItem(item.description || '')
                line.categoryId = item.categoryId || ''
                line.subcategoryId = item.subcategoryId || ''
                line.amount = item.amount?.toString() || ''
                if (item.categoryId) {
                  try {
                    const subRes = await fetch(`/api/expense-categories/subcategories/${item.categoryId}/sub-subcategories`, { credentials: 'include' })
                    if (subRes.ok) {
                      const subJson = await subRes.json()
                      line.subcategoryItems = (subJson.subSubcategories || []).map((s: any) => ({
                        id: s.id, name: s.name, emoji: s.emoji || null,
                      }))
                    }
                  } catch {}
                }
                return line
              })
            )
            setLines(loadedLines)
          }
        }
      } catch (err: any) {
        toast.error('Failed to load request: ' + (err.message || 'unknown error'))
      }
    }

    setLoadingData(false)
  }

  // Line item helpers
  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))

  const removeLine = (id: string) =>
    setLines(prev => prev.filter(l => l.id !== id))

  const handleCategoryChange = (lineId: string, catId: string) => {
    const items = catId ? (subcategoriesMap[catId] ?? []) : []
    updateLine(lineId, { categoryId: catId, subcategoryId: '', subcategoryItems: items, loadingSubcategories: false })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplierId) {
      toast.error('Please select a supplier')
      return
    }
    if (lines.length === 0) {
      toast.error('Add at least one item')
      return
    }
    if (lines.some(l => !l.amount || parseFloat(l.amount) <= 0)) {
      toast.error('Each item must have a valid amount')
      return
    }

    setSubmitting(true)
    try {
      const result = editId
        ? await fetchWithValidation(`/api/supplier-payments/requests/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dueDate: dueDate || undefined,
              notes: notes.trim() || undefined,
              receiptNumber: receiptNumber.trim() || undefined,
              items: lines.map(l => ({
                description: l.description.trim() || undefined,
                categoryId: l.categoryId || undefined,
                subcategoryId: l.subcategoryId || undefined,
                amount: parseFloat(l.amount),
              })),
            }),
          })
        : await fetchWithValidation('/api/supplier-payments/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: currentBusinessId,
              supplierId,
              dueDate: dueDate || undefined,
              notes: notes.trim() || undefined,
              receiptNumber: receiptNumber.trim() || undefined,
              items: lines.map(l => ({
                description: l.description.trim() || undefined,
                categoryId: l.categoryId || undefined,
                subcategoryId: l.subcategoryId || undefined,
                amount: parseFloat(l.amount),
              })),
            }),
          })
      setSuccessId(result.data?.id || editId || 'unknown')
      setSupplierId('')
      setNotes('')
      setReceiptNumber('')
      setDueDate(todayStr)
      setLines([makeLineItem()])
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (businessLoading || loadingData) {
    return (
      <ContentLayout title="Submit Payment Request">
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      </ContentLayout>
    )
  }

  if (successId) {
    return (
      <ContentLayout title={editId ? 'Edit Payment Request' : 'Submit Payment Request'}>
        <div className="max-w-lg mx-auto mt-10 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-1">
            {editId ? 'Request Updated' : 'Request Submitted'}
          </h2>
          <p className="text-green-700 dark:text-green-400 text-sm mb-6">
            {editId
              ? 'Your payment request has been updated.'
              : 'Your payment request has been submitted and is awaiting approval.'}
          </p>
          <div className="flex gap-3 justify-center">
            {!editId && (
              <button
                onClick={() => setSuccessId(null)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                Submit Another
              </button>
            )}
            <button
              onClick={() => router.push('/supplier-payments/my-requests')}
              className="px-4 py-2 border border-green-600 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg text-sm hover:bg-green-50 dark:hover:bg-green-900/30"
            >
              View My Requests
            </button>
          </div>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout title={editId ? 'Edit Payment Request' : 'Submit Payment Request'}>
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Supplier + receipt details */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              {editId ? (
                <div className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                  {suppliers.find(s => s.id === supplierId)?.emoji
                    ? `${suppliers.find(s => s.id === supplierId)?.emoji} `
                    : ''}{suppliers.find(s => s.id === supplierId)?.name || supplierId}
                </div>
              ) : (
                <SearchableSelect
                  options={supplierOptions}
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Select supplier..."
                  required
                />
              )}
            </div>

            {/* Special instructions banner */}
            {selectedSupplier?.hasSpecialInstructions && selectedSupplier.specialInstructions && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex gap-2">
                <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Special Instructions</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">{selectedSupplier.specialInstructions}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">(defaults to today)</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Receipt No. <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. INV-0042"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">(optional)</span></label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional notes for the approver..."
              />
            </div>
          </div>

          {/* Line items */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 rounded-t-xl flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Items</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">{lines.length} item{lines.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {lines.map((line) => {
                const itemNum = lines.filter(l => !l.isTax).indexOf(line) + 1
                return (
                <div key={line.id} className={`p-4 space-y-3 ${line.isTax ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${line.isTax ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {line.isTax ? '🧾 Tax' : `Item ${itemNum}`}
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <input
                    type="text"
                    value={line.description}
                    onChange={e => updateLine(line.id, { description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Category + Subcategory */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Category</label>
                      {categories.length > 0 ? (
                        <SearchableSelect
                          options={categoryOptions}
                          value={line.categoryId}
                          onChange={id => handleCategoryChange(line.id, id)}
                          placeholder="Select..."
                        />
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500 py-2 px-2 border border-gray-200 dark:border-gray-600 rounded-lg">No categories</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sub-category</label>
                      {line.subcategoryItems.length > 0 ? (
                        <SearchableSelect
                          options={line.subcategoryItems.map(s => ({ value: s.id, label: `${s.emoji ? s.emoji + ' ' : ''}${s.name}` }))}
                          value={line.subcategoryId}
                          onChange={id => updateLine(line.id, { subcategoryId: id })}
                          placeholder="Select..."
                        />
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-gray-500 py-2 px-2 border border-gray-200 dark:border-gray-600 rounded-lg">
                          {line.categoryId ? 'No sub-categories' : '—'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Amount <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={line.amount}
                        onChange={e => updateLine(line.id, { amount: e.target.value })}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-5 pr-2 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                </div>
              )
              })}
            </div>

            {/* Add line + total */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700 rounded-b-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setLines(prev => [...prev, makeLineItem()])}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  + Add Item
                </button>
                {!lines.some(l => l.isTax) && (
                  <button
                    type="button"
                    onClick={() => setLines(prev => [...prev, makeLineItem('Tax', true)])}
                    className="text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    + Add Tax Line
                  </button>
                )}
              </div>
              <div className="text-right">
                {totalTax > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                    Tax: {fmt(totalTax)}
                  </div>
                )}
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Total: {fmt(total)}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting
                ? (editId ? 'Saving...' : 'Submitting...')
                : (editId ? `Save Changes — ${fmt(total)}` : `Submit Request — ${fmt(total)}`)}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </ContentLayout>
  )
}
