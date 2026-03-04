'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useToastContext } from '@/components/ui/toast'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { UniversalSupplierForm } from '@/components/universal/supplier'
import { hasUserPermission } from '@/lib/permission-utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Domain {
  id: string
  name: string
  emoji?: string | null
}

interface Subcategory {
  id: string
  name: string
  emoji?: string | null
}

interface Category {
  id: string
  name: string
  emoji?: string | null
  domainId?: string | null
  domain?: Domain | null
  subcategories?: Subcategory[]
}

interface Supplier {
  id: string
  name: string
  emoji?: string | null
}

interface ProductDefinition {
  id: string
  name: string
  sku: string | null
  description?: string | null
  attributes?: any
  category?: { id: string; name: string; emoji?: string | null } | null
  variantId: string | null
}

export interface QuickStockFromScanModalProps {
  isOpen: boolean
  barcode: string
  businessId: string
  businessType: string
  onSuccess: (productId: string, variantId: string, productName: string) => void
  onClose: () => void
  /** Pre-populate with a known product (activate-pricing flow: barcode already linked to $0 product) */
  existingProduct?: { id: string; name: string; variantId?: string }
  /** Optional name pre-fill suggestion (e.g. from cross-business result in global modal) */
  suggestedName?: string
}

type Mode = 'create-new' | 'link-existing'
type Step = 'form' | 'submitting' | 'success'

// ── Helpers ─────────────────────────────────────────────────────────────────

function labelClass() {
  return 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
}
function inputClass(error?: boolean) {
  return `w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`
}
function selectClass() {
  return `w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`
}

function productNamePlaceholder(businessType: string): string {
  switch (businessType) {
    case 'clothing':     return "e.g. Men's Polo Shirt"
    case 'grocery':      return 'e.g. Organic Whole Milk 1L'
    case 'restaurant':   return 'e.g. Grilled Chicken Burger'
    case 'hardware':     return 'e.g. 10mm Stainless Bolt (Pack of 50)'
    case 'construction': return 'e.g. Portland Cement 50 kg Bag'
    case 'vehicles':     return 'e.g. Engine Oil Filter — Toyota Hilux'
    case 'pharmacy':     return 'e.g. Paracetamol 500 mg Tablets x 24'
    default:             return 'e.g. Product name'
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function QuickStockFromScanModal({
  isOpen,
  barcode,
  businessId,
  businessType,
  onSuccess,
  onClose,
  existingProduct,
  suggestedName,
}: QuickStockFromScanModalProps) {
  const toast = useToastContext()
  const { data: session } = useSession()

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isClothing = businessType === 'clothing'
  const isActivateMode = !!existingProduct // barcode already linked to a $0 product
  const canCreateSubcategories = !!(session?.user && hasUserPermission(session.user, 'canCreateInventorySubcategories'))

  // ── Mode / step ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('create-new')
  const [step, setStep] = useState<Step>('form')

  // ── Dropdown data ─────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  // ── Create-new form fields ────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [isFreeItem, setIsFreeItem] = useState(false)
  const [costPrice, setCostPrice] = useState('')
  const [initialQuantity, setInitialQuantity] = useState('1')
  const [sku, setSku] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')

  // ── Domain filter (Level 1 – clothing and any type with domains) ─────────
  const [domainId, setDomainId] = useState('')

  // ── On-the-fly category creation ─────────────────────────────────────────
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  // ── On-the-fly subcategory creation ──────────────────────────────────────
  const [showNewSubcategory, setShowNewSubcategory] = useState(false)
  const [newSubcategoryName, setNewSubcategoryName] = useState('')
  const [newSubcategoryEmoji, setNewSubcategoryEmoji] = useState('')
  const [creatingSubcategory, setCreatingSubcategory] = useState(false)

  // ── On-the-fly supplier creation ─────────────────────────────────────────
  const [showSupplierFormModal, setShowSupplierFormModal] = useState(false)
  const [creatingSupplier, setCreatingSupplier] = useState(false)

  // ── Link-existing tab ─────────────────────────────────────────────────────
  const [definitions, setDefinitions] = useState<ProductDefinition[]>([])
  const [defSearch, setDefSearch] = useState('')
  const [defPage, setDefPage] = useState(1)
  const [defTotal, setDefTotal] = useState(0)
  const [loadingDefs, setLoadingDefs] = useState(false)
  const [selectedDef, setSelectedDef] = useState<ProductDefinition | null>(null)
  const [linkPrice, setLinkPrice] = useState('')
  const [linkCostPrice, setLinkCostPrice] = useState('')
  const [linkQty, setLinkQty] = useState('1')

  // ── Validation errors ─────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  // ── Duplicate barcode: "Add to cart instead?" state ──────────────────────────
  const [duplicateProductId, setDuplicateProductId] = useState<string | null>(null)
  const [duplicateVariantId, setDuplicateVariantId] = useState<string | null>(null)
  const [duplicateProductName, setDuplicateProductName] = useState<string | null>(null)

  // ── Reset on open/close ───────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setMode('create-new')
      setStep('form')
      setErrors({})
      setApiError(null)
      setName(existingProduct ? existingProduct.name : (suggestedName || ''))
      setCategoryId('')
      setSubcategoryId('')
      setSupplierId('')
      setDomainId('')
      setDescription('')
      setBasePrice('')
      setIsFreeItem(false)
      setCostPrice('')
      setInitialQuantity('1')
      setSku('')
      setSize('')
      setColor('')
      setShowNewCategory(false)
      setNewCategoryName('')
      setShowNewSubcategory(false)
      setNewSubcategoryName('')
      setNewSubcategoryEmoji('')
      setShowSupplierFormModal(false)
      setSelectedDef(null)
      setDefSearch('')
      setDefPage(1)
      setLinkPrice('')
      setLinkCostPrice('')
      setLinkQty('1')
      setDuplicateProductId(null)
      setDuplicateVariantId(null)
      setDuplicateProductName(null)
      loadDropdowns()
      // Auto-focus: price if name is pre-filled; otherwise name
      setTimeout(() => {
        if (suggestedName || existingProduct?.name) {
          priceInputRef.current?.focus()
        } else {
          nameInputRef.current?.focus()
        }
      }, 100)
    }
  }, [isOpen])

  // ── Keyboard: Escape closes modal ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'submitting') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step])

  // ── Load categories + suppliers ───────────────────────────────────────────
  const loadDropdowns = useCallback(async () => {
    setLoadingDropdowns(true)
    try {
      const [catRes, supRes] = await Promise.all([
        fetch(`/api/universal/categories?businessId=${businessId}&businessType=${businessType}`),
        fetch(`/api/business/${businessId}/suppliers?limit=100`),
      ])
      const catData = catRes.ok ? await catRes.json() : null
      const supData = supRes.ok ? await supRes.json() : null
      setCategories(catData?.data ?? [])
      setSuppliers(supData?.items ?? [])
    } catch {
      // Non-fatal; dropdowns just empty
    } finally {
      setLoadingDropdowns(false)
    }
  }, [businessId, businessType])

  // ── Load definitions for Link Existing tab ────────────────────────────────
  const loadDefinitions = useCallback(async (search: string, page: number) => {
    setLoadingDefs(true)
    try {
      const params = new URLSearchParams({
        businessId,
        businessType,
        page: String(page),
        limit: '20',
        ...(search.trim() ? { search: search.trim() } : {}),
      })
      const res = await fetch(`/api/inventory/product-definitions?${params}`)
      const data = res.ok ? await res.json() : null
      if (data?.success) {
        setDefinitions(page === 1 ? data.definitions : (prev) => [...prev, ...data.definitions])
        setDefTotal(data.pagination.total)
      }
    } catch {
      /* silent */
    } finally {
      setLoadingDefs(false)
    }
  }, [businessId, businessType])

  useEffect(() => {
    if (isOpen && mode === 'link-existing') {
      setDefinitions([])
      setDefPage(1)
      loadDefinitions(defSearch, 1)
    }
  }, [mode, isOpen])

  // Debounced search for definitions
  useEffect(() => {
    if (mode !== 'link-existing') return
    const t = setTimeout(() => {
      setDefPage(1)
      loadDefinitions(defSearch, 1)
    }, 300)
    return () => clearTimeout(t)
  }, [defSearch])

  // ── On-the-fly category create ────────────────────────────────────────────
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      const res = await fetch('/api/universal/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          name: newCategoryName.trim(),
          domainId: domainId || undefined,
          displayOrder: 0,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const selectedDomain = domainId ? domains.find((d) => d.id === domainId) ?? null : null
        const created: Category = {
          id: data.data.id,
          name: data.data.name,
          emoji: data.data.emoji,
          domainId: domainId || null,
          domain: selectedDomain,
          subcategories: [],
        }
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setCategoryId(created.id)
        setShowNewCategory(false)
        setNewCategoryName('')
      } else {
        setApiError(data.error || 'Failed to create category')
      }
    } catch {
      setApiError('Network error creating category')
    } finally {
      setCreatingCategory(false)
    }
  }

  // ── Full supplier form submit ────────────────────────────────────────────
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
        const created: Supplier = {
          id: json.id || json.supplier?.id,
          name: data.name,
        }
        setSuppliers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        setSupplierId(created.id)
        setShowSupplierFormModal(false)
      } else {
        setApiError(json.error || 'Failed to create supplier')
      }
    } catch {
      setApiError('Network error creating supplier')
    } finally {
      setCreatingSupplier(false)
    }
  }

  // ── On-the-fly subcategory create ────────────────────────────────────────
  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !categoryId) return
    setCreatingSubcategory(true)
    try {
      const res = await fetch('/api/inventory/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          name: newSubcategoryName.trim(),
          emoji: newSubcategoryEmoji.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.subcategory) {
        const created: Subcategory = {
          id: data.subcategory.id,
          name: data.subcategory.name,
          emoji: data.subcategory.emoji || undefined,
        }
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  subcategories: [...(c.subcategories ?? []), created].sort((a, b) =>
                    a.name.localeCompare(b.name)
                  ),
                }
              : c
          )
        )
        setSubcategoryId(created.id)
        setShowNewSubcategory(false)
        setNewSubcategoryName('')
        setNewSubcategoryEmoji('')
      } else {
        setApiError(data.error || 'Failed to create subcategory')
      }
    } catch {
      setApiError('Network error creating subcategory')
    } finally {
      setCreatingSubcategory(false)
    }
  }

  // ── Derived: unique domains + filtered categories ─────────────────────────
  const domains = useMemo<Domain[]>(() => {
    const seen = new Set<string>()
    const result: Domain[] = []
    for (const c of categories) {
      if (c.domain && c.domainId && !seen.has(c.domainId)) {
        seen.add(c.domainId)
        result.push(c.domain as Domain)
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [categories])

  const hasDomains = domains.length > 0

  // Categories filtered by domain selection
  const filteredCategories = useMemo(
    () => (hasDomains && domainId ? categories.filter((c) => c.domainId === domainId) : categories),
    [categories, hasDomains, domainId]
  )

  // Subcategory options for the selected category
  const selectedCategoryObj = filteredCategories.find((c) => c.id === categoryId)
  const subcategories: Subcategory[] = selectedCategoryObj?.subcategories ?? []

  // ── Validate create-new form ──────────────────────────────────────────────
  const validateCreateNew = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Product name is required'
    if (!categoryId) e.categoryId = 'Category is required'
    if (!isFreeItem && (!basePrice || parseFloat(basePrice) <= 0)) {
      e.basePrice = 'Sell price is required. Check "Free Item" if this item has no charge.'
    }
    if (!initialQuantity || parseInt(initialQuantity, 10) < 1) {
      e.initialQuantity = 'Initial quantity must be at least 1'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Validate link-existing form ───────────────────────────────────────────
  const validateLinkExisting = (): boolean => {
    const e: Record<string, string> = {}
    if (!selectedDef) e.selectedDef = 'Select a product definition'
    if (!linkPrice || parseFloat(linkPrice) <= 0) e.linkPrice = 'Sell price is required'
    if (!linkQty || parseInt(linkQty, 10) < 1) e.linkQty = 'Quantity must be at least 1'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit create-new ─────────────────────────────────────────────────────
  const handleSubmitCreateNew = async () => {
    if (!validateCreateNew()) return
    setStep('submitting')
    setApiError(null)
    try {
      const res = await fetch('/api/inventory/quick-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          name: name.trim(),
          categoryId,
          subcategoryId: subcategoryId || undefined,
          supplierId: supplierId || undefined,
          description: description.trim() || undefined,
          barcode,
          basePrice: isFreeItem ? 0 : parseFloat(basePrice),
          isFreeItem,
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
          initialQuantity: parseInt(initialQuantity, 10),
          sku: sku.trim() || undefined,
          attributes:
            isClothing && (size || color)
              ? { size: size || undefined, color: color || undefined }
              : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        const skuNote = data.product.sku ? ` · SKU: ${data.product.sku}` : ''
        toast.push(`✅ ${data.product.name} added to inventory${skuNote}`)
        setStep('success')
        onSuccess(data.productId, data.variantId, data.product.name)
      } else if (res.status === 409 && data.code === 'DUPLICATE_BARCODE') {
        setStep('form')
        setApiError(data.error || 'This barcode is already linked to a product in this business.')
        setDuplicateProductId(data.existingProductId ?? null)
        setDuplicateVariantId(data.existingVariantId ?? null)
        setDuplicateProductName(data.existingProductName ?? null)
      } else {
        setStep('form')
        setApiError(data.error || 'Failed to create product')
      }
    } catch {
      setStep('form')
      setApiError('Network error — please try again')
    }
  }

  // ── Submit activate-pricing (existingProduct mode) ────────────────────────
  const handleSubmitActivate = async () => {
    const e: Record<string, string> = {}
    if (!basePrice || parseFloat(basePrice) <= 0) e.basePrice = 'Sell price is required'
    if (!initialQuantity || parseInt(initialQuantity, 10) < 1) e.initialQuantity = 'Quantity must be at least 1'
    setErrors(e)
    if (Object.keys(e).length > 0) return

    setStep('submitting')
    setApiError(null)
    try {
      const res = await fetch('/api/inventory/activate-definition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          productId: existingProduct!.id,
          variantId: existingProduct!.variantId,
          barcode,
          basePrice: parseFloat(basePrice),
          costPrice: costPrice ? parseFloat(costPrice) : undefined,
          initialQuantity: parseInt(initialQuantity, 10),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.push(`✅ ${data.product.name} activated and added to inventory`)
        setStep('success')
        onSuccess(data.productId, data.variantId, data.product.name)
      } else if (res.status === 409 && data.code === 'DUPLICATE_BARCODE') {
        setStep('form')
        setApiError(data.error || 'This barcode is already linked to another product.')
        setDuplicateProductId(data.existingProductId ?? null)
        setDuplicateVariantId(data.existingVariantId ?? null)
        setDuplicateProductName(data.existingProductName ?? null)
      } else {
        setStep('form')
        setApiError(data.error || 'Failed to activate product')
      }
    } catch {
      setStep('form')
      setApiError('Network error — please try again')
    }
  }

  // ── Submit link-existing ──────────────────────────────────────────────────
  const handleSubmitLinkExisting = async () => {
    if (!validateLinkExisting()) return
    setStep('submitting')
    setApiError(null)
    try {
      const res = await fetch('/api/inventory/activate-definition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          businessType,
          productId: selectedDef!.id,
          variantId: selectedDef!.variantId,
          barcode,
          basePrice: parseFloat(linkPrice),
          costPrice: linkCostPrice ? parseFloat(linkCostPrice) : undefined,
          initialQuantity: parseInt(linkQty, 10),
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.push(`✅ ${data.product.name} linked and added to inventory`)
        setStep('success')
        onSuccess(data.productId, data.variantId, data.product.name)
      } else if (res.status === 409) {
        setStep('form')
        setApiError(data.error || 'This barcode is already linked to another product.')
        setDuplicateProductId(data.existingProductId ?? null)
        setDuplicateVariantId(data.existingVariantId ?? null)
        setDuplicateProductName(data.existingProductName ?? null)
      } else {
        setStep('form')
        setApiError(data.error || 'Failed to link product')
      }
    } catch {
      setStep('form')
      setApiError('Network error — please try again')
    }
  }

  if (!isOpen) return null

  const isSubmitting = step === 'submitting'

  // ── Activate-pricing mode (single-step, no tabs) ──────────────────────────
  if (isActivateMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div role="dialog" aria-modal="true" aria-labelledby="quick-stock-activate-title" className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 id="quick-stock-activate-title" className="text-lg font-semibold text-gray-900 dark:text-white">💰 Activate Pricing &amp; Stock</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {existingProduct!.name} · Barcode: <span className="font-mono">{barcode}</span>
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {apiError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md px-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="flex-1">{apiError}</span>
                  <button type="button" onClick={() => { setApiError(null); setDuplicateProductId(null); setDuplicateVariantId(null); setDuplicateProductName(null) }} className="text-red-400 hover:text-red-600 text-base leading-none flex-shrink-0" aria-label="Dismiss error">✕</button>
                </div>
                {duplicateProductId && (
                  <button type="button" onClick={() => onSuccess(duplicateProductId, duplicateVariantId ?? '', duplicateProductName ?? 'Product')} className="mt-1.5 text-xs font-medium underline text-red-700 dark:text-red-300 hover:no-underline">Add to cart instead →</button>
                )}
              </div>
            )}

            {/* Sell price */}
            <div>
              <label className={labelClass()}>Sell Price <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  autoFocus
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass(!!errors.basePrice)} pl-7`}
                />
              </div>
              {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice}</p>}
            </div>

            {/* Cost price */}
            <div>
              <label className={labelClass()}>Cost Price <span className="text-gray-400 text-xs">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass()} pl-7`}
                />
              </div>
            </div>

            {/* Initial quantity */}
            <div>
              <label className={labelClass()}>Quantity to Stock <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                step="1"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                className={inputClass(!!errors.initialQuantity)}
              />
              {errors.initialQuantity && <p className="text-red-500 text-xs mt-1">{errors.initialQuantity}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 flex gap-3 justify-end">
            <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
              Cancel
            </button>
            <button
              onClick={handleSubmitActivate}
              disabled={isSubmitting}
              className="px-5 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {isSubmitting ? 'Saving…' : '✓ Activate & Stock'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Full modal (create-new + optionally link-existing for clothing) ────────
  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="quick-stock-modal-title" className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 id="quick-stock-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">📦 Stock New Item</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Barcode: <span className="font-mono">{barcode}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">✕</button>
        </div>

        {/* Tabs (clothing only) */}
        {isClothing && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 px-6">
            {(['create-new', 'link-existing'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}); setApiError(null) }}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  mode === m
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {m === 'create-new' ? '➕ Create New' : '🔗 Link Existing'}
              </button>
            ))}
          </div>
        )}

        {/* API error banner */}
        {apiError && (
          <div className="mx-6 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-md px-3 py-2 text-sm flex-shrink-0">
            <div className="flex items-start gap-2">
              <span className="flex-1">{apiError}</span>
              <button type="button" onClick={() => { setApiError(null); setDuplicateProductId(null); setDuplicateVariantId(null); setDuplicateProductName(null) }} className="text-red-400 hover:text-red-600 text-base leading-none flex-shrink-0" aria-label="Dismiss error">✕</button>
            </div>
            {duplicateProductId && (
              <button type="button" onClick={() => { onSuccess(duplicateProductId, duplicateVariantId ?? '', duplicateProductName ?? 'Product') }} className="mt-1.5 text-xs font-medium underline text-red-700 dark:text-red-300 hover:no-underline">Add to cart instead →</button>
            )}
          </div>
        )}

        {/* ── Create New form ─────────────────────────────────────────────── */}
        {mode === 'create-new' && (
          <div className="overflow-y-auto flex-1 px-6 py-5">

            {/* Name — full width */}
            <div className="mb-4">
              <label className={labelClass()}>Product Name <span className="text-red-500">*</span></label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={productNamePlaceholder(businessType)}
                className={inputClass(!!errors.name)}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Two-column grid on desktop: left = categories + supplier; right = pricing */}
            <div className="grid md:grid-cols-2 md:gap-x-6 gap-y-4">
            <div className="space-y-4">
            {/* ── Level 1: Department / Domain (clothing + any type that has domains) ── */}
            {!loadingDropdowns && hasDomains && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass().replace('mb-1', '')}>
                    Department <span className="text-gray-400 text-xs">(filter categories)</span>
                  </label>
                  {domainId && (
                    <button
                      type="button"
                      onClick={() => { setDomainId(''); setCategoryId(''); setSubcategoryId('') }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                    >
                      × Clear
                    </button>
                  )}
                </div>
                <SearchableSelect
                  options={domains.map((d) => ({ id: d.id, name: d.name, emoji: d.emoji || undefined }))}
                  value={domainId}
                  onChange={(id) => { setDomainId(id); setCategoryId(''); setSubcategoryId(''); setShowNewSubcategory(false) }}
                  placeholder="All departments…"
                  searchPlaceholder="Search departments…"
                />
              </div>
            )}

            {/* ── Level 2: Category ── */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass().replace('mb-1', '')}>Category <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={() => { setShowNewCategory((v) => !v); setShowNewSubcategory(false) }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showNewCategory ? 'Cancel' : '+ New category'}
                </button>
              </div>
              {showNewCategory ? (
                <div>
                  {filteredCategories.length === 0 && !loadingDropdowns && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1.5">
                      No categories yet — type a name below to create one
                    </p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Category name"
                      className={inputClass()}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory() }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={creatingCategory || !newCategoryName.trim()}
                      className="px-3 py-2 text-xs bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 whitespace-nowrap"
                    >
                      {creatingCategory ? '…' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : loadingDropdowns ? (
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              ) : (
                <SearchableSelect
                  options={filteredCategories.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji || undefined }))}
                  value={categoryId}
                  onChange={(id) => { setCategoryId(id); setSubcategoryId(''); setShowNewSubcategory(false) }}
                  placeholder={hasDomains && domainId ? 'Select category in this department…' : 'Select category…'}
                  searchPlaceholder="Search categories…"
                  error={errors.categoryId}
                />
              )}
            </div>

            {/* ── Level 3: Subcategory (shown as soon as a category is selected) ── */}
            {categoryId && !showNewCategory && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass().replace('mb-1', '')}>
                    Subcategory <span className="text-gray-400 text-xs">(optional)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {subcategoryId && !showNewSubcategory && (
                      <button
                        type="button"
                        onClick={() => setSubcategoryId('')}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                      >
                        × Clear
                      </button>
                    )}
                    {canCreateSubcategories && (
                      <button
                        type="button"
                        onClick={() => setShowNewSubcategory((v) => !v)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {showNewSubcategory ? 'Cancel' : '+ New subcategory'}
                      </button>
                    )}
                  </div>
                </div>
                {showNewSubcategory ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubcategoryEmoji}
                        onChange={(e) => setNewSubcategoryEmoji(e.target.value)}
                        placeholder="Emoji"
                        className={`${inputClass()} w-20 text-center`}
                        maxLength={2}
                      />
                      <input
                        type="text"
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        placeholder="Subcategory name"
                        className={`${inputClass()} flex-1`}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSubcategory() }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCreateSubcategory}
                        disabled={creatingSubcategory || !newSubcategoryName.trim()}
                        className="px-3 py-2 text-xs bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 whitespace-nowrap"
                      >
                        {creatingSubcategory ? '…' : 'Create'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <SearchableSelect
                    options={subcategories.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji || undefined }))}
                    value={subcategoryId}
                    onChange={(id) => setSubcategoryId(id)}
                    placeholder="No subcategory"
                    searchPlaceholder="Search subcategories…"
                    emptyMessage={
                      subcategories.length === 0
                        ? canCreateSubcategories
                          ? 'No subcategories yet — click "+ New subcategory" to add one'
                          : 'No subcategories yet'
                        : 'No match'
                    }
                  />
                )}
              </div>
            )}

            {/* Supplier */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={labelClass().replace('mb-1', '')}>Supplier <span className="text-gray-400 text-xs">(optional)</span></label>
                <button
                  type="button"
                  onClick={() => setShowSupplierFormModal(true)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + New supplier
                </button>
              </div>
              {loadingDropdowns ? (
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
              ) : (
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <SearchableSelect
                      options={suppliers.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji || undefined }))}
                      value={supplierId}
                      onChange={(id) => setSupplierId(id)}
                      placeholder="No supplier"
                      searchPlaceholder="Search suppliers…"
                    />
                  </div>
                  {supplierId && (
                    <button
                      type="button"
                      onClick={() => setSupplierId('')}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:underline mt-2.5"
                    >
                      × Clear
                    </button>
                  )}
                </div>
              )}
            </div>

            </div>{/* end left column */}

            {/* RIGHT COLUMN — Description, Pricing, Qty, SKU */}
            <div className="space-y-4">
            {/* Description */}
            <div>
              <label className={labelClass()}>Description <span className="text-gray-400 text-xs">(optional)</span></label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief product description…"
                className={`${inputClass()} resize-none`}
              />
            </div>

            {/* Sell price + Free item override */}
            <div>
              <label className={labelClass()}>Sell Price <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  ref={priceInputRef}
                  type="number"
                  min="0"
                  step="0.01"
                  value={isFreeItem ? '0.00' : basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  disabled={isFreeItem}
                  placeholder="0.00"
                  className={`${inputClass(!!errors.basePrice)} pl-7 disabled:bg-gray-100 dark:disabled:bg-gray-600`}
                />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFreeItem}
                  onChange={(e) => { setIsFreeItem(e.target.checked); if (e.target.checked) setBasePrice('0') }}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Free Item — this item has no charge ($0.00)</span>
              </label>
              {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice}</p>}
            </div>

            {/* Cost price */}
            <div>
              <label className={labelClass()}>Cost Price <span className="text-gray-400 text-xs">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass()} pl-7`}
                />
              </div>
            </div>

            {/* Initial quantity */}
            <div>
              <label className={labelClass()}>Initial Quantity <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                step="1"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                className={inputClass(!!errors.initialQuantity)}
              />
              {errors.initialQuantity && <p className="text-red-500 text-xs mt-1">{errors.initialQuantity}</p>}
            </div>

            {/* SKU (optional) */}
            <div>
              <label className={labelClass()}>SKU <span className="text-gray-400 text-xs">(optional — auto-generated if blank)</span></label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Leave blank to auto-generate"
                className={inputClass()}
              />
            </div>

            </div>{/* end right column */}

            {/* Clothing-only: Size + Color — full width */}
            {isClothing && (
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass()}>Size <span className="text-gray-400 text-xs">(clothing)</span></label>
                    <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. M, L, XL" className={inputClass()} />
                  </div>
                  <div>
                    <label className={labelClass()}>Color <span className="text-gray-400 text-xs">(clothing)</span></label>
                    <input type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Blue" className={inputClass()} />
                  </div>
                </div>
              </div>
            )}
            </div>{/* end two-column grid */}
          </div>
        )}

        {/* ── Link Existing tab (clothing only) ───────────────────────────── */}
        {mode === 'link-existing' && (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {/* Search */}
            <div>
              <label className={labelClass()}>Search product definitions</label>
              <input
                type="text"
                value={defSearch}
                onChange={(e) => setDefSearch(e.target.value)}
                placeholder="Search by name or SKU…"
                className={inputClass()}
              />
            </div>

            {/* Definitions list */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden max-h-56 overflow-y-auto">
              {loadingDefs && (
                <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Loading…</div>
              )}
              {!loadingDefs && definitions.length === 0 && (
                <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No definitions found</div>
              )}
              {definitions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDef(d)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                    selectedDef?.id === d.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-white">{d.name}</div>
                  {d.sku && <div className="text-xs text-gray-400 mt-0.5">SKU: {d.sku}</div>}
                  {d.category && <div className="text-xs text-gray-400">{d.category.emoji} {d.category.name}</div>}
                </button>
              ))}
              {/* Load more */}
              {!loadingDefs && definitions.length < defTotal && (
                <button
                  type="button"
                  onClick={() => {
                    const next = defPage + 1
                    setDefPage(next)
                    loadDefinitions(defSearch, next)
                  }}
                  className="w-full py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 text-center"
                >
                  Load more ({defTotal - definitions.length} remaining)
                </button>
              )}
            </div>
            {errors.selectedDef && <p className="text-red-500 text-xs">{errors.selectedDef}</p>}

            {/* Selected definition details */}
            {selectedDef && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md px-4 py-3 text-sm">
                <p className="font-medium text-gray-900 dark:text-white">Selected: {selectedDef.name}</p>
                {selectedDef.sku && <p className="text-gray-500 dark:text-gray-400 text-xs">SKU: {selectedDef.sku}</p>}
              </div>
            )}

            {/* Link form fields */}
            <div>
              <label className={labelClass()}>Sell Price <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={linkPrice}
                  onChange={(e) => setLinkPrice(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass(!!errors.linkPrice)} pl-7`}
                />
              </div>
              {errors.linkPrice && <p className="text-red-500 text-xs mt-1">{errors.linkPrice}</p>}
            </div>

            <div>
              <label className={labelClass()}>Cost Price <span className="text-gray-400 text-xs">(optional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={linkCostPrice}
                  onChange={(e) => setLinkCostPrice(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass()} pl-7`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass()}>Quantity to Stock <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                step="1"
                value={linkQty}
                onChange={(e) => setLinkQty(e.target.value)}
                className={inputClass(!!errors.linkQty)}
              />
              {errors.linkQty && <p className="text-red-500 text-xs mt-1">{errors.linkQty}</p>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={mode === 'create-new' ? handleSubmitCreateNew : handleSubmitLinkExisting}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {isSubmitting
              ? 'Saving…'
              : mode === 'create-new'
              ? '✓ Create & Stock'
              : '✓ Link & Stock'}
          </button>
        </div>

      </div>
    </div>
    {/* UniversalSupplierForm overlay — renders above the main modal */}
    {showSupplierFormModal && (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
        <UniversalSupplierForm
          businessId={businessId}
          businessType={businessType as any}
          onSubmit={handleNewSupplierSubmit}
          onCancel={() => setShowSupplierFormModal(false)}
          loading={creatingSupplier}
        />
      </div>
    )}
    </>
  )
}
