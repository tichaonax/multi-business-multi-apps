'use client'

export const dynamic = 'force-dynamic'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useToastContext } from '@/components/ui/toast'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { PricingCalculator } from '@/components/inventory/pricing-calculator'
import { CategoryOptionGroups } from '@/lib/category-grouping'
import { InventoryCategoryEditor } from '@/components/inventory/inventory-category-editor'

// ── Interfaces ────────────────────────────────────────────────────────────────

interface BatchInfo {
  id: string
  batchName: string
  pickedUpAtCollectionPoint: boolean
  collectionTransportCost: number | null
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
  // MBM-300 — set when this item was reconciled against a Container Batch
  // import; landedCost is the exact fully-loaded per-unit cost (preferred
  // over the costUsd/clearanceCostUsd pro-rata estimate below when present).
  landedCost: number | null
  estSellingPrice: number | null
  trackingNumber: string | null
  imageId: string | null
  isPersonal: boolean
  status: string
  // Groups every item moved together in one "Move to Business" action —
  // used to filter the list down to a single past session (see the
  // "Move Sessions" panel on the batch detail page and ?sessionId= below).
  moveSessionId: string | null
  // Set once this item has been moved — live values from the linked
  // BusinessProducts row, so a barcode assigned well after the move still
  // shows up here.
  businessProductId: string | null
  linkedProductSku: string | null
  linkedProductBarcode: string | null
  linkedProductBusinessId: string | null
  linkedProductBusinessType: string | null
  // Live current price + the price it was actually moved at (captured
  // automatically the first time it's ever edited afterward — null means
  // never changed since the move) — plus the reason for that change,
  // already required/captured by the standard Edit Item price flow.
  linkedProductCurrentPrice: number | null
  linkedProductOriginalPrice: number | null
  linkedProductPriceChangeReason: string | null
  linkedProductPriceChangedAt: string | null
  // Domain -> Category -> Subcategory exactly as it was actually saved
  // (resolved server-side the same way Edit Item shows it) -- NOT the same
  // as this row's own domainId/categoryId/subCategoryId fields, which are
  // reset to '' for an already-moved row (see the row-building effect) and
  // reflect the pre-save UI picks anyway, not the true persisted leaf.
  linkedProductDomainName: string | null
  linkedProductDomainEmoji: string | null
  linkedProductCategoryName: string | null
  linkedProductCategoryEmoji: string | null
  linkedProductSubcategoryName: string | null
  linkedProductSubcategoryEmoji: string | null
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
  parent?: { id: string; name: string } | null
  attributes?: { isGroup?: boolean } | null
}

interface Domain {
  id: string
  name: string
  emoji: string
}

// A "group" category (attributes.isGroup) is an organizational/display-only
// node -- never itself the leaf categoryId a product is saved with. Its
// domain-tagged children are the real leaves; the group is just a name+emoji
// used to present them as a pickable Category, with the children demoted to
// the Subcategory tier (see loadCategories / filteredCats / filteredSubs).
function isGroupCategory(c: Category): boolean {
  return !!(c.attributes && c.attributes.isGroup === true)
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
  movedSku?: string        // assigned by the server at move time — shown once status is 'moved'
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
    // Whole-word matching against text's own tokens -- plain substring
    // matching (text.includes(t)) let a token like "end" (from "High-end")
    // false-positive match inside an unrelated word like "boyfr-END",
    // surfacing e.g. "Boyfriend Jeans" as a suggestion for a handbag.
    const words = text.toLowerCase().split(/[\s,./\\-]+/).filter(Boolean)
    return tokens.filter(t => {
      if (words.includes(t)) return true
      // Also match singular form: "screws"→"screw", "nails"→"nail", "walls"→"wall"
      if (t.length > 3 && t.endsWith('s') && words.includes(t.slice(0, -1))) return true
      // ...and the reverse: category word is plural, product token is singular
      if (words.some(w => w.length > 3 && w.endsWith('s') && w.slice(0, -1) === t)) return true
      return false
    }).length
  }

  const scored: SuggestItem[] = []
  for (const sub of subCategories) {
    const cat = categories.find(c => c.id === sub.parentId)
    if (!cat) continue

    let domainId = '', domainName = '', domainEmoji = ''
    if (domainList.length > 0) {
      // Prefer the CATEGORY's own domainId when it has one -- Domain and
      // Category must always agree, since Domain is really just a display of
      // which domain the suggested Category belongs to. Only fall back to
      // the leaf's own domainId when the category has none, i.e. it's a
      // "group" (e.g. "Lighting And Smart Electronics" -> "Led Lamps").
      // Some seed data has a plain (non-group) category whose child carries
      // a DIFFERENT domainId than the category itself (e.g. "Appliances"
      // under Sale with a child tagged Electronics) -- preferring cat.domainId
      // keeps the suggested Domain/Category self-consistent so it doesn't
      // immediately trip the "re-pick category" foreign-category warning.
      const dom = domainList.find(d => d.id === (cat.domainId || sub.domainId))
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
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, switchBusiness } = useBusinessPermissionsContext()

  const scanItemId = searchParams.get('itemId')
  const scanBarcode = searchParams.get('barcode')
  const preselectedIdsRaw = searchParams.get('ids') || ''
  // Reopens a past "Move to Business" action from the batch detail page's
  // Move Sessions panel — filters the list down to exactly the items moved
  // together in that one session, so it's never a dead end once you
  // navigate away from the page you saw right after moving.
  const sessionIdParam = searchParams.get('sessionId')

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
  // Which ids in `subCategories` are real InventorySubcategories rows (need
  // their own `subcategoryId` field) vs. nested BusinessCategories rows
  // (their id IS the leaf `categoryId` — there's no separate subcategory
  // concept for those). Moving a domain-business item picked the wrong one
  // as the leaf and silently dropped the real subcategory, so Edit Item
  // later showed "No subcategory" and failed to save (the standard edit
  // route 400s on a subcategoryId that doesn't resolve to a real
  // InventorySubcategories row).
  const [inventorySubcategoryIds, setInventorySubcategoryIds] = useState<Set<string>>(new Set())
  const [allCats, setAllCats] = useState<Category[]>([])

  // ── Create category / sub-category on the fly (mirrors bulk-stock-panel's
  // established "+ New Category" / "+ New Sub-category" pattern) ───────────
  const [categoryEditorRowIdx, setCategoryEditorRowIdx] = useState<number | null>(null)
  const [quickCreateRowIdx, setQuickCreateRowIdx] = useState<number | null>(null)
  const [quickCreateName, setQuickCreateName] = useState('')
  const [quickCreateEmoji, setQuickCreateEmoji] = useState('')
  const [quickCreateError, setQuickCreateError] = useState('')
  const [quickCreateLoading, setQuickCreateLoading] = useState(false)

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
  const rowRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // ── Calc expansion ────────────────────────────────────────────────────────────
  const [openCalcIdx, setOpenCalcIdx] = useState<number | null>(null)

  // ── Batch move ────────────────────────────────────────────────────────────────
  const [batchMoving, setBatchMoving] = useState(false)

  // ── Item search (large batches) ────────────────────────────────────────────
  const [itemSearch, setItemSearch] = useState('')

  // ── Scan-and-assign barcode (moved items) ───────────────────────────────────
  const [barcodeAssignIdx, setBarcodeAssignIdx] = useState<number | null>(null)
  const [barcodeAssignValue, setBarcodeAssignValue] = useState('')
  const [assigningBarcode, setAssigningBarcode] = useState(false)

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
      // status=ALL (not just IN_WAREHOUSE) so an already-moved item stays
      // visible with its live SKU/barcode across a real page reload, not
      // just for the remainder of the current in-memory session.
      const res = await fetch(`/api/warehouse/${batchId}?limit=200&status=ALL`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to load batch'); return }
      setBatch(data.batch)
      let eligible: WarehouseItem[] = (data.items || []).filter((i: WarehouseItem) => !i.isPersonal && i.status !== 'MOVED_TO_PERSONAL')
      if (preselectedIdsRaw) {
        const idSet = new Set(decodeURIComponent(preselectedIdsRaw).split(',').filter(Boolean))
        eligible = eligible.filter((i: WarehouseItem) => idSet.has(i.id))
      }
      if (sessionIdParam) {
        eligible = eligible.filter((i: WarehouseItem) => i.moveSessionId === sessionIdParam)
      }
      setAllItems(eligible)
    } catch {
      toast.error('Failed to load batch')
    } finally {
      setLoading(false)
    }
  }, [batchId, preselectedIdsRaw, sessionIdParam])

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

  // Restore scroll position after returning from Edit Item (see the
  // "Open in Edit Item" Link's onClick, which saves it before navigating).
  // Waits for rows to actually be rendered, not just for the fetch to
  // finish, so there's enough page height to scroll to.
  const scrollRestoredRef = useRef(false)
  useEffect(() => {
    if (scrollRestoredRef.current || loading || rows.length === 0) return
    scrollRestoredRef.current = true
    try {
      const saved = sessionStorage.getItem(`wh-move-scroll-${batchId}`)
      if (saved) {
        sessionStorage.removeItem(`wh-move-scroll-${batchId}`)
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)))
      }
    } catch {}
  }, [loading, rows.length, batchId])

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
  // Extracted to a callable function (not just an effect body) so that
  // creating a new category/subcategory on the fly (see openCategoryEditor /
  // handleQuickCreate below) can re-run the exact same derivation instead of
  // trying to splice a new row into whichever of the several derived state
  // shapes (domain-based vs plain 3-level nesting) happens to be active.
  const loadCategories = useCallback(async () => {
    if (!selectedBusinessId || !selectedBusinessType) {
      setDomainList([]); setDepartments([]); setCategories([]); setSubCategories([]); setAllCats([])
      setInventorySubcategoryIds(new Set())
      return
    }
    // Clear stale data from previous business immediately, before fetch completes
    setAllCats([]); setSubCategories([])
    setInventorySubcategoryIds(new Set())
    try {
      const [catData, domainData] = await Promise.all([
        // includeGroups=true -- without it, "organizational group" categories
        // (attributes.isGroup, e.g. "Phones And Mobile Accessories") are
        // excluded server-side and only their domain-tagged children come
        // back, which is why those children used to get flattened straight
        // into the Category tier with no way to pick the group first. The
        // API was already built to support a tree-style UI that wants groups
        // as real, selectable nodes -- this just opts into that.
        fetch(`/api/universal/categories?businessId=${selectedBusinessId}&businessType=${selectedBusinessType}&includeGroups=true`, { credentials: 'include' }).then(r => r.json()),
        fetch(`/api/inventory/domains?businessType=${selectedBusinessType}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({ domains: [] })),
      ])
      const cats: Category[] = Array.isArray(catData) ? catData : (catData.data ?? catData.categories ?? [])
      const doms: Domain[] = domainData.domains ?? []
      setDomainList(doms)
      setAllCats(cats)

      if (doms.length > 0) {
        const depts: Category[] = doms.map(d => ({ id: d.id, name: d.name, emoji: d.emoji, parentId: null, domainId: null }))
        setDepartments(depts)
        // NOTE: previously also required `!c.parentId` here, which assumed every
        // domain-scoped category was top-level. That's no longer true now that
        // clothing categories are grouped under parent categories (Tops,
        // Bottoms, ...) via parentId -- that filter would have hidden nearly
        // every clothing category. domainId is what actually marks a
        // domain-level category here; parentId is now used for grouping, not
        // domain membership.
        //
        // Group categories (isGroup) are a separate, third shape: the GROUP
        // itself carries no domainId (it's cosmetic/organizational by the
        // app's own convention), while each of its children carries its own
        // domainId directly and can belong to a DIFFERENT domain than its
        // siblings. So a group is promoted to Category tier in its own
        // right (shown once, using its own name/emoji), and its
        // domain-tagged children are demoted out of the flat Category list
        // and into the Subcategory tier instead -- selectable only once
        // their group is picked, and filtered to the domain in view.
        const groupIds = new Set(cats.filter(isGroupCategory).map(c => c.id))
        const domainCats = cats.filter(c => !!c.domainId && !isGroupCategory(c) && !(c.parentId && groupIds.has(c.parentId)))
        const groupCats = cats.filter(isGroupCategory)
        setCategories([...domainCats, ...groupCats])
        const catIds = [...domainCats, ...groupCats].map(c => c.id).join(',')
        const parentBasedSubs = cats.filter(c => c.parentId != null && (domainCats.some(dc => dc.id === c.parentId) || groupIds.has(c.parentId)))
        if (catIds) {
          try {
            const d = await fetch(`/api/inventory/subcategories?categoryIds=${catIds}`, { credentials: 'include' }).then(r => r.json())
            const invSubs: Category[] = (d.subcategories ?? []).map((s: any) => ({
              id: s.id, name: s.name, emoji: s.emoji || '', parentId: s.categoryId, domainId: null,
            }))
            const existingIds = new Set(invSubs.map(s => s.id))
            setSubCategories([...invSubs, ...parentBasedSubs.filter(s => !existingIds.has(s.id))])
            setInventorySubcategoryIds(existingIds)
          } catch {
            setSubCategories(parentBasedSubs)
          }
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
    } catch {}
  }, [selectedBusinessId, selectedBusinessType])

  useEffect(() => { loadCategories() }, [loadCategories])

  // ── Build rows when items or batch changes ────────────────────────────────────
  useEffect(() => {
    let savedState: Record<string, any> = {}
    try { savedState = JSON.parse(sessionStorage.getItem(`wh-move-rows-${batchId}`) || '{}') } catch {}

    const markup = parseFloat(markupPct) / 100 || 0.3
    const feePct = batch?.transactionFeePct ?? 0
    setRows(prev => allItems.map(item => {
      const existing = prev.find(r => r.item.id === item.id)
      const saved = savedState[item.id] || {}
      if (existing?.status === 'moved') return { ...existing, item }
      // Already moved (from an earlier session, or before this page's most
      // recent reload) — render as 'moved' immediately using live data from
      // the linked BusinessProducts row, rather than requiring the user to
      // have just performed the move in this same in-memory session.
      if (item.status === 'MOVED_TO_BUSINESS') {
        return {
          item,
          selected: false,
          domainId: '', categoryId: '', subCategoryId: '',
          sellingPrice: item.linkedProductCurrentPrice != null
            ? item.linkedProductCurrentPrice.toFixed(2)
            : (item.estSellingPrice != null ? Number(item.estSellingPrice).toFixed(2) : ''),
          barcode: '',
          transportOverride: '',
          itemBusinessId: saved.itemBusinessId || '',
          status: 'moved',
          movedSku: item.linkedProductSku ?? undefined,
        }
      }
      const costUsd = item.costUsd != null ? Number(item.costUsd) : 0
      const qty = item.manifestQty ?? item.quantity ?? 1
      const costUsdPerUnit = costUsd / qty
      const txFee = item.costUsd != null ? costUsdPerUnit * (feePct / 100) : 0
      const transportPerUnit = (batch?.perItemTransport || 0) / qty
      const clearancePerUnit = Number(item.clearanceCostUsd ?? 0) / qty
      const cost = item.landedCost != null ? Number(item.landedCost) : (item.costUsd != null ? costUsdPerUnit + txFee + transportPerUnit + clearancePerUnit : 0)
      // MBM-300 — a Container Batch reconciliation already suggests a
      // selling price straight from the source file; prefer it as the
      // default over the markup-derived estimate (still fully editable).
      const sell = item.estSellingPrice != null ? Number(item.estSellingPrice).toFixed(2) : (cost > 0 ? (cost * (1 + markup)).toFixed(2) : '')
      return {
        item,
        selected: existing?.selected ?? saved.selected ?? (scanItemId ? item.id === scanItemId : true),
        domainId: existing?.domainId || saved.domainId || '',
        categoryId: existing?.categoryId || saved.categoryId || '',
        subCategoryId: existing?.subCategoryId || saved.subCategoryId || '',
        sellingPrice: (() => { const v = existing?.sellingPrice ?? saved.sellingPrice ?? sell; const n = parseFloat(v); return v && !isNaN(n) ? n.toFixed(2) : v })(),
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

  // ── Create category / sub-category on the fly ──────────────────────────────
  // Only offered while the row's effective business matches the main Target
  // Business — same restriction as Suggest (see handleSuggest below): the
  // categories/subCategories state is only ever loaded for selectedBusinessId,
  // so a category created for a different per-row business wouldn't resolve
  // correctly in this row's own dropdown afterward.
  function openCategoryEditor(idx: number) {
    const row = rows[idx]
    const effBizId = row.itemBusinessId || selectedBusinessId
    if (effBizId !== selectedBusinessId) {
      toast.error('Creating a category only works for the main Target Business right now — set this item\'s business there first.')
      return
    }
    setCategoryEditorRowIdx(idx)
  }

  async function handleCategoryEditorSuccess(newCat?: any) {
    const idx = categoryEditorRowIdx
    setCategoryEditorRowIdx(null)
    await loadCategories()
    if (newCat?.id && idx !== null) {
      updateRow(idx, { categoryId: newCat.id, subCategoryId: '' })
    }
  }

  function openQuickCreate(idx: number) {
    const row = rows[idx]
    const effBizId = row.itemBusinessId || selectedBusinessId
    if (effBizId !== selectedBusinessId) {
      toast.error('Creating a sub-category only works for the main Target Business right now — set this item\'s business there first.')
      return
    }
    if (!row.categoryId) return
    setQuickCreateRowIdx(idx)
    setQuickCreateName('')
    setQuickCreateEmoji('')
    setQuickCreateError('')
  }

  // Lightweight nested-category "sub-category" create — mirrors
  // bulk-stock-panel.tsx's handleQuickCreate exactly (a real InventorySubcategories
  // row isn't needed here; a BusinessCategories row nested under the chosen
  // category via parentId is what resolveCategoryFields() already treats as
  // a valid leaf sub-category for a non-InventorySubcategories id).
  async function handleQuickCreate() {
    if (!quickCreateName.trim() || quickCreateRowIdx === null) return
    const idx = quickCreateRowIdx
    const row = rows[idx]
    setQuickCreateLoading(true)
    try {
      const res = await fetch('/api/universal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          businessType: selectedBusinessType,
          name: quickCreateName.trim(),
          parentId: row.categoryId,
          emoji: quickCreateEmoji.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || (!data.success && !data.data?.id)) {
        setQuickCreateError(data.error || 'Failed to create sub-category')
        return
      }
      await loadCategories()
      updateRow(idx, { subCategoryId: data.data?.id || data.id })
      setQuickCreateRowIdx(null)
      setQuickCreateName('')
      setQuickCreateEmoji('')
    } catch {
      setQuickCreateError('Failed to create sub-category')
    } finally {
      setQuickCreateLoading(false)
    }
  }

  // Copy classification from the row immediately above — for a run of
  // near-identical items (same product, split across many order/tracking
  // numbers), this avoids re-running "Suggest" for every single row.
  function copyClassificationFromAbove(idx: number) {
    if (idx === 0) return
    const above = rows[idx - 1]
    updateRow(idx, { domainId: above.domainId, categoryId: above.categoryId, subCategoryId: above.subCategoryId })
  }

  // Quick "scan and assign" — reuses the exact same PUT the standard Edit
  // Item screen already uses to save a barcode, so behavior stays consistent
  // regardless of which screen the barcode was assigned from.
  async function submitAssignBarcode(idx: number) {
    const row = rows[idx]
    const code = barcodeAssignValue.trim()
    if (!code) { toast.error('Enter or scan a barcode'); return }
    const bizId = row.item.linkedProductBusinessId
    const productId = row.item.businessProductId
    if (!bizId || !productId) return

    setAssigningBarcode(true)
    try {
      const res = await fetch(`/api/inventory/${bizId}/items/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ barcode: code }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Failed to assign barcode'); return }
      setRows(prev => prev.map((r, i) => i === idx ? { ...r, item: { ...r.item, linkedProductBarcode: code } } : r))
      toast.push('Barcode assigned')
      setBarcodeAssignIdx(null)
      setBarcodeAssignValue('')
    } catch {
      toast.error('Failed to assign barcode')
    } finally {
      setAssigningBarcode(false)
    }
  }

  // Apply this row's classification to every OTHER not-yet-classified row
  // that shares the exact same product name — one click instead of clicking
  // "Suggest" (or "same as above") once per duplicate row.
  function applyClassificationToMatching(idx: number) {
    const source = rows[idx]
    if (!source.categoryId && !source.subCategoryId) return
    setRows(prev => prev.map((r, i) => {
      if (i === idx || r.status === 'moved') return r
      if (r.item.productName !== source.item.productName) return r
      if (r.categoryId || r.subCategoryId) return r // never overwrite an already-classified row
      return { ...r, domainId: source.domainId, categoryId: source.categoryId, subCategoryId: source.subCategoryId }
    }))
  }

  function recalcAll() {
    const markup = parseFloat(markupPct) / 100 || 0.3
    const feePct = batch?.transactionFeePct ?? 0
    sessionStorage.setItem(SESSION_MARKUP_KEY, markupPct)
    setRows(prev => prev.map(r => {
      if (r.status === 'moved') return r
      // MBM-300 — a Container Batch reconciliation already has an exact,
      // fully-loaded landed cost + suggested selling price straight from
      // the source file; prefer those over the pro-rata estimate below
      // (still fully editable either way).
      if (r.item.estSellingPrice != null) {
        return { ...r, sellingPrice: Number(r.item.estSellingPrice).toFixed(2) }
      }
      const costUsd = r.item.costUsd != null ? Number(r.item.costUsd) : 0
      const qty = r.item.manifestQty ?? r.item.quantity ?? 1
      const costUsdPerUnit = costUsd / qty
      const txFee = r.item.costUsd != null ? costUsdPerUnit * (feePct / 100) : 0
      const itemTransportPerUnit = (r.transportOverride !== '' ? parseFloat(r.transportOverride) || 0 : (batch?.perItemTransport || 0)) / qty
      const clearancePerUnit = Number(r.item.clearanceCostUsd ?? 0) / qty
      const cost = r.item.landedCost != null ? Number(r.item.landedCost) : (r.item.costUsd != null ? costUsdPerUnit + txFee + itemTransportPerUnit + clearancePerUnit : 0)
      const sell = cost > 0 ? (cost * (1 + markup)).toFixed(2) : r.sellingPrice
      return { ...r, sellingPrice: sell }
    }))
  }

  function handleSuggest(idx: number, e: React.MouseEvent<HTMLButtonElement>) {
    const row = rows[idx]
    const effBizId = row.itemBusinessId || selectedBusinessId
    if (!effBizId) { toast.error('Select a target business first'); return }
    // Suggest must only ever offer categories that actually belong to the
    // business this item is going into — `categories`/`subCategories`/
    // `departments` are already fetched scoped to `selectedBusinessId` for
    // the dropdowns, so reuse that exact pool instead of the old
    // business-agnostic suggestAllCats/suggestAllSubs/suggestDomains lists,
    // which could (and did) hand back a category belonging to a different
    // business entirely, failing the move with a foreign-key error.
    if (effBizId !== selectedBusinessId) {
      toast.error('Suggest only works for the main Target Business right now — set this item\'s business there, or pick its category manually.')
      return
    }
    if (suggestRowIdx === idx) { setSuggestRowIdx(null); return }
    openSuggestBtnRef.current = e.currentTarget
    const rect = e.currentTarget.getBoundingClientRect()
    const name = row.item.productName || row.item.shortName
    // If the row already has a domain picked, further restrict the
    // candidate pool to that domain's own categories/subcategories — same
    // filtering the Domain/Category dropdowns already apply (see filteredCats
    // below), so Suggest never offers a match from an unrelated domain the
    // user has already ruled out by picking this one.
    const scopedCategories = row.domainId
      ? (domainList.length > 0
          ? categories.filter(c => c.domainId === row.domainId)
          : departments.length > 0
            ? categories.filter(c => c.parentId === row.domainId)
            : categories)
      : categories
    const scopedCategoryIds = new Set(scopedCategories.map(c => c.id))
    const scopedSubCategories = row.domainId
      ? subCategories.filter(c => !!c.parentId && scopedCategoryIds.has(c.parentId))
      : subCategories
    const suggestions = suggestClassification(
      name,
      hasDomains ? departments : [],
      scopedCategories,
      scopedSubCategories,
      hasDomains ? domainList : [],
    )
    setSuggestions(suggestions)
    setShowAllSuggestions(false)
    setSuggestSearch('')
    const OVERHEAD = 180 // header + product name section height estimate
    // Cap how tall the popover is allowed to grow -- it was previously
    // sized to consume ALL remaining space above the button when flipped
    // up, which for a row near the bottom of a long page meant a very tall
    // box whose top edge landed near the top of the viewport, far from the
    // button that opened it. The list already scrolls internally past a
    // handful of items, so there's no need to maximize height here.
    const MAX_LIST_HEIGHT = 320
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const flipUp = spaceBelow < OVERHEAD + 120
    const listMaxHeight = flipUp
      ? Math.max(120, Math.min(MAX_LIST_HEIGHT, spaceAbove - OVERHEAD))
      : Math.max(120, Math.min(MAX_LIST_HEIGHT, spaceBelow - OVERHEAD))
    const top = flipUp
      ? Math.max(8, rect.top - (listMaxHeight + OVERHEAD) - 4)
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

  // Resolves a row's Domain/Category/Subcategory picks into the two
  // separate fields BusinessProducts actually has: `categoryId` (a
  // BusinessCategories row) and `subcategoryId` (an InventorySubcategories
  // row — only when the subcategory pick genuinely is one; a domain business
  // can also nest plain BusinessCategories under a category, e.g. clothing's
  // "Tops > T-Shirts", in which case that nested row IS the leaf categoryId
  // and there's no separate subcategoryId). Previously only ever sent one
  // combined "leaf" id as categoryId, silently dropping the real
  // subcategory whenever one existed — Edit Item then showed "No
  // subcategory" and failed to save.
  function resolveCategoryFields(row: MoveRow): { categoryId: string | null; subcategoryId: string | null } {
    const subCatIsBusinessCat = row.subCategoryId ? subCategories.some(s => s.id === row.subCategoryId) : false
    if (departments.length > 0) {
      const subIsInventorySubcategory = !!row.subCategoryId && inventorySubcategoryIds.has(row.subCategoryId)
      return subIsInventorySubcategory
        ? { categoryId: row.categoryId || null, subcategoryId: row.subCategoryId }
        : { categoryId: row.subCategoryId || row.categoryId || null, subcategoryId: null }
    }
    return subCatIsBusinessCat
      ? { categoryId: row.subCategoryId, subcategoryId: null }
      : { categoryId: row.categoryId || null, subcategoryId: null }
  }

  // The Domain/Category/Subcategory breadcrumb for a row that was JUST
  // moved in this session -- built from the exact same picks the row's own
  // dropdowns show (row.domainId/categoryId/subCategoryId aren't reset by a
  // successful move), so it's available immediately instead of only after a
  // full page reload (when the server-resolved linkedProduct* fields take
  // over instead — see the row-building effect above).
  function classificationBreadcrumb(row: MoveRow) {
    const dept = departments.find(d => d.id === row.domainId)
    const cat = categories.find(c => c.id === row.categoryId)
    const sub = subCategories.find(c => c.id === row.subCategoryId)
    return {
      domainName: dept?.name ?? null, domainEmoji: dept?.emoji ?? null,
      categoryName: cat?.name ?? null, categoryEmoji: cat?.emoji ?? null,
      subcategoryName: sub?.name ?? null, subcategoryEmoji: sub?.emoji ?? null,
    }
  }

  async function handleMoveRow(idx: number) {
    const row = rows[idx]
    const effBizId = row.itemBusinessId || selectedBusinessId
    const effBiz = businesses.find(b => b.businessId === effBizId)
    if (!effBizId || !effBiz) { toast.error('Select a target business for this item'); return }
    const { categoryId: leafCategoryId, subcategoryId } = resolveCategoryFields(row)
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
          items: [{ itemId: row.item.id, sellingPrice: sellPrice, barcode: row.barcode || undefined, categoryId: leafCategoryId, subcategoryId }],
        }),
      })
      const data = await res.json()
      if (!res.ok) { updateRow(idx, { status: 'error', errorMessage: data.error || 'Move failed' }); return }
      const productId = data.items?.[0]?.productId
      const finalSellingPrice = data.items?.[0]?.sellingPrice
      const breadcrumb = classificationBreadcrumb(row)
      setRows(prev => prev.map((r, i) => i === idx ? {
        ...r,
        status: 'moved',
        movedSku: data.items?.[0]?.sku,
        // The server rounds the final selling price up to the nearest
        // $0.50 — reflect that immediately instead of showing the
        // pre-rounded value until the next reload.
        sellingPrice: finalSellingPrice != null ? Number(finalSellingPrice).toFixed(2) : r.sellingPrice,
        item: {
          ...r.item,
          businessProductId: productId ?? r.item.businessProductId,
          linkedProductBusinessId: effBizId,
          linkedProductBusinessType: effBiz.businessType,
          linkedProductBarcode: row.barcode || r.item.linkedProductBarcode,
          linkedProductDomainName: breadcrumb.domainName,
          linkedProductDomainEmoji: breadcrumb.domainEmoji,
          linkedProductCategoryName: breadcrumb.categoryName,
          linkedProductCategoryEmoji: breadcrumb.categoryEmoji,
          linkedProductSubcategoryName: breadcrumb.subcategoryName,
          linkedProductSubcategoryEmoji: breadcrumb.subcategoryEmoji,
        },
      } : r))
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

      const allMovedIds = new Set<string>()
      const moveResultByItemId = new Map<string, { sku: string; productId: string; businessId: string; businessType: string; barcode?: string; sellingPrice?: number }>()
      let anyError = false

      for (const [, group] of groups) {
        const items = group.rows.map(r => {
          const { categoryId, subcategoryId } = resolveCategoryFields(r)
          return {
            itemId: r.item.id,
            sellingPrice: parseFloat(r.sellingPrice),
            barcode: r.barcode || undefined,
            categoryId,
            subcategoryId,
          }
        })
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
          ;(data.items || []).forEach((i: any) => {
            allMovedIds.add(i.itemId)
            const sourceRow = group.rows.find(r => r.item.id === i.itemId)
            moveResultByItemId.set(i.itemId, {
              sku: i.sku,
              productId: i.productId,
              businessId: group.businessId,
              businessType: group.businessType,
              barcode: sourceRow?.barcode || undefined,
              sellingPrice: i.sellingPrice,
            })
          })
        }
      }

      setRows(prev => prev.map(r => {
        if (r.status !== 'moving') return r
        const result = moveResultByItemId.get(r.item.id)
        if (!result) return { ...r, status: anyError ? r.status : 'error', errorMessage: 'Not moved' }
        const breadcrumb = classificationBreadcrumb(r)
        return {
          ...r,
          status: 'moved',
          movedSku: result.sku,
          sellingPrice: result.sellingPrice != null ? Number(result.sellingPrice).toFixed(2) : r.sellingPrice,
          item: {
            ...r.item,
            businessProductId: result.productId ?? r.item.businessProductId,
            linkedProductBusinessId: result.businessId,
            linkedProductBusinessType: result.businessType,
            linkedProductBarcode: result.barcode || r.item.linkedProductBarcode,
            linkedProductDomainName: breadcrumb.domainName,
            linkedProductDomainEmoji: breadcrumb.domainEmoji,
            linkedProductCategoryName: breadcrumb.categoryName,
            linkedProductCategoryEmoji: breadcrumb.categoryEmoji,
            linkedProductSubcategoryName: breadcrumb.subcategoryName,
            linkedProductSubcategoryEmoji: breadcrumb.subcategoryEmoji,
          },
        }
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

  // Preserve the exact working set (e.g. ?ids=... from "Move selected") when
  // returning from Edit Item — otherwise the user loses their filtered view
  // and sees the whole batch again instead of just the items they came from.
  const returnToUrl = `/warehouse/${batchId}/move${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

  const perItemTransport = batch?.perItemTransport || 0
  const transactionFeePct = batch?.transactionFeePct ?? null
  const hasDomains = departments.length > 0
  const movedCount = rows.filter(r => r.status === 'moved').length
  const pendingSelected = rows.filter(r => r.selected && r.status === 'pending')
  // A row whose Category is still set to a "group" (e.g. "Phones And Mobile
  // Accessories") with nothing picked underneath it -- the group itself is
  // never a valid leaf categoryId, so this needs the same attention as
  // having no category at all (see isGroupCategory above).
  const rowStuckOnGroup = (r: MoveRow) => {
    if (r.subCategoryId) return false
    const cat = categories.find(c => c.id === r.categoryId)
    return !!cat && isGroupCategory(cat)
  }
  const batchBtnDisabled = batchMoving || pendingSelected.length === 0 ||
    pendingSelected.some(r => (!r.itemBusinessId && !selectedBusinessId) || (!r.subCategoryId && !r.categoryId) || rowStuckOnGroup(r) || !r.sellingPrice || parseFloat(r.sellingPrice) <= 0)
  const needsClassificationCount = pendingSelected.filter(r => (!r.categoryId && !r.subCategoryId) || rowStuckOnGroup(r)).length
  const firstNeedsClassificationIdx = rows.findIndex(r => r.selected && r.status === 'pending' && ((!r.categoryId && !r.subCategoryId) || rowStuckOnGroup(r)))

  function jumpToFirstMissingClassification() {
    if (firstNeedsClassificationIdx === -1) return
    const el = rowRefs.current[firstNeedsClassificationIdx]
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
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

          {sessionIdParam && (
            <div className="flex items-center justify-between gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-800 dark:text-emerald-300">
              <span>Viewing a past Move Session — showing only the {allItems.length} item{allItems.length !== 1 ? 's' : ''} moved together in that action.</span>
              <Link href={`/warehouse/${batchId}/move`} className="shrink-0 font-medium underline hover:no-underline">Show all items</Link>
            </div>
          )}

          {/* Floating search + primary actions — sticky so a large batch never
              hides "Move selected" below a long scroll. */}
          <div className="sticky top-14 sm:top-16 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                autoComplete="off"
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                placeholder="Search by product, order #, tracking #…"
                className="block w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {itemSearch && (
                <button onClick={() => setItemSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center" title="Clear search">
                  <svg className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            {needsClassificationCount > 0 && (
              <button
                onClick={jumpToFirstMissingClassification}
                className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50 transition-colors"
                title="Jump to the first selected item still missing a category"
              >
                ⚠ {needsClassificationCount} need category
              </button>
            )}
            <Link href={`/warehouse/${batchId}`} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0">
              Cancel
            </Link>
            <button
              onClick={handleMoveSelected}
              disabled={batchBtnDisabled}
              title={batchBtnDisabled ? 'Select items, set category and selling price for all selected' : undefined}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {batchMoving ? 'Moving…' : `Move selected (${pendingSelected.length})`}
            </button>
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
            <div className="p-8 flex flex-col items-center justify-center gap-3 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600" />
              <span>Loading items…</span>
            </div>
          ) : allItems.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No eligible IN_WAREHOUSE items found.</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                <div className="flex items-center pl-3 pr-2 shrink-0">
                  <input
                    type="checkbox"
                    checked={pendingSelected.length > 0 && pendingSelected.length === rows.filter(r => r.status !== 'moved').length}
                    ref={el => { if (el) el.indeterminate = pendingSelected.length > 0 && pendingSelected.length < rows.filter(r => r.status !== 'moved').length }}
                    onChange={e => setRows(prev => prev.map(r => r.status === 'moved' ? r : { ...r, selected: e.target.checked }))}
                    className="rounded"
                    title={pendingSelected.length > 0 ? 'Deselect all' : 'Select all'}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                <span className="text-sm font-medium text-gray-900 dark:text-white ml-auto">
                  {pendingSelected.length} of {rows.filter(r => r.status !== 'moved').length} pending selected
                </span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((row, idx) => {
                  if (itemSearch.trim()) {
                    const q = itemSearch.trim().toLowerCase()
                    const haystack = `${row.item.productName} ${row.item.shortName ?? ''} ${row.item.orderNumber} ${row.item.trackingNumber ?? ''}`.toLowerCase()
                    if (!haystack.includes(q)) return null
                  }
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
                    ? categories.filter(c =>
                        c.domainId === row.domainId ||
                        (isGroupCategory(c) && subCategories.some(s => s.parentId === c.id && s.domainId === row.domainId))
                      )
                    : row.domainId && departments.length > 0
                      ? categories.filter(c => c.parentId === row.domainId)
                      : categories
                  // A subcategory with no domainId of its own (the normal nested
                  // case, e.g. "Boyfriend Jeans" under "Girls Pants") is always
                  // valid once its parent category is picked; one that DOES carry
                  // its own domainId (a group's child, e.g. "Screen Protectors"
                  // under "Phones And Mobile Accessories") only belongs here when
                  // it matches the domain currently in view, since siblings can
                  // legitimately span different domains.
                  const filteredSubs = row.categoryId
                    ? subCategories.filter(c => c.parentId === row.categoryId && (!c.domainId || c.domainId === row.domainId))
                    : subCategories

                  const extraDomain = row.domainId && !departments.find(d => d.id === row.domainId)
                    ? suggestDomains.find(d => d.id === row.domainId) : null
                  const extraCat = row.categoryId && !filteredCats.find(c => c.id === row.categoryId)
                    ? suggestAllCats.find(c => c.id === row.categoryId) : null
                  const extraSub = row.subCategoryId && !filteredSubs.find(s => s.id === row.subCategoryId)
                    ? suggestAllSubs.find(s => s.id === row.subCategoryId) : null

                  const effBizId = row.itemBusinessId || selectedBusinessId
                  const canCopyFromAbove = idx > 0 && !isMoved && (rows[idx - 1].categoryId || rows[idx - 1].subCategoryId)
                  const matchingUnclassifiedCount = (!isMoved && (row.categoryId || row.subCategoryId))
                    ? rows.filter((r, i) => i !== idx && r.status !== 'moved' && r.item.productName === row.item.productName && !r.categoryId && !r.subCategoryId).length
                    : 0

                  // Selected but still missing a category — exactly what
                  // blocks "Move selected" from being enabled; highlight it
                  // so it doesn't take scanning every row's dropdowns to find.
                  const needsClassification = !isMoved && row.selected && ((!row.categoryId && !row.subCategoryId) || rowStuckOnGroup(row))
                  // A category/domain picked via Suggest (or copied from
                  // another row) that isn't in THIS business's own category
                  // list — it may belong to a different business entirely,
                  // which fails the move with a foreign-key error. Flag it so
                  // the user re-picks a real option for this business instead
                  // of trusting what's already shown in the dropdown.
                  const categoryMayBeForeign = !isMoved && row.selected && !!(extraCat || extraDomain)

                  const cardBg = isMoved
                    ? 'bg-emerald-50 dark:bg-emerald-900/10'
                    : isError ? 'bg-red-50 dark:bg-red-900/10'
                    : isMoving ? 'opacity-60'
                    : !row.selected ? 'opacity-50'
                    : needsClassification ? 'bg-amber-50 dark:bg-amber-900/10 ring-1 ring-inset ring-amber-300 dark:ring-amber-700'
                    : categoryMayBeForeign ? 'bg-red-50 dark:bg-red-900/10 ring-1 ring-inset ring-red-300 dark:ring-red-700'
                    : ''

                  const selectCls = 'flex-1 min-w-0 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50'
                  // Solid backgrounds only — a native <select>'s popup list can't
                  // render a translucent (/NN opacity) background as a flat
                  // color, so on some devices (confirmed: Android) it falls back
                  // to a washed-out, low-contrast blend that's unreadable. Same
                  // class of bug as the opaque-overlay rule for popovers.
                  const classificationSelectCls = needsClassification
                    ? 'flex-1 min-w-0 px-2 py-1.5 border-2 border-amber-400 dark:border-amber-600 rounded-lg text-xs bg-amber-50 dark:bg-amber-950 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50'
                    : categoryMayBeForeign
                    ? 'flex-1 min-w-0 px-2 py-1.5 border-2 border-red-400 dark:border-red-600 rounded-lg text-xs bg-red-50 dark:bg-red-950 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 disabled:opacity-50'
                    : selectCls

                  return (
                    <div key={row.item.id} ref={el => { rowRefs.current[idx] = el }} className={`flex transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${cardBg}`}>

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
                          {isMoved && row.item.businessProductId && row.item.linkedProductBusinessType ? (
                            <button
                              type="button"
                              onClick={async () => {
                                try { sessionStorage.setItem(`wh-move-scroll-${batchId}`, String(window.scrollY)) } catch {}
                                const href = `/${row.item.linkedProductBusinessType}/inventory?productId=${encodeURIComponent(row.item.businessProductId!)}&returnTo=${encodeURIComponent(returnToUrl)}`
                                // The product only exists under the business it was
                                // actually moved into — if that's not the currently
                                // active business, editing 404s. Switch first so this
                                // always works regardless of what's active.
                                if (row.item.linkedProductBusinessId && row.item.linkedProductBusinessId !== currentBusinessId) {
                                  try { await switchBusiness(row.item.linkedProductBusinessId) } catch { toast.error('Could not switch to that business'); return }
                                }
                                router.push(href)
                              }}
                              className="flex-1 min-w-0 text-left text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline leading-snug line-clamp-2"
                              title="Open in Edit Item"
                            >
                              {row.item.productName}
                            </button>
                          ) : (
                            <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white leading-snug line-clamp-2" title={row.item.productName}>
                              {row.item.productName}
                            </p>
                          )}
                          <div className="shrink-0 flex items-center gap-1.5">
                            {isMoved ? (
                              <div className="flex flex-col items-end gap-0.5">
                                {row.item.linkedProductOriginalPrice != null &&
                                 row.item.linkedProductCurrentPrice != null &&
                                 Math.abs(row.item.linkedProductOriginalPrice - row.item.linkedProductCurrentPrice) > 0.001 && (
                                  <span
                                    className="text-xs text-amber-600 dark:text-amber-400 line-through cursor-help"
                                    title={[
                                      `Price at move time: $${row.item.linkedProductOriginalPrice.toFixed(2)}`,
                                      row.item.linkedProductPriceChangedAt ? `Changed on ${new Date(row.item.linkedProductPriceChangedAt).toLocaleString()}` : null,
                                      row.item.linkedProductPriceChangeReason ? `Reason: ${row.item.linkedProductPriceChangeReason}` : 'No reason recorded',
                                    ].filter(Boolean).join(' — ')}
                                  >
                                    was ${row.item.linkedProductOriginalPrice.toFixed(2)}
                                  </span>
                                )}
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  ${parseFloat(row.sellingPrice || '0').toFixed(2)}
                                </span>
                                {row.movedSku && (
                                  <span className="text-sm font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" title="Assigned SKU">
                                    SKU {row.movedSku}
                                  </span>
                                )}
                                {row.item.linkedProductBarcode ? (
                                  <span className="text-sm font-mono px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300" title="Assigned barcode">
                                    🏷 {row.item.linkedProductBarcode}
                                  </span>
                                ) : row.item.businessProductId && (
                                  barcodeAssignIdx === idx ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        autoFocus
                                        type="text"
                                        value={barcodeAssignValue}
                                        onChange={e => setBarcodeAssignValue(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') submitAssignBarcode(idx)
                                          if (e.key === 'Escape') { setBarcodeAssignIdx(null); setBarcodeAssignValue('') }
                                        }}
                                        placeholder="Scan or type barcode"
                                        className="w-32 px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                      />
                                      <button
                                        onClick={() => submitAssignBarcode(idx)}
                                        disabled={assigningBarcode}
                                        className="text-xs px-1.5 py-0.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                      >✓</button>
                                      <button
                                        onClick={() => { setBarcodeAssignIdx(null); setBarcodeAssignValue('') }}
                                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                      >✕</button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setBarcodeAssignIdx(idx); setBarcodeAssignValue('') }}
                                      className="text-xs px-1.5 py-0.5 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                    >📷 Scan Barcode</button>
                                  )
                                )}
                              </div>
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
                                disabled={isMoving || (!row.itemBusinessId && !selectedBusinessId) || (!row.subCategoryId && !row.categoryId) || rowStuckOnGroup(row) || !row.sellingPrice || parseFloat(row.sellingPrice) <= 0}
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

                          {isMoved && row.item.linkedProductCategoryName && (
                            // row.domainId/categoryId/subCategoryId are reset to
                            // '' for an already-moved row (see the row-building
                            // effect) and reflect pre-save UI picks anyway, not
                            // the true saved leaf -- use the same server-resolved
                            // breadcrumb the batch detail page shows instead, so
                            // this always matches what Edit Item actually has.
                            <div className="flex items-center gap-1 flex-wrap text-xs text-gray-500 dark:text-gray-400" title={[row.item.linkedProductDomainName, row.item.linkedProductCategoryName, row.item.linkedProductSubcategoryName].filter(Boolean).join(' > ')}>
                              {row.item.linkedProductDomainName && (
                                <>
                                  <span>{row.item.linkedProductDomainEmoji || '📦'} {row.item.linkedProductDomainName}</span>
                                  <span className="text-gray-400 dark:text-gray-500 font-bold">&gt;</span>
                                </>
                              )}
                              <span>{row.item.linkedProductCategoryEmoji || '📦'} {row.item.linkedProductCategoryName}</span>
                              {row.item.linkedProductSubcategoryName && (
                                <>
                                  <span className="text-gray-400 dark:text-gray-500 font-bold">&gt;</span>
                                  <span>{row.item.linkedProductSubcategoryEmoji || '📦'} {row.item.linkedProductSubcategoryName}</span>
                                </>
                              )}
                            </div>
                          )}

                          {hasDomains && (
                            isMoved ? null : (
                              <select
                                value={row.domainId}
                                disabled={isMoving}
                                onChange={e => updateRow(idx, { domainId: e.target.value, categoryId: '', subCategoryId: '' })}
                                className={classificationSelectCls}
                              >
                                <option value="">Domain…</option>
                                {extraDomain && <option value={extraDomain.id}>{extraDomain.emoji ? `${extraDomain.emoji} ` : ''}{extraDomain.name}</option>}
                                {departments.map(d => (
                                  <option key={d.id} value={d.id}>{d.emoji ? `${d.emoji} ` : ''}{d.name}</option>
                                ))}
                              </select>
                            )
                          )}

                          {isMoved ? null : (
                            <select
                              value={row.categoryId}
                              disabled={(hasDomains && !row.domainId) || (categories.length === 0 && !extraCat) || isMoving}
                              onChange={e => updateRow(idx, { categoryId: e.target.value, subCategoryId: '' })}
                              className={classificationSelectCls}
                            >
                              <option value="">Category…</option>
                              {extraCat && <option value={extraCat.id}>{extraCat.emoji ? `${extraCat.emoji} ` : ''}{extraCat.name}</option>}
                              <CategoryOptionGroups
                                categories={filteredCats.map(c => ({ ...c, parentName: c.parent?.name ?? null }))}
                                renderLabel={(c) => `${c.emoji ? `${c.emoji} ` : ''}${c.name}`}
                              />
                            </select>
                          )}

                          {!isMoved && (hasDomains ? !!row.domainId : true) && (
                            <button
                              type="button"
                              title="Create a new category for this business"
                              onClick={() => openCategoryEditor(idx)}
                              disabled={isMoving}
                              className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium border bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 disabled:opacity-40"
                            >+ Category</button>
                          )}

                          {isMoved ? null : (
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

                          {!isMoved && (
                            <button
                              type="button"
                              title={!row.categoryId ? 'Select a category first' : 'Create a new sub-category for this business'}
                              onClick={() => openQuickCreate(idx)}
                              disabled={!row.categoryId || isMoving}
                              className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium border bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed"
                            >+ Sub-cat</button>
                          )}

                          {!isMoved && suggestAllSubs.length > 0 && (
                            <button
                              type="button"
                              onClick={e => handleSuggest(idx, e)}
                              disabled={!effBizId}
                              title={!effBizId ? 'Select a target business first' : 'Suggest category from product name'}
                              className={`shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border disabled:opacity-40 disabled:cursor-not-allowed ${
                                suggestRowIdx === idx
                                  ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                  : 'bg-amber-50 border-amber-200 text-amber-600 hover:enabled:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700'
                              }`}
                            >🏷 Suggest</button>
                          )}

                          {canCopyFromAbove && (
                            <button
                              type="button"
                              onClick={() => copyClassificationFromAbove(idx)}
                              title="Copy category from the item above"
                              className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                            >↑ Same as above</button>
                          )}

                          {matchingUnclassifiedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => applyClassificationToMatching(idx)}
                              title={`Apply this category to ${matchingUnclassifiedCount} other unclassified item(s) with the same product name`}
                              className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700"
                            >⇊ Apply to {matchingUnclassifiedCount} matching</button>
                          )}

                          {categoryMayBeForeign && (
                            <span
                              className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                              title="This category/domain isn't in the target business's own list — it came from Suggest and may belong to a different business. Re-pick it from the dropdown to avoid a failed move."
                            >⚠ re-pick category for this business</span>
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
              <div className="flex items-start gap-2 mb-2">
                {rows[suggestRowIdx]?.item.imageId && (
                  <img
                    src={`/api/images/${rows[suggestRowIdx]?.item.imageId}`}
                    alt=""
                    className="w-10 h-10 shrink-0 rounded object-cover border border-gray-200 dark:border-gray-600"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Based on: <span className="font-medium text-gray-700 dark:text-gray-200">
                    &ldquo;{rows[suggestRowIdx]?.item.productName || ''}&rdquo;
                  </span>
                </p>
              </div>
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
                <div className="text-center py-2">
                  <p className="text-xs text-gray-500 mb-2">No matches found — select manually, or:</p>
                  <button
                    type="button"
                    onClick={() => { const idx = suggestRowIdx; setSuggestRowIdx(null); if (idx !== null) openCategoryEditor(idx) }}
                    className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
                  >+ Create new category</button>
                </div>
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

        {/* Standard category creation modal — same InventoryCategoryEditor used
            by bulk-stock-panel.tsx, scoped to the Target Business */}
        <InventoryCategoryEditor
          category={null}
          businessId={selectedBusinessId}
          businessType={selectedBusinessType}
          initialDomainId={categoryEditorRowIdx !== null ? (rows[categoryEditorRowIdx]?.domainId || undefined) : undefined}
          isOpen={categoryEditorRowIdx !== null}
          onSuccess={handleCategoryEditorSuccess}
          onCancel={() => setCategoryEditorRowIdx(null)}
        />

        {/* Quick-create sub-category modal (nested BusinessCategories row) */}
        {quickCreateRowIdx !== null && (() => {
          const qcRow = rows[quickCreateRowIdx]
          const parentCatName = qcRow?.categoryId ? (categories.find(c => c.id === qcRow.categoryId)?.name || '') : ''
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">New Sub-category</h3>
                {parentCatName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Under category: <span className="font-medium text-indigo-600 dark:text-indigo-400">{parentCatName}</span></p>
                )}
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="🏷"
                    value={quickCreateEmoji}
                    onChange={e => setQuickCreateEmoji(e.target.value)}
                    maxLength={4}
                    title="Emoji (optional)"
                    className="w-14 px-2 py-2 text-center text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Name"
                    value={quickCreateName}
                    onChange={e => { setQuickCreateName(e.target.value); setQuickCreateError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickCreate() }}
                    className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {quickCreateError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mb-3">{quickCreateError}</p>
                )}
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={() => setQuickCreateRowIdx(null)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleQuickCreate} disabled={quickCreateLoading || !quickCreateName.trim()}
                    className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">
                    {quickCreateLoading ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

      </ContentLayout>
    </ProtectedRoute>
  )
}
