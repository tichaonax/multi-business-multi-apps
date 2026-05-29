'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { PricingCalculator } from '@/components/inventory/pricing-calculator'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface BatchInfo {
  id: string
  batchName: string
  pickedUpFromHarare: boolean
  transportCostHarare: number | null
  transactionFeePct: number | null
  perItemTransport: number
}

interface WarehouseItem {
  id: string
  orderNumber: string
  productName: string
  shortName: string | null
  quantity: number | null
  costUsd: number | null
  imageId: string | null
  isPersonal: boolean
  status: string
}

interface Business {
  businessId: string
  businessName: string
  businessType: string
}

interface Category {
  id: string
  name: string
  emoji: string
  parentId: string | null
  domainId: string | null
}

interface Domain {
  id: string
  name: string
  emoji: string
}

interface SuggestItem {
  domainId: string; domainName: string; domainEmoji: string
  categoryId: string; categoryName: string; categoryEmoji: string
  subCategoryId: string; subCategoryName: string; subCategoryEmoji: string
  score: number
}

interface MoveRow {
  item: WarehouseItem
  selected: boolean
  domainId: string
  categoryId: string
  subCategoryId: string
  sellingPrice: string
  barcode: string
  transportOverride: string
  status: 'pending' | 'moving' | 'moved' | 'error'
  errorMessage?: string
}

// ── Suggestion algorithm (ported from bulk-stock-panel) ───────────────────────

function suggestClassification(
  productName: string,
  departments: Category[],
  categories: Category[],
  subCategories: Category[],
  domainList: Domain[],
): SuggestItem[] {
  const tokens = productName.toLowerCase().split(/[\s,./\\-]+/).filter(t => t.length >= 2)
  if (tokens.length === 0 || subCategories.length === 0) return []

  function countMatches(text: string): number {
    const lower = text.toLowerCase()
    return tokens.filter(t => lower.includes(t)).length
  }

  const scored: SuggestItem[] = []
  for (const sub of subCategories) {
    const cat = categories.find(c => c.id === sub.parentId)
    if (!cat) continue

    let domainId = '', domainName = '', domainEmoji = ''
    if (domainList.length > 0) {
      const dom = domainList.find(d => d.id === cat.domainId)
      if (dom) { domainId = dom.id; domainName = dom.name; domainEmoji = dom.emoji }
    } else {
      const dept = departments.find(d => d.id === cat.parentId)
      if (dept) { domainId = dept.id; domainName = dept.name; domainEmoji = dept.emoji }
    }

    const subScore = countMatches(sub.name) * 3
    const catScore = countMatches(cat.name) * 2
    const domScore = domainName ? countMatches(domainName) * 1 : 0
    const total = subScore + catScore + domScore
    if (total === 0) continue

    scored.push({
      domainId, domainName, domainEmoji,
      categoryId: cat.id, categoryName: cat.name, categoryEmoji: cat.emoji ?? '',
      subCategoryId: sub.id, subCategoryName: sub.name, subCategoryEmoji: sub.emoji ?? '',
      score: total,
    })
  }

  scored.sort((a, b) => b.score - a.score || a.subCategoryName.localeCompare(b.subCategoryName))
  const seen = new Set<string>()
  return scored.filter(s => {
    if (seen.has(s.subCategoryId)) return false
    seen.add(s.subCategoryId)
    return true
  }).slice(0, 20)
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_BIZ_KEY = 'wh-move-businessId'
const SESSION_MARKUP_KEY = 'wh-move-markupPct'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MoveWizardPage() {
  const { batchId } = useParams() as { batchId: string }
  const searchParams = useSearchParams()
  const toast = useToastContext()

  const scanItemId = searchParams.get('itemId')
  const scanBarcode = searchParams.get('barcode')
  const preselectedIdsRaw = searchParams.get('ids') || ''

  // ── Core state ───────────────────────────────────────────────────────────────
  const [batch, setBatch] = useState<BatchInfo | null>(null)
  const [allItems, setAllItems] = useState<WarehouseItem[]>([])
  const [rows, setRows] = useState<MoveRow[]>([])
  const [loading, setLoading] = useState(true)

  // ── Business + hierarchy ─────────────────────────────────────────────────────
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState(() =>
    typeof window !== 'undefined' ? (sessionStorage.getItem(SESSION_BIZ_KEY) || '') : ''
  )
  const [selectedBusinessType, setSelectedBusinessType] = useState('')
  const [domainList, setDomainList] = useState<Domain[]>([])
  const [departments, setDepartments] = useState<Category[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subCategories, setSubCategories] = useState<Category[]>([])

  // ── Markup ───────────────────────────────────────────────────────────────────
  const [markupPct, setMarkupPct] = useState(() =>
    typeof window !== 'undefined' ? (sessionStorage.getItem(SESSION_MARKUP_KEY) || '30') : '30'
  )

  // ── Suggest popover ───────────────────────────────────────────────────────────
  const [suggestRowIdx, setSuggestRowIdx] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([])
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [suggestSearch, setSuggestSearch] = useState('')
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, listMaxHeight: 300 })
  const popoverRef = useRef<HTMLDivElement>(null)
  const openSuggestBtnRef = useRef<Element | null>(null)

  // ── Calc expansion ────────────────────────────────────────────────────────────
  const [openCalcIdx, setOpenCalcIdx] = useState<number | null>(null)

  // ── Batch move ────────────────────────────────────────────────────────────────
  const [batchMoving, setBatchMoving] = useState(false)

  // ── Close suggest popover on outside click / Escape ───────────────────────────
  useEffect(() => {
    if (suggestRowIdx === null) return
    function onMouseDown(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        openSuggestBtnRef.current && !openSuggestBtnRef.current.contains(e.target as Node)
      ) setSuggestRowIdx(null)
    }
    function onKeyDown(e: KeyboardEvent) { if (e.key === 'Escape') setSuggestRowIdx(null) }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [suggestRowIdx])

  // ── Load batch + items ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/warehouse/${batchId}?limit=200&status=IN_WAREHOUSE`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to load batch'); return }
      setBatch(data.batch)
      let eligible: WarehouseItem[] = (data.items || []).filter((i: WarehouseItem) => !i.isPersonal)
      if (preselectedIdsRaw) {
        const idSet = new Set(decodeURIComponent(preselectedIdsRaw).split(',').filter(Boolean))
        eligible = eligible.filter((i: WarehouseItem) => idSet.has(i.id))
      }
      setAllItems(eligible)
    } catch {
      toast.error('Failed to load batch')
    } finally {
      setLoading(false)
    }
  }, [batchId, preselectedIdsRaw])

  // ── Load businesses ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/user/business-memberships', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list: Business[] = (data.memberships || data || []).map((m: any) => ({
          businessId: m.businessId || m.id,
          businessName: m.businessName || m.name,
          businessType: m.businessType || m.type,
        }))
        setBusinesses(list)
        if (selectedBusinessId) {
          const saved = list.find((b: Business) => b.businessId === selectedBusinessId)
          if (saved) setSelectedBusinessType(saved.businessType)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  // ── Load categories + domains when business changes ───────────────────────────
  useEffect(() => {
    if (!selectedBusinessId || !selectedBusinessType) {
      setDomainList([]); setDepartments([]); setCategories([]); setSubCategories([])
      return
    }
    Promise.all([
      fetch(`/api/universal/categories?businessId=${selectedBusinessId}&businessType=${selectedBusinessType}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/inventory/domains?businessType=${selectedBusinessType}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({ domains: [] })),
    ]).then(([catData, domainData]) => {
      const cats: Category[] = Array.isArray(catData) ? catData : (catData.data ?? catData.categories ?? [])
      const doms: Domain[] = domainData.domains ?? []
      setDomainList(doms)

      if (doms.length > 0) {
        const depts: Category[] = doms.map(d => ({ id: d.id, name: d.name, emoji: d.emoji, parentId: null, domainId: null }))
        setDepartments(depts)
        const domainCats = cats.filter(c => !!c.domainId && !c.parentId)
        setCategories(domainCats)
        const catIds = domainCats.map(c => c.id).join(',')
        const parentBasedSubs = cats.filter(c => c.parentId != null && domainCats.some(dc => dc.id === c.parentId))
        if (catIds) {
          fetch(`/api/inventory/subcategories?categoryIds=${catIds}`, { credentials: 'include' })
            .then(r => r.json())
            .then((d: any) => {
              const invSubs: Category[] = (d.subcategories ?? []).map((s: any) => ({
                id: s.id, name: s.name, emoji: s.emoji || '', parentId: s.categoryId, domainId: null,
              }))
              const existingIds = new Set(invSubs.map(s => s.id))
              setSubCategories([...invSubs, ...parentBasedSubs.filter(s => !existingIds.has(s.id))])
            })
            .catch(() => setSubCategories(parentBasedSubs))
        } else {
          setSubCategories([])
        }
      } else {
        const level1 = cats.filter(c => !c.parentId)
        const level1Ids = new Set(level1.map(c => c.id))
        const level2 = cats.filter(c => c.parentId && level1Ids.has(c.parentId!))
        const level2Ids = new Set(level2.map(c => c.id))
        const level3 = cats.filter(c => c.parentId && level2Ids.has(c.parentId!))
        if (level2.length > 0) {
          setDepartments(level1); setCategories(level2); setSubCategories(level3)
        } else {
          setDepartments([]); setCategories(level1); setSubCategories([])
        }
      }
    }).catch(() => {})
  }, [selectedBusinessId, selectedBusinessType])

  // ── Build rows when items or batch changes ────────────────────────────────────
  useEffect(() => {
    let savedState: Record<string, any> = {}
    try { savedState = JSON.parse(sessionStorage.getItem(`wh-move-rows-${batchId}`) || '{}') } catch {}

    const markup = parseFloat(markupPct) / 100 || 0.3
    const feePct = batch?.transactionFeePct ?? 0
    setRows(prev => allItems.map(item => {
      const existing = prev.find(r => r.item.id === item.id)
      const saved = savedState[item.id] || {}
      if (existing?.status === 'moved') return existing
      const costUsd = item.costUsd != null ? Number(item.costUsd) : 0
      const qty = item.quantity || 1
      const costUsdPerUnit = costUsd / qty
      const txFee = item.costUsd != null ? costUsdPerUnit * (feePct / 100) : 0
      const transportPerUnit = (batch?.perItemTransport || 0) / qty
      const cost = item.costUsd != null ? costUsdPerUnit + txFee + transportPerUnit : 0
      const sell = cost > 0 ? (cost * (1 + markup)).toFixed(2) : ''
      return {
        item,
        selected: existing?.selected ?? saved.selected ?? (scanItemId ? item.id === scanItemId : true),
        domainId: existing?.domainId || saved.domainId || '',
        categoryId: existing?.categoryId || saved.categoryId || '',
        subCategoryId: existing?.subCategoryId || saved.subCategoryId || '',
        sellingPrice: existing?.sellingPrice ?? saved.sellingPrice ?? sell,
        barcode: existing?.barcode ?? saved.barcode ?? (scanItemId && item.id === scanItemId && scanBarcode ? scanBarcode : ''),
        transportOverride: existing?.transportOverride || saved.transportOverride || '',
        status: existing?.status || 'pending',
        errorMessage: existing?.errorMessage,
      }
    }))
  }, [allItems, batch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist row state to sessionStorage so navigation doesn't wipe selections ─
  useEffect(() => {
    if (rows.length === 0) return
    const toSave: Record<string, any> = {}
    rows.forEach(r => {
      toSave[r.item.id] = {
        domainId: r.domainId,
        categoryId: r.categoryId,
        subCategoryId: r.subCategoryId,
        sellingPrice: r.sellingPrice,
        barcode: r.barcode,
        transportOverride: r.transportOverride,
        selected: r.selected,
      }
    })
    try { sessionStorage.setItem(`wh-move-rows-${batchId}`, JSON.stringify(toSave)) } catch {}
  }, [rows, batchId])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleBusinessChange(bizId: string) {
    const biz = businesses.find(b => b.businessId === bizId)
    setSelectedBusinessId(bizId)
    setSelectedBusinessType(biz?.businessType || '')
    sessionStorage.setItem(SESSION_BIZ_KEY, bizId)
    // Clear saved category selections — they belong to the old business
    try { sessionStorage.removeItem(`wh-move-rows-${batchId}`) } catch {}
    setRows(prev => prev.map(r => r.status === 'moved' ? r : { ...r, domainId: '', categoryId: '', subCategoryId: '' }))
  }

  function updateRow(idx: number, patch: Partial<MoveRow>) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function recalcAll() {
    const markup = parseFloat(markupPct) / 100 || 0.3
    const feePct = batch?.transactionFeePct ?? 0
    sessionStorage.setItem(SESSION_MARKUP_KEY, markupPct)
    setRows(prev => prev.map(r => {
      if (r.status === 'moved') return r
      const costUsd = r.item.costUsd != null ? Number(r.item.costUsd) : 0
      const qty = r.item.quantity || 1
      const costUsdPerUnit = costUsd / qty
      const txFee = r.item.costUsd != null ? costUsdPerUnit * (feePct / 100) : 0
      const itemTransportPerUnit = (r.transportOverride !== '' ? parseFloat(r.transportOverride) || 0 : (batch?.perItemTransport || 0)) / qty
      const cost = r.item.costUsd != null ? costUsdPerUnit + txFee + itemTransportPerUnit : 0
      const sell = cost > 0 ? (cost * (1 + markup)).toFixed(2) : r.sellingPrice
      return { ...r, sellingPrice: sell }
    }))
  }

  function handleSuggest(idx: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (suggestRowIdx === idx) { setSuggestRowIdx(null); return }
    openSuggestBtnRef.current = e.currentTarget
    const rect = e.currentTarget.getBoundingClientRect()
    const row = rows[idx]
    const name = row.item.shortName || row.item.productName
    setSuggestions(suggestClassification(name, departments, categories, subCategories, domainList))
    setShowAllSuggestions(false)
    setSuggestSearch('')
    const OVERHEAD = 180 // header + product name section height estimate
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const flipUp = spaceBelow < OVERHEAD + 120
    const listMaxHeight = flipUp
      ? Math.max(120, spaceAbove - OVERHEAD)
      : Math.max(120, spaceBelow - OVERHEAD)
    const top = flipUp
      ? Math.max(8, rect.top - Math.min(listMaxHeight + OVERHEAD, spaceAbove) - 4)
      : rect.bottom + 4
    setPopoverPos({ top, left: Math.max(8, rect.left - 120), listMaxHeight })
    setSuggestRowIdx(idx)
  }

  async function applySuggestion(idx: number, s: SuggestItem) {
    setSuggestRowIdx(null)
    updateRow(idx, { domainId: s.domainId, categoryId: '', subCategoryId: '' })
    await new Promise(r => setTimeout(r, 60))
    updateRow(idx, { categoryId: s.categoryId, subCategoryId: '' })
    await new Promise(r => setTimeout(r, 60))
    updateRow(idx, { subCategoryId: s.subCategoryId })
  }

  async function handleMoveRow(idx: number) {
    const row = rows[idx]
    if (!selectedBusinessId) { toast.error('Select a target business'); return }
    // Domain businesses (clothing etc.): subCategoryId is inventory_subcategories — not valid for business_products FK
    // Non-domain businesses: subCategoryId is business_categories — fine to use as leaf
    const leafCategoryId = departments.length > 0 ? row.categoryId : (row.subCategoryId || row.categoryId)
    if (!leafCategoryId) { toast.error('Select a category for this item'); return }
    const sellPrice = parseFloat(row.sellingPrice)
    if (!sellPrice || sellPrice <= 0) { toast.error('Set a selling price > 0'); return }

    updateRow(idx, { status: 'moving', errorMessage: undefined })
    try {
      const res = await fetch(`/api/warehouse/${batchId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          businessId: selectedBusinessId,
          businessType: selectedBusinessType,
          items: [{ itemId: row.item.id, sellingPrice: sellPrice, barcode: row.barcode || undefined, categoryId: leafCategoryId }],
        }),
      })
      const data = await res.json()
      if (!res.ok) { updateRow(idx, { status: 'error', errorMessage: data.error || 'Move failed' }); return }
      updateRow(idx, { status: 'moved' })
      toast.push(`${(row.item.shortName || row.item.productName).slice(0, 30)} moved to inventory`)
    } catch {
      updateRow(idx, { status: 'error', errorMessage: 'Move failed' })
    }
  }

  async function handleMoveSelected() {
    if (!selectedBusinessId) { toast.error('Select a target business'); return }
    const pendingSelected = rows.filter(r => r.selected && r.status === 'pending')
    if (pendingSelected.length === 0) { toast.error('Select at least one item'); return }
    const missingCat = pendingSelected.find(r => !r.subCategoryId && !r.categoryId)
    if (missingCat) { toast.error('All selected items need a category'); return }
    const missingPrice = pendingSelected.find(r => !r.sellingPrice || parseFloat(r.sellingPrice) <= 0)
    if (missingPrice) { toast.error('All selected items need a selling price > 0'); return }

    setBatchMoving(true)
    setRows(prev => prev.map(r => r.selected && r.status === 'pending' ? { ...r, status: 'moving' } : r))
    try {
      const useDomainCat = departments.length > 0
      const items = pendingSelected.map(r => ({
        itemId: r.item.id,
        sellingPrice: parseFloat(r.sellingPrice),
        barcode: r.barcode || undefined,
        categoryId: useDomainCat ? r.categoryId : (r.subCategoryId || r.categoryId),
      }))
      const res = await fetch(`/api/warehouse/${batchId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId: selectedBusinessId, businessType: selectedBusinessType, items }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRows(prev => prev.map(r => r.status === 'moving' ? { ...r, status: 'error', errorMessage: data.error || 'Move failed' } : r))
        toast.error(data.error || 'Move failed')
        return
      }
      const movedIds = new Set((data.items || []).map((i: any) => i.itemId))
      setRows(prev => prev.map(r => {
        if (r.status !== 'moving') return r
        return movedIds.has(r.item.id) ? { ...r, status: 'moved' } : { ...r, status: 'error', errorMessage: 'Not moved' }
      }))
      toast.push(`${data.movedCount} item(s) moved to business inventory`)
    } catch {
      setRows(prev => prev.map(r => r.status === 'moving' ? { ...r, status: 'error', errorMessage: 'Move failed' } : r))
      toast.error('Move failed')
    } finally {
      setBatchMoving(false)
    }
  }

  // ── Computed ──────────────────────────────────────────────────────────────────

  const perItemTransport = batch?.perItemTransport || 0
  const transactionFeePct = batch?.transactionFeePct ?? null
  const hasDomains = departments.length > 0
  const movedCount = rows.filter(r => r.status === 'moved').length
  const pendingSelected = rows.filter(r => r.selected && r.status === 'pending')
  const batchBtnDisabled = batchMoving || pendingSelected.length === 0 || !selectedBusinessId ||
    pendingSelected.some(r => (!r.subCategoryId && !r.categoryId) || !r.sellingPrice || parseFloat(r.sellingPrice) <= 0)
  // colSpan for calculator expansion row
  const colCount = 11 + (perItemTransport > 0 ? 1 : 0) + (hasDomains ? 1 : 0)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <ContentLayout title="Move to Business">
        <div className="space-y-6">

          <Link href={`/warehouse/${batchId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {batch?.batchName || 'Batch'}
          </Link>

          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">Move to Business Inventory</h1>
            {movedCount > 0 && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ {movedCount} item{movedCount !== 1 ? 's' : ''} moved
              </span>
            )}
          </div>

          {/* Settings panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Target Business *</label>
                <select
                  value={selectedBusinessId}
                  onChange={e => handleBusinessChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select business…</option>
                  {businesses.map(b => (
                    <option key={b.businessId} value={b.businessId}>{b.businessName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Markup %</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" max="1000" step="1"
                    value={markupPct}
                    onChange={e => setMarkupPct(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={recalcAll}
                    className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >Apply</button>
                </div>
              </div>
              {perItemTransport > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Transport / item</label>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400 pt-2">${perItemTransport.toFixed(2)}</p>
                </div>
              )}
              {transactionFeePct != null && transactionFeePct > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Transaction fee</label>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400 pt-2">{transactionFeePct.toFixed(1)}% of cost</p>
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading items…</div>
          ) : allItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No eligible IN_WAREHOUSE items found.</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {pendingSelected.length} of {rows.filter(r => r.status !== 'moved').length} pending selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRows(prev => prev.map(r => r.status === 'moved' ? r : { ...r, selected: true }))}
                    className="text-xs text-blue-600 hover:underline"
                  >Select all</button>
                  <span className="text-gray-300">·</span>
                  <button
                    onClick={() => setRows(prev => prev.map(r => r.status === 'moved' ? r : { ...r, selected: false }))}
                    className="text-xs text-blue-600 hover:underline"
                  >Deselect all</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Order #</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Cost USD</th>
                      {perItemTransport > 0 && <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">+ Transport</th>}
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Unit Cost</th>
                      {hasDomains && <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Domain</th>}
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Sub-category</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Sell Price *</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Barcode</th>
                      <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map((row, idx) => {
                      const costUsd = row.item.costUsd != null ? Number(row.item.costUsd) : 0
                      const qty = row.item.quantity || 1
                      const costUsdPerUnit = costUsd / qty
                      const itemTransportPerUnit = (row.transportOverride !== '' ? parseFloat(row.transportOverride) || 0 : perItemTransport) / qty
                      const txFeePerUnit = row.item.costUsd != null && transactionFeePct != null ? costUsdPerUnit * (transactionFeePct / 100) : 0
                      const costPrice = costUsdPerUnit + txFeePerUnit + itemTransportPerUnit
                      const totalAdjustment = itemTransportPerUnit + txFeePerUnit
                      const isMoved = row.status === 'moved'
                      const isMoving = row.status === 'moving'
                      const isError = row.status === 'error'

                      const filteredCats = row.domainId && domainList.length > 0
                        ? categories.filter(c => c.domainId === row.domainId)
                        : row.domainId && departments.length > 0
                          ? categories.filter(c => c.parentId === row.domainId)
                          : categories
                      const filteredSubs = row.categoryId
                        ? subCategories.filter(c => c.parentId === row.categoryId)
                        : subCategories

                      const rowBg = isMoved
                        ? 'bg-emerald-50 dark:bg-emerald-900/10'
                        : isError ? 'bg-red-50 dark:bg-red-900/10'
                        : isMoving ? 'opacity-60'
                        : !row.selected ? 'opacity-40'
                        : ''

                      return (
                        <React.Fragment key={row.item.id}>
                          <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${rowBg}`}>
                            {/* Checkbox */}
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={row.selected}
                                disabled={isMoved}
                                onChange={e => updateRow(idx, { selected: e.target.checked })}
                                className="rounded disabled:opacity-40"
                              />
                            </td>

                            {/* Product */}
                            <td className="px-3 py-2 max-w-[140px]">
                              <div className="font-medium text-gray-900 dark:text-white truncate" title={row.item.shortName || row.item.productName}>
                                {(row.item.shortName || row.item.productName).slice(0, 40)}
                              </div>
                            </td>

                            {/* Order # */}
                            <td className="px-3 py-2 font-mono text-gray-500 max-w-[100px] truncate">{row.item.orderNumber}</td>

                            {/* Qty */}
                            <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{row.item.quantity ?? 1}</td>

                            {/* Cost USD */}
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {row.item.costUsd != null ? `$${costUsd.toFixed(2)}` : <span className="text-red-500">missing</span>}
                            </td>

                            {/* Transport (conditional) */}
                            {perItemTransport > 0 && (
                              <td className="px-3 py-2 text-amber-600 dark:text-amber-400">
                                +${itemTransportPerUnit.toFixed(2)}
                                {row.transportOverride !== '' && <span className="ml-1 text-gray-400">(custom)</span>}
                                {txFeePerUnit > 0 && <div className="text-blue-600 dark:text-blue-400">+${txFeePerUnit.toFixed(2)} fee</div>}
                                {qty > 1 && <div className="text-gray-400 text-[10px]">÷{qty} units</div>}
                              </td>
                            )}

                            {/* Cost Price */}
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                              ${costPrice.toFixed(2)}
                            </td>

                            {/* Domain (conditional column) */}
                            {hasDomains && (
                              <td className="px-3 py-2 min-w-[110px]">
                                {isMoved ? (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {departments.find(d => d.id === row.domainId)?.name || '—'}
                                  </span>
                                ) : (
                                  <select
                                    value={row.domainId}
                                    disabled={isMoving}
                                    onChange={e => updateRow(idx, { domainId: e.target.value, categoryId: '', subCategoryId: '' })}
                                    className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                  >
                                    <option value="">Domain…</option>
                                    {departments.map(d => (
                                      <option key={d.id} value={d.id}>{d.emoji ? `${d.emoji} ` : ''}{d.name}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            )}

                            {/* Category */}
                            <td className="px-3 py-2 min-w-[110px]">
                              {isMoved ? (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {categories.find(c => c.id === row.categoryId)?.name || '—'}
                                </span>
                              ) : (
                                <select
                                  value={row.categoryId}
                                  disabled={(hasDomains && !row.domainId) || categories.length === 0 || isMoving}
                                  onChange={e => updateRow(idx, { categoryId: e.target.value, subCategoryId: '' })}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                >
                                  <option value="">Category…</option>
                                  {filteredCats.map(c => (
                                    <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
                                  ))}
                                </select>
                              )}
                            </td>

                            {/* Sub-category */}
                            <td className="px-3 py-2 min-w-[110px]">
                              {isMoved ? (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {subCategories.find(c => c.id === row.subCategoryId)?.name || '—'}
                                </span>
                              ) : (
                                <select
                                  value={row.subCategoryId}
                                  disabled={!row.categoryId || filteredSubs.length === 0 || isMoving}
                                  onChange={e => updateRow(idx, { subCategoryId: e.target.value })}
                                  className="w-full px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                >
                                  <option value="">{!row.categoryId || filteredSubs.length === 0 ? 'N/A' : 'Sub-cat…'}</option>
                                  {filteredSubs.map(c => (
                                    <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
                                  ))}
                                </select>
                              )}
                            </td>

                            {/* Sell Price + action buttons */}
                            <td className="px-3 py-2 min-w-[120px]">
                              {isMoved ? (
                                <span className="font-medium text-gray-900 dark:text-white">
                                  ${parseFloat(row.sellingPrice || '0').toFixed(2)}
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <input
                                    type="number" min="0" step="0.01"
                                    value={row.sellingPrice}
                                    disabled={isMoving}
                                    onChange={e => updateRow(idx, { sellingPrice: e.target.value })}
                                    className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 block disabled:opacity-50"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setOpenCalcIdx(openCalcIdx === idx ? null : idx)}
                                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors border ${
                                        openCalcIdx === idx
                                          ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600'
                                          : 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                                      }`}
                                    >💡 Calc</button>
                                    {selectedBusinessId && subCategories.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={e => handleSuggest(idx, e)}
                                        title="Suggest category from product name"
                                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors border ${
                                          suggestRowIdx === idx
                                            ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                            : 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700'
                                        }`}
                                      >💡 Cat</button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Barcode */}
                            <td className="px-3 py-2">
                              {isMoved ? (
                                <span className="text-gray-500 dark:text-gray-400">{row.barcode || '—'}</span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="optional"
                                  value={row.barcode}
                                  disabled={isMoving}
                                  onChange={e => updateRow(idx, { barcode: e.target.value })}
                                  className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                              )}
                            </td>

                            {/* Action */}
                            <td className="px-3 py-2 min-w-[80px]">
                              {isMoved ? (
                                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                  <span className="text-xs font-medium">Moved</span>
                                </div>
                              ) : isError ? (
                                <div>
                                  <button
                                    onClick={() => handleMoveRow(idx)}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                  >Retry</button>
                                  {row.errorMessage && (
                                    <div className="text-red-500 text-[10px] mt-0.5 max-w-[80px]">{row.errorMessage}</div>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleMoveRow(idx)}
                                  disabled={isMoving || !selectedBusinessId || (!row.subCategoryId && !row.categoryId) || !row.sellingPrice || parseFloat(row.sellingPrice) <= 0}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                >
                                  {isMoving ? '…' : 'Move →'}
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Pricing calculator expansion */}
                          {openCalcIdx === idx && (
                            <tr className="bg-blue-50 dark:bg-gray-800 border-b border-blue-200 dark:border-gray-700">
                              <td colSpan={colCount} className="px-6 py-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Transport override (US$):</span>
                                    <input
                                      type="number" min="0" step="0.01"
                                      placeholder={perItemTransport > 0 ? `default $${perItemTransport.toFixed(2)}` : '0.00'}
                                      value={row.transportOverride}
                                      onChange={e => updateRow(idx, { transportOverride: e.target.value })}
                                      className="w-28 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                                    />
                                    {row.transportOverride !== '' && (
                                      <button
                                        type="button"
                                        onClick={() => updateRow(idx, { transportOverride: '' })}
                                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                      >Reset</button>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setOpenCalcIdx(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  >✕ Close</button>
                                </div>
                                {row.item.costUsd != null ? (
                                  <PricingCalculator
                                    costPrice={costUsdPerUnit}
                                    sellingPrice={row.sellingPrice}
                                    onSelectPrice={price => updateRow(idx, { sellingPrice: String(price) })}
                                    transportEnabled={totalAdjustment > 0}
                                    transportDistanceKm={null}
                                    transportCostPerKm={null}
                                    transportPerUnitOverride={totalAdjustment > 0 ? totalAdjustment : null}
                                  />
                                ) : (
                                  <p className="text-xs text-amber-600 dark:text-amber-400">Set a cost price for this item to use the calculator.</p>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-end gap-4">
            <Link href={`/warehouse/${batchId}`} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Cancel
            </Link>
            <button
              onClick={handleMoveSelected}
              disabled={batchBtnDisabled}
              title={batchBtnDisabled ? 'Select items, set category and selling price for all selected' : undefined}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {batchMoving ? 'Moving…' : `Move selected (${pendingSelected.length})`}
            </button>
          </div>

        </div>

        {/* Suggest classification popover — fixed position to escape table overflow clipping */}
        {suggestRowIdx !== null && (
          <div
            ref={popoverRef}
            style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">💡 Suggested Classification</span>
              <button type="button" onClick={() => setSuggestRowIdx(null)} className="text-gray-400 hover:text-gray-600 text-base leading-none">×</button>
            </div>
            <div className="px-3 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Based on: <span className="font-medium text-gray-700 dark:text-gray-200">
                  &ldquo;{rows[suggestRowIdx]?.item.productName || ''}&rdquo;
                </span>
              </p>
              {suggestions.length > 5 && (
                <input
                  type="text"
                  placeholder="Search classifications…"
                  value={suggestSearch}
                  onChange={e => setSuggestSearch(e.target.value)}
                  className="w-full px-2 py-1 mb-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              )}
            </div>
            <div className="overflow-y-auto px-2 pb-2" style={{ maxHeight: popoverPos.listMaxHeight }}>
              {(() => {
                const searchLower = suggestSearch.toLowerCase()
                const filtered = suggestSearch
                  ? suggestions.filter(s =>
                      s.domainName.toLowerCase().includes(searchLower) ||
                      s.categoryName.toLowerCase().includes(searchLower) ||
                      s.subCategoryName.toLowerCase().includes(searchLower)
                    )
                  : showAllSuggestions ? suggestions : suggestions.slice(0, 5)
                return suggestions.length === 0 ? (
                <p className="text-xs text-gray-500 py-2 text-center">No matches found — select manually.</p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {filtered.map((s, i) => (
                      <li key={`${s.subCategoryId}-${i}`}>
                        <button
                          type="button"
                          onClick={() => applySuggestion(suggestRowIdx, s)}
                          className="w-full text-left px-2 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          {(s.domainName || s.categoryName) && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                              {s.domainEmoji && `${s.domainEmoji} `}{s.domainName}
                              {s.domainName && s.categoryName ? ' › ' : ''}
                              {s.categoryEmoji && `${s.categoryEmoji} `}{s.categoryName}
                            </div>
                          )}
                          <div className="text-xs font-medium text-gray-900 dark:text-white">
                            {s.subCategoryEmoji && `${s.subCategoryEmoji} `}{s.subCategoryName}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!suggestSearch && !showAllSuggestions && suggestions.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllSuggestions(true)}
                      className="w-full mt-1 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    >
                      Show {suggestions.length - 5} more suggestion{suggestions.length - 5 !== 1 ? 's' : ''}…
                    </button>
                  )}
                  {suggestSearch && filtered.length === 0 && (
                    <p className="text-xs text-gray-400 py-2 text-center">No matches for &ldquo;{suggestSearch}&rdquo;</p>
                  )}
                </>
              )
              })()}
            </div>
          </div>
        )}

      </ContentLayout>
    </ProtectedRoute>
  )
}
