'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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
  currentStock: number | null
  status: 'pending' | 'saving' | 'saved' | 'error'
  errorMessage?: string
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
}

function makeRow(overrides: Partial<BulkStockRow> = {}): BulkStockRow {
  return {
    rowId: crypto.randomUUID(),
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
    currentStock: null,
    status: 'pending',
    ...overrides,
  }
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

export function BulkStockPanel({ businessId, businessName, businessType, onClose }: BulkStockPanelProps) {
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

  // Quick-create state
  const [quickCreateTargetRowId, setQuickCreateTargetRowId] = useState<string | null>(null)
  const [quickCreateLevel, setQuickCreateLevel] = useState<'category' | 'subcategory' | 'supplier'>('category')
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickCreateName, setQuickCreateName] = useState('')
  const [quickCreateLoading, setQuickCreateLoading] = useState(false)

  const scanInputRef = useRef<HTMLInputElement>(null)
  const tableEndRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Suppress global barcode modal while panel is open
  useEffect(() => {
    ;(window as any).__bulkStockingActive = true
    return () => { ;(window as any).__bulkStockingActive = false }
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

  const handleScan = async (barcodeValue: string) => {
    const trimmed = barcodeValue.trim()
    if (!trimmed) return

    // Duplicate detection
    const existing = rows.find(r => r.barcode === trimmed)
    if (existing) {
      setDuplicateAlert({ barcode: trimmed, rowId: existing.rowId })
      setScanInput('')
      return
    }

    setScanLoading(true)
    setScanInput('')
    try {
      const res = await fetch(`/api/global/inventory-lookup/${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      const match = data?.data?.businesses?.find(
        (b: any) => b.businessId === businessId && b.isInventoryItem
      )

      let hierarchyPatch: Partial<BulkStockRow> = {}
      if (match?.categoryId && allCats.length > 0) {
        const resolved = resolveHierarchy(match.categoryId, allCats)
        hierarchyPatch = resolved
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
      tableEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } finally {
      setScanLoading(false)
      focusScanInput()
    }
  }

  const handleScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleScan(scanInput)
  }

  const addBlankRow = () => {
    setRows(prev => [...prev, makeRow()])
    tableEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    focusScanInput()
  }

  const removeRow = (rowId: string) => setRows(prev => prev.filter(r => r.rowId !== rowId))

  const updateRow = (rowId: string, patch: Partial<BulkStockRow>) =>
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, ...patch } : r))

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

  // Quick-create opener
  const openQuickCreate = (rowId: string, level: 'category' | 'subcategory' | 'supplier') => {
    setQuickCreateTargetRowId(rowId)
    setQuickCreateLevel(level)
    setQuickCreateName('')
    setShowQuickCreate(true)
  }

  const handleQuickCreate = async () => {
    if (!quickCreateName.trim() || !quickCreateTargetRowId) return
    const targetRow = rows.find(r => r.rowId === quickCreateTargetRowId)
    setQuickCreateLoading(true)
    try {
      if (quickCreateLevel === 'supplier') {
        const res = await fetch(`/api/business/${businessId}/suppliers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: quickCreateName.trim() }),
        })
        const data = await res.json()
        if (!res.ok) return
        const newSup: Supplier = { id: data.supplier?.id || data.id || data.data?.id, name: quickCreateName.trim() }
        setSuppliers(prev => [...prev, newSup])
        updateRow(quickCreateTargetRowId, { supplierId: newSup.id })
      } else {
        const parentId = quickCreateLevel === 'subcategory'
          ? targetRow?.categoryId
          : targetRow?.departmentId
        const res = await fetch('/api/universal/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            businessType,
            name: quickCreateName.trim(),
            ...(parentId ? { parentId } : {}),
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
        }
        setAllCats(prev => [...prev, newCat])
        if (quickCreateLevel === 'subcategory') {
          setAllSubCategories(prev => [...prev, newCat])
          updateRow(quickCreateTargetRowId, { subCategoryId: newCat.id })
        } else {
          setAllCategories(prev => [...prev, newCat])
          updateRow(quickCreateTargetRowId, { categoryId: newCat.id, subCategoryId: '' })
        }
      }
      setQuickCreateName('')
      setShowQuickCreate(false)
      setQuickCreateTargetRowId(null)
    } finally {
      setQuickCreateLoading(false)
    }
  }

  // Submit batch
  const handleSubmit = async () => {
    setSubmitError('')
    const errors: string[] = []
    rows.forEach((r, i) => {
      if (!r.name.trim()) errors.push(`Row ${i + 1}: Name is required`)
      if (!r.categoryId && !r.subCategoryId) errors.push(`Row ${i + 1}: Category is required`)
      if (!r.quantity || Number(r.quantity) < 1) errors.push(`Row ${i + 1}: Quantity must be >= 1`)
      if (!r.isFreeItem && (!r.sellingPrice || Number(r.sellingPrice) < 0)) errors.push(`Row ${i + 1}: Selling price is required`)
    })
    if (errors.length > 0) { setSubmitError(errors.join('\n')); return }
    if (rows.length === 0) { setSubmitError('Add at least one item before submitting'); return }

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
  const hasDeptCol = departments.length > 0
  const hasSubCatCol = allSubCategories.length > 0

  // Label for quick-create form
  const quickCreateLabel =
    quickCreateLevel === 'supplier' ? 'New Supplier' :
    quickCreateLevel === 'subcategory' ? 'New Sub-category' : 'New Category'

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="font-bold text-gray-900 dark:text-white text-base">Bulk Stocking — {businessName}</h1>
      </div>

      {/* Scan bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 flex-wrap">
        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">Barcode:</label>
        <input
          ref={scanInputRef}
          autoFocus
          type="text"
          value={scanInput}
          onChange={e => setScanInput(e.target.value)}
          onKeyDown={handleScanKeyDown}
          placeholder="Scan or type barcode, press Enter"
          disabled={scanLoading}
          className="flex-1 min-w-[180px] px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
        />
        {scanLoading && <span className="text-xs text-gray-400">Looking up…</span>}
        <div className="flex gap-2 ml-auto">
          <button onClick={addBlankRow} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            + Add Row
          </button>
          <button onClick={handleSubmit} disabled={submitLoading || rows.length === 0}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium">
            {submitLoading ? 'Saving…' : `Submit Batch (${pendingCount} item${pendingCount !== 1 ? 's' : ''})`}
          </button>
        </div>
      </div>

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

      {submitError && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap">
          {submitError}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 py-3">
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
                <th className="px-2 py-2 text-left min-w-[120px]">Barcode</th>
                <th className="px-2 py-2 text-left min-w-[160px]">Name *</th>
                {hasDeptCol && <th className="px-2 py-2 text-left min-w-[130px]">Department</th>}
                <th className="px-2 py-2 text-left min-w-[150px]">Category *</th>
                {hasSubCatCol && <th className="px-2 py-2 text-left min-w-[150px]">Sub-category</th>}
                <th className="px-2 py-2 text-left min-w-[140px]">Supplier</th>
                <th className="px-2 py-2 text-left min-w-[130px]">Description</th>
                <th className="px-2 py-2 text-center min-w-[70px]">Stock</th>
                <th className="px-2 py-2 text-center min-w-[70px]">Qty *</th>
                <th className="px-2 py-2 text-center min-w-[110px]">Sell Price *</th>
                <th className="px-2 py-2 text-center min-w-[80px]">Cost</th>
                <th className="px-2 py-2 text-left min-w-[90px]">SKU</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
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
                  onChange={patch => updateRow(row.rowId, patch)}
                  onRemove={() => removeRow(row.rowId)}
                  onNewCategory={() => openQuickCreate(row.rowId, 'category')}
                  onNewSubCategory={() => openQuickCreate(row.rowId, 'subcategory')}
                  onNewSupplier={() => openQuickCreate(row.rowId, 'supplier')}
                  rowRef={(el: HTMLTableRowElement | null) => { rowRefs.current[row.rowId] = el }}
                />
              ))}
            </tbody>
          </table>
        )}
        <div ref={tableEndRef} />
      </div>

      {/* Quick-create bottom panel */}
      {showQuickCreate && (
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{quickCreateLabel}:</span>
            <input
              autoFocus
              type="text"
              placeholder="Name"
              value={quickCreateName}
              onChange={e => setQuickCreateName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickCreate() }}
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button onClick={handleQuickCreate} disabled={quickCreateLoading || !quickCreateName.trim()}
              className="px-3 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded">
              {quickCreateLoading ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setShowQuickCreate(false); setQuickCreateTargetRowId(null) }} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

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
  onChange: (patch: Partial<BulkStockRow>) => void
  onRemove: () => void
  onNewCategory: () => void
  onNewSubCategory: () => void
  onNewSupplier: () => void
  rowRef: (el: HTMLTableRowElement | null) => void
}

function BulkRowEditor({ row, rowNumber, domains, departments, allCategories, allSubCategories, suppliers, hasDeptCol, hasSubCatCol, onChange, onRemove, onNewCategory, onNewSubCategory, onNewSupplier, rowRef }: BulkRowEditorProps) {
  const [catOpen, setCatOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const catRef = useRef<HTMLDivElement>(null)

  const [subCatOpen, setSubCatOpen] = useState(false)
  const [subCatSearch, setSubCatSearch] = useState('')
  const subCatRef = useRef<HTMLDivElement>(null)

  const [supOpen, setSupOpen] = useState(false)
  const [supSearch, setSupSearch] = useState('')
  const supRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catRef.current && !catRef.current.contains(e.target as Node)) setCatOpen(false)
      if (subCatRef.current && !subCatRef.current.contains(e.target as Node)) setSubCatOpen(false)
      if (supRef.current && !supRef.current.contains(e.target as Node)) setSupOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Derive filtered lists based on row's current selections
  const filteredCats = allCategories.filter(c => {
    if (row.departmentId) {
      // Domain-based: filter by domainId
      if (domains.length > 0 && c.domainId !== row.departmentId) return false
      // ParentId-based: filter by parentId
      if (domains.length === 0 && c.parentId && c.parentId !== row.departmentId) return false
    }
    return !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase())
  })
  const filteredSubCats = allSubCategories.filter(c => {
    if (row.categoryId && c.parentId && c.parentId !== row.categoryId) return false
    return !subCatSearch || c.name.toLowerCase().includes(subCatSearch.toLowerCase())
  })
  const filteredSups = suppliers.filter(s =>
    !supSearch || s.name.toLowerCase().includes(supSearch.toLowerCase())
  )

  const selectedCatName = allCategories.find(c => c.id === row.categoryId)?.name || ''
  const selectedSubCatName = allSubCategories.find(c => c.id === row.subCategoryId)?.name || ''
  const selectedSupName = suppliers.find(s => s.id === row.supplierId)?.name || ''

  const rowStatusClass =
    row.status === 'saved' ? 'bg-green-50 dark:bg-green-900/10' :
    row.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' :
    row.status === 'saving' ? 'opacity-60' : ''

  const inputClass = 'w-full px-2 py-1 border border-gray-200 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-indigo-400'
  const roClass = `${inputClass} bg-gray-50 dark:bg-gray-700 text-gray-500 cursor-not-allowed`

  // Shared dropdown cell pattern
  const DropdownCell = ({
    cellRef, value, displayName, open, setOpen, search, setSearch,
    items, onSelect, onNew, newLabel, required,
    disabled = false,
  }: {
    cellRef: React.RefObject<HTMLDivElement | null>
    value: string
    displayName: string
    open: boolean
    setOpen: (v: boolean) => void
    search: string
    setSearch: (v: string) => void
    items: { id: string; name: string; emoji?: string }[]
    onSelect: (id: string) => void
    onNew: () => void
    newLabel: string
    required?: boolean
    disabled?: boolean
  }) => (
    <div className="flex items-center gap-0.5">
      <div className="relative flex-1" ref={cellRef}>
        <input
          type="text"
          value={open ? search : displayName}
          onFocus={() => { if (!disabled) { setOpen(true); setSearch('') } }}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          placeholder={disabled ? '—' : 'Search…'}
          disabled={disabled}
          className={`${inputClass} ${required && !value ? 'border-red-300' : ''} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        />
        {open && (
          <div className="absolute z-50 left-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-40 overflow-y-auto text-xs">
            {value && (
              <div onMouseDown={() => { onSelect(''); setOpen(false); setSearch('') }}
                className="px-2 py-1.5 cursor-pointer text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                — clear —
              </div>
            )}
            {items.map(item => (
              <div key={item.id} onMouseDown={() => { onSelect(item.id); setOpen(false); setSearch('') }}
                className={`px-2 py-1.5 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${value === item.id ? 'font-medium text-indigo-700' : ''}`}>
                {item.emoji ? `${item.emoji} ` : ''}{item.name}
              </div>
            ))}
            {items.length === 0 && search && (
              <div className="px-2 py-1.5 text-gray-400">No matches</div>
            )}
          </div>
        )}
      </div>
      {/* "+" button outside the dropdown */}
      <button
        type="button"
        title={newLabel}
        disabled={disabled}
        onMouseDown={e => { e.preventDefault(); setOpen(false); onNew() }}
        className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-xs font-bold flex items-center justify-center hover:bg-indigo-100 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
      >+</button>
    </div>
  )

  return (
    <tr ref={rowRef} className={`border-b border-gray-100 dark:border-gray-700 transition-all ${rowStatusClass}`}>
      <td className="px-2 py-1.5 text-center text-xs text-gray-400">{rowNumber}</td>

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
          className={row.nameReadOnly ? roClass : inputClass} placeholder="Product name" />
      </td>

      {/* Department */}
      {hasDeptCol && (
        <td className="px-2 py-1.5">
          <select value={row.departmentId}
            onChange={e => onChange({ departmentId: e.target.value, categoryId: '', subCategoryId: '' })}
            className={inputClass}>
            <option value="">— dept —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </td>
      )}

      {/* Category */}
      <td className="px-2 py-1.5">
        <DropdownCell
          cellRef={catRef} value={row.categoryId} displayName={selectedCatName}
          open={catOpen} setOpen={setCatOpen} search={catSearch} setSearch={setCatSearch}
          items={filteredCats}
          onSelect={id => onChange({ categoryId: id, subCategoryId: '' })}
          onNew={onNewCategory} newLabel="+ New category" required
          disabled={departments.length > 0 && !row.departmentId}
        />
      </td>

      {/* Sub-category */}
      {hasSubCatCol && (
        <td className="px-2 py-1.5">
          <DropdownCell
            cellRef={subCatRef} value={row.subCategoryId} displayName={selectedSubCatName}
            open={subCatOpen} setOpen={setSubCatOpen} search={subCatSearch} setSearch={setSubCatSearch}
            items={filteredSubCats}
            onSelect={id => onChange({ subCategoryId: id })}
            onNew={onNewSubCategory} newLabel="+ New sub-category"
            disabled={!row.categoryId}
          />
        </td>
      )}

      {/* Supplier */}
      <td className="px-2 py-1.5">
        <DropdownCell
          cellRef={supRef} value={row.supplierId} displayName={selectedSupName}
          open={supOpen} setOpen={setSupOpen} search={supSearch} setSearch={setSupSearch}
          items={filteredSups}
          onSelect={id => onChange({ supplierId: id })}
          onNew={onNewSupplier} newLabel="+ New supplier"
        />
      </td>

      {/* Description */}
      <td className="px-2 py-1.5">
        <input type="text" value={row.description} onChange={e => onChange({ description: e.target.value })}
          className={inputClass} placeholder="optional" />
      </td>

      {/* Current Stock */}
      <td className="px-2 py-1.5 text-center text-xs text-gray-500">
        {row.currentStock !== null ? row.currentStock : '—'}
      </td>

      {/* Qty */}
      <td className="px-2 py-1.5">
        <input type="number" min="1" value={row.quantity} onChange={e => onChange({ quantity: e.target.value })}
          className={`${inputClass} w-14 text-center`} placeholder="qty" />
      </td>

      {/* Sell Price + Free checkbox */}
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <input type="number" min="0" step="0.01" value={row.sellingPrice} disabled={row.isFreeItem}
            onChange={e => onChange({ sellingPrice: e.target.value })}
            className={`${row.isFreeItem ? roClass : inputClass} w-14 text-center`} placeholder="price" />
          <label className="flex items-center gap-0.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={row.isFreeItem}
              onChange={e => onChange({ isFreeItem: e.target.checked, sellingPrice: e.target.checked ? '0' : row.sellingPrice })}
              className="w-3 h-3" />
            Free
          </label>
        </div>
      </td>

      {/* Cost */}
      <td className="px-2 py-1.5">
        <input type="number" min="0" step="0.01" value={row.costPrice} onChange={e => onChange({ costPrice: e.target.value })}
          className={`${inputClass} w-16 text-center`} placeholder="cost" />
      </td>

      {/* SKU */}
      <td className="px-2 py-1.5">
        <input type="text" value={row.sku} onChange={e => onChange({ sku: e.target.value })}
          className={inputClass} placeholder="Auto" />
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
