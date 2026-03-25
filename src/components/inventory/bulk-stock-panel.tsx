'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { UniversalSupplierForm } from '@/components/universal/supplier'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { StockTakeReportPreview } from './stock-take-report-preview'
import { CustomBulkModal } from './custom-bulk-modal'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'

interface BulkStockRow {
  rowId: string
  barcode: string
  barcodeReadOnly: boolean
  name: string
  nameReadOnly: boolean
  // Category hierarchy — store the most specific (subCatId || catId is sent to API)
  departmentId: string
  categoryId: string
  subCategoryId: string
  supplierId: string
  description: string
  quantity: string
  sellingPrice: string
  costPrice: string
  sku: string
  isFreeItem: boolean
  isExistingItem: boolean
  itemType?: string             // 'product' | 'barcode' | 'bulk' | 'bale' — set for stock-take loaded rows
  currentStock: number | null   // systemQuantity from DB at time of scan/sync
  physicalCount: string         // actual physical shelf count entered by user
  needsReview: boolean          // true when a sale occurred for this item during stock take
  status: 'pending' | 'saving' | 'saved' | 'error'
  errorMessage?: string
}

interface DraftListItem {
  id: string
  title: string | null
  updatedAt: string
  itemCount: number
  isStockTakeMode?: boolean
}

interface BusinessCategory {
  id: string
  name: string
  emoji: string
  color: string
  parentId: string | null
  domainId?: string | null
}

interface Domain {
  id: string
  name: string
  emoji: string
}

interface Supplier {
  id: string
  name: string
}

interface BulkStockPanelProps {
  businessId: string
  businessName: string
  businessType: string
  onClose: () => void
  initialMode?: 'bulkStock' | 'stockTake'
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for HTTP (non-secure) contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function makeRow(overrides: Partial<BulkStockRow> = {}): BulkStockRow {
  return {
    rowId: generateId(),
    barcode: '',
    barcodeReadOnly: false,
    name: '',
    nameReadOnly: false,
    departmentId: '',
    categoryId: '',
    subCategoryId: '',
    supplierId: '',
    description: '',
    quantity: '',
    sellingPrice: '',
    costPrice: '',
    sku: '',
    isFreeItem: false,
    isExistingItem: false,
    itemType: undefined,
    currentStock: null,
    physicalCount: '',
    needsReview: false,
    status: 'pending',
    ...overrides,
  }
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin === 1) return '1 min ago'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  return diffHr === 1 ? '1 hr ago' : `${diffHr} hrs ago`
}

/** Resolve a stored leaf categoryId back to dept/category/subCat ids */
function resolveHierarchy(categoryId: string, allCats: BusinessCategory[]) {
  const cat = allCats.find(c => c.id === categoryId)
  if (!cat) return { departmentId: '', categoryId, subCategoryId: '' }
  // Domain-based departments (e.g. clothing): category has domainId, no parentId hierarchy
  if (cat.domainId && !cat.parentId) return { departmentId: cat.domainId, categoryId: cat.id, subCategoryId: '' }
  // ParentId-based hierarchy
  if (!cat.parentId) return { departmentId: '', categoryId: cat.id, subCategoryId: '' }
  const parent = allCats.find(c => c.id === cat.parentId)
  if (!parent) return { departmentId: '', categoryId: cat.id, subCategoryId: '' }
  if (!parent.parentId) return { departmentId: parent.id, categoryId: cat.id, subCategoryId: '' }
  const grandparent = allCats.find(c => c.id === parent.parentId)
  return { departmentId: grandparent?.id || '', categoryId: parent.id, subCategoryId: cat.id }
}

export function BulkStockPanel({ businessId, businessName, businessType, onClose, initialMode }: BulkStockPanelProps) {
  const confirm = useConfirm()
  const { push: toast, error: toastError } = useToastContext()

  const [rows, setRows] = useState<BulkStockRow[]>([])
  const [scanInput, setScanInput] = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [duplicateAlert, setDuplicateAlert] = useState<{ barcode: string; rowId: string } | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successSummary, setSuccessSummary] = useState<string | null>(null)

  // Shared category/supplier state — loaded once, shared across all rows
  const [allCats, setAllCats] = useState<BusinessCategory[]>([])
  const [domains, setDomains] = useState<Domain[]>([])                          // inventory domains (departments for clothing etc.)
  const [departments, setDepartments] = useState<BusinessCategory[]>([])        // either from domains or level-1 parentId
  const [allCategories, setAllCategories] = useState<BusinessCategory[]>([])
  const [allSubCategories, setAllSubCategories] = useState<BusinessCategory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Per-row validation errors: rowId → set of field names
  const [rowFieldErrors, setRowFieldErrors] = useState<Record<string, Set<string>>>({})

  // Quick-create state (categories only)
  const [quickCreateTargetRowId, setQuickCreateTargetRowId] = useState<string | null>(null)
  const [quickCreateLevel, setQuickCreateLevel] = useState<'category' | 'subcategory'>('category')
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateName, setQuickCreateName] = useState('')
  const [quickCreateLoading, setQuickCreateLoading] = useState(false)

  // Full supplier form modal
  const [showSupplierFormModal, setShowSupplierFormModal] = useState(false)
  const [supplierFormTargetRowId, setSupplierFormTargetRowId] = useState<string | null>(null)
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  // Draft state
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [draftUnsaved, setDraftUnsaved] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftCheckLoading, setDraftCheckLoading] = useState(true)
  const [draftList, setDraftList] = useState<DraftListItem[]>([])
  const [showDraftSelector, setShowDraftSelector] = useState(false)
  const [newDraftTitle, setNewDraftTitle] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [salesOccurredAt, setSalesOccurredAt] = useState<string | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [salesCount, setSalesCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null)
  // Tick state to force re-render for "X min ago" updates
  const [, setTick] = useState(0)

  // Stock Take Mode state
  const [isStockTakeMode, setIsStockTakeMode] = useState(false)
  const [stockTakeLoading, setStockTakeLoading] = useState(false)
  const [stockTakeLoadProgress, setStockTakeLoadProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [showStockTakeModeConfirm, setShowStockTakeModeConfirm] = useState(false)
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null)
  const [syncResetNotice, setSyncResetNotice] = useState(false)
  const [showCustomBulkModal, setShowCustomBulkModal] = useState(false)
  const [showModeSelector, setShowModeSelector] = useState(false)

  const scanInputRef = useRef<HTMLInputElement>(null)
  const tableEndRef = useRef<HTMLDivElement>(null)
  const tableTopRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Suppress global barcode modal while panel is open
  useEffect(() => {
    ;(window as any).__bulkStockingActive = true
    return () => { ;(window as any).__bulkStockingActive = false }
  }, [])

  // On mount: check for existing active drafts
  useEffect(() => {
    setDraftCheckLoading(true)
    fetch(`/api/stock-take/drafts?businessId=${businessId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.drafts) && d.drafts.length > 0) {
          const list: DraftListItem[] = d.drafts.map((dr: any) => ({
            id: dr.id,
            title: dr.title,
            updatedAt: dr.updatedAt,
            itemCount: dr._count?.items ?? 0,
            isStockTakeMode: dr.isStockTakeMode ?? false,
          }))
          setDraftList(list)
          setShowDraftSelector(true)
        } else {
          setDraftTitle(`Stock ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`)
          if (initialMode !== 'stockTake') {
            setShowModeSelector(true)
          }
          // Note: stockTake auto-activation is triggered after draftCheckLoading → false (see below)
        }
      })
      .catch(() => {
        setDraftTitle(`Stock ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`)
      })
      .finally(() => setDraftCheckLoading(false))
  }, [businessId])


  // Auto-save draft every 60 seconds when there are unsaved rows
  useEffect(() => {
    if (!draftUnsaved || rows.length === 0) return
    const timer = setInterval(() => saveDraft(), 60000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftUnsaved, rows.length])

  // Tick every 30s to update "X min ago" display
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(timer)
  }, [])

  // Load categories and suppliers once
  useEffect(() => {
    const fetchDomains = businessType === 'clothing'
      ? fetch(`/api/inventory/domains?businessType=clothing`).then(r => r.json())
      : Promise.resolve({ domains: [] })

    Promise.all([
      fetch(`/api/universal/categories?businessId=${businessId}&businessType=${businessType}`).then(r => r.json()),
      fetchDomains,
    ]).then(([catData, domainData]) => {
      const list: BusinessCategory[] = Array.isArray(catData) ? catData : (catData.data ?? catData.categories ?? [])
      setAllCats(list)
      const domainList: Domain[] = domainData.domains ?? []
      setDomains(domainList)

      if (domainList.length > 0) {
        setDepartments(domainList.map(d => ({ id: d.id, name: d.name, emoji: d.emoji || '📦', color: '#6366f1', parentId: null })))
        setAllCategories(list)
        setAllSubCategories([])
      } else {
        const level1 = list.filter(c => !c.parentId)
        const level1Ids = new Set(level1.map(c => c.id))
        const level2 = list.filter(c => c.parentId && level1Ids.has(c.parentId!))
        const level2Ids = new Set(level2.map(c => c.id))
        const level3 = list.filter(c => c.parentId && level2Ids.has(c.parentId!))
        if (level2.length > 0) {
          setDepartments(level1)
          setAllCategories(level2)
          setAllSubCategories(level3)
        } else {
          setDepartments([])
          setAllCategories(level1)
          setAllSubCategories([])
        }
      }
    }).catch(() => {})

    fetch(`/api/business/${businessId}/suppliers?isActive=true&limit=100`)
      .then(r => r.json())
      .then((d: any) => setSuppliers(Array.isArray(d) ? d : (d.data ?? d.suppliers ?? [])))
      .catch(() => {})
  }, [businessId, businessType])

  const focusScanInput = useCallback(() => {
    setTimeout(() => scanInputRef.current?.focus(), 50)
  }, [])

  const activateStockTakeMode = async () => {
    setShowModeSelector(false)
    setIsStockTakeMode(true)
    setStockTakeLoading(true)
    setStockTakeLoadProgress(null)

    // Default draft title for stock take
    const defaultTitle = `Stock Take ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
    if (!draftTitle.trim()) setDraftTitle(defaultTitle)

    try {
      // Create the draft immediately with isStockTakeMode=true so it's persisted
      if (!draftId) {
        const title = draftTitle.trim() || defaultTitle
        const createRes = await fetch('/api/stock-take/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, title, isStockTakeMode: true }),
        })
        const createData = await createRes.json()
        if (createData.success && createData.draft?.id) {
          setDraftId(createData.draft.id)
          setDraftTitle(title)
        }
      }

      // Load all active inventory
      const res = await fetch(`/api/stock-take/load-inventory?businessId=${businessId}`)
      const data = await res.json()
      if (!data.success) return

      setStockTakeLoadProgress({ loaded: 0, total: data.total })

      // Map API items to BulkStockRow format
      const loadedRows: BulkStockRow[] = []
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        const hierarchyPatch = item.categoryId && allCats.length > 0
          ? resolveHierarchy(item.categoryId, allCats)
          : { departmentId: '', categoryId: item.categoryId || '', subCategoryId: '' }

        loadedRows.push(makeRow({
          barcode: item.barcode || '',
          barcodeReadOnly: true,
          name: item.name || '',
          nameReadOnly: true,
          isExistingItem: true,
          itemType: item.itemType,
          currentStock: item.systemQuantity ?? 0,
          sellingPrice: String(item.sellingPrice || ''),
          costPrice: item.costPrice != null ? String(item.costPrice) : '',
          sku: item.sku || '',
          supplierId: item.supplierId || '',
          ...hierarchyPatch,
        }))

        // Update progress every 50 items
        if (i % 50 === 0) setStockTakeLoadProgress({ loaded: i + 1, total: data.total })
      }

      setStockTakeLoadProgress({ loaded: data.items.length, total: data.total })
      setRows(loadedRows)
      setDraftUnsaved(true)
    } finally {
      setStockTakeLoading(false)
      setStockTakeLoadProgress(null)
      focusScanInput()
    }
  }

  // Auto-activate stock take when initialMode='stockTake' and no existing drafts found
  useEffect(() => {
    if (initialMode === 'stockTake' && !draftCheckLoading && !showDraftSelector) {
      activateStockTakeMode()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftCheckLoading])

  const highlightRow = (rowId: string) => {
    setHighlightedRowId(rowId)
    setTimeout(() => setHighlightedRowId(null), 1500)
  }

  const handleScan = async (barcodeValue: string) => {
    const trimmed = barcodeValue.trim()
    if (!trimmed) return

    setScanInput('')

    // If mode selector is still showing, auto-select Bulk Stocking mode and continue
    if (showModeSelector) {
      setShowModeSelector(false)
    }

    // ── Stock Take Mode: existing row → move to top; new row → prepend ──
    if (isStockTakeMode) {
      const existingRow = rows.find(r => r.barcode === trimmed)
      if (existingRow) {
        // Move existing row to top for immediate physical count entry
        setRows(prev => [existingRow, ...prev.filter(r => r.rowId !== existingRow.rowId)])
        tableTopRef.current?.scrollIntoView({ behavior: 'smooth' })
        highlightRow(existingRow.rowId)
        focusScanInput()
        return
      }
      // New product not in list — look up and prepend
      setScanLoading(true)
      await new Promise(r => setTimeout(r, 0))
      try {
        const res = await fetch(`/api/global/inventory-lookup/${encodeURIComponent(trimmed)}`)
        const data = await res.json()
        const match = data?.data?.businesses?.find(
          (b: any) => b.businessId === businessId && b.isInventoryItem
        )
        let hierarchyPatch: Partial<BulkStockRow> = {}
        if (match?.categoryId && allCats.length > 0) {
          hierarchyPatch = resolveHierarchy(match.categoryId, allCats)
        }
        const newRow = makeRow({
          barcode: trimmed,
          barcodeReadOnly: true,
          ...(match ? {
            name: match.productName || '',
            nameReadOnly: true,
            isExistingItem: true,
            currentStock: match.stockQuantity ?? null,
            sellingPrice: String(match.price || ''),
            sku: match.sku || '',
            supplierId: match.supplierId || '',
            ...hierarchyPatch,
          } : {}),
        })
        setRows(prev => [newRow, ...prev])
        setDraftUnsaved(true)
        tableTopRef.current?.scrollIntoView({ behavior: 'smooth' })
        highlightRow(newRow.rowId)
      } finally {
        setScanLoading(false)
        focusScanInput()
      }
      return
    }

    // ── Normal Mode ──
    const existing = rows.find(r => r.barcode === trimmed)
    if (existing) {
      setDuplicateAlert({ barcode: trimmed, rowId: existing.rowId })
      return
    }

    setScanLoading(true)
    // Yield to the browser so the loading state renders before the fetch starts
    await new Promise(r => setTimeout(r, 0))
    let match: any = null
    let hierarchyPatch: Partial<BulkStockRow> = {}
    try {
      const res = await fetch(`/api/global/inventory-lookup/${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      match = data?.data?.businesses?.find(
        (b: any) => b.businessId === businessId && b.isInventoryItem
      )
      if (match?.categoryId && allCats.length > 0) {
        hierarchyPatch = resolveHierarchy(match.categoryId, allCats)
      }
    } catch {
      // Lookup failed — still add a blank row with the scanned barcode
    }

    const newRow = makeRow({
      barcode: trimmed,
      barcodeReadOnly: true,
      ...(match ? {
        name: match.productName || '',
        nameReadOnly: true,
        isExistingItem: true,
        currentStock: match.stockQuantity ?? null,
        sellingPrice: String(match.price || ''),
        sku: match.sku || '',
        supplierId: match.supplierId || '',
        ...hierarchyPatch,
      } : {}),
    })
    setRows(prev => [...prev, newRow])
    setDraftUnsaved(true)
    tableEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setScanLoading(false)
    focusScanInput()
  }

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleScan(scanInput)
  }

  const addBlankRow = () => {
    setRows(prev => [...prev, makeRow()])
    setDraftUnsaved(true)
    tableEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    focusScanInput()
  }

  const removeRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.rowId !== rowId))
    setDraftUnsaved(true)
    setRowFieldErrors(prev => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const updateRow = (rowId: string, patch: Partial<BulkStockRow>) => {
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, ...patch } : r))
    setDraftUnsaved(true)
    // Clear validation errors for fields being updated; remove row entry when no errors remain
    setRowFieldErrors(prev => {
      if (!prev[rowId]) return prev
      const next = new Set(prev[rowId])
      Object.keys(patch).forEach(k => next.delete(k))
      if (next.size === 0) {
        const { [rowId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [rowId]: next }
    })
  }

  const saveDraft = async () => {
    if (rows.length === 0) return
    setDraftLoading(true)
    try {
      const items = rows.map((r, i) => ({
        barcode: r.barcode,
        name: r.name,
        categoryId: r.subCategoryId || r.categoryId || undefined,
        supplierId: r.supplierId || undefined,
        description: r.description || undefined,
        newQuantity: r.quantity ? Number(r.quantity) : 0,
        sellingPrice: r.sellingPrice ? Number(r.sellingPrice) : 0,
        costPrice: r.costPrice ? Number(r.costPrice) : undefined,
        sku: r.sku || undefined,
        isExistingItem: r.isExistingItem,
        systemQuantity: r.currentStock ?? undefined,
        physicalCount: r.physicalCount !== '' ? Number(r.physicalCount) : undefined,
        displayOrder: i,
      }))

      let activeDraftId = draftId
      if (!activeDraftId) {
        const title = draftTitle.trim() || `Stock ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
        const createRes = await fetch('/api/stock-take/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, title, isStockTakeMode }),
        })
        const createData = await createRes.json()
        if (createData.success && createData.draft?.id) {
          activeDraftId = createData.draft.id
          setDraftId(activeDraftId)
          setDraftTitle(title)
        }
      }
      if (activeDraftId) {
        const res = await fetch(`/api/stock-take/drafts/${activeDraftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: draftTitle.trim() || undefined, isStockTakeMode, items }),
        })
        if (res.ok) {
          setDraftSavedAt(new Date())
          setDraftUnsaved(false)
        }
      }
    } catch (e) {
      // silent — user can retry manually
    } finally {
      setDraftLoading(false)
    }
  }

  const handleSync = async () => {
    if (!draftId) return
    setSyncing(true)
    try {
      const res = await fetch(`/api/stock-take/drafts/${draftId}/sync`, { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        const changeMap: Record<string, number> = {}
        ;(d.updates ?? []).forEach((c: any) => { if (c.changed) changeMap[c.barcode] = c.newSystemQty })
        const removedSet = new Set<string>(d.removedBarcodes ?? [])
        setRows(prev => prev
          .filter(r => !removedSet.has(r.barcode))
          .map(r => ({
            ...r,
            currentStock: changeMap[r.barcode] !== undefined ? changeMap[r.barcode] : r.currentStock,
            needsReview: false,
          }))
        )
        setLastSyncedAt(d.syncedAt ?? new Date().toISOString())
        if (d.removedBaleCount > 0) {
          toast(`${d.removedBaleCount} bale(s) removed — transferred to another business.`, { type: 'warning' })
        }
      }
    } finally {
      setSyncing(false)
    }
  }

  const handleResumeDraft = async (selectedDraftId: string) => {
    setDraftLoading(true)
    try {
      const res = await fetch(`/api/stock-take/drafts/${selectedDraftId}`)
      const d = await res.json()
      if (!d.success || !d.draft) return
      const draft = d.draft
      // needsReview items float to top, then sort by displayOrder
      const sortedItems = [...(draft.items ?? [])].sort((a: any, b: any) => {
        if (a.needsReview && !b.needsReview) return -1
        if (!a.needsReview && b.needsReview) return 1
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
      })
      const restoredRows: BulkStockRow[] = sortedItems.map((item: any) => {
        const hierarchyPatch = item.categoryId && allCats.length > 0
          ? resolveHierarchy(item.categoryId, allCats)
          : { departmentId: '', categoryId: item.categoryId || '', subCategoryId: '' }
        // Infer itemType from name suffix when not stored (legacy drafts)
        const inferredType = item.itemType
          ?? (item.name?.endsWith('[Bale]') ? 'bale'
            : item.name?.endsWith('[Bulk]') ? 'bulk'
            : undefined)
        return makeRow({
          barcode: item.barcode || '',
          barcodeReadOnly: !!item.barcode,
          name: item.name || '',
          nameReadOnly: item.isExistingItem,
          isExistingItem: item.isExistingItem,
          itemType: inferredType,
          currentStock: item.systemQuantity ?? null,
          physicalCount: item.physicalCount != null ? String(item.physicalCount) : '',
          needsReview: item.needsReview ?? false,
          quantity: item.newQuantity != null ? String(item.newQuantity) : '',
          sellingPrice: item.sellingPrice != null ? String(item.sellingPrice) : '',
          costPrice: item.costPrice != null ? String(item.costPrice) : '',
          sku: item.sku || '',
          supplierId: item.supplierId || '',
          description: item.description || '',
          ...hierarchyPatch,
        })
      })
      setRows(restoredRows)
      setDraftId(draft.id)
      setDraftTitle(draft.title || '')
      setDraftSavedAt(new Date(draft.updatedAt))
      setDraftUnsaved(false)
      setShowDraftSelector(false)
      setSalesOccurredAt(draft.salesOccurredAt ?? null)
      setLastSyncedAt(draft.lastSyncedAt ?? null)
      setSalesCount(draft.salesCount ?? 0)

      // Stock Take Mode: restore mode flag, auto-sync, and reset all physical counts
      if (draft.isStockTakeMode) {
        setIsStockTakeMode(true)
        setSyncing(true)
        try {
          const syncRes = await fetch(`/api/stock-take/drafts/${draft.id}/sync`, { method: 'POST' })
          const syncData = await syncRes.json()
          if (syncData.success && syncData.updates) {
            const changeMap: Record<string, number> = {}
            syncData.updates.forEach((c: any) => { if (c.changed) changeMap[c.barcode] = c.newSystemQty })
            setRows(prev => prev.map(r => ({
              ...r,
              currentStock: changeMap[r.barcode] !== undefined ? changeMap[r.barcode] : r.currentStock,
              physicalCount: '',  // reset all counts — force fresh count every session
            })))
          } else {
            // Sync failed or no updates — still reset counts
            setRows(prev => prev.map(r => ({ ...r, physicalCount: '' })))
          }
          setSyncResetNotice(true)
          setTimeout(() => setSyncResetNotice(false), 5000)
        } finally {
          setSyncing(false)
        }
      }
    } finally {
      setDraftLoading(false)
    }
  }

  const handleStartNewDraft = async () => {
    const title = newDraftTitle.trim() || `Stock ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
    setDraftLoading(true)
    try {
      const res = await fetch('/api/stock-take/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, title }),
      })
      const d = await res.json()
      if (d.success && d.draft?.id) {
        setDraftId(d.draft.id)
        setDraftTitle(title)
        setDraftSavedAt(null)
        setDraftUnsaved(false)
        setRows([])
        setShowDraftSelector(false)
        setNewDraftTitle('')
      }
    } finally {
      setDraftLoading(false)
    }
  }

  const handleSwitchDraft = async () => {
    // Save current work first, then reload the draft list and show selector
    if (rows.length > 0) await saveDraft()
    const res = await fetch(`/api/stock-take/drafts?businessId=${businessId}`)
    const d = await res.json()
    if (d.success && Array.isArray(d.drafts)) {
      setDraftList(d.drafts.map((dr: any) => ({
        id: dr.id, title: dr.title, updatedAt: dr.updatedAt, itemCount: dr._count?.items ?? 0, isStockTakeMode: dr.isStockTakeMode ?? false,
      })))
    }
    setShowDraftSelector(true)
  }

  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null)

  const handleDeleteDraftFromList = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const ok = await confirm({ title: 'Delete draft', description: 'This draft will be permanently deleted. This cannot be undone.', confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return
    setDeletingDraftId(id)
    try {
      const res = await fetch(`/api/stock-take/drafts/${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success || res.status === 404) {
        setDraftList(prev => prev.filter(dr => dr.id !== id))
        toast('Draft deleted', { type: 'success' })
      } else {
        toastError(d.error || 'Failed to delete draft')
      }
    } catch {
      toastError('Failed to delete draft')
    } finally {
      setDeletingDraftId(null)
    }
  }

  const handleDeleteCurrentDraft = async () => {
    if (!draftId) return
    const ok = await confirm({ title: 'Delete this draft?', description: 'All rows and progress in this draft will be permanently deleted.', confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return
    setDraftLoading(true)
    try {
      const res = await fetch(`/api/stock-take/drafts/${draftId}`, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) {
        toast('Draft deleted', { type: 'success' })
        onClose()
      } else {
        toastError(d.error || 'Failed to delete draft')
      }
    } catch {
      toastError('Failed to delete draft')
    } finally {
      setDraftLoading(false)
    }
  }

  const handleGoToDuplicate = () => {
    if (!duplicateAlert) return
    const el = rowRefs.current[duplicateAlert.rowId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-yellow-400')
      setTimeout(() => el.classList.remove('ring-2', 'ring-yellow-400'), 2000)
    }
    setDuplicateAlert(null)
    focusScanInput()
  }

  // Quick-create opener (categories only)
  const openQuickCreate = (rowId: string, level: 'category' | 'subcategory') => {
    setQuickCreateTargetRowId(rowId)
    setQuickCreateLevel(level)
    setQuickCreateName('')
    setShowQuickCreate(true)
  }

  // Open full supplier form
  const openSupplierForm = (rowId: string) => {
    setSupplierFormTargetRowId(rowId)
    setShowSupplierFormModal(true)
  }

  // Handle full supplier form submit
  const handleNewSupplierSubmit = async (data: any) => {
    setCreatingSupplier(true)
    try {
      const res = await fetch(`/api/business/${businessId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (res.ok && (json.id || json.supplier?.id)) {
        const newSup: Supplier = { id: json.id || json.supplier?.id, name: data.name }
        setSuppliers(prev => [...prev, newSup])
        if (supplierFormTargetRowId) updateRow(supplierFormTargetRowId, { supplierId: newSup.id })
        setShowSupplierFormModal(false)
        setSupplierFormTargetRowId(null)
      }
    } finally {
      setCreatingSupplier(false)
    }
  }

  const handleQuickCreate = async () => {
    if (!quickCreateName.trim() || !quickCreateTargetRowId) return
    const targetRow = rows.find(r => r.rowId === quickCreateTargetRowId)
    setQuickCreateLoading(true)
    try {
      // For domain-based businesses (clothing): top-level categories link via domainId, not parentId
      const isDomainBased = domains.length > 0
      const parentId = quickCreateLevel === 'subcategory'
        ? targetRow?.categoryId
        : (isDomainBased ? undefined : targetRow?.departmentId)
      const domainId = quickCreateLevel !== 'subcategory' && isDomainBased
        ? targetRow?.departmentId
        : undefined
      const res = await fetch('/api/universal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          name: quickCreateName.trim(),
          ...(parentId ? { parentId } : {}),
          ...(domainId ? { domainId } : {}),
        }),
      })
      const data = await res.json()
      if (!data.success && !data.id) return
      const newCat: BusinessCategory = {
        id: data.id || data.data?.id,
        name: quickCreateName.trim(),
        emoji: data.emoji || data.data?.emoji || '📦',
        color: data.color || data.data?.color || '#3B82F6',
        parentId: parentId || null,
        domainId: domainId || data.domainId || data.data?.domainId || null,
      }
      setAllCats(prev => [...prev, newCat])
      if (quickCreateLevel === 'subcategory') {
        setAllSubCategories(prev => [...prev, newCat])
        updateRow(quickCreateTargetRowId, { subCategoryId: newCat.id })
      } else {
        setAllCategories(prev => [...prev, newCat])
        updateRow(quickCreateTargetRowId, { categoryId: newCat.id, subCategoryId: '' })
      }
      setQuickCreateName('')
      setShowQuickCreate(false)
      setQuickCreateTargetRowId(null)
    } finally {
      setQuickCreateLoading(false)
    }
  }

  // Submit batch
  const validateRows = (): boolean => {
    const fieldErrorMap: Record<string, Set<string>> = {}
    rows.forEach(r => {
      const bad = new Set<string>()
      if (!r.name.trim()) bad.add('name')
      if (!r.isExistingItem && !r.categoryId && !r.subCategoryId) bad.add('categoryId')
      if (!r.isExistingItem && (!r.quantity || Number(r.quantity) < 1)) bad.add('quantity')
      if (r.isExistingItem && r.currentStock !== null && r.currentStock > 0 && (r.physicalCount === '' || Number(r.physicalCount) === 0)) bad.add('physicalCount')
      if (!r.isFreeItem && !r.isExistingItem && Number(r.sellingPrice) <= 0) bad.add('sellingPrice')
      if (!r.isFreeItem && r.isExistingItem && (!r.sellingPrice || Number(r.sellingPrice) < 0)) bad.add('sellingPrice')
      if (bad.size > 0) fieldErrorMap[r.rowId] = bad
    })
    if (Object.keys(fieldErrorMap).length > 0) {
      setRowFieldErrors(fieldErrorMap)
      const firstBadId = rows.find(r => fieldErrorMap[r.rowId])?.rowId
      if (firstBadId) {
        rowRefs.current[firstBadId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }
    setRowFieldErrors({})
    return true
  }

  const handleSubmit = async () => {
    setSubmitError('')
    if (rows.length === 0) { setSubmitError('Add at least one item before submitting'); return }
    if (!validateRows()) return

    setSubmitLoading(true)
    setRows(prev => prev.map(r => ({ ...r, status: 'saving' })))
    try {
      const res = await fetch('/api/inventory/bulk-add-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          items: rows.map(r => ({
            barcode: r.barcode,
            name: r.name.trim(),
            // Send most specific (leaf) category
            categoryId: (r.subCategoryId || r.categoryId) || undefined,
            supplierId: r.supplierId || undefined,
            description: r.description.trim() || undefined,
            quantity: Number(r.quantity),
            sellingPrice: r.isFreeItem ? 0 : Number(r.sellingPrice),
            costPrice: r.costPrice ? Number(r.costPrice) : undefined,
            sku: r.sku.trim() || undefined,
            physicalCount: r.isExistingItem && r.physicalCount !== '' ? Number(r.physicalCount) : undefined,
          })),
        }),
      })
      const data = await res.json()
      if (!data.success) { setSubmitError(data.error || 'Batch submission failed'); return }

      if (data.results) {
        setRows(prev => prev.map((r, i) => ({
          ...r,
          status: data.results[i]?.success ? 'saved' : 'error',
          errorMessage: data.results[i]?.error,
        })))
      }

      const created = data.created ?? rows.length
      setSuccessSummary(`${created} item${created !== 1 ? 's' : ''} added to inventory`)
      // Clean up draft after successful submission
      if (draftId) {
        fetch(`/api/stock-take/drafts/${draftId}`, { method: 'DELETE' }).catch(() => {})
        setDraftId(null)
        setDraftSavedAt(null)
        setDraftUnsaved(false)
      }
      setTimeout(() => {
        setRows(prev => prev.filter(r => r.status !== 'saved'))
        setSuccessSummary(null)
      }, 3000)
    } catch (e: any) {
      setSubmitError(e.message || 'Batch submission failed')
      setRows(prev => prev.map(r => ({ ...r, status: 'pending' })))
    } finally {
      setSubmitLoading(false)
    }
  }

  const pendingCount = rows.filter(r => r.status === 'pending' || r.status === 'error').length
  const syncRequired = isStockTakeMode && !!salesOccurredAt && (!lastSyncedAt || new Date(lastSyncedAt) < new Date(salesOccurredAt))
  const needsReviewCount = rows.filter(r => r.needsReview).length
  const hasDeptCol = departments.length > 0
  const hasSubCatCol = true // always show sub-category column
  const hasExistingItems = rows.some(r => r.isExistingItem)

  // Stock take progress counts
  const countedCount = isStockTakeMode ? rows.filter(r => r.isExistingItem && r.physicalCount !== '').length : 0
  const totalCountable = isStockTakeMode ? rows.filter(r => r.isExistingItem).length : 0

  // Label for quick-create form
  const quickCreateLabel = quickCreateLevel === 'subcategory' ? 'New Sub-category' : 'New Category'

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col pb-20">

      {/* Barcode lookup overlay */}
      {scanLoading && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex flex-col items-center justify-center cursor-wait">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-white/20 border-t-white mb-4" />
          <p className="text-white text-sm font-medium tracking-wide">Looking up barcode…</p>
        </div>
      )}

      {/* Stock Take inventory load overlay */}
      {stockTakeLoading && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex flex-col items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-4 min-w-[280px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600" />
            <p className="text-base font-semibold text-gray-800 dark:text-white">Loading inventory…</p>
            {stockTakeLoadProgress && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stockTakeLoadProgress.loaded} / {stockTakeLoadProgress.total} products
              </p>
            )}
          </div>
        </div>
      )}
      {/* Mode Selector — shown on fresh start when no existing drafts */}
      {showModeSelector && !draftCheckLoading && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">What would you like to do?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose a mode for this session</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowModeSelector(false)}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                <p className="font-semibold text-gray-900 dark:text-white">📦 Bulk Stocking</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Scan barcodes to add or receive new stock</p>
              </button>
              <button
                onClick={() => { setShowModeSelector(false); activateStockTakeMode() }}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-teal-200 dark:border-teal-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors">
                <p className="font-semibold text-gray-900 dark:text-white">📋 Stock Take Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Count all existing inventory and record physical counts</p>
              </button>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 flex-wrap">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 shrink-0">
          ← Back
        </button>
        <span className="font-bold text-gray-900 dark:text-white text-base shrink-0">
          {isStockTakeMode ? '📋 Stock Take' : 'Bulk Stocking'} — {businessName}
        </span>
        {isStockTakeMode && totalCountable > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shrink-0">
            Counted: {countedCount} / {totalCountable}
          </span>
        )}
        {/* Editable draft title */}
        {!showDraftSelector && !draftCheckLoading && (
          <input
            type="text"
            value={draftTitle}
            onChange={e => { setDraftTitle(e.target.value); setDraftUnsaved(true) }}
            onBlur={() => { if (draftId && draftTitle.trim()) saveDraft() }}
            placeholder="Draft name…"
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-1 focus:ring-indigo-400 w-48"
          />
        )}
        {/* Draft status */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {draftSavedAt && !draftUnsaved && (
            <span className="text-xs text-green-600 dark:text-green-400">✓ Saved {formatTimeAgo(draftSavedAt)}</span>
          )}
          {draftUnsaved && (
            <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">● Unsaved changes</span>
          )}
          {draftId && (
            <button onClick={handleSync} disabled={syncing}
              title="Re-fetch live stock quantities for existing items"
              className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
              {syncing ? 'Syncing…' : '↻ Sync Stock'}
            </button>
          )}
          <button onClick={handleSwitchDraft} disabled={draftLoading || draftCheckLoading}
            className="px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
            ⇄ Switch Draft
          </button>
          {draftId && (
            <button onClick={handleDeleteCurrentDraft} disabled={draftLoading}
              className="px-2.5 py-1 text-xs border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">
              🗑 Delete Draft
            </button>
          )}
          <button onClick={saveDraft} disabled={draftLoading || rows.length === 0}
            className="px-2.5 py-1 text-xs border border-indigo-300 dark:border-indigo-700 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-50">
            {draftLoading ? 'Saving…' : '💾 Save Draft'}
          </button>
        </div>
      </div>

      {/* Scan bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 flex-wrap">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">Barcode:</label>
        <div className="relative flex-1 min-w-[180px]">
          <input
            ref={scanInputRef}
            autoFocus
            type="text"
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            onKeyDown={handleScanKeyDown}
            placeholder={draftCheckLoading ? 'Checking for drafts…' : 'Scan or type barcode, press Enter'}
            disabled={scanLoading || draftCheckLoading}
            className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 pr-8 ${(scanLoading || draftCheckLoading) ? 'border-indigo-400 dark:border-indigo-500 opacity-60' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {(scanLoading || draftCheckLoading) && (
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
        </div>
        {draftCheckLoading && (
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse shrink-0">
            Checking for drafts…
          </span>
        )}
        {scanLoading && !draftCheckLoading && (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 animate-pulse shrink-0">
            Looking up barcode…
          </span>
        )}
        <div className="flex gap-2 ml-auto flex-wrap">
          {/* Register Custom Bulk Product */}
          <button
            onClick={() => setShowCustomBulkModal(true)}
            className="px-3 py-1.5 text-sm border border-orange-400 dark:border-orange-600 rounded-lg text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 font-medium">
            📦 Bulk Product
          </button>
          {/* Stock Take Mode toggle */}
          {!isStockTakeMode ? (
            <button
              onClick={() => rows.length > 0 ? setShowStockTakeModeConfirm(true) : activateStockTakeMode()}
              disabled={draftCheckLoading || stockTakeLoading}
              className="px-3 py-1.5 text-sm border border-teal-400 dark:border-teal-600 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 font-medium disabled:opacity-40">
              📋 Stock Take Mode
            </button>
          ) : (
            <span className="px-3 py-1.5 text-sm rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-medium border border-teal-300 dark:border-teal-700 cursor-default">
              📋 Stock Take — Active
            </span>
          )}
          {!isStockTakeMode && (
            <button onClick={addBlankRow} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              + Add Row
            </button>
          )}
          <button
            onClick={() => { if (validateRows()) setShowReviewModal(true) }}
            disabled={rows.length === 0 || syncRequired}
            title={syncRequired ? 'Sync required before submitting' : undefined}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium">
            Review & Submit ({pendingCount} item{pendingCount !== 1 ? 's' : ''})
          </button>
        </div>
      </div>

      {/* Search / filter bar */}
      {rows.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filter by barcode, name, description…"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          {searchQuery && (
            <>
              <span className="text-xs text-gray-400 shrink-0">
                {rows.filter(r => {
                  const q = searchQuery.toLowerCase()
                  return r.barcode.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
                }).length} of {rows.length}
              </span>
              <button onClick={() => setSearchQuery('')}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 shrink-0">
                Reset
              </button>
            </>
          )}
        </div>
      )}

      {/* Duplicate alert */}
      {duplicateAlert && (
        <div className="mx-4 mt-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-3">
          <span>⚠️ <strong>{duplicateAlert.barcode}</strong> is already in this batch.</span>
          <button onClick={handleGoToDuplicate} className="underline text-yellow-700 dark:text-yellow-400">Go to row</button>
          <button onClick={() => { setDuplicateAlert(null); focusScanInput() }} className="ml-auto text-yellow-600">Skip</button>
        </div>
      )}

      {successSummary && (
        <div className="mx-4 mt-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-sm text-green-800 dark:text-green-300">
          ✅ {successSummary}
        </div>
      )}

      {Object.keys(rowFieldErrors).length > 0 && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <span className="font-medium">⚠ {Object.keys(rowFieldErrors).length} row{Object.keys(rowFieldErrors).length !== 1 ? 's' : ''} need attention</span>
          <span className="text-xs text-red-500">— highlighted below</span>
        </div>
      )}
      {submitError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-xs text-red-800 dark:text-red-300">
          {submitError}
        </div>
      )}

      {/* Sync-reset notice (stock take mode resume) */}
      {syncResetNotice && (
        <div className="mx-4 mt-3 px-3 py-2 bg-teal-50 dark:bg-teal-900/20 border border-teal-300 dark:border-teal-700 rounded-lg text-sm text-teal-800 dark:text-teal-300 flex items-center justify-between">
          <span>↻ Stock levels synced — physical counts have been reset for a fresh count.</span>
          <button onClick={() => setSyncResetNotice(false)} className="text-teal-600 ml-3">✕</button>
        </div>
      )}

      {/* Sales-during-stock-take warning banner */}
      {syncRequired && (
        <div className="mx-4 mt-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-400 dark:border-amber-600 rounded-lg flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              ⚠️ {salesCount} sale{salesCount !== 1 ? 's' : ''} occurred during this stock take
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {needsReviewCount > 0
                ? `${needsReviewCount} affected row${needsReviewCount !== 1 ? 's' : ''} highlighted below and moved to the top.`
                : 'No matching items found in this draft.'}{' '}
              Sync to update system quantities before submitting.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50">
            {syncing ? 'Syncing…' : '↻ Sync Now'}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <div ref={tableTopRef} />
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="text-lg">📦</p>
            <p className="text-sm mt-2">Scan a barcode or click + Add Row to start</p>
          </div>
        ) : (
          <table className="min-w-max w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
                <th className="px-2 py-2 text-center w-8">#</th>
                <th className="px-2 py-2 text-left min-w-[110px]">Barcode</th>
                <th className="px-2 py-2 text-left min-w-[180px]">Name *</th>
                {hasDeptCol && <th className="px-2 py-2 text-left min-w-[150px]">Department</th>}
                <th className="px-2 py-2 text-left min-w-[160px]">Category *</th>
                {hasSubCatCol && <th className="px-2 py-2 text-left min-w-[160px]">Sub-category</th>}
                <th className="px-2 py-2 text-left min-w-[160px]">Supplier</th>
                <th className="px-2 py-2 text-left min-w-[150px]">Description</th>
                <th className="px-2 py-2 text-center w-16">System</th>
                {hasExistingItems && <th className="px-2 py-2 text-center w-24">Physical</th>}
                {hasExistingItems && <th className="px-2 py-2 text-center w-20">Variance</th>}
                <th className="px-2 py-2 text-center w-24">Qty *</th>
                <th className="px-2 py-2 text-center w-28">Sell Price *</th>
                <th className="px-2 py-2 text-center w-14">Free?</th>
                <th className="px-2 py-2 text-center w-28">Cost</th>
                <th className="px-2 py-2 text-left w-32">SKU</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.filter(row => {
                if (!searchQuery) return true
                const q = searchQuery.toLowerCase()
                return row.barcode.toLowerCase().includes(q) || row.name.toLowerCase().includes(q) || row.description.toLowerCase().includes(q)
              }).map((row, idx) => (
                <BulkRowEditor
                  key={row.rowId}
                  row={row}
                  rowNumber={idx + 1}
                  domains={domains}
                  departments={departments}
                  allCategories={allCategories}
                  allSubCategories={allSubCategories}
                  suppliers={suppliers}
                  hasDeptCol={hasDeptCol}
                  hasSubCatCol={hasSubCatCol}
                  invalidFields={rowFieldErrors[row.rowId] ?? new Set()}
                  onChange={patch => updateRow(row.rowId, patch)}
                  onRemove={() => removeRow(row.rowId)}
                  onNewCategory={() => openQuickCreate(row.rowId, 'category')}
                  onNewSubCategory={() => openQuickCreate(row.rowId, 'subcategory')}
                  onNewSupplier={() => openSupplierForm(row.rowId)}
                  rowRef={(el: HTMLTableRowElement | null) => { rowRefs.current[row.rowId] = el }}
                  hasPhysicalCountCol={hasExistingItems}
                  isStockTakeMode={isStockTakeMode}
                  isHighlighted={highlightedRowId === row.rowId}
                  needsReview={row.needsReview}
                />
              ))}
            </tbody>
          </table>
        )}
        <div ref={tableEndRef} />
      </div>

      {/* Full supplier creation modal */}
      {showSupplierFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <UniversalSupplierForm
            businessId={businessId}
            businessType={businessType as any}
            onSubmit={handleNewSupplierSubmit}
            onCancel={() => { setShowSupplierFormModal(false); setSupplierFormTargetRowId(null) }}
            loading={creatingSupplier}
          />
        </div>
      )}

      {/* Draft selector modal */}
      {showDraftSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Your Saved Drafts</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Select a draft to continue, or start a new one.</p>

            {/* Existing drafts list */}
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {draftList.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <button onClick={() => handleResumeDraft(d.id)} disabled={draftLoading} className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                      {d.isStockTakeMode && <span className="text-teal-600 dark:text-teal-400">📋</span>}
                      {d.title || 'Unnamed Draft'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {d.itemCount} item{d.itemCount !== 1 ? 's' : ''} · Last saved {new Date(d.updatedAt).toLocaleString()}
                    </p>
                  </button>
                  <button onClick={e => handleDeleteDraftFromList(e, d.id)} disabled={draftLoading || deletingDraftId === d.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 shrink-0 px-2 py-0.5 rounded border border-red-200 hover:border-red-400"
                    title="Delete this draft">
                    {deletingDraftId === d.id ? '…' : '🗑 Delete'}
                  </button>
                </div>
              ))}
            </div>

            {/* Start new draft */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Start a new draft</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDraftTitle}
                  onChange={e => setNewDraftTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleStartNewDraft() }}
                  placeholder={`Stock ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleStartNewDraft} disabled={draftLoading}
                  className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium shrink-0">
                  {draftLoading ? 'Creating…' : '+ New Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review & Submit — full-screen StockTakeReportPreview */}
      {showReviewModal && !submittedReportId && (
        <StockTakeReportPreview
          businessId={businessId}
          businessName={businessName}
          draftId={draftId}
          rows={rows.map(r => ({
            barcode: r.barcode,
            name: r.name,
            isExistingItem: r.isExistingItem,
            currentStock: r.currentStock,
            physicalCount: r.physicalCount,
            quantity: r.quantity,
            sellingPrice: r.sellingPrice,
            isFreeItem: r.isFreeItem,
          }))}
          isStockTakeMode={isStockTakeMode}
          onBack={() => setShowReviewModal(false)}
          onSubmitSuccess={reportId => {
            setSubmittedReportId(reportId)
            setDraftId(null)
            setDraftTitle('')
            setDraftSavedAt(null)
            setDraftUnsaved(false)
            setRows([])
          }}
        />
      )}

      {/* Post-submit success screen */}
      {submittedReportId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Stock Take Submitted</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              The report has been created and is pending sign-off.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setSubmittedReportId(null); setShowReviewModal(false); onClose() }}
                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Take Mode confirmation (shown when rows already exist) */}
      {showStockTakeModeConfirm && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Start Stock Take Mode?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Your current work will be saved as a draft. A new Stock Take draft will be created and all active inventory will be loaded automatically.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowStockTakeModeConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={async () => {
                  setShowStockTakeModeConfirm(false)
                  await saveDraft()
                  // Reset to fresh state then activate
                  setRows([])
                  setDraftId(null)
                  setDraftSavedAt(null)
                  setDraftUnsaved(false)
                  await activateStockTakeMode()
                }}
                className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium">
                Save &amp; Start Stock Take
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Bulk Product registration modal */}
      {showCustomBulkModal && (
        <CustomBulkModal
          businessId={businessId}
          businessType={businessType}
          onClose={() => setShowCustomBulkModal(false)}
          onSaved={() => {}}
        />
      )}

      {/* Quick-create modal overlay (categories only) */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{quickCreateLabel}</h3>
            <input
              autoFocus
              type="text"
              placeholder="Name"
              value={quickCreateName}
              onChange={e => setQuickCreateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickCreate() }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowQuickCreate(false); setQuickCreateTargetRowId(null) }}
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
      )}
    </div>
  )
}

// ── Shared constants ──────────────────────────────────────────────────────────

const cellInputClass = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-400'

// ── Per-row editor ────────────────────────────────────────────────────────────

interface BulkRowEditorProps {
  row: BulkStockRow
  rowNumber: number
  domains: Domain[]
  departments: BusinessCategory[]
  allCategories: BusinessCategory[]
  allSubCategories: BusinessCategory[]
  suppliers: Supplier[]
  hasDeptCol: boolean
  hasSubCatCol: boolean
  invalidFields: Set<string>
  onChange: (patch: Partial<BulkStockRow>) => void
  onRemove: () => void
  onNewCategory: () => void
  onNewSubCategory: () => void
  onNewSupplier: () => void
  rowRef: (el: HTMLTableRowElement | null) => void
  hasPhysicalCountCol: boolean
  isStockTakeMode: boolean
  isHighlighted: boolean
  needsReview?: boolean
}

function BulkRowEditor({ row, rowNumber, domains, departments, allCategories, allSubCategories, suppliers, hasDeptCol, hasSubCatCol, hasPhysicalCountCol, invalidFields, onChange, onRemove, onNewCategory, onNewSubCategory, onNewSupplier, rowRef, isStockTakeMode, isHighlighted, needsReview }: BulkRowEditorProps) {
  const inv = (field: string) => invalidFields.has(field)
  // Hierarchy-filtered lists (SearchableSelect handles text search internally)
  const filteredCats = allCategories.filter(c => {
    if (!row.departmentId) return true
    if (domains.length > 0) return c.domainId === row.departmentId
    return !c.parentId || c.parentId === row.departmentId
  })
  const filteredSubCats = allSubCategories.filter(c =>
    !row.categoryId || !c.parentId || c.parentId === row.categoryId
  )

  // Variance = physicalCount − systemQuantity (only for existing items)
  const variance = row.isExistingItem && row.physicalCount !== '' && row.currentStock !== null
    ? Number(row.physicalCount) - row.currentStock
    : null
  const isShortfall = variance !== null && variance < 0

  const hasValidationError = invalidFields.size > 0
  const isCounted = isStockTakeMode && row.isExistingItem && row.physicalCount !== ''
  const rowStatusClass =
    row.status === 'saved' ? 'bg-green-50 dark:bg-green-900/10' :
    row.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' :
    row.status === 'saving' ? 'opacity-60' :
    hasValidationError ? 'bg-red-50 dark:bg-red-900/10 ring-1 ring-inset ring-red-300 dark:ring-red-700' :
    needsReview ? 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400' :
    isShortfall ? 'bg-red-50 dark:bg-red-900/10' :
    isCounted ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''
  const highlightClass = isHighlighted ? 'ring-2 ring-inset ring-teal-400 dark:ring-teal-500' : ''

  const inputClass = cellInputClass
  const roClass = `${inputClass} bg-gray-50 dark:bg-gray-700 text-gray-500 cursor-not-allowed`

  const plusBtnClass = 'w-5 h-5 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-xs font-bold flex items-center justify-center hover:bg-indigo-100'

  return (
    <tr ref={rowRef} className={`border-b border-gray-100 dark:border-gray-700 transition-all ${rowStatusClass} ${highlightClass}`}>
      <td className="px-2 py-1.5 text-center text-xs text-gray-400">
        {isCounted ? <span className="text-emerald-500 font-bold">✓</span> : rowNumber}
        {row.itemType === 'bale'    && <div className="text-[9px] font-bold text-orange-500 leading-none mt-0.5">Bale</div>}
        {row.itemType === 'bulk'    && <div className="text-[9px] font-bold text-purple-500 leading-none mt-0.5">Bulk</div>}
        {row.itemType === 'barcode' && <div className="text-[9px] font-bold text-teal-600 leading-none mt-0.5">BCI</div>}
        {row.isExistingItem && !row.itemType && <div className="text-[9px] font-medium text-blue-500 leading-none mt-0.5">Stk</div>}
        {needsReview && <div className="text-[9px] font-bold text-amber-600 leading-none mt-0.5">⚠ Review</div>}
      </td>

      {/* Barcode */}
      <td className="px-2 py-1.5">
        <input type="text" value={row.barcode} readOnly={row.barcodeReadOnly}
          onChange={e => onChange({ barcode: e.target.value })}
          className={row.barcodeReadOnly ? roClass : inputClass} placeholder="barcode" />
      </td>

      {/* Name */}
      <td className="px-2 py-1.5">
        <input type="text" value={row.name} readOnly={row.nameReadOnly}
          onChange={e => onChange({ name: e.target.value })}
          className={`${row.nameReadOnly ? roClass : inputClass} ${inv('name') ? 'border-red-400 dark:border-red-500' : ''}`} placeholder="Product name" />
      </td>

      {/* Department */}
      {hasDeptCol && (
        <td className="px-2 py-1.5">
          <SearchableSelect
            options={departments}
            value={row.departmentId}
            onChange={id => onChange({ departmentId: id, categoryId: '', subCategoryId: '' })}
            placeholder="Select dept…"
            allLabel="— none —"
            disabled={row.isExistingItem}
          />
        </td>
      )}

      {/* Category */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <SearchableSelect
            className="flex-1 min-w-0"
            options={filteredCats}
            value={row.categoryId}
            onChange={id => onChange({ categoryId: id, subCategoryId: '' })}
            placeholder={departments.length > 0 && !row.departmentId ? 'Select dept first' : 'Select category…'}
            allLabel="— none —"
            disabled={row.isExistingItem || (departments.length > 0 && !row.departmentId)}
            required
            error={inv('categoryId') ? ' ' : undefined}
          />
          {!row.isExistingItem && <button type="button" title="New category" onClick={onNewCategory} className={plusBtnClass}>+</button>}
        </div>
      </td>

      {/* Sub-category */}
      {hasSubCatCol && (
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            <SearchableSelect
              className="flex-1 min-w-0"
              options={filteredSubCats}
              value={row.subCategoryId}
              onChange={id => onChange({ subCategoryId: id })}
              placeholder={!row.categoryId ? 'Select category first' : 'Select sub-cat…'}
              allLabel="— none —"
              disabled={row.isExistingItem || !row.categoryId}
            />
            {!row.isExistingItem && (
              <button type="button" title={!row.categoryId ? 'Select a category first' : 'New sub-category'}
                onClick={onNewSubCategory} disabled={!row.categoryId}
                className={`${plusBtnClass} disabled:opacity-30 disabled:cursor-not-allowed`}>+</button>
            )}
          </div>
        </td>
      )}

      {/* Supplier */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <SearchableSelect
            className="flex-1 min-w-0"
            options={suppliers}
            value={row.supplierId}
            onChange={id => onChange({ supplierId: id })}
            placeholder="Select supplier…"
            allLabel="— none —"
            disabled={row.isExistingItem}
          />
          {!row.isExistingItem && <button type="button" title="New supplier" onClick={onNewSupplier} className={plusBtnClass}>+</button>}
        </div>
      </td>

      {/* Description */}
      <td className="px-2 py-1.5">
        <input type="text" value={row.description} readOnly={row.isExistingItem}
          onChange={e => onChange({ description: e.target.value })}
          className={row.isExistingItem ? roClass : inputClass} placeholder="optional" />
      </td>

      {/* System Quantity */}
      <td className="px-2 py-1.5 text-center text-xs text-gray-500">
        {row.currentStock !== null ? row.currentStock : '—'}
      </td>

      {/* Physical Count — only editable for existing items */}
      {hasPhysicalCountCol && (
        <td className="px-2 py-1.5">
          {row.isExistingItem ? (
            <input type="number" min="0" value={row.physicalCount}
              onChange={e => onChange({ physicalCount: e.target.value })}
              className={`${cellInputClass} w-full text-center ${inv('physicalCount') ? 'border-red-400 dark:border-red-500' : ''}`} placeholder="count" />
          ) : (
            <span className="block text-center text-xs text-gray-300 dark:text-gray-600">—</span>
          )}
        </td>
      )}

      {/* Variance */}
      {hasPhysicalCountCol && (
        <td className="px-2 py-1.5 text-center text-xs font-medium">
          {variance !== null ? (
            <span className={variance < 0 ? 'text-red-600 dark:text-red-400' : variance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
              {variance > 0 ? '+' : ''}{variance}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">—</span>
          )}
        </td>
      )}

      {/* Qty */}
      <td className="px-2 py-1.5">
        <input type="number" min="1" value={row.quantity} onChange={e => onChange({ quantity: e.target.value })}
          className={`${inputClass} w-full text-center ${inv('quantity') ? 'border-red-400 dark:border-red-500' : ''}`} placeholder="qty" />
      </td>

      {/* Sell Price */}
      <td className="px-2 py-1.5">
        <input type="number" min="0" step="0.10" value={row.sellingPrice} disabled={row.isFreeItem}
          onChange={e => onChange({ sellingPrice: e.target.value })}
          className={`${row.isFreeItem ? roClass : inputClass} w-full text-center ${inv('sellingPrice') && !row.isFreeItem ? 'border-red-400 dark:border-red-500' : ''}`} placeholder="price" />
      </td>

      {/* Free */}
      <td className="px-2 py-1.5 text-center">
        <input type="checkbox" checked={row.isFreeItem} disabled={row.isExistingItem}
          onChange={e => onChange({ isFreeItem: e.target.checked, sellingPrice: e.target.checked ? '0' : row.sellingPrice })}
          className="w-4 h-4 cursor-pointer accent-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed" />
      </td>

      {/* Cost */}
      <td className="px-2 py-1.5">
        <input type="number" min="0" step="0.10" value={row.costPrice} readOnly={row.isExistingItem}
          onChange={e => onChange({ costPrice: e.target.value })}
          className={`${row.isExistingItem ? roClass : inputClass} w-full text-center`} placeholder="cost" />
      </td>

      {/* SKU */}
      <td className="px-2 py-1.5">
        <input type="text" value={row.sku} readOnly={row.isExistingItem}
          onChange={e => onChange({ sku: e.target.value })}
          className={row.isExistingItem ? roClass : inputClass} placeholder="Auto" />
      </td>

      {/* Remove */}
      <td className="px-2 py-1.5 text-center">
        {row.status === 'saved' ? <span className="text-green-500 text-xs">✓</span> :
         row.status === 'error' ? <span className="text-red-500 text-xs" title={row.errorMessage}>✗</span> :
         <button onClick={onRemove} className="text-gray-300 hover:text-red-500 text-base leading-none">×</button>}
      </td>
    </tr>
  )
}
