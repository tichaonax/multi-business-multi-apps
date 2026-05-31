'use client'

import { useEffect, useRef, useState } from 'react'
import { useScale } from '@/contexts/ScaleContext'
import { UnifiedReceiptPreviewModal } from '@/components/receipts/unified-receipt-preview-modal'
import { ReceiptPrintManager } from '@/lib/receipts/receipt-print-manager'
import type { ReceiptData } from '@/types/printing'

interface Supplier {
  id: string
  name: string
}

interface PricingRule {
  id: string
  categoryName: string
  ruleType: string
  pricePerKg: number
  emoji: string
  isActive: boolean
}

interface VendorProfile {
  id: string
  name: string
  emoji: string
  pricePerKg: number
  sortOrder: number
  isActive: boolean
}

interface VendorHistoryItem {
  categoryName: string
  count: number
  pricePerKg: number
}

interface Line {
  id: string
  categoryName: string
  weightKg: number
  pricePerKg: number
  totalAmount: number
  notes?: string | null
}

interface Session {
  id: string
  supplierId: string
  status: string
  totalWeightKg: number
  totalAmount: number
  business_suppliers: { id: string; name: string }
  livestock_purchase_lines: Line[]
}

interface Props {
  businessId: string
  businessType: 'restaurant' | 'grocery'
  onClose: () => void
}

export function LivestockPurchaseWizard({ businessId, businessType, onClose }: Props) {
  const { weight, status: scaleStatus } = useScale()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [session, setSession] = useState<Session | null>(null)

  // New-session form
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [vendorSearch, setVendorSearch] = useState('')
  const [vendorOpen, setVendorOpen] = useState(false)
  const vendorRef = useRef<HTMLDivElement>(null)

  const RECENT_KEY = `livestock-recent-vendors-${businessId}`
  const MAX_RECENT = 5

  function getRecentIds(): string[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
  }

  function saveToRecent(supplierId: string) {
    const prev = getRecentIds().filter(id => id !== supplierId)
    localStorage.setItem(RECENT_KEY, JSON.stringify([supplierId, ...prev].slice(0, MAX_RECENT)))
  }

  const recentIds = getRecentIds()
  const recentSuppliers = recentIds.map(id => suppliers.find(s => s.id === id)).filter(Boolean) as Supplier[]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (vendorRef.current && !vendorRef.current.contains(e.target as Node)) {
        setVendorOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Inline confirmation dialog
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)

  function showConfirm(message: string, onConfirm: () => void) {
    setConfirm({ message, onConfirm })
  }

  // Add-line form
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [lockedWeight, setLockedWeight] = useState<number | null>(null)
  const [customPricePerKg, setCustomPricePerKg] = useState('')
  const [lineNotes, setLineNotes] = useState('')
  const [addingLine, setAddingLine] = useState(false)

  // Vendor profiles + history
  const [vendorProfiles, setVendorProfiles] = useState<VendorProfile[]>([])
  const [vendorHistory, setVendorHistory] = useState<VendorHistoryItem[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [showProfileManager, setShowProfileManager] = useState(false)
  const [addingProfile, setAddingProfile] = useState(false)
  const [newProfile, setNewProfile] = useState({ name: '', emoji: '📦', pricePerKg: '' })
  const emojiUserEdited = useRef(false)

  // Auto-suggest emoji from expense taxonomy as user types category name
  useEffect(() => {
    const name = newProfile.name.trim()
    if (name.length < 2 || emojiUserEdited.current) return
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(name)}`)
        if (!res.ok) return
        const data = await res.json()
        const top = data.suggestions?.[0]
        if (!top) return
        const emoji = top.subSubcategoryEmoji ?? top.subcategoryEmoji ?? top.categoryEmoji ?? top.domainEmoji
        if (emoji) setNewProfile(p => ({ ...p, emoji }))
      } catch {}
    }, 350)
    return () => clearTimeout(timer)
  }, [newProfile.name])

  // Receipt preview
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const connected = scaleStatus.status === 'connected'
  const liveWeight = weight?.stable && !weight.overload ? weight.weight : null

  const categoryName = selectedCategory === '__custom__' ? customCategory.trim() : selectedCategory
  const matchedRule = pricingRules.find(
    (r) => r.categoryName === categoryName && r.ruleType === 'PURCHASE' && r.isActive
  )
  const pricePerKg = customPricePerKg ? parseFloat(customPricePerKg) : (matchedRule?.pricePerKg ?? 0)
  const displayWeight = lockedWeight ?? liveWeight
  const lineTotal = displayWeight != null && pricePerKg > 0 ? displayWeight * pricePerKg : null

  // Load suppliers and pricing rules on mount
  useEffect(() => {
    fetch(`/api/business/${businessId}/suppliers?businessType=${businessType}`)
      .then((r) => r.json())
      .then((data) => setSuppliers(Array.isArray(data) ? data : data.suppliers ?? []))
      .catch(() => {})

    fetch(`/api/weight-pricing-rules?businessId=${businessId}`)
      .then((r) => r.json())
      .then((data) => setPricingRules(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [businessId, businessType])

  // Auto-lock stable reading
  useEffect(() => {
    if (lockedWeight == null && weight?.stable && !weight.overload && weight.weight > 0) {
      setLockedWeight(weight.weight)
    }
  }, [weight, lockedWeight])

  async function loadVendorData(vendorId: string) {
    setProfilesLoading(true)
    try {
      const [profilesRes, historyRes] = await Promise.all([
        fetch(`/api/livestock-purchase/vendor-profiles?businessId=${businessId}&vendorId=${vendorId}`),
        fetch(`/api/livestock-purchase/vendor-history?businessId=${businessId}&vendorId=${vendorId}`),
      ])
      const profilesData = profilesRes.ok ? await profilesRes.json() : []
      const historyData = historyRes.ok ? await historyRes.json() : []
      setVendorProfiles(Array.isArray(profilesData) ? profilesData : [])
      setVendorHistory(Array.isArray(historyData) ? historyData : [])
    } finally {
      setProfilesLoading(false)
    }
  }

  async function startSession() {
    if (!selectedSupplierId) return
    saveToRecent(selectedSupplierId)
    const res = await fetch('/api/livestock-purchase/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, supplierId: selectedSupplierId }),
    })
    const data = await res.json()
    setSession(data)
    loadVendorData(selectedSupplierId)
  }

  function applyQuickAdd(name: string, price: number) {
    const matchingRule = pricingRules.find(
      r => r.categoryName.toLowerCase() === name.toLowerCase() && r.ruleType === 'PURCHASE' && r.isActive
    )
    if (matchingRule) {
      setSelectedCategory(matchingRule.categoryName)
    } else {
      setSelectedCategory('__custom__')
      setCustomCategory(name)
    }
    setCustomPricePerKg(String(price))
  }

  async function addProfileManually() {
    const n = newProfile.name.trim()
    const p = parseFloat(newProfile.pricePerKg)
    if (!n || !p || !session) return
    setAddingProfile(true)
    try {
      const res = await fetch('/api/livestock-purchase/vendor-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, vendorId: session.supplierId, name: n, emoji: newProfile.emoji || '📦', pricePerKg: p }),
      })
      if (res.ok) {
        const created = await res.json()
        setVendorProfiles(prev => [...prev, created])
        setNewProfile({ name: '', emoji: '📦', pricePerKg: '' })
        emojiUserEdited.current = false
      }
    } finally {
      setAddingProfile(false)
    }
  }

  async function addProfileFromHistory(h: VendorHistoryItem) {
    if (!session) return
    const res = await fetch('/api/livestock-purchase/vendor-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId, vendorId: session.supplierId, name: h.categoryName, emoji: '📦', pricePerKg: h.pricePerKg }),
    })
    if (res.ok) {
      const created = await res.json()
      setVendorProfiles(prev => [...prev, created])
    }
  }

  async function deleteProfile(id: string) {
    await fetch(`/api/livestock-purchase/vendor-profiles/${id}`, { method: 'DELETE' })
    setVendorProfiles(prev => prev.filter(p => p.id !== id))
  }

  async function addLine() {
    if (!session || !categoryName || displayWeight == null || pricePerKg <= 0) return
    setAddingLine(true)
    try {
      const res = await fetch(`/api/livestock-purchase/sessions/${session.id}/lines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName,
          weightKg: displayWeight,
          pricePerKg,
          notes: lineNotes || null,
        }),
      })
      if (!res.ok) { showConfirm('Failed to add line. Please try again.', () => {}); return }

      // Refresh session
      const updated = await fetch(`/api/livestock-purchase/sessions?businessId=${businessId}`)
        .then((r) => r.json())
        .then((list: Session[]) => list.find((s) => s.id === session.id) ?? session)

      setSession(updated)

      // Reset line form
      setLockedWeight(null)
      setCustomPricePerKg('')
      setLineNotes('')
    } finally {
      setAddingLine(false)
    }
  }

  async function removeLine(lineId: string) {
    if (!session) return
    await fetch(`/api/livestock-purchase/sessions/${session.id}/lines?lineId=${lineId}`, { method: 'DELETE' })
    const updated = await fetch(`/api/livestock-purchase/sessions?businessId=${businessId}`)
      .then((r) => r.json())
      .then((list: Session[]) => list.find((s) => s.id === session.id) ?? session)
    setSession(updated)
  }

  async function submitSession() {
    if (!session) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/livestock-purchase/sessions/${session.id}/submit`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { showConfirm(data.error ?? 'Submit failed. Please try again.', () => {}); return }

      const updatedSession: Session = data.data

      // Build receipt data
      const businessRes = await fetch(`/api/business/${businessId}`)
      const businessData = businessRes.ok ? await businessRes.json() : {}
      const biz = businessData.data ?? businessData

      const lines = updatedSession.livestock_purchase_lines ?? []
      const receipt: ReceiptData = {
        businessName: biz.businessName ?? biz.name ?? 'Business',
        businessAddress: biz.address ?? '',
        businessPhone: biz.phone ?? '',
        receiptNumber: `LSP-${session.id.slice(-6).toUpperCase()}`,
        date: new Date().toISOString(),
        items: lines.map((l) => ({
          name: `${l.categoryName} (${Number(l.weightKg).toFixed(3)} kg @ ${Number(l.pricePerKg).toFixed(2)}/kg)`,
          quantity: 1,
          price: Number(l.totalAmount),
          total: Number(l.totalAmount),
        })),
        subtotal: Number(updatedSession.totalAmount),
        tax: 0,
        total: Number(updatedSession.totalAmount),
        paymentMethod: 'EXPENSE ACCOUNT',
        footer: `Supplier: ${updatedSession.business_suppliers?.name ?? ''}`,
        receiptType: 'LIVESTOCK_PURCHASE',
      }
      setReceiptData(receipt)
      setSession(updatedSession)
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelSession() {
    if (!session) return
    showConfirm('Cancel this livestock purchase session?', async () => {
      await fetch(`/api/livestock-purchase/sessions/${session.id}/cancel`, { method: 'POST' })
      onClose()
    })
  }

  const ConfirmDialog = confirm ? (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <p className="text-sm text-gray-800 dark:text-gray-100">{confirm.message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setConfirm(null)}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={() => { const fn = confirm.onConfirm; setConfirm(null); fn() }}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : null

  if (receiptData) {
    return (
      <UnifiedReceiptPreviewModal
        receiptData={receiptData}
        businessType={businessType}
        onClose={onClose}
        onPrintConfirm={async (printer) => {
          await ReceiptPrintManager.printReceipt(receiptData, businessType, { printer })
          onClose()
        }}
      />
    )
  }

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Livestock Purchase</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Select a vendor to begin</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div ref={vendorRef} className="relative">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Vendor / Supplier</label>
              <div
                className="w-full flex items-center gap-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 cursor-pointer"
                onClick={() => setVendorOpen(true)}
              >
                {selectedSupplierId
                  ? <span className="flex-1 text-gray-900 dark:text-gray-100">{suppliers.find(s => s.id === selectedSupplierId)?.name}</span>
                  : <span className="flex-1 text-gray-400">— select vendor —</span>
                }
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {vendorOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search vendor…"
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      className="w-full text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {!vendorSearch && recentSuppliers.length > 0 && (
                      <>
                        <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Recent</li>
                        {recentSuppliers.map(s => (
                          <li
                            key={`recent-${s.id}`}
                            onClick={() => { setSelectedSupplierId(s.id); setVendorSearch(''); setVendorOpen(false) }}
                            className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                              s.id === selectedSupplierId ? 'bg-orange-50 dark:bg-orange-900/20 font-medium text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <span className="text-xs">🕐</span>
                            {s.name}
                          </li>
                        ))}
                        <li className="mx-3 my-1 border-t border-gray-100 dark:border-gray-700" />
                        <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">All Vendors</li>
                      </>
                    )}
                    {suppliers
                      .filter(s => s.name.toLowerCase().includes(vendorSearch.toLowerCase()))
                      .map(s => (
                        <li
                          key={s.id}
                          onClick={() => { setSelectedSupplierId(s.id); setVendorSearch(''); setVendorOpen(false) }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                            s.id === selectedSupplierId ? 'bg-orange-50 dark:bg-orange-900/20 font-medium text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {s.name}
                        </li>
                      ))}
                    {suppliers.filter(s => s.name.toLowerCase().includes(vendorSearch.toLowerCase())).length === 0 && (
                      <li className="px-3 py-2 text-sm text-gray-400 italic">No vendors found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200">
              Cancel
            </button>
            <button
              onClick={startSession}
              disabled={!selectedSupplierId}
              className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-40"
            >
              Start Session
            </button>
          </div>
        </div>
        {ConfirmDialog}
      </div>
    )
  }

  const purchaseRules = pricingRules.filter((r) => r.ruleType === 'PURCHASE' && r.isActive)
  const activeProfiles = vendorProfiles.filter(p => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
  const historyNotInProfile = vendorHistory.filter(
    h => !vendorProfiles.some(p => p.name.toLowerCase() === h.categoryName.toLowerCase())
  )
  const hasQuickAdd = activeProfiles.length > 0 || historyNotInProfile.length > 0

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Livestock Purchase</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Vendor: {session.business_suppliers?.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100 font-mono">
                {Number(session.totalAmount).toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">{Number(session.totalWeightKg).toFixed(3)} kg total</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Scale status */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-gray-500 dark:text-gray-400">
              {connected ? `Scale connected (${scaleStatus.comPort})` : 'Scale not connected'}
            </span>
          </div>

          {/* Live weight */}
          <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-center">
            <div className="text-3xl font-mono font-bold text-gray-900 dark:text-gray-100">
              {lockedWeight != null ? `${lockedWeight.toFixed(3)} kg` : liveWeight != null ? `${liveWeight.toFixed(3)} kg` : '— kg'}
            </div>
            <div className={`mt-1 text-xs font-medium ${
              lockedWeight != null ? 'text-blue-600 dark:text-blue-400'
              : weight?.stable ? 'text-green-600 dark:text-green-400'
              : 'text-amber-500'
            }`}>
              {lockedWeight != null ? 'LOCKED' : weight?.stable ? 'STABLE' : connected ? 'UNSTABLE' : 'NO SCALE'}
            </div>
          </div>

          {lockedWeight != null && (
            <button onClick={() => setLockedWeight(null)} className="w-full text-xs text-amber-600 dark:text-amber-400 hover:underline">
              Re-weigh (clear lock)
            </button>
          )}

          {/* Quick-add chips */}
          {profilesLoading && (
            <div className="text-xs text-gray-400">Loading vendor profile…</div>
          )}
          {!profilesLoading && hasQuickAdd && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Quick Add</div>
              <div className="flex flex-wrap gap-2">
                {activeProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => applyQuickAdd(p.name, p.pricePerKg)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900/40 font-medium transition-colors"
                  >
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                    <span className="font-mono opacity-70">{Number(p.pricePerKg).toFixed(2)}/kg</span>
                  </button>
                ))}
                {historyNotInProfile.slice(0, 4).map(h => (
                  <button
                    key={h.categoryName}
                    onClick={() => applyQuickAdd(h.categoryName, h.pricePerKg)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
                  >
                    <span>🕐</span>
                    <span>{h.categoryName}</span>
                    <span className="font-mono opacity-70">{Number(h.pricePerKg).toFixed(2)}/kg</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowProfileManager(!showProfileManager)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showProfileManager ? 'Hide profile manager ▲' : 'Manage vendor profile ▼'}
              </button>
            </div>
          )}
          {!profilesLoading && !hasQuickAdd && (
            <button
              onClick={() => setShowProfileManager(!showProfileManager)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showProfileManager ? 'Hide profile manager ▲' : '+ Set up vendor profile ▼'}
            </button>
          )}

          {/* Profile manager panel */}
          {showProfileManager && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-4 space-y-3">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                Profile — {session.business_suppliers?.name}
              </div>

              {vendorProfiles.length === 0 && (
                <p className="text-xs text-gray-400">No profile set up yet. Add items below.</p>
              )}

              {vendorProfiles.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-base">{p.emoji}</span>
                  <span className="text-xs flex-1 text-gray-800 dark:text-gray-200">{p.name}</span>
                  <span className="text-xs font-mono text-gray-500">{Number(p.pricePerKg).toFixed(2)}/kg</span>
                  <button onClick={() => deleteProfile(p.id)} className="text-red-500 hover:text-red-700 text-sm leading-none">×</button>
                </div>
              ))}

              {historyNotInProfile.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">Add from history</div>
                  <div className="flex flex-wrap gap-1.5">
                    {historyNotInProfile.map(h => (
                      <button
                        key={h.categoryName}
                        onClick={() => addProfileFromHistory(h)}
                        className="px-2.5 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        + {h.categoryName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual add */}
              <div className="flex gap-2 items-end pt-1 border-t border-blue-100 dark:border-blue-800">
                <input
                  type="text"
                  value={newProfile.emoji}
                  onChange={e => { emojiUserEdited.current = true; setNewProfile(p => ({ ...p, emoji: e.target.value })) }}
                  className="w-10 text-center text-base border border-gray-300 dark:border-gray-600 rounded-lg px-1 py-1.5 bg-white dark:bg-gray-800"
                  maxLength={2}
                  title="Emoji (auto-suggested from category name)"
                />
                <input
                  type="text"
                  value={newProfile.name}
                  onChange={e => { emojiUserEdited.current = false; setNewProfile(p => ({ ...p, name: e.target.value })) }}
                  placeholder="Category name"
                  className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="number"
                  value={newProfile.pricePerKg}
                  onChange={e => setNewProfile(p => ({ ...p, pricePerKg: e.target.value }))}
                  placeholder="$/kg"
                  step="0.01"
                  min="0"
                  className="w-20 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button
                  onClick={addProfileManually}
                  disabled={addingProfile || !newProfile.name.trim() || !newProfile.pricePerKg}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
                >
                  {addingProfile ? '…' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCustomPricePerKg('') }}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">— select category —</option>
              {purchaseRules.map((r) => (
                <option key={r.id} value={r.categoryName}>
                  {r.emoji ? `${r.emoji} ` : ''}{r.categoryName} ({Number(r.pricePerKg).toFixed(2)}/kg)
                </option>
              ))}
              <option value="__custom__">Other (custom)</option>
            </select>
            {selectedCategory === '__custom__' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Category name"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            )}
          </div>

          {/* Price per kg */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Price / kg
              {matchedRule && !customPricePerKg && (
                <span className="ml-1 text-green-600 dark:text-green-400">(from pricing rule)</span>
              )}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={customPricePerKg || (matchedRule ? String(matchedRule.pricePerKg) : '')}
              onChange={(e) => setCustomPricePerKg(e.target.value)}
              placeholder="0.00"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono"
            />
          </div>

          {/* Total preview */}
          {lineTotal != null && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-center">
              <span className="text-2xl font-mono font-bold text-blue-700 dark:text-blue-300">
                {lineTotal.toFixed(2)}
              </span>
              <span className="text-sm text-blue-500 ml-2">
                ({displayWeight?.toFixed(3)} kg × {pricePerKg.toFixed(2)})
              </span>
            </div>
          )}

          {/* Notes */}
          <input
            type="text"
            value={lineNotes}
            onChange={(e) => setLineNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />

          <button
            onClick={addLine}
            disabled={addingLine || !categoryName || displayWeight == null || pricePerKg <= 0}
            className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40"
          >
            {addingLine ? 'Adding…' : '+ Add Line'}
          </button>

          {/* Lines table */}
          {session.livestock_purchase_lines.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Category</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">kg</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">$/kg</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {session.livestock_purchase_lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{line.categoryName}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(line.weightKg).toFixed(3)}</td>
                      <td className="px-3 py-2 text-right font-mono">{Number(line.pricePerKg).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold">{Number(line.totalAmount).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeLine(line.id)} className="text-red-500 hover:text-red-700">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
          <button onClick={cancelSession} className="px-4 py-2 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20">
            Cancel
          </button>
          <div className="flex-1" />
          <button
            onClick={submitSession}
            disabled={submitting || session.livestock_purchase_lines.length === 0}
            className="px-6 py-2 text-sm font-semibold bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Submit & Print Voucher'}
          </button>
        </div>
      </div>
      {ConfirmDialog}
    </div>
  )
}
