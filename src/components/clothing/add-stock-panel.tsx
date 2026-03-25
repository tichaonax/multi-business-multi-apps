'use client'

import { useState, useEffect, useRef } from 'react'
import type { ProductData } from '@/components/clothing/bulk-print-modal'
import { SearchableCategorySelector } from '@/components/expense-account/searchable-category-selector'
import { InventoryCategoryEditor } from '@/components/inventory/inventory-category-editor'
import type { InventoryCategory } from '@/types/inventory-category'

interface BaleCategory {
  id: string
  name: string
}

interface BarcodeTemplate {
  id: string
  name: string
  symbology: string
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

interface AddStockPanelProps {
  businessId: string
  onClose: () => void
  /** Which tab to open on: 'bale' (default) or 'product' */
  initialTab?: 'bale' | 'product'
  /** When true, hides the Bale/Individual tab switcher — use when context already determines the type */
  hideTabs?: boolean
  /** When true, hides the Bale tab entirely and forces product tab — for no-match/delivery intake flow */
  hideBaleTab?: boolean
  /** If true, show "Add to cart" checkbox and dispatch pos:add-to-cart on save */
  isPosRoute?: boolean
  /** Pre-filled barcode (from global barcode modal no-match flow) */
  prefillBarcode?: string
  /** Called after a bale is registered (so caller can refresh bale list) */
  onBaleAdded?: () => void
  /** Called after an individual inventory item is successfully created */
  onItemAdded?: () => void
  /** Called with print params so the parent can open BulkPrintModal */
  onPrintReady?: (params: { baleId?: string; qty: number; templateId?: string; productData?: ProductData }) => void
  /** When true, hides print controls — barcode already exists, just save the stock */
  disablePrint?: boolean
  /** When true, shows a business selector dropdown so user can pick destination */
  showBusinessSelector?: boolean
  /** Business name shown as "Stocking to: X" banner when on POS */
  businessName?: string
}

export function AddStockPanel({ businessId, onClose, initialTab = 'bale', hideTabs = false, hideBaleTab = false, isPosRoute, prefillBarcode, onBaleAdded, onItemAdded, onPrintReady, disablePrint = false, showBusinessSelector = false, businessName }: AddStockPanelProps) {
  // When hideBaleTab is set (no-match flow), always force product tab
  const [tab, setTab] = useState<'bale' | 'product'>(hideBaleTab ? 'product' : initialTab)

  // Business selector state — used when showBusinessSelector=true (not on POS)
  const [effectiveBusinessId, setEffectiveBusinessId] = useState(showBusinessSelector ? '' : businessId)
  const [effectiveBusinessType, setEffectiveBusinessType] = useState('clothing')
  const [accessibleBusinesses, setAccessibleBusinesses] = useState<{ id: string; name: string; type: string }[]>([])
  const [bizSearch, setBizSearch] = useState('')
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false)
  const [bizSelectedName, setBizSelectedName] = useState('')
  const bizRef = useRef<HTMLDivElement>(null)

  // ── Bale tab state ──────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<BaleCategory[]>([])
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryRef = useRef<HTMLDivElement>(null)
  const [baleForm, setBaleForm] = useState({
    categoryId: '', batchNumber: '', itemCount: '', unitPrice: '', costPrice: '', barcode: '', notes: '', labelCount: '',
  })
  const [baleLoading, setBaleLoading] = useState(false)
  const [baleError, setBaleError] = useState('')

  // ── Individual product tab state ────────────────────────────────────────────
  const [templates, setTemplates] = useState<BarcodeTemplate[]>([])
  const [productForm, setProductForm] = useState({
    templateId: '', name: '', barcode: prefillBarcode || '', quantity: '', sku: '', description: '', costPrice: '', sellingPrice: '',
  })
  const [useGenericTemplate, setUseGenericTemplate] = useState(false)
  const [addToCart, setAddToCart] = useState(false)
  const [isFreeItem, setIsFreeItem] = useState(false)
  const [productLoading, setProductLoading] = useState(false)
  const [productError, setProductError] = useState('')

  // ── Category / Supplier state (individual product tab) ──────────────────────
  // All categories stored flat; levels derived at load time
  const [allCats, setAllCats] = useState<BusinessCategory[]>([])
  const [domains, setDomains] = useState<Domain[]>([])                           // inventory domains (clothing departments)
  const [departments, setDepartments] = useState<BusinessCategory[]>([])         // either from domains or level-1 parentId
  const [allCategories, setAllCategories] = useState<BusinessCategory[]>([])     // level 2
  const [filteredCategories, setFilteredCategories] = useState<BusinessCategory[]>([])
  const [allSubCategories, setAllSubCategories] = useState<BusinessCategory[]>([]) // level 3
  const [filteredSubCategories, setFilteredSubCategories] = useState<BusinessCategory[]>([])
  const [productDepartmentId, setProductDepartmentId] = useState('')
  const [productCategoryId, setProductCategoryId] = useState('')
  const [productSubCategoryId, setProductSubCategoryId] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productSupplierId, setProductSupplierId] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false)
  const supplierRef = useRef<HTMLDivElement>(null)

  // ── Quick-create state ──────────────────────────────────────────────────────
  const [showCategoryEditor, setShowCategoryEditor] = useState(false)
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryLoading, setNewCategoryLoading] = useState(false)
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierLoading, setNewSupplierLoading] = useState(false)

  // Fetch accessible clothing businesses when business selector is shown
  useEffect(() => {
    if (!showBusinessSelector) return
    fetch('/api/user/business-memberships')
      .then(r => r.json())
      .then((d: any) => {
        const list = (Array.isArray(d) ? d : (d.memberships ?? []))
          .filter((m: any) => m.businessId && m.businessName)
          .map((m: any) => ({ id: m.businessId, name: m.businessName, type: m.businessType || 'clothing' }))
        setAccessibleBusinesses(list)
      })
      .catch(() => {})
  }, [showBusinessSelector])

  useEffect(() => {
    if (!effectiveBusinessId) return
    // Load bale categories
    fetch('/api/clothing/bale-categories')
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data) })
      .catch(() => {})
    // Load barcode templates (only needed when print is enabled)
    if (!disablePrint) {
      fetch(`/api/universal/barcode-management/templates?businessId=${effectiveBusinessId}&limit=100`)
        .then(r => r.json())
        .then(d => {
          const list: BarcodeTemplate[] = d.templates ?? d.data ?? []
          setTemplates(list)
          if (list.length > 0) setProductForm(f => ({ ...f, templateId: list[0].id }))
          else setUseGenericTemplate(true) // no templates — auto-select generic
        })
        .catch(() => {})
    }
    // Load categories + domains together so we can decide the hierarchy in one place
    const fetchDomains = effectiveBusinessType === 'clothing'
      ? fetch(`/api/inventory/domains?businessType=clothing`).then(r => r.json())
      : Promise.resolve({ domains: [] })

    Promise.all([
      fetch(`/api/universal/categories?businessId=${effectiveBusinessId}&businessType=${effectiveBusinessType}`).then(r => r.json()),
      fetchDomains,
    ]).then(([catData, domainData]) => {
      const list: BusinessCategory[] = Array.isArray(catData) ? catData : (catData.data ?? catData.categories ?? [])
      setAllCats(list)
      const domainList: Domain[] = domainData.domains ?? []
      setDomains(domainList)

      if (domainList.length > 0) {
        // Domain-based departments (e.g. clothing): categories are flat, filtered by domainId
        setDepartments(domainList.map(d => ({ id: d.id, name: d.name, emoji: d.emoji || '📦', color: '#6366f1', parentId: null })))
        setAllCategories(list)
        setFilteredCategories([]) // empty until domain/dept selected
        setAllSubCategories([])
        setFilteredSubCategories([])
      } else {
        // ParentId hierarchy fallback (generic businesses)
        const level1 = list.filter(c => !c.parentId)
        const level1Ids = new Set(level1.map(c => c.id))
        const level2 = list.filter(c => c.parentId && level1Ids.has(c.parentId!))
        const level2Ids = new Set(level2.map(c => c.id))
        const level3 = list.filter(c => c.parentId && level2Ids.has(c.parentId!))
        if (level2.length > 0) {
          setDepartments(level1)
          setAllCategories(level2)
          setFilteredCategories([])
          setAllSubCategories(level3)
          setFilteredSubCategories([])
        } else {
          setDepartments([])
          setAllCategories(level1)
          setFilteredCategories(level1)
          setAllSubCategories([])
          setFilteredSubCategories([])
        }
      }
    }).catch(() => {})
    // Load suppliers
    fetch(`/api/business/${effectiveBusinessId}/suppliers?isActive=true&limit=100`)
      .then(r => r.json())
      .then((d: any) => {
        setSuppliers(Array.isArray(d) ? d : (d.data ?? d.suppliers ?? []))
      })
      .catch(() => {})
  }, [effectiveBusinessId, effectiveBusinessType, disablePrint])

  // Pre-fill barcode when it changes (from no-match flow)
  useEffect(() => {
    if (prefillBarcode) {
      setProductForm(f => ({ ...f, barcode: prefillBarcode }))
      setTab('product')
    }
  }, [prefillBarcode])

  // Cascade: dept → category → sub-category
  const handleDepartmentChange = (deptId: string) => {
    setProductDepartmentId(deptId)
    setProductCategoryId('')
    setProductSubCategoryId('')
    if (domains.length > 0) {
      // Domain-based: filter categories by domainId
      setFilteredCategories(deptId ? allCategories.filter(c => c.domainId === deptId) : allCategories)
    } else {
      // ParentId-based: filter categories by parentId
      setFilteredCategories(deptId ? allCategories.filter(c => c.parentId === deptId) : allCategories)
    }
    setFilteredSubCategories([])
  }

  const handleCategoryChange = (catId: string) => {
    setProductCategoryId(catId)
    setProductSubCategoryId('')
    setFilteredSubCategories(catId ? allSubCategories.filter(c => c.parentId === catId) : allSubCategories)
  }

  // ── Quick-create: sub-category (level 3) ────────────────────────────────
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setNewCategoryLoading(true)
    const parentId = productCategoryId
    try {
      const res = await fetch('/api/universal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: effectiveBusinessId,
          businessType: effectiveBusinessType,
          name: newCategoryName.trim(),
          ...(parentId ? { parentId } : {}),
        }),
      })
      const data = await res.json()
      if (!data.success && !data.id) { return }
      const newCat: BusinessCategory = {
        id: data.id || data.data?.id,
        name: newCategoryName.trim(),
        emoji: data.emoji || data.data?.emoji || '📦',
        color: data.color || data.data?.color || '#3B82F6',
        parentId: parentId || null,
      }
      setAllSubCategories(prev => [...prev, newCat])
      if (!productCategoryId || newCat.parentId === productCategoryId) {
        setFilteredSubCategories(prev => [...prev, newCat])
      }
      setProductSubCategoryId(newCat.id)
      setNewCategoryName('')
      setShowNewCategoryForm(false)
    } catch (e) {
      // silent
    } finally {
      setNewCategoryLoading(false)
    }
  }

  // ── Category editor success handler ─────────────────────────────────────────
  const handleCategoryEditorSuccess = (newCat?: InventoryCategory) => {
    if (newCat) {
      const cat: BusinessCategory = {
        id: newCat.id,
        name: newCat.name,
        emoji: newCat.emoji,
        color: newCat.color,
        parentId: newCat.parentId || null,
        domainId: newCat.domainId || null,
      }
      setAllCats(prev => [...prev, cat])
      setAllCategories(prev => [...prev, cat])
      if (!productDepartmentId || cat.domainId === productDepartmentId || cat.parentId === productDepartmentId) {
        setFilteredCategories(prev => [...prev, cat])
      }
      setProductCategoryId(cat.id)
    }
    setShowCategoryEditor(false)
  }

  // ── Quick-create: supplier ──────────────────────────────────────────────────
  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return
    setNewSupplierLoading(true)
    try {
      const res = await fetch(`/api/business/${effectiveBusinessId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSupplierName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { return }
      const newSup: Supplier = { id: data.supplier?.id || data.id || data.data?.id, name: newSupplierName.trim() }
      setSuppliers(prev => [...prev, newSup])
      setProductSupplierId(newSup.id)
      setSupplierSearch(newSup.name)
      setNewSupplierName('')
      setShowNewSupplierForm(false)
    } catch (e) {
      // silent
    } finally {
      setNewSupplierLoading(false)
    }
  }

  // ── Bale submit ─────────────────────────────────────────────────────────────
  const handleBaleRegisterAndPrint = async () => {
    setBaleError('')
    if (!baleForm.categoryId || !baleForm.itemCount || !baleForm.unitPrice || !baleForm.costPrice) {
      setBaleError('Category, item count, unit price, and bale cost are required')
      return
    }
    setBaleLoading(true)
    try {
      const res = await fetch('/api/clothing/bales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: effectiveBusinessId,
          categoryId: baleForm.categoryId,
          ...(baleForm.batchNumber.trim() ? { batchNumber: baleForm.batchNumber.trim() } : {}),
          itemCount: Number(baleForm.itemCount),
          unitPrice: Number(baleForm.unitPrice),
          costPrice: Number(baleForm.costPrice),
          barcode: baleForm.barcode.trim() || undefined,
          notes: baleForm.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setBaleError(data.error || 'Failed to register bale'); return }

      const baleId = data.data.id
      const qty = Number(baleForm.labelCount) || Number(baleForm.itemCount) || 1

      await fetch('/api/clothing/label-print-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: effectiveBusinessId, baleId, quantity: qty, notes: 'initial registration' }),
      })

      onBaleAdded?.()
      onClose()
      onPrintReady?.({ baleId, qty })
    } catch (e: any) {
      setBaleError(e.message || 'Failed to register bale')
    } finally {
      setBaleLoading(false)
    }
  }

  // ── Individual product submit ────────────────────────────────────────────────
  const handleProductAddAndPrint = async () => {
    setProductError('')
    if (!disablePrint && !useGenericTemplate && !productForm.templateId) { setProductError('Please select a barcode template or use generic'); return }
    if (!productForm.name.trim()) { setProductError('Product name is required'); return }
    if (!productCategoryId && !productSubCategoryId) { setProductError('Category is required'); return }
    if (!productForm.quantity || Number(productForm.quantity) < 1) { setProductError('Quantity must be >= 1'); return }
    if (!isFreeItem && (!productForm.sellingPrice || Number(productForm.sellingPrice) <= 0)) { setProductError('Selling price is required'); return }
    setProductLoading(true)
    try {
      const res = await fetch('/api/clothing/inventory/add-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: effectiveBusinessId,
          templateId: disablePrint ? undefined : (useGenericTemplate ? undefined : productForm.templateId),
          name: productForm.name.trim(),
          quantity: Number(productForm.quantity),
          barcode: productForm.barcode.trim() || undefined,
          sku: productForm.sku.trim() || undefined,
          description: productForm.description.trim() || undefined,
          costPrice: productForm.costPrice ? Number(productForm.costPrice) : undefined,
          sellingPrice: isFreeItem ? 0 : Number(productForm.sellingPrice),
          categoryId: (productSubCategoryId || productCategoryId) || undefined,
          supplierId: productSupplierId || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setProductError(data.error || 'Failed to add stock'); return }

      const qty = Number(productForm.quantity)

      await fetch('/api/clothing/label-print-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: effectiveBusinessId, productId: data.itemId, templateId: disablePrint ? null : (useGenericTemplate ? null : productForm.templateId), quantity: qty, notes: 'stock intake' }),
      })

      if (addToCart && isPosRoute) {
        window.dispatchEvent(new CustomEvent('pos:add-inventory-item-to-cart', {
          detail: { inventoryItemId: data.itemId, name: productForm.name.trim(), sellingPrice: isFreeItem ? 0 : Number(productForm.sellingPrice), sku: productForm.sku.trim() || '', barcodeData: data.barcodeData || productForm.barcode.trim() }
        }))
      }

      onClose()
      onItemAdded?.()
      if (!disablePrint) {
        onPrintReady?.({
          qty,
          templateId: useGenericTemplate ? undefined : productForm.templateId,
          productData: {
            id: data.itemId,
            name: productForm.name.trim(),
            barcodeData: data.barcodeData,
            sellingPrice: isFreeItem ? 0 : Number(productForm.sellingPrice),
            sku: productForm.sku.trim() || undefined,
          },
        })
      }
    } catch (e: any) {
      setProductError(e.message || 'Failed to add stock')
    } finally {
      setProductLoading(false)
    }
  }

  const resetBaleForm = () => setBaleForm({ categoryId: '', batchNumber: '', itemCount: '', unitPrice: '', costPrice: '', barcode: '', notes: '', labelCount: '' })

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">+ Add Stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold">×</button>
        </div>

        {/* Destination business banner (on POS) or selector (off POS) */}
        {isPosRoute && businessName && (
          <div className="mx-4 mt-4 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm text-indigo-700 dark:text-indigo-300">
            📍 Stocking inventory to: <span className="font-semibold">{businessName}</span>
          </div>
        )}
        {showBusinessSelector && accessibleBusinesses.length > 0 && (
          <div className="mx-4 mt-4">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stock into which business?</label>
            {accessibleBusinesses.length === 1 ? (
              <p className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                📍 {accessibleBusinesses[0].name}
              </p>
            ) : (
              <div className="relative" ref={bizRef}>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Search business..."
                    value={bizSearch}
                    onChange={e => { setBizSearch(e.target.value); setBizDropdownOpen(true) }}
                    onFocus={() => setBizDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setBizDropdownOpen(false), 150)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  {bizSelectedName && (
                    <button
                      type="button"
                      onClick={() => {
                        setBizSearch('')
                        setBizSelectedName('')
                        setEffectiveBusinessId('')
                        setEffectiveBusinessType('clothing')
                        setDepartments([])
                        setAllCategories([])
                        setFilteredCategories([])
                        setAllSubCategories([])
                        setFilteredSubCategories([])
                        setSuppliers([])
                        setProductDepartmentId('')
                        setProductCategoryId('')
                        setProductSubCategoryId('')
                        setProductSupplierId('')
                        setSupplierSearch('')
                      }}
                      className="px-2 py-2 text-xs text-gray-400 hover:text-red-500 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                      title="Clear selection"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {bizSelectedName && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">✓ {bizSelectedName}</p>
                )}
                {bizDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {accessibleBusinesses
                      .filter(b => b.name.toLowerCase().includes(bizSearch.toLowerCase()))
                      .map(b => (
                        <div
                          key={b.id}
                          onMouseDown={() => {
                            setEffectiveBusinessId(b.id)
                            setEffectiveBusinessType(b.type)
                            setBizSelectedName(b.name)
                            setBizSearch(b.name)
                            setBizDropdownOpen(false)
                            // Reset category/supplier selections when business changes
                            setProductDepartmentId('')
                            setProductCategoryId('')
                            setProductSubCategoryId('')
                            setProductSupplierId('')
                            setSupplierSearch('')
                          }}
                          className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${effectiveBusinessId === b.id ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}
                        >
                          {b.name}
                        </div>
                      ))}
                    {accessibleBusinesses.filter(b => b.name.toLowerCase().includes(bizSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-sm text-gray-400">No businesses found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs — hidden when hideBaleTab or hideTabs or context already determines type */}
        {!hideTabs && !hideBaleTab && (
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 m-4 mb-0 p-1 rounded-xl">
            <button
              onClick={() => setTab('bale')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'bale' ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 Bale
            </button>
            <button
              onClick={() => setTab('product')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === 'product' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🏷️ Individual Product
            </button>
          </div>
        )}

        <div className="p-4 space-y-4">
          {/* ── Bale Tab ── */}
          {tab === 'bale' && (
            <div className="space-y-3">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <div className="relative" ref={categoryRef}>
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={e => { setCategorySearch(e.target.value); setCategoryDropdownOpen(true) }}
                    onFocus={() => setCategoryDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 150)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  {baleForm.categoryId && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                      ✓ {categories.find(c => c.id === baleForm.categoryId)?.name}
                    </p>
                  )}
                  {categoryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {categories
                        .filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase()))
                        .map(c => (
                          <div
                            key={c.id}
                            onMouseDown={() => { setBaleForm(f => ({ ...f, categoryId: c.id })); setCategorySearch(c.name); setCategoryDropdownOpen(false) }}
                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/30 ${baleForm.categoryId === c.id ? 'font-medium text-purple-700' : ''}`}
                          >
                            {c.name}
                          </div>
                        ))}
                      {categories.filter(c => c.name.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">No categories found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Count *</label>
                  <input type="number" min="1" value={baleForm.itemCount}
                    onChange={e => setBaleForm(f => ({ ...f, itemCount: e.target.value }))}
                    placeholder="e.g., 150" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Labels to print</label>
                  <input type="number" min="1" value={baleForm.labelCount}
                    onChange={e => setBaleForm(f => ({ ...f, labelCount: e.target.value }))}
                    placeholder={baleForm.itemCount || 'same as count'} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Price ($) *</label>
                  <input type="number" min="0.01" step="0.01" value={baleForm.unitPrice}
                    onChange={e => setBaleForm(f => ({ ...f, unitPrice: e.target.value }))}
                    placeholder="e.g., 3.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bale Cost ($) *</label>
                  <input type="number" min="0" step="0.01" value={baleForm.costPrice}
                    onChange={e => setBaleForm(f => ({ ...f, costPrice: e.target.value }))}
                    placeholder="Total acquisition cost" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Batch Number</label>
                  <input type="text" value={baleForm.batchNumber}
                    onChange={e => setBaleForm(f => ({ ...f, batchNumber: e.target.value }))}
                    placeholder="Auto-generated" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode (optional)</label>
                  <input type="text" value={baleForm.barcode}
                    onChange={e => setBaleForm(f => ({ ...f, barcode: e.target.value }))}
                    placeholder="Scan or enter" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input type="text" value={baleForm.notes}
                  onChange={e => setBaleForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes about this bale" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>

              {baleError && <p className="text-sm text-red-600 dark:text-red-400">{baleError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={handleBaleRegisterAndPrint} disabled={baleLoading}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {baleLoading ? 'Registering...' : '🖨️ Register & Print'}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Individual Product Tab ── */}
          {tab === 'product' && (
            <div className="space-y-3">
              {/* Template selector — hidden when barcode already exists (disablePrint) */}
              {!disablePrint && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Barcode Template {!useGenericTemplate && '*'}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useGenericTemplate}
                        onChange={e => setUseGenericTemplate(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Use generic (CODE128)</span>
                    </label>
                  </div>
                  {useGenericTemplate ? (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 px-2 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                      Generic CODE128 barcode — works with any scanner
                    </p>
                  ) : templates.length === 0 ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">No templates found — check "Use generic" above to continue.</p>
                  ) : (
                    <select value={productForm.templateId} onChange={e => setProductForm(f => ({ ...f, templateId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Barcode / Scan Code {disablePrint && <span className="text-xs text-gray-400 font-normal ml-1">(from scan)</span>}
                </label>
                <input type="text" value={productForm.barcode}
                  onChange={e => !disablePrint && setProductForm(f => ({ ...f, barcode: e.target.value }))}
                  readOnly={disablePrint}
                  placeholder="Scan or auto-generated" className={`w-full px-3 py-2 border rounded-lg text-sm ${disablePrint ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-default' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`} />
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                <input type="text" value={productForm.name}
                  onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Men's Denim Jacket" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>

              {/* Department — always shown; empty when business has a flat category structure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department <span className="text-gray-400 font-normal">(optional)</span></label>
                <SearchableCategorySelector
                  categories={departments}
                  value={productDepartmentId}
                  onChange={handleDepartmentChange}
                  disabled={departments.length === 0}
                />
                {departments.length === 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">No departments set up for this business</p>
                )}
              </div>

              {/* Category * */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <SearchableCategorySelector
                      categories={filteredCategories}
                      value={productCategoryId}
                      onChange={handleCategoryChange}
                      disabled={departments.length > 0 && !productDepartmentId}
                    />
                  </div>
                  <button
                    type="button"
                    title="Add new category"
                    onClick={() => { setShowCategoryEditor(true); setShowNewCategoryForm(false); setShowNewSupplierForm(false) }}
                    className="mt-0.5 w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-base font-bold hover:bg-indigo-100 flex items-center justify-center shrink-0"
                  >+</button>
                </div>
                {departments.length > 0 && !productDepartmentId && (
                  <p className="text-xs text-gray-400 mt-0.5">Select a department first</p>
                )}
              </div>

              {/* Sub-category — always shown so users can create and assign one */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sub-category <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <SearchableCategorySelector
                      categories={filteredSubCategories}
                      value={productSubCategoryId}
                      onChange={setProductSubCategoryId}
                      disabled={!productCategoryId}
                    />
                  </div>
                  <button
                    type="button"
                    title="Add new sub-category"
                    disabled={!productCategoryId}
                    onClick={() => { setShowNewCategoryForm(v => !v); setShowCategoryEditor(false); setShowNewSupplierForm(false) }}
                    className="mt-0.5 w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-base font-bold hover:bg-indigo-100 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                  >+</button>
                </div>
                {showNewCategoryForm && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input autoFocus type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      placeholder={productCategoryId ? `New sub-category under "${allCategories.find(c => c.id === productCategoryId)?.name}"` : 'Select a category first'}
                      disabled={!productCategoryId}
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory() }} />
                    <button type="button" onClick={handleCreateCategory} disabled={newCategoryLoading || !newCategoryName.trim() || !productCategoryId}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                      {newCategoryLoading ? '...' : 'Add'}
                    </button>
                    <button type="button" onClick={() => setShowNewCategoryForm(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                )}
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier <span className="text-gray-400 font-normal">(optional)</span></label>
                <div className="flex items-start gap-2">
                  <div className="relative flex-1" ref={supplierRef}>
                    <input
                      type="text"
                      placeholder="Search supplier..."
                      value={supplierSearch}
                      onChange={e => { setSupplierSearch(e.target.value); setSupplierDropdownOpen(true) }}
                      onFocus={() => setSupplierDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setSupplierDropdownOpen(false), 150)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    {productSupplierId && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                        ✓ {suppliers.find(s => s.id === productSupplierId)?.name}
                      </p>
                    )}
                    {supplierDropdownOpen && suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {suppliers
                          .filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                          .map(s => (
                            <div key={s.id} onMouseDown={() => { setProductSupplierId(s.id); setSupplierSearch(s.name); setSupplierDropdownOpen(false) }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${productSupplierId === s.id ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'}`}>
                              {s.name}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Add new supplier"
                    onClick={() => { setShowNewSupplierForm(v => !v); setShowNewCategoryForm(false) }}
                    className="mt-0.5 w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-base font-bold hover:bg-indigo-100 flex items-center justify-center shrink-0"
                  >+</button>
                </div>
                {showNewSupplierForm && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input autoFocus type="text" value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)}
                      placeholder="Supplier name"
                      className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateSupplier() }} />
                    <button type="button" onClick={handleCreateSupplier} disabled={newSupplierLoading || !newSupplierName.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                      {newSupplierLoading ? '...' : 'Add'}
                    </button>
                    <button type="button" onClick={() => setShowNewSupplierForm(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <input type="text" value={productForm.description}
                  onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g., Size M, Red, summer collection" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
              </div>

              {/* Prices + Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sell Price ($) *</label>
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isFreeItem}
                        onChange={e => {
                          setIsFreeItem(e.target.checked)
                          if (e.target.checked) setProductForm(f => ({ ...f, sellingPrice: '0' }))
                        }}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Free Item</span>
                    </label>
                  </div>
                  <input type="number" min="0" step="0.01" value={productForm.sellingPrice}
                    disabled={isFreeItem}
                    onChange={e => setProductForm(f => ({ ...f, sellingPrice: e.target.value }))}
                    placeholder="e.g., 12.00" className={`w-full px-3 py-2 border rounded-lg text-sm ${isFreeItem ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 cursor-default' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price ($) <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="number" min="0" step="0.01" value={productForm.costPrice}
                    onChange={e => setProductForm(f => ({ ...f, costPrice: e.target.value }))}
                    placeholder="e.g., 5.00" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity *</label>
                  <input type="number" min="1" value={productForm.quantity}
                    onChange={e => setProductForm(f => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g., 30" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={productForm.sku}
                    onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))}
                    placeholder="Leave blank to auto-generate" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              {isPosRoute && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={addToCart} onChange={e => setAddToCart(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Add 1 to cart after saving</span>
                </label>
              )}

              {productError && <p className="text-sm text-red-600 dark:text-red-400">{productError}</p>}

              <div className="flex gap-2 pt-1">
                <button onClick={handleProductAddAndPrint} disabled={productLoading || (!disablePrint && !useGenericTemplate && templates.length === 0)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                  {productLoading ? 'Adding...' : disablePrint ? '📦 Add to Stock' : '🖨️ Add to Stock & Print'}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    <InventoryCategoryEditor
      isOpen={showCategoryEditor}
      businessId={effectiveBusinessId}
      businessType={effectiveBusinessType}
      initialDomainId={productDepartmentId}
      onSuccess={handleCategoryEditorSuccess}
      onCancel={() => setShowCategoryEditor(false)}
    />
    </>
  )
}
