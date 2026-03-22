'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { UniversalSupplierForm } from '@/components/universal/supplier'
import { SearchableSelect } from '@/components/ui/searchable-select'

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
    // Yield to the browser so the loading state renders before the fetch starts
    await new Promise(r => setTimeout(r, 0))
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

  const removeRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.rowId !== rowId))
    setRowFieldErrors(prev => {
      if (!prev[rowId]) return prev
      const next = { ...prev }
      delete next[rowId]
      return next
    })
  }

  const updateRow = (rowId: string, patch: Partial<BulkStockRow>) => {
    setRows(prev => prev.map(r => r.rowId === rowId ? { ...r, ...patch } : r))
    // Clear validation errors for fields being updated
    setRowFieldErrors(prev => {
      if (!prev[rowId]) return prev
      const next = new Set(prev[rowId])
      Object.keys(patch).forEach(k => next.delete(k))
      return { ...prev, [rowId]: next }
    })
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
  const handleSubmit = async () => {
    setSubmitError('')
    if (rows.length === 0) { setSubmitError('Add at least one item before submitting'); return }

    const fieldErrorMap: Record<string, Set<string>> = {}
    rows.forEach(r => {
      const bad = new Set<string>()
      if (!r.name.trim()) bad.add('name')
      if (!r.isExistingItem && !r.categoryId && !r.subCategoryId) bad.add('categoryId')
      if (!r.quantity || Number(r.quantity) < 1) bad.add('quantity')
      if (!r.isFreeItem && (!r.sellingPrice || Number(r.sellingPrice) < 0)) bad.add('sellingPrice')
      if (bad.size > 0) fieldErrorMap[r.rowId] = bad
    })

    if (Object.keys(fieldErrorMap).length > 0) {
      setRowFieldErrors(fieldErrorMap)
      // Scroll to first failing row
      const firstBadId = rows.find(r => fieldErrorMap[r.rowId])?.rowId
      if (firstBadId) {
        rowRefs.current[firstBadId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }
    setRowFieldErrors({})

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
  const hasSubCatCol = true // always show sub-category column

  // Label for quick-create form
  const quickCreateLabel =
    quickCreateLevel === 'supplier' ? 'New Supplier' :
    quickCreateLevel === 'subcategory' ? 'New Sub-category' : 'New Category'

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">

      {/* Barcode lookup overlay — blocks UI and shows centered spinner */}
      {scanLoading && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex flex-col items-center justify-center cursor-wait">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-white/20 border-t-white mb-4" />
          <p className="text-white text-sm font-medium tracking-wide">Looking up barcode…</p>
        </div>
      )}
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
        <div className="relative flex-1 min-w-[180px]">
          <input
            ref={scanInputRef}
            autoFocus
            type="text"
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            onKeyDown={handleScanKeyDown}
            placeholder="Scan or type barcode, press Enter"
            disabled={scanLoading}
            className={`w-full px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 pr-8 ${scanLoading ? 'border-indigo-400 dark:border-indigo-500 opacity-60' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {scanLoading && (
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
        </div>
        {scanLoading && (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 animate-pulse shrink-0">
            Looking up barcode…
          </span>
        )}
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
                <th className="px-2 py-2 text-left min-w-[110px]">Barcode</th>
                <th className="px-2 py-2 text-left min-w-[180px]">Name *</th>
                {hasDeptCol && <th className="px-2 py-2 text-left min-w-[150px]">Department</th>}
                <th className="px-2 py-2 text-left min-w-[160px]">Category *</th>
                {hasSubCatCol && <th className="px-2 py-2 text-left min-w-[160px]">Sub-category</th>}
                <th className="px-2 py-2 text-left min-w-[160px]">Supplier</th>
                <th className="px-2 py-2 text-left min-w-[150px]">Description</th>
                <th className="px-2 py-2 text-center w-12">Stock</th>
                <th className="px-2 py-2 text-center w-24">Qty *</th>
                <th className="px-2 py-2 text-center w-28">Sell Price *</th>
                <th className="px-2 py-2 text-center w-14">Free?</th>
                <th className="px-2 py-2 text-center w-28">Cost</th>
                <th className="px-2 py-2 text-left w-32">SKU</th>
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
                  invalidFields={rowFieldErrors[row.rowId] ?? new Set()}
                  onChange={patch => updateRow(row.rowId, patch)}
                  onRemove={() => removeRow(row.rowId)}
                  onNewCategory={() => openQuickCreate(row.rowId, 'category')}
                  onNewSubCategory={() => openQuickCreate(row.rowId, 'subcategory')}
                  onNewSupplier={() => openSupplierForm(row.rowId)}
                  rowRef={(el: HTMLTableRowElement | null) => { rowRefs.current[row.rowId] = el }}
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
}

function BulkRowEditor({ row, rowNumber, domains, departments, allCategories, allSubCategories, suppliers, hasDeptCol, hasSubCatCol, invalidFields, onChange, onRemove, onNewCategory, onNewSubCategory, onNewSupplier, rowRef }: BulkRowEditorProps) {
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

  const hasValidationError = invalidFields.size > 0
  const rowStatusClass =
    row.status === 'saved' ? 'bg-green-50 dark:bg-green-900/10' :
    row.status === 'error' ? 'bg-red-50 dark:bg-red-900/10' :
    row.status === 'saving' ? 'opacity-60' :
    hasValidationError ? 'bg-red-50 dark:bg-red-900/10 ring-1 ring-inset ring-red-300 dark:ring-red-700' : ''

  const inputClass = cellInputClass
  const roClass = `${inputClass} bg-gray-50 dark:bg-gray-700 text-gray-500 cursor-not-allowed`

  const plusBtnClass = 'w-5 h-5 shrink-0 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-xs font-bold flex items-center justify-center hover:bg-indigo-100'

  return (
    <tr ref={rowRef} className={`border-b border-gray-100 dark:border-gray-700 transition-all ${rowStatusClass}`}>
      <td className="px-2 py-1.5 text-center text-xs text-gray-400">
        {rowNumber}
        {row.isExistingItem && <div className="text-[9px] font-medium text-blue-500 leading-none mt-0.5">Existing</div>}
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

      {/* Current Stock */}
      <td className="px-2 py-1.5 text-center text-xs text-gray-500">
        {row.currentStock !== null ? row.currentStock : '—'}
      </td>

      {/* Qty */}
      <td className="px-2 py-1.5">
        <input type="number" min="1" value={row.quantity} onChange={e => onChange({ quantity: e.target.value })}
          className={`${inputClass} w-full text-center ${inv('quantity') ? 'border-red-400 dark:border-red-500' : ''}`} placeholder="qty" />
      </td>

      {/* Sell Price */}
      <td className="px-2 py-1.5">
        <input type="number" min="0" step="0.01" value={row.sellingPrice} disabled={row.isFreeItem}
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
        <input type="number" min="0" step="0.01" value={row.costPrice} readOnly={row.isExistingItem}
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
