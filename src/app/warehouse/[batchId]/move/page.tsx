'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  quantity: number | null       // ordered qty — read-only
  manifestQty: number | null    // received qty — used for stock
  costUsd: number | null
  clearanceCostUsd: number | null
  trackingNumber: string | null
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
  itemBusinessId: string   // per-item override; empty = use global
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
  const STOP_WORDS = new Set(['for', 'and', 'the', 'with', 'of', 'in', 'to', 'a', 'an', 'by', 'at', 'on', 'or', 'its', 'as'])
  const tokens = productName.toLowerCase().split(/[\s,./\\-]+/).filter(t => t.length >= 2 && !STOP_WORDS.has(t))
  if (tokens.length === 0 || subCategories.length === 0) return []

  function countMatches(text: string): number {
    const lower = text.toLowerCase()
    return tokens.filter(t => {
      if (lower.includes(t)) return true
      // Also match singular form: "screws"→"screw", "nails"→"nail", "walls"→"wall"
      if (t.length > 3 && t.endsWith('s') && lower.includes(t.slice(0, -1))) return true
      return false
    }).length
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
  })
}

// ── BusinessCombobox ──────────────────────────────────────────────────────────

function BusinessCombobox({
  value,
  onChange,
  businesses,
  globalBusinessName,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  businesses: Business[]
  globalBusinessName: string
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({})

  const selected = businesses.find(b => b.businessId === value)
  const filtered = businesses.filter(b =>
    b.businessName.toLowerCase().includes(search.toLowerCase())
  )

  const reposition = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    if (spaceBelow < 120 && spaceAbove > spaceBelow) {
      setDropStyle({ position: 'fixed', bottom: window.innerHeight - rect.top, left: rect.left, width: Math.max(rect.width, 180), maxHeight: Math.min(160, spaceAbove - 8), zIndex: 9999 })
    } else {
      setDropStyle({ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 180), maxHeight: Math.min(160, spaceBelow - 8), zIndex: 9999 })
    }
  }

  useEffect(() => {
    if (!open) return
    reposition()
    inputRef.current?.select()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!containerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false); setSearch('')
      }
    }
    const onScroll = () => reposition()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const select = (bizId: string) => { onChange(bizId); setOpen(false); setSearch('') }

  const inputCls = 'w-full text-xs px-2 py-1.5 pr-7 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-50 cursor-pointer'

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={open ? search : (selected?.businessName ?? '')}
        placeholder={globalBusinessName ? `↑ ${globalBusinessName}` : '— select business —'}
        disabled={disabled}
        readOnly={!open}
        onFocus={() => { if (!disabled) { setOpen(true); setSearch('') } }}
        onChange={e => setSearch(e.target.value)}
        className={inputCls}
      />
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={dropStyle}
          className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl flex flex-col overflow-hidden"
        >
          <div className="overflow-y-auto flex-1">
            <button
              type="button"
              onClick={() => select('')}
              className={`w-full text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${!value ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {globalBusinessName ? `↑ ${globalBusinessName}` : '— none —'}
            </button>
            {filtered.length === 0 ? (
              <p className="px-2 py-1 text-xs text-gray-400 italic">No match</p>
            ) : (
              filtered.map(b => (
                <button
                  key={b.businessId}
                  type="button"
                  onClick={() => select(b.businessId)}
                  className={`w-full text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${value === b.businessId ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {b.businessName}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Item thumbnail ────────────────────────────────────────────────────────────

function ItemThumb({ imageId, name }: { imageId: string | null; name: string }) {
  const [enlarged, setEnlarged] = useState(false)
  if (!imageId) {
    return <div className="w-full h-full min-h-[7rem] bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-300 text-[10px]">—</div>
  }
  return (
    <>
      <img
        src={`/api/images/${imageId}`}
        alt={name}
        className="w-full h-full min-h-[7rem] object-cover cursor-zoom-in"
        onClick={() => setEnlarged(true)}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      {enlarged && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setEnlarged(false)}>
          <img src={`/api/images/${imageId}`} alt={name} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  )
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
  const [allCats, setAllCats] = useState<Category[]>([])

  // ── Markup ───────────────────────────────────────────────────────────────────
  const [markupPct, setMarkupPct] = useState(() =>
    typeof window !== 'undefined' ? (sessionStorage.getItem(SESSION_MARKUP_KEY) || '30') : '30'
  )

  // ── Suggest-specific data (all domains/categories regardless of destination business) ──
  const [suggestDomains, setSuggestDomains] = useState<Domain[]>([])
  const [suggestAllCats, setSuggestAllCats] = useState<Category[]>([])
  const [suggestAllSubs, setSuggestAllSubs] = useState<Category[]>([])

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

  // ── Load ALL domains + categories + subcategories once on mount for suggestions ─
  useEffect(() => {
    // Domains with their categories (all business types)
    fetch('/api/inventory/domains?includeCategories=true', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const allDomains: Domain[] = (data.domains ?? []).filter((d: any) => d.isActive)
        setSuggestDomains(allDomains)
        const cats: Category[] = allDomains.flatMap((dom: any) =>
          (dom.business_categories ?? []).map((c: any) => ({
            id: c.id, name: c.name, emoji: c.emoji ?? '', parentId: null, domainId: dom.id,
          }))
        )
        setSuggestAllCats(cats)
      })
      .catch(() => {})

    // All inventory subcategories (no category filter)
    fetch('/api/inventory/subcategories?all=true', { credentials: 'include' })
      .then(r => r.json())
      .then((d: any) => {
        const subs: Category[] = (d.subcategories ?? []).map((s: any) => ({
          id: s.id, name: s.name, emoji: s.emoji ?? '', parentId: s.categoryId, domainId: null,
        }))
        setSuggestAllSubs(subs)
      })
      .catch(() => {})
  }, [])

  // ── Load categories + domains when business changes ───────────────────────────
  useEffect(() => {
    if (!selectedBusinessId || !selectedBusinessType) {
      setDomainList([]); setDepartments([]); setCategories([]); setSubCategories([]); setAllCats([])
      return
    }
    // Clear stale data from previous business immediately, before fetch completes
    setAllCats([]); setSubCategories([])
    Promise.all([
      fetch(`/api/universal/categories?businessId=${selectedBusinessId}&businessType=${selectedBusinessType}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/inventory/domains?businessType=${selectedBusinessType}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({ domains: [] })),
    ]).then(([catData, domainData]) => {
      const cats: Category[] = Array.isArray(catData) ? catData : (catData.data ?? catData.categories ?? [])
      const doms: Domain[] = domainData.domains ?? []
      setDomainList(doms)
      setAllCats(cats)

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
      const qty = item.manifestQty ?? item.quantity ?? 1
      const costUsdPerUnit = costUsd / qty
      const txFee = item.costUsd != null ? costUsdPerUnit * (feePct / 100) : 0
      const transportPerUnit = (batch?.perItemTransport || 0) / qty
      const clearancePerUnit = Number(item.clearanceCostUsd ?? 0) / qty
      const cost = item.costUsd != null ? costUsdPerUnit + txFee + transportPerUnit + clearancePerUnit : 0
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
        itemBusinessId: existing?.itemBusinessId || saved.itemBusinessId || '',
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
        itemBusinessId: r.itemBusinessId,
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
      const qty = r.item.manifestQty ?? r.item.quantity ?? 1
      const costUsdPerUnit = costUsd / qty
      const txFee = r.item.costUsd != null ? costUsdPerUnit * (feePct / 100) : 0
      const itemTransportPerUnit = (r.transportOverride !== '' ? parseFloat(r.transportOverride) || 0 : (batch?.perItemTransport || 0)) / qty
      const clearancePerUnit = Number(r.item.clearanceCostUsd ?? 0) / qty
      const cost = r.item.costUsd != null ? costUsdPerUnit + txFee + itemTransportPerUnit + clearancePerUnit : 0
      const sell = cost > 0 ? (cost * (1 + markup)).toFixed(2) : r.sellingPrice
      return { ...r, sellingPrice: sell }
    }))
  }

  function handleSuggest(idx: number, e: React.MouseEvent<HTMLButtonElement>) {
    if (suggestRowIdx === idx) { setSuggestRowIdx(null); return }
    openSuggestBtnRef.current = e.currentTarget
    const rect = e.currentTarget.getBoundingClientRect()
    const row = rows[idx]
    const name = row.item.productName || row.item.shortName
    const suggestions = suggestClassification(
      name,
      suggestDomains.map(d => ({ id: d.id, name: d.name, emoji: d.emoji, parentId: null, domainId: null })),
      suggestAllCats,
      suggestAllSubs,
      suggestDomains,
    )
    setSuggestions(suggestions)
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
    const effBizId = row.itemBusinessId || selectedBusinessId
    const effBiz = businesses.find(b => b.businessId === effBizId)
    if (!effBizId || !effBiz) { toast.error('Select a target business for this item'); return }
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
          businessId: effBizId,
          businessType: effBiz.businessType,
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
    const pendingSelected = rows.filter(r => r.selected && r.status === 'pending')
    if (pendingSelected.length === 0) { toast.error('Select at least one item'); return }

    // Each row resolves its own target business (row override or global fallback)
    const missingBiz = pendingSelected.find(r => !r.itemBusinessId && !selectedBusinessId)
    if (missingBiz) { toast.error('Every item needs a target business (set one above or per-row)'); return }
    const missingCat = pendingSelected.find(r => !r.subCategoryId && !r.categoryId)
    if (missingCat) { toast.error('All selected items need a category'); return }
    const missingPrice = pendingSelected.find(r => !r.sellingPrice || parseFloat(r.sellingPrice) <= 0)
    if (missingPrice) { toast.error('All selected items need a selling price > 0'); return }

    setBatchMoving(true)
    setRows(prev => prev.map(r => r.selected && r.status === 'pending' ? { ...r, status: 'moving' } : r))
    try {
      // Group rows by effective businessId so we make one API call per business
      const groups = new Map<string, { businessId: string; businessType: string; rows: MoveRow[] }>()
      for (const r of pendingSelected) {
        const effBizId = r.itemBusinessId || selectedBusinessId
        const effBiz = businesses.find(b => b.businessId === effBizId)
        if (!effBizId || !effBiz) continue
        if (!groups.has(effBizId)) groups.set(effBizId, { businessId: effBizId, businessType: effBiz.businessType, rows: [] })
        groups.get(effBizId)!.rows.push(r)
      }

      const useDomainCat = departments.length > 0
      const allMovedIds = new Set<string>()
      let anyError = false

      for (const [, group] of groups) {
        const items = group.rows.map(r => ({
          itemId: r.item.id,
          sellingPrice: parseFloat(r.sellingPrice),
          barcode: r.barcode || undefined,
          categoryId: useDomainCat ? r.categoryId : (r.subCategoryId || r.categoryId),
        }))
        const res = await fetch(`/api/warehouse/${batchId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ businessId: group.businessId, businessType: group.businessType, items }),
        })
        const data = await res.json()
        if (!res.ok) {
          anyError = true
          const failedIds = new Set(group.rows.map(r => r.item.id))
          setRows(prev => prev.map(r => failedIds.has(r.item.id) && r.status === 'moving' ? { ...r, status: 'error', errorMessage: data.error || 'Move failed' } : r))
          toast.error(`Failed for ${group.businessType}: ${data.error || 'Move failed'}`)
        } else {
          ;(data.items || []).forEach((i: any) => allMovedIds.add(i.itemId))
        }
      }

      setRows(prev => prev.map(r => {
        if (r.status !== 'moving') return r
        return allMovedIds.has(r.item.id) ? { ...r, status: 'moved' } : { ...r, status: anyError ? r.status : 'error', errorMessage: 'Not moved' }
      }))
      if (allMovedIds.size > 0) toast.push(`${allMovedIds.size} item(s) moved to inventory`)
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
  const batchBtnDisabled = batchMoving || pendingSelected.length === 0 ||
    pendingSelected.some(r => (!r.itemBusinessId && !selectedBusinessId) || (!r.subCategoryId && !r.categoryId) || !r.sellingPrice || parseFloat(r.sellingPrice) <= 0)
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
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row, idx) => {
                  const costUsd = row.item.costUsd != null ? Number(row.item.costUsd) : 0
                  const qty = row.item.manifestQty ?? row.item.quantity ?? 1
                  const costUsdPerUnit = costUsd / qty
                  const itemTransportPerUnit = (row.transportOverride !== '' ? parseFloat(row.transportOverride) || 0 : perItemTransport) / qty
                  const txFeePerUnit = row.item.costUsd != null && transactionFeePct != null ? costUsdPerUnit * (transactionFeePct / 100) : 0
                  const clearancePerUnit = Number(row.item.clearanceCostUsd ?? 0) / qty
                  const costPrice = costUsdPerUnit + txFeePerUnit + itemTransportPerUnit + clearancePerUnit
                  const totalAdjustment = itemTransportPerUnit + txFeePerUnit + clearancePerUnit
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

                  const extraDomain = row.domainId && !departments.find(d => d.id === row.domainId)
                    ? suggestDomains.find(d => d.id === row.domainId) : null
                  const extraCat = row.categoryId && !filteredCats.find(c => c.id === row.categoryId)
                    ? suggestAllCats.find(c => c.id === row.categoryId) : null
                  const extraSub = row.subCategoryId && !filteredSubs.find(s => s.id === row.subCategoryId)
                    ? suggestAllSubs.find(s => s.id === row.subCategoryId) : null

                  const cardBg = isMoved
                    ? 'bg-emerald-50 dark:bg-emerald-900/10'
                    : isError ? 'bg-red-50 dark:bg-red-900/10'
                    : isMoving ? 'opacity-60'
                    : !row.selected ? 'opacity-50'
                    : ''

                  const selectCls = 'flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50'

                  return (
                    <div key={row.item.id} className={`flex transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${cardBg}`}>

                      {/* Checkbox */}
                      <div className="flex items-center pl-3 pr-2 shrink-0">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={isMoved}
                          onChange={e => updateRow(idx, { selected: e.target.checked })}
                          className="rounded disabled:opacity-40"
                        />
                      </div>

                      {/* Image */}
                      <div className="w-24 shrink-0 self-center overflow-hidden rounded" style={{ maxHeight: '7rem' }}>
                        <ItemThumb imageId={row.item.imageId} name={row.item.productName} />
                      </div>

                      {/* Card content */}
                      <div className="flex-1 min-w-0 p-3 space-y-1.5">

                        {/* Row 1: product name + price + calc/cat + action — all in one line */}
                        <div className="flex items-center gap-2">
                          <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2" title={row.item.productName}>
                            {row.item.productName}
                          </p>
                          <div className="shrink-0 flex items-center gap-1.5">
                            {isMoved ? (
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                ${parseFloat(row.sellingPrice || '0').toFixed(2)}
                              </span>
                            ) : (
                              <>
                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap shrink-0">Sell $</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={row.sellingPrice}
                                  disabled={isMoving}
                                  onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) updateRow(idx, { sellingPrice: v }) }}
                                  onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v >= 0) updateRow(idx, { sellingPrice: v.toFixed(2) }) }}
                                  placeholder="0.00"
                                  className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <button
                                  type="button"
                                  onClick={() => setOpenCalcIdx(openCalcIdx === idx ? null : idx)}
                                  title="Pricing calculator"
                                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                    openCalcIdx === idx
                                      ? 'bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600'
                                      : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400'
                                  }`}
                                >💡</button>
                              </>
                            )}
                            {isMoved ? (
                              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Moved
                              </div>
                            ) : isError ? (
                              <div className="flex flex-col items-end">
                                <button
                                  onClick={() => handleMoveRow(idx)}
                                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                >Retry</button>
                                {row.errorMessage && (
                                  <p className="text-xs text-red-500 max-w-[120px] text-right mt-0.5">{row.errorMessage}</p>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleMoveRow(idx)}
                                disabled={isMoving || (!row.itemBusinessId && !selectedBusinessId) || (!row.subCategoryId && !row.categoryId) || !row.sellingPrice || parseFloat(row.sellingPrice) <= 0}
                                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap font-medium"
                              >
                                {isMoving ? '…' : 'Move →'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Row 2: order # / tracking / qty / cost breakdown */}
                        <div className="flex items-center gap-4 text-xs flex-wrap">
                          <div>
                            <span className="font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">{row.item.orderNumber}</span>
                            {row.item.trackingNumber && (
                              <div className="font-mono text-xs text-blue-500 dark:text-blue-400 whitespace-nowrap">{row.item.trackingNumber}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600 pl-4">
                            <span>Qty</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {row.item.manifestQty ?? <span className="text-amber-500">?</span>}
                            </span>
                            {row.item.quantity != null && row.item.quantity !== row.item.manifestQty && (
                              <span className="text-gray-400 ml-0.5">(ord {row.item.quantity})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-600 pl-4">
                            <span>Cost</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {row.item.costUsd != null ? `$${costUsd.toFixed(2)}` : <span className="text-red-500">missing</span>}
                            </span>
                          </div>
                          {itemTransportPerUnit > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 border-l border-gray-200 dark:border-gray-600 pl-4">
                              +${itemTransportPerUnit.toFixed(2)} transport{row.transportOverride !== '' ? ' (custom)' : ''}
                            </span>
                          )}
                          {txFeePerUnit > 0 && (
                            <span className="text-blue-600 dark:text-blue-400">+${txFeePerUnit.toFixed(2)} fee</span>
                          )}
                          {clearancePerUnit > 0 && (
                            <span className="text-purple-600 dark:text-purple-400">+${clearancePerUnit.toFixed(2)} clearance</span>
                          )}
                          {qty > 1 && <span className="text-gray-400">÷{qty} units</span>}
                          <div className="flex items-center gap-1 border-l border-gray-200 dark:border-gray-600 pl-4">
                            <span className="text-gray-500 dark:text-gray-400">Unit cost</span>
                            <span className="font-bold text-gray-900 dark:text-white">${costPrice.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Row 3: business + categories + barcode */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {!isMoved ? (
                            <div className="flex-1 min-w-0">
                              <BusinessCombobox
                                value={row.itemBusinessId}
                                onChange={v => updateRow(idx, { itemBusinessId: v })}
                                businesses={businesses}
                                globalBusinessName={businesses.find(b => b.businessId === selectedBusinessId)?.businessName || ''}
                                disabled={isMoving}
                              />
                            </div>
                          ) : row.itemBusinessId ? (
                            <span className="text-xs text-gray-400">
                              → {businesses.find(b => b.businessId === row.itemBusinessId)?.businessName}
                            </span>
                          ) : null}

                          {hasDomains && (
                            isMoved ? (
                              <span className="text-xs text-gray-500">{(departments.find(d => d.id === row.domainId) ?? extraDomain)?.name || '—'}</span>
                            ) : (
                              <select
                                value={row.domainId}
                                disabled={isMoving}
                                onChange={e => updateRow(idx, { domainId: e.target.value, categoryId: '', subCategoryId: '' })}
                                className={selectCls}
                              >
                                <option value="">Domain…</option>
                                {extraDomain && <option value={extraDomain.id}>{extraDomain.emoji ? `${extraDomain.emoji} ` : ''}{extraDomain.name}</option>}
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.emoji ? `${d.emoji} ` : ''}{d.name}</option>
                                ))}
                              </select>
                            )
                          )}

                          {isMoved ? (
                            <span className="text-xs text-gray-500">{(categories.find(c => c.id === row.categoryId) ?? extraCat)?.name || '—'}</span>
                          ) : (
                            <select
                              value={row.categoryId}
                              disabled={(hasDomains && !row.domainId) || (categories.length === 0 && !extraCat) || isMoving}
                              onChange={e => updateRow(idx, { categoryId: e.target.value, subCategoryId: '' })}
                              className={selectCls}
                            >
                              <option value="">Category…</option>
                              {extraCat && <option value={extraCat.id}>{extraCat.emoji ? `${extraCat.emoji} ` : ''}{extraCat.name}</option>}
                              {filteredCats.map(c => (
                                <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
                              ))}
                            </select>
                          )}

                          {isMoved ? (
                            <span className="text-xs text-gray-500">{(subCategories.find(c => c.id === row.subCategoryId) ?? extraSub)?.name || '—'}</span>
                          ) : (
                            <select
                              value={row.subCategoryId}
                              disabled={!row.categoryId || (filteredSubs.length === 0 && !extraSub) || isMoving}
                              onChange={e => updateRow(idx, { subCategoryId: e.target.value })}
                              className={selectCls}
                            >
                              <option value="">{!row.categoryId || (filteredSubs.length === 0 && !extraSub) ? 'Sub-cat N/A' : 'Sub-category…'}</option>
                              {extraSub && <option value={extraSub.id}>{extraSub.emoji ? `${extraSub.emoji} ` : ''}{extraSub.name}</option>}
                              {filteredSubs.map(c => (
                                <option key={c.id} value={c.id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
                              ))}
                            </select>
                          )}

                          {!isMoved && suggestAllSubs.length > 0 && (
                            <button
                              type="button"
                              onClick={e => handleSuggest(idx, e)}
                              title="Suggest category from product name"
                              className={`shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                                suggestRowIdx === idx
                                  ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700'
                              }`}
                            >🏷 Suggest</button>
                          )}

                          {isMoved ? (
                            <span className="text-xs text-gray-400">{row.barcode || ''}</span>
                          ) : (
                            <input
                              type="text"
                              placeholder="Barcode (optional)"
                              value={row.barcode}
                              disabled={isMoving}
                              onChange={e => updateRow(idx, { barcode: e.target.value })}
                              className="flex-1 min-w-[8rem] px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            />
                          )}
                        </div>

                        {/* Pricing calculator (inline, no separate row) */}
                        {openCalcIdx === idx && (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Transport override (US$):</span>
                                <input
                                  type="number" min="0" step="0.01"
                                  placeholder={perItemTransport > 0 ? `default $${perItemTransport.toFixed(2)}` : '0.00'}
                                  value={row.transportOverride}
                                  onChange={e => updateRow(idx, { transportOverride: e.target.value })}
                                  className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 text-xs"
                                />
                                {row.transportOverride !== '' && (
                                  <button type="button" onClick={() => updateRow(idx, { transportOverride: '' })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Reset</button>
                                )}
                              </div>
                              <button type="button" onClick={() => setOpenCalcIdx(null)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">✕ Close</button>
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
                          </div>
                        )}

                      </div>
                    </div>
                  )
                })}
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
