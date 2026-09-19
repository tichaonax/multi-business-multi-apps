'use client'

import { useState, useEffect, useRef } from 'react'
import { SupplierSelector } from '@/components/suppliers/supplier-selector'
import { LocationSelector } from '@/components/locations/location-selector'
import { InventorySubcategoryEditor } from '@/components/inventory/inventory-subcategory-editor'
import { BarcodeManager, ProductBarcode } from '@/components/universal/barcode-manager'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { ProductTagPicker, ProductTagsEditor } from '@/components/universal/product-tag-picker'
import { AttributeOptionsPicker } from '@/components/universal/attribute-options-picker'
import { useToastContext } from '@/components/ui/toast'
import { ImageUploadDialog } from '@/components/pos/image-upload-dialog'
import { useSession } from 'next-auth/react'
import { useUserPermissions } from '@/hooks/use-user-permissions'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { LabelPreview } from '@/components/printing/label-preview'
import { usePrinterPermissions } from '@/hooks/use-printer-permissions'
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'
import { usePrompt, useAlert, useConfirm } from '@/components/ui/confirm-modal'
import SKUGenerator from '@/components/products/sku-generator'
import type { LabelData, NetworkPrinter, BarcodeFormat, LabelFormat } from '@/types/printing'
import { PricingCalculator } from '@/components/inventory/pricing-calculator'

interface InventorySubcategory {
  id: string
  name: string
  emoji?: string
  displayOrder: number
}

interface UniversalInventoryItem {
  id?: string
  businessId: string
  businessType: string
  name: string
  sku: string
  description?: string
  category?: string // Legacy field for backward compatibility
  categoryId?: string
  subcategoryId?: string
  currentStock: number
  unit: string
  costPrice: number
  sellPrice: number
  // MBM-297 — bulk-pack cost allocation, when this item was bought as a
  // case/pack. `costPrice` above stays the real individual unit cost;
  // these two just let it be derived correctly instead of recording the
  // whole case cost as if it were one unit's cost.
  unitsPerPack?: number | null
  bulkPackCost?: number | null
  // MBM-297 follow-up — expense classification, carried over from the Bulk
  // Products registration flow (CustomBulkProducts). Only ever set on
  // BarcodeInventoryItems-backed items (id prefixed 'inv_') — the section
  // below is hidden for BusinessProducts, which has no equivalent columns.
  expenseDomainId?: string | null
  expenseCategoryId?: string | null
  expenseSubcategoryId?: string | null
  supplier?: string // Legacy - for display only
  supplierId?: string
  location?: string // Legacy - for display only
  locationId?: string
  isActive: boolean
  isAvailable?: boolean
  barcodes?: ProductBarcode[]
  attributes?: Record<string, any>
  // MBM-296: the item's own display image, if it has one — not an editable
  // form field, just what the GET endpoint returns to seed the thumbnail.
  imageUrl?: string | null
  // The inventory LIST endpoint's row shape carries the bare Images.id as
  // `imageId` instead of a ready-made `imageUrl` (same convention the grid
  // component already renders from) — "Edit" from the list passes that row
  // straight in as `item` without a fresh fetch, so this form has to accept
  // either shape rather than only the single-item GET endpoint's `imageUrl`.
  imageId?: string | null
  // MBM-133 follow-up — draft/unconfigured product flag. Hidden from
  // inventory search until priced or manually converted.
  isProductTemplate?: boolean
}

// MBM-270: hardware conditional fields, keyed by exact category name (see
// "Conditional Item Fields" table in 🏬 Hardware & Home Improvement Invento.md).
// All values still land in the same formData.attributes JSON bag the rest of
// this form already uses — no new storage mechanism, just category-aware inputs.
interface HardwareAttrField {
  key: string
  label: string
  type: 'text' | 'number' | 'select'
  options?: string[]
  placeholder?: string
}

const HARDWARE_UNIVERSAL_FIELDS: HardwareAttrField[] = [
  { key: 'manufacturer', label: 'Manufacturer', type: 'text', placeholder: 'Manufacturer name' },
  { key: 'model', label: 'Model Number', type: 'text', placeholder: 'Model number' },
  { key: 'warranty', label: 'Warranty Period', type: 'text', placeholder: 'e.g., 1 year, 5 years' },
  {
    key: 'unitOfMeasure', label: 'Unit of Measure', type: 'select',
    options: ['Piece', 'Bag', 'Box', 'Bundle', 'Metre', 'Litre', 'Kilogram', 'Square Metre', 'Cubic Metre', 'Sheet', 'Roll', 'Pallet', 'Set'],
  },
  { key: 'packSize', label: 'Pack Size', type: 'text', placeholder: 'e.g., 50 kg, Box of 100' },
  { key: 'colour', label: 'Colour / Finish', type: 'text', placeholder: 'e.g., Grey' },
  { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g., 2440 x 1220 x 12 mm' },
  { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Cement, Steel, PVC, Timber' },
]

const LIGHTING_FIELDS: HardwareAttrField[] = [
  { key: 'wattage', label: 'Wattage', type: 'number' },
  { key: 'voltage', label: 'Voltage', type: 'text' },
  { key: 'bulbBase', label: 'Bulb Base', type: 'text' },
  { key: 'colourTemperature', label: 'Colour Temperature', type: 'text' },
  { key: 'lumens', label: 'Lumens', type: 'number' },
  { key: 'indoorOutdoor', label: 'Indoor / Outdoor', type: 'select', options: ['Indoor', 'Outdoor', 'Both'] },
]

const ELECTRICAL_FIELDS: HardwareAttrField[] = [
  { key: 'voltage', label: 'Voltage', type: 'text' },
  { key: 'amperage', label: 'Amperage', type: 'text' },
  { key: 'wireGauge', label: 'Wire Gauge', type: 'text' },
  { key: 'numberOfCores', label: 'Number of Cores', type: 'number' },
  { key: 'cableLength', label: 'Cable Length', type: 'text' },
  { key: 'certification', label: 'Certification', type: 'text' },
]

const PLUMBING_FIELDS: HardwareAttrField[] = [
  { key: 'pipeDiameter', label: 'Pipe Diameter', type: 'text' },
  { key: 'pressureRating', label: 'Pressure Rating', type: 'text' },
  { key: 'fittingType', label: 'Fitting Type', type: 'text' },
  { key: 'hotColdSuitability', label: 'Hot / Cold Suitability', type: 'select', options: ['Hot', 'Cold', 'Both'] },
]

const PAINT_FIELDS: HardwareAttrField[] = [
  { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Satin', 'Gloss', 'Semi-Gloss'] },
  { key: 'baseType', label: 'Base Type', type: 'text' },
  { key: 'volume', label: 'Volume', type: 'text' },
  { key: 'coverage', label: 'Coverage', type: 'text' },
  { key: 'interiorExterior', label: 'Interior / Exterior', type: 'select', options: ['Interior', 'Exterior', 'Both'] },
]

const LUMBER_FIELDS: HardwareAttrField[] = [
  { key: 'species', label: 'Species', type: 'text' },
  { key: 'treatment', label: 'Treatment', type: 'text' },
  { key: 'grade', label: 'Grade', type: 'text' },
  { key: 'length', label: 'Length', type: 'text' },
  { key: 'width', label: 'Width', type: 'text' },
  { key: 'thickness', label: 'Thickness', type: 'text' },
  { key: 'moistureRating', label: 'Moisture Rating', type: 'text' },
]

const MASONRY_FIELDS: HardwareAttrField[] = [
  { key: 'weight', label: 'Weight', type: 'text' },
  { key: 'strengthClass', label: 'Strength Class', type: 'text' },
  { key: 'cureTime', label: 'Cure Time', type: 'text' },
  { key: 'indoorOutdoorSuitability', label: 'Indoor / Outdoor Suitability', type: 'select', options: ['Indoor', 'Outdoor', 'Both'] },
]

const TOOLS_FIELDS: HardwareAttrField[] = [
  { key: 'powerSource', label: 'Power Source', type: 'select', options: ['Manual', 'Corded Electric', 'Battery', 'Pneumatic', 'Petrol'] },
  { key: 'wattage', label: 'Wattage', type: 'number' },
  { key: 'toolType', label: 'Tool Type', type: 'text' },
  { key: 'includedAccessories', label: 'Included Accessories', type: 'text' },
]

const FASTENER_FIELDS: HardwareAttrField[] = [
  { key: 'diameter', label: 'Diameter', type: 'text' },
  { key: 'length', label: 'Length', type: 'text' },
  { key: 'threadType', label: 'Thread Type', type: 'text' },
  { key: 'coating', label: 'Coating', type: 'text' },
  { key: 'packQuantity', label: 'Pack Quantity', type: 'number' },
]

const DOORS_WINDOWS_FIELDS: HardwareAttrField[] = [
  { key: 'width', label: 'Width', type: 'text' },
  { key: 'height', label: 'Height', type: 'text' },
  { key: 'handingOpeningDirection', label: 'Handing / Opening Direction', type: 'select', options: ['Left', 'Right', 'Sliding', 'N/A'] },
  { key: 'glazingType', label: 'Glazing Type', type: 'text' },
]

const FLOORING_FIELDS: HardwareAttrField[] = [
  { key: 'areaCoverage', label: 'Area Coverage', type: 'text' },
  { key: 'finish', label: 'Finish', type: 'text' },
  { key: 'waterResistance', label: 'Water Resistance', type: 'select', options: ['Yes', 'No', 'Partial'] },
  { key: 'installationMethod', label: 'Installation Method', type: 'text' },
]

const APPLIANCE_FIELDS: HardwareAttrField[] = [
  { key: 'energyRating', label: 'Energy Rating', type: 'text' },
  { key: 'capacity', label: 'Capacity', type: 'text' },
]

const GARDEN_FIELDS: HardwareAttrField[] = [
  { key: 'plantType', label: 'Plant Type', type: 'text' },
  { key: 'seedQuantity', label: 'Seed Quantity', type: 'text' },
  { key: 'coverageArea', label: 'Coverage Area', type: 'text' },
  { key: 'fertilizerAnalysis', label: 'Fertilizer Analysis', type: 'text' },
  { key: 'seasonality', label: 'Seasonality', type: 'select', options: ['Spring', 'Summer', 'Fall', 'Winter', 'Year-Round'] },
]

// Exact category-name lookup — matches the category names seeded in
// seed-hardware-taxonomy-expansion.js. A category not listed here just gets
// the universal fields above plus the free-form Specifications field.
const HARDWARE_CATEGORY_FIELDS: Record<string, HardwareAttrField[]> = {
  'Lighting': LIGHTING_FIELDS,
  'Wire, Cable and Conduit': ELECTRICAL_FIELDS,
  'Electrical Components': ELECTRICAL_FIELDS,
  'Pipes and Fittings': PLUMBING_FIELDS,
  'Valves and Water Control': PLUMBING_FIELDS,
  'Bathroom Fixtures': PLUMBING_FIELDS,
  'Drainage and Waste': PLUMBING_FIELDS,
  'Paint': PAINT_FIELDS,
  'Lumber and Sheet Goods': LUMBER_FIELDS,
  'Concrete, Cement and Masonry': MASONRY_FIELDS,
  'General Hand Tools': TOOLS_FIELDS,
  'General Power Tools': TOOLS_FIELDS,
  'Workshop Equipment': TOOLS_FIELDS,
  'Screws, Bolts and Nuts': FASTENER_FIELDS,
  'Nails, Staples and Rivets': FASTENER_FIELDS,
  'Anchors and Structural Hardware': FASTENER_FIELDS,
  'Doors and Door Hardware': DOORS_WINDOWS_FIELDS,
  'Windows and Window Hardware': DOORS_WINDOWS_FIELDS,
  'Flooring': FLOORING_FIELDS,
  'Refrigeration': APPLIANCE_FIELDS,
  'Kitchen Appliances': APPLIANCE_FIELDS,
  'Laundry and Cleaning Appliances': APPLIANCE_FIELDS,
  'Heating and Cooling Appliances': APPLIANCE_FIELDS,
  'Plants, Seeds and Soil': GARDEN_FIELDS,
}

interface UniversalInventoryFormProps {
  businessId: string
  businessType: string
  item?: UniversalInventoryItem
  // legacy: onSave
  onSave?: (item: UniversalInventoryItem) => void
  // preferred: onSubmit handler used by pages
  onSubmit?: (formData: any) => Promise<void> | void
  onCancel: () => void
  // Fires after an in-modal action persists immediately to the server —
  // stock adjustment, template conversion, image change — bypassing the
  // normal onSubmit/onSave flow entirely. Without this, the parent's list
  // (e.g. UniversalInventoryGrid) has no way to know data changed if the
  // user closes the modal without ever clicking the main Update button,
  // and shows stale data until a manual page refresh. Optional so existing
  // callers that don't need it keep working unchanged.
  onSilentUpdate?: () => void
  isOpen?: boolean
  customFields?: any[]
  mode?: 'create' | 'edit'
  // renderMode controls whether the component renders its built-in modal wrapper
  // or only the inner form panel so a parent can supply a modal wrapper.
  renderMode?: 'modal' | 'inline'
  // Called when categories finish loading — lets the parent disable action buttons until ready
  onCategoriesLoaded?: () => void
  // Set true when the parent page renders its own weight selling bar (restaurant/grocery inventory pages)
  hideWeightBar?: boolean
  // When parent manages isSoldByWeight, pass the value here so the form hides irrelevant fields
  soldByWeight?: boolean
}

export function UniversalInventoryForm({
  businessId,
  businessType,
  item,
  onSave,
  onSubmit,
  onCancel,
  onSilentUpdate,
  isOpen = true,
  customFields = [],
  mode = 'create',
  renderMode = 'modal',
  onCategoriesLoaded,
  hideWeightBar = false,
  soldByWeight = false,
}: UniversalInventoryFormProps) {
  const [formData, setFormData] = useState<UniversalInventoryItem>({
    businessId,
    businessType,
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    subcategoryId: '',
    currentStock: 0,
    unit: '',
    costPrice: 0,
    sellPrice: 0,
    unitsPerPack: null,
    bulkPackCost: null,
    expenseDomainId: null,
    expenseCategoryId: null,
    expenseSubcategoryId: null,
    supplier: '',
    supplierId: undefined,
    location: '',
    locationId: undefined,
    isActive: true,
    isAvailable: true,
    attributes: {}
  })

  const [domains, setDomains] = useState<Array<{ id: string; name: string; emoji: string }>>([])
  const [selectedDomainId, setSelectedDomainId] = useState<string>('')
  const [domainsLoaded, setDomainsLoaded] = useState(false)
  const [categories, setCategories] = useState<Array<{
    id: string
    name: string
    emoji?: string
    color?: string
    domainId?: string | null
    subcategories?: InventorySubcategory[]
  }>>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [availableSubcategories, setAvailableSubcategories] = useState<InventorySubcategory[]>([])
  const [loading, setLoading] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<Array<{ id: string; name: string; sku: string | null }>>([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [isNavigatingToPOS, setIsNavigatingToPOS] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showImageDialog, setShowImageDialog] = useState(false)
  // Tracks which imageUrl has actually finished loading in the <img> below,
  // so a newly-saved image (MBM-298) shows a spinner instead of a blank box
  // while it loads, rather than looking like the save silently did nothing.
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null)
  const [showSubcategoryEditor, setShowSubcategoryEditor] = useState(false)
  const [printOnSave, setPrintOnSave] = useState(false)
  const [showLabelPreview, setShowLabelPreview] = useState(false)
  const [savedItemForLabel, setSavedItemForLabel] = useState<UniversalInventoryItem | null>(null)
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([])
  const [isManualSku, setIsManualSku] = useState(false)
  const [transportConfig, setTransportConfig] = useState<{ enabled: boolean; distanceKm: number | null; ratePerKm: number }>({ enabled: false, distanceKm: null, ratePerKm: 0.30 })

  // ── Suggest Classification ──────────────────────────────────────────────────
  type SuggestItem = {
    domainId: string; domainName: string; domainEmoji: string
    categoryId: string; categoryName: string; categoryEmoji: string
    subcategoryId: string; subcategoryName: string; subcategoryEmoji: string
    score: number
  }
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestVisibleCount, setSuggestVisibleCount] = useState(5)
  // Was calcDismissed (default false, meaning "shown by default until
  // dismissed") - with an existing item already carrying a cost price, that
  // popped the calculator open immediately whenever the form loaded, unrequested.
  // It should only open when the user actually focuses the Sell Price field
  // (or edits Cost Price, which re-opens it to help recompute a new price).
  const [calcOpen, setCalcOpen] = useState(false)

  // A reason is required whenever a real previous cost/sell price is being
  // changed to a different value (mirrors isPriceChangeReasonRequired in
  // src/lib/inventory/price-history.ts — duplicated here rather than
  // imported, since that module pulls in prisma/server-only deps that can't
  // be bundled into this client component). The PUT route enforces this
  // server-side; this form previously had no field to satisfy it at all.
  const [priceChangeReason, setPriceChangeReason] = useState('')
  const isPriceChangeReasonRequired = (oldPrice: number | null | undefined, newPrice: number | null | undefined): boolean => {
    if (oldPrice === null || oldPrice === undefined || oldPrice <= 0) return false
    if (newPrice === null || newPrice === undefined) return false
    return oldPrice !== newPrice
  }
  const priceChanging = !!item && (
    isPriceChangeReasonRequired(item.costPrice, formData.costPrice) ||
    isPriceChangeReasonRequired(item.sellPrice, formData.sellPrice)
  )

  // Weight selling — restaurant and grocery only
  const isWeightBusiness = businessType === 'restaurant' || businessType === 'grocery'
  const [isSoldByWeight, setIsSoldByWeight] = useState(false)
  const [pricePerKg, setPricePerKg] = useState('')
  const [weightPricingRuleId, setWeightPricingRuleId] = useState('')
  const [purchaseRuleId, setPurchaseRuleId] = useState('')
  const [saleRules, setSaleRules] = useState<{ id: string; categoryName: string; pricePerKg: number; emoji: string }[]>([])
  const [purchaseRules, setPurchaseRules] = useState<{ id: string; categoryName: string; pricePerKg: number; emoji: string }[]>([])
  const [suggestions, setSuggestions] = useState<SuggestItem[]>([])

  // ── Expense Classification (MBM-297 follow-up) ──────────────────────────
  // Domain → Category → Subcategory expense classification, ported over
  // from the Bulk Products registration modal (custom-bulk-modal.tsx) now
  // that bulk-registered items are real BarcodeInventoryItems rows. This is
  // a different hierarchy from the "inventory category" one above (that one
  // organizes products for browsing; this one buckets a purchase for
  // accounting/expense reporting) — only shown for BarcodeInventoryItems
  // (id prefixed 'inv_'), the only catalog with these columns.
  type ExpenseDomainItem = { id: string; name: string; emoji?: string }
  type ExpenseSuggestion = {
    domainId: string; domainName: string; domainEmoji: string | null
    categoryId: string; categoryName: string; categoryEmoji: string | null
    subcategoryId: string; subcategoryName: string; subcategoryEmoji: string | null
    score: number
  }
  const [expenseDomains, setExpenseDomains] = useState<ExpenseDomainItem[]>([])
  const [expenseCategories, setExpenseCategories] = useState<ExpenseDomainItem[]>([])
  const [expenseSubcategories, setExpenseSubcategories] = useState<ExpenseDomainItem[]>([])
  const [loadingExpenseCategories, setLoadingExpenseCategories] = useState(false)
  const [loadingExpenseSubcategories, setLoadingExpenseSubcategories] = useState(false)
  const [expenseSuggestLoading, setExpenseSuggestLoading] = useState(false)
  const [expenseSuggestions, setExpenseSuggestions] = useState<ExpenseSuggestion[]>([])
  const [showExpenseSuggest, setShowExpenseSuggest] = useState(false)

  useEffect(() => {
    fetch('/api/expense-categories/hierarchical')
      .then(r => r.json())
      .then(d => {
        const items: ExpenseDomainItem[] = (d.domains?.[0]?.expense_categories ?? []).map((c: any) => ({
          id: c.id, name: c.name, ...(c.emoji ? { emoji: c.emoji } : {}),
        }))
        setExpenseDomains(items)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!formData.expenseDomainId) {
      setExpenseCategories([])
      setExpenseSubcategories([])
      return
    }
    setLoadingExpenseCategories(true)
    setExpenseCategories([])
    setExpenseSubcategories([])
    fetch(`/api/expense-categories/${formData.expenseDomainId}/subcategories`)
      .then(r => r.json())
      .then(d => {
        const items: ExpenseDomainItem[] = (d.subcategories ?? []).map((c: any) => ({
          id: c.id, name: c.name, ...(c.emoji ? { emoji: c.emoji } : {}),
        }))
        setExpenseCategories(items)
      })
      .catch(() => {})
      .finally(() => setLoadingExpenseCategories(false))
  }, [formData.expenseDomainId])

  useEffect(() => {
    if (!formData.expenseCategoryId) {
      setExpenseSubcategories([])
      return
    }
    setLoadingExpenseSubcategories(true)
    setExpenseSubcategories([])
    fetch(`/api/expense-categories/${formData.expenseCategoryId}/subcategories`)
      .then(r => r.json())
      .then(d => {
        const items: ExpenseDomainItem[] = (d.subcategories ?? []).map((c: any) => ({
          id: c.id, name: c.name, ...(c.emoji ? { emoji: c.emoji } : {}),
        }))
        setExpenseSubcategories(items)
      })
      .catch(() => {})
      .finally(() => setLoadingExpenseSubcategories(false))
  }, [formData.expenseCategoryId])

  const handleExpenseDomainChange = (domainId: string) => {
    setFormData(prev => ({ ...prev, expenseDomainId: domainId || null, expenseCategoryId: null, expenseSubcategoryId: null }))
  }
  const handleExpenseCategoryChange = (categoryId: string) => {
    setFormData(prev => ({ ...prev, expenseCategoryId: categoryId || null, expenseSubcategoryId: null }))
  }
  const handleExpenseSuggest = async () => {
    if (formData.name.trim().length < 2) return
    setExpenseSuggestLoading(true)
    setShowExpenseSuggest(true)
    setExpenseSuggestions([])
    try {
      const res = await fetch(`/api/expense-categories/suggest?q=${encodeURIComponent(formData.name.trim())}`)
      const d = await res.json()
      setExpenseSuggestions(d.suggestions ?? [])
    } catch {
      setExpenseSuggestions([])
    } finally {
      setExpenseSuggestLoading(false)
    }
  }
  const applyExpenseSuggestion = (s: ExpenseSuggestion) => {
    setFormData(prev => ({ ...prev, expenseDomainId: s.domainId, expenseCategoryId: s.categoryId, expenseSubcategoryId: s.subcategoryId }))
    setShowExpenseSuggest(false)
    setExpenseSuggestions([])
  }

  // Effective weight mode — true when form's own toggle OR parent-managed prop says sold by weight
  const effectiveWeightMode = isSoldByWeight || soldByWeight

  const { data: session } = useSession()
  const { permissions } = useUserPermissions()
  const { isSystemAdmin, hasPermission: hasBusinessPermission } = useBusinessPermissionsContext()
  const canManageInventory = isSystemAdmin || hasBusinessPermission('canManageInventory')
  const [convertingTemplate, setConvertingTemplate] = useState(false)
  const [adjustingStock, setAdjustingStock] = useState(false)

  // Create-mode image/tags staging — a brand-new item has no id yet to
  // upload a photo to or attach tags on, so both are held locally and
  // applied automatically the instant the item is actually created
  // (watched via the effect below), instead of forcing a separate
  // "create, then add image/tags" round trip.
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null)
  const [pendingImageId, setPendingImageId] = useState<string | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [uploadingPendingImage, setUploadingPendingImage] = useState(false)
  const [showImageSourceMenu, setShowImageSourceMenu] = useState(false)
  const [showImagePoolBrowser, setShowImagePoolBrowser] = useState(false)
  const [pendingTagNames, setPendingTagNames] = useState<string[]>([])
  const pendingImageFileRef = useRef<File | null>(null)
  const pendingImageIdRef = useRef<string | null>(null)
  const pendingTagNamesRef = useRef<string[]>([])
  useEffect(() => { pendingImageFileRef.current = pendingImageFile }, [pendingImageFile])
  useEffect(() => { pendingImageIdRef.current = pendingImageId }, [pendingImageId])
  useEffect(() => { pendingTagNamesRef.current = pendingTagNames }, [pendingTagNames])

  function stagePendingImage(file: File) {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview)
    setPendingImageId(null)
    setPendingImageFile(file)
    setPendingImagePreview(URL.createObjectURL(file))
  }

  function stagePendingPoolImage(imageId: string, url: string) {
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview)
    setPendingImageFile(null)
    setPendingImageId(imageId)
    setPendingImagePreview(url)
    setShowImagePoolBrowser(false)
    setShowImageSourceMenu(false)
  }

  // Fires the moment `item` flips from "no id" (create) to "has an id"
  // (right after a successful create, when the parent feeds the server's
  // response back in as `item`) — applies whatever was staged.
  useEffect(() => {
    if (!item?.id || item.id.startsWith('inv_')) return
    const file = pendingImageFileRef.current
    const poolImageId = pendingImageIdRef.current
    const tagNames = pendingTagNamesRef.current
    if (!file && !poolImageId && tagNames.length === 0) return
    const productId = item.id
    pendingImageFileRef.current = null
    pendingImageIdRef.current = null
    pendingTagNamesRef.current = []
    setPendingImageFile(null)
    setPendingImageId(null)
    setPendingTagNames([])
    ;(async () => {
      if (file) {
        setUploadingPendingImage(true)
        try {
          const form = new FormData()
          form.append('files', file)
          const uploadRes = await fetch(`/api/universal/products/${productId}/images`, { method: 'POST', body: form })
          if (!uploadRes.ok) throw new Error('Upload failed')
          const { data } = await uploadRes.json()
          const images = data?.images ?? []
          const newImg = images.length > 0 ? images.reduce((a: any, b: any) => (b.sortOrder > a.sortOrder ? b : a)) : null
          if (newImg) {
            await fetch(`/api/universal/products/${productId}/images/${newImg.id}/primary`, { method: 'POST' })
            setFormData(prev => ({ ...prev, imageUrl: newImg.imageUrl }))
            onSilentUpdate?.()
          }
        } catch {
          await alert({ title: 'Image upload failed', description: 'The item was created, but the photo could not be uploaded. Use Add Image below to try again.' })
        } finally {
          setUploadingPendingImage(false)
          setPendingImagePreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
        }
      } else if (poolImageId) {
        setUploadingPendingImage(true)
        try {
          const res = await fetch(`/api/universal/products/${productId}/images/from-gallery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageIds: [poolImageId] }),
          })
          if (!res.ok) throw new Error('Failed to attach image')
          const { primaryImageUrl } = await res.json()
          setFormData(prev => ({ ...prev, imageUrl: primaryImageUrl }))
          onSilentUpdate?.()
        } catch {
          await alert({ title: 'Image attach failed', description: 'The item was created, but the pool image could not be attached. Use Add Image below to try again.' })
        } finally {
          setUploadingPendingImage(false)
          setPendingImagePreview(null)
        }
      }
      for (const name of tagNames) {
        await fetch(`/api/universal/products/${productId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        }).catch(() => {})
      }
      if (tagNames.length > 0) onSilentUpdate?.()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id])

  // Modal hooks
  const prompt = usePrompt()
  const alert = useAlert()
  const confirmDialog = useConfirm()

  // Unsaved-changes guard — the "Adjust Stock" prompt and other edits used
  // to only stage local state, silently lost if the modal was closed without
  // hitting Update. Stock adjustments now persist immediately (see the
  // 📦 Adjust button below); this flag covers everything else.
  const [isDirty, setIsDirty] = useState(false)
  const markDirty = () => setIsDirty(true)

  // Printing hooks
  const { canPrintInventoryLabels } = usePrinterPermissions()
  const { monitorJob, notifyJobQueued } = usePrintJobMonitor()

  // Fetch active SALE and PURCHASE pricing presets for weight selling
  useEffect(() => {
    if (!isWeightBusiness || !businessId) return
    fetch(`/api/weight-pricing-rules?businessId=${businessId}`)
      .then(r => r.json())
      .then(data => {
        const all = Array.isArray(data) ? data : []
        const toRule = (r: any) => ({ id: r.id, categoryName: r.categoryName, pricePerKg: Number(r.pricePerKg), emoji: r.emoji })
        setSaleRules(all.filter((r: any) => r.ruleType === 'SALE' && r.isActive).map(toRule))
        setPurchaseRules(all.filter((r: any) => r.ruleType === 'PURCHASE' && r.isActive).map(toRule))
      })
      .catch(() => {})
  }, [isWeightBusiness, businessId])

  // Pre-fill weight fields when editing an existing item
  useEffect(() => {
    if (item) {
      setIsSoldByWeight((item as any).isSoldByWeight ?? false)
      setPricePerKg((item as any).pricePerKg != null ? String((item as any).pricePerKg) : '')
      setWeightPricingRuleId((item as any).weightPricingRuleId ?? '')
    } else {
      setIsSoldByWeight(false)
      setPricePerKg('')
      setWeightPricingRuleId('')
      setPurchaseRuleId('')
    }
  }, [item])

  // Auto-match saved costPrice to a purchase rule once both item and rules are loaded
  useEffect(() => {
    if (!item || purchaseRules.length === 0) return
    const savedCost = Number((item as any).costPrice)
    if (!savedCost) return
    const match = purchaseRules.find(r => Math.abs(r.pricePerKg - savedCost) < 0.001)
    if (match) setPurchaseRuleId(match.id)
  }, [item, purchaseRules])

  // Fetch transport cost config for pricing calculator
  useEffect(() => {
    if (!businessId) return
    fetch(`/api/universal/business-config?businessId=${businessId}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.data) {
          setTransportConfig({
            enabled: d.data.transportCostEnabled ?? false,
            distanceKm: d.data.transportDistanceKm ?? null,
            ratePerKm: d.data.transportCostPerKm ?? 0.30,
          })
        }
      })
      .catch(() => {})
  }, [businessId])

  // Initialize form data when item prop changes
  useEffect(() => {
    if (item) {
      // Normalize the two shapes `item` can arrive in (MBM-296): a fresh
      // fetch from the single-item GET endpoint already has `imageUrl`, but
      // "Edit" from the inventory list passes the grid row straight in,
      // which only carries the bare `imageId` (same field the grid's own
      // thumbnail renders from) — build the same `/api/images/{id}` path
      // for that case so the form's thumbnail works either way.
      const resolvedImageUrl = item.imageUrl ?? (item.imageId ? `/api/images/${item.imageId}` : null)
      setFormData({ ...item, imageUrl: resolvedImageUrl })
      setBarcodes(item.barcodes || [])
      // Set selected category immediately when editing
      if (item.categoryId) {
        setSelectedCategory(item.categoryId)
      }
    } else {
      setFormData({
        businessId,
        businessType,
        name: '',
        sku: '',
        description: '',
        categoryId: '',
        subcategoryId: '',
        currentStock: 0,
        unit: '',
        costPrice: 0,
        sellPrice: 0,
        supplier: '',
        supplierId: undefined,
        location: '',
        locationId: undefined,
        isActive: true,
        isAvailable: true,
        attributes: {}
      })
      setBarcodes([])
      setSelectedCategory('')
      setAvailableSubcategories([])
    }
    setIsDirty(false)
    setPriceChangeReason('')
  }, [item, businessId, businessType])

  // Set selected category, subcategories, and domain when categories are loaded and item has a category
  useEffect(() => {
    const categoryId = formData.categoryId
    if (categoryId && categories.length > 0) {
      setSelectedCategory(categoryId)
      const category = categories.find(c => c.id === categoryId)
      if (category?.subcategories) {
        setAvailableSubcategories(category.subcategories)
      }
      if (category?.domainId) {
        setSelectedDomainId(category.domainId)
      }
    }
  }, [categories, formData.categoryId])

  // Fetch domains for this business type
  const fetchDomains = async () => {
    try {
      const res = await fetch(`/api/inventory/domains?businessType=${businessType}`)
      if (res.ok) {
        const data = await res.json()
        setDomains(data.domains || [])
      }
    } catch {
      // non-critical
    } finally {
      setDomainsLoaded(true)
    }
  }

  // Fetch categories with subcategories
  const fetchCategories = async () => {
    try {
      const response = await fetch(`/api/inventory/${businessId}/categories`)
      if (response.ok) {
        const data = await response.json()
        const fetchedCategories = data.categories?.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          emoji: cat.emoji || cat.icon || '📦',
          color: cat.color || 'gray',
          domainId: cat.domainId || null,
          subcategories: cat.subcategories || []
        })) || []

        setCategories(fetchedCategories)

        // Pre-populate subcategories immediately using item?.categoryId (from closure)
        // or selectedCategory. item is preferred because selectedCategory may be stale.
        const catId = item?.categoryId || selectedCategory
        if (catId) {
          const cat = fetchedCategories.find((c: any) => c.id === catId)
          // Pre-select domain from the item's category
          if (cat?.domainId && !selectedDomainId) {
            setSelectedDomainId(cat.domainId)
          }
          if (cat?.subcategories) {
            setAvailableSubcategories(cat.subcategories)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    } finally {
      setCategoriesLoaded(true)
      onCategoriesLoaded?.()
    }
  }

  useEffect(() => {
    setCategoriesLoaded(false)
    setDomainsLoaded(false)
    if (businessId) {
      fetchDomains()
      fetchCategories()
    }
  }, [businessId])

  const handleInputChange = (field: string, value: any) => {
    if (field === 'locationId') {
      console.log('UniversalInventoryForm - locationId changed to:', value)
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    markDirty()

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleAttributeChange = (attributeKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [attributeKey]: value
      }
    }))
    markDirty()
  }

  const handleBarcodesChange = (updated: ProductBarcode[]) => {
    setBarcodes(updated)
    markDirty()
  }

  const handleCategoryChange = (categoryId: string) => {
    markDirty()
    // Update form data with new category
    setFormData(prev => ({
      ...prev,
      categoryId,
      subcategoryId: prev.categoryId !== categoryId ? '' : prev.subcategoryId // Only reset subcategory when category actually changes
    }))

    // Update selected category and available subcategories
    setSelectedCategory(categoryId)
    const category = categories.find(c => c.id === categoryId)
    setAvailableSubcategories(category?.subcategories || [])

    // Clear errors
    if (errors.categoryId) {
      setErrors(prev => ({
        ...prev,
        categoryId: ''
      }))
    }
  }

  function handleSuggest() {
    const q = formData.name.trim()
    if (q.length < 2) return
    const tokens = q.toLowerCase().split(/[\s,./\\-]+/).filter(t => t.length >= 2)
    function countMatches(text: string): number {
      const lower = text.toLowerCase()
      return tokens.filter(t => lower.includes(t)).length
    }
    const scored: SuggestItem[] = []
    for (const cat of categories) {
      const domain = domains.find(d => d.id === cat.domainId)
      const catScore = countMatches(cat.name) * 2
      const domScore = domain ? countMatches(domain.name) * 1 : 0
      if (cat.subcategories && cat.subcategories.length > 0) {
        for (const sub of cat.subcategories) {
          const subScore = countMatches(sub.name) * 3
          const total = subScore + catScore + domScore
          if (total === 0) continue
          scored.push({
            domainId: domain?.id ?? '', domainName: domain?.name ?? '', domainEmoji: domain?.emoji ?? '',
            categoryId: cat.id, categoryName: cat.name, categoryEmoji: cat.emoji ?? '',
            subcategoryId: sub.id, subcategoryName: sub.name, subcategoryEmoji: sub.emoji ?? '',
            score: total,
          })
        }
      } else {
        const total = catScore + domScore
        if (total === 0) continue
        scored.push({
          domainId: domain?.id ?? '', domainName: domain?.name ?? '', domainEmoji: domain?.emoji ?? '',
          categoryId: cat.id, categoryName: cat.name, categoryEmoji: cat.emoji ?? '',
          subcategoryId: '', subcategoryName: '', subcategoryEmoji: '',
          score: total,
        })
      }
    }
    scored.sort((a, b) => b.score - a.score || a.categoryName.localeCompare(b.categoryName))
    const seen = new Set<string>()
    // No cap here — the panel shows a scrollable slice of this plus a
    // "Load More" button when there's more than fits on screen, instead of
    // silently discarding everything past the first 5.
    const deduped = scored.filter(s => {
      const key = `${s.categoryId}|${s.subcategoryId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setSuggestions(deduped)
    setSuggestVisibleCount(5)
    setSuggestOpen(true)
  }

  function applySuggestion(s: SuggestItem) {
    setSuggestOpen(false)
    setSelectedDomainId(s.domainId)
    setSelectedCategory(s.categoryId)
    const cat = categories.find(c => c.id === s.categoryId)
    setAvailableSubcategories(cat?.subcategories || [])
    setFormData(prev => ({ ...prev, categoryId: s.categoryId, subcategoryId: s.subcategoryId || '' }))
    setErrors(prev => ({ ...prev, categoryId: '', domainId: '' }))
  }

  const handleSubcategoryCreated = async (createdSubcategory?: any) => {
    // Refresh categories to get the new subcategory
    await fetchCategories()
    
    // Auto-select the newly created subcategory after refresh
    if (createdSubcategory?.id) {
      setFormData(prev => ({
        ...prev,
        subcategoryId: createdSubcategory.id
      }))
    }
    
    setShowSubcategoryEditor(false)
  }


  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!selectedDomainId) newErrors.domainId = 'Domain is required'
    // SKU is optional - backend will auto-generate if not provided
    // if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    if (!formData.categoryId?.trim()) newErrors.categoryId = 'Category is required'
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required'
    if (!effectiveWeightMode && formData.currentStock < 0) newErrors.currentStock = 'Stock cannot be negative'
    if (effectiveWeightMode) {
      // Weight-based: cost/stock managed via parent bar — no validation needed here
    } else {
      if (formData.costPrice <= 0) newErrors.costPrice = 'Cost price is required'
    }
    if (!isSoldByWeight && formData.sellPrice < 0) newErrors.sellPrice = 'Sell price cannot be negative'
    if (priceChanging && !priceChangeReason.trim()) newErrors.priceChangeReason = 'A reason is required when changing an existing price'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // MBM-133 follow-up — manual escape hatch for a product stuck as a
  // template (e.g. legitimately $0-priced) that a canManageInventory user
  // wants visible in inventory search right now, without having to give it
  // a price first. The auto-graduate-on-price path (server-side) covers the
  // common case; this covers the rest.
  const handleConvertToRegular = async () => {
    if (!item?.id) return
    setConvertingTemplate(true)
    try {
      const res = await fetch(`/api/inventory/${businessId}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isProductTemplate: false }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        await alert({ title: 'Conversion failed', description: data.error || 'Failed to convert item to regular inventory' })
        return
      }
      setFormData(prev => ({ ...prev, isProductTemplate: false }))
      onSilentUpdate?.()
    } catch {
      await alert({ title: 'Conversion failed', description: 'Failed to convert item to regular inventory' })
    } finally {
      setConvertingTemplate(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent, force = false) => {
    e?.preventDefault()

    if (!validateForm()) {
      // Show alert for missing required fields
      await alert({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields marked with * before submitting.'
      })

      // Scroll to first error field
      const firstErrorField = document.querySelector('.border-red-500')
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Focus the field if it's an input
        if (firstErrorField instanceof HTMLInputElement || firstErrorField instanceof HTMLTextAreaElement) {
          firstErrorField.focus()
        }
      }

      return
    }

    console.log('UniversalInventoryForm - submitting with formData.locationId:', formData.locationId)
    console.log('UniversalInventoryForm - full formData:', formData)

    setLoading(true)

    try {
      // Merge barcodes into formData before submission
      const submissionData = {
        ...formData,
        barcodes,
        skuMode: isManualSku ? 'manual' : 'auto',
        domainId: selectedDomainId || undefined,
        priceChangeReason: priceChangeReason.trim() || undefined,
        ...(force ? { force: true } : {}),
        ...(isWeightBusiness ? {
          isSoldByWeight,
          pricePerKg: isSoldByWeight && !weightPricingRuleId && pricePerKg ? parseFloat(pricePerKg) : null,
          weightPricingRuleId: weightPricingRuleId || null,
        } : {}),
      }

      // If onSubmit is provided, let the parent handle the submission
      if (onSubmit) {
        await onSubmit(submissionData)
        setIsDirty(false)
        // If printOnSave is checked, show label preview
        if (printOnSave && canPrintInventoryLabels) {
          setSavedItemForLabel(submissionData)
          setShowLabelPreview(true)
        }
        setLoading(false)
        return
      }

      // Legacy mode: form handles the API call when onSave is provided
      const method = mode === 'edit' ? 'PUT' : 'POST'
      const url = mode === 'edit' && item?.id
        ? `/api/inventory/${businessId}/items/${item.id}`
        : `/api/inventory/${businessId}/items`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      })

      if (response.ok) {
        const data = await response.json()
        setDuplicateMatches([])
        setIsDirty(false)
        // If printOnSave is checked, show label preview
        if (printOnSave && canPrintInventoryLabels) {
          setSavedItemForLabel(data.item)
          setShowLabelPreview(true)
        }
        if (onSave) {
          onSave(data.item)
        }
      } else {
        const errorData = await response.json()
        if (response.status === 409 && errorData.code === 'DUPLICATE_NAME') {
          setDuplicateMatches(errorData.matches ?? [])
        } else {
          setErrors({ general: errorData.error || 'Failed to save item' })
        }
      }
    } catch (error) {
      setErrors({ general: 'Network error occurred' })
    } finally {
      setLoading(false)
    }
  }

  // Convert inventory item to label data
  const getLabelDataFromItem = (item: UniversalInventoryItem): LabelData => {
    // Helper function to convert barcode type to format
    const getBarcodeFormat = (type: string): BarcodeFormat => {
      switch (type) {
        case 'UPC_A': return 'upca'
        case 'EAN_13': return 'ean13'
        case 'EAN_8': return 'ean13' // Close enough for printing
        case 'CODE128': return 'code128'
        case 'CODE39': return 'code39'
        case 'QR_CODE': return 'qr'
        case 'CUSTOM': return 'code128' // Custom barcodes use code128 format
        case 'SKU_BARCODE': return 'code128' // SKU barcodes use code128 format
        default: return 'code128'
      }
    }

    // Get primary barcode using new multi-barcode logic
    const getPrimaryBarcode = () => {
      // First try new barcodes array
      if (item.barcodes && item.barcodes.length > 0) {
        const primary = item.barcodes.find(b => b.isPrimary)
        if (primary) return primary

        // If no primary marked, use first universal UPC, or first barcode
        const universalUPC = item.barcodes.find(b => b.isUniversal && (b.type === 'UPC_A' || b.type === 'EAN_13'))
        if (universalUPC) return universalUPC

        return item.barcodes[0]
      }

      // Fallback to old barcode field for backward compatibility
      return null
    }

    const primaryBarcode = getPrimaryBarcode()

    return {
      sku: item.sku,
      itemName: item.name,
      price: item.sellPrice,
      businessId,
      businessType: businessType as any,
      businessName: undefined, // TODO: Get business name from context or props
      labelFormat: 'with-price' as LabelFormat,
      barcode: {
        data: primaryBarcode?.code || item.sku, // Fallback to SKU if no barcode
        format: primaryBarcode ? getBarcodeFormat(primaryBarcode.type) : 'code128'
      },
      businessSpecificData: item.attributes
    }
  }

  // Handle printing the label
  const handlePrint = async (printer: NetworkPrinter, copies: number) => {
    if (!savedItemForLabel) return

    try {
      const labelData = getLabelDataFromItem(savedItemForLabel)

      const response = await fetch('/api/print/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: printer.id,
          ...labelData,
          copies
        })
      })

      if (!response.ok) {
        throw new Error('Failed to queue print job')
      }

      const data = await response.json()
      notifyJobQueued(data.printJob.id, printer.printerName)
      monitorJob({ jobId: data.printJob.id })

      setShowLabelPreview(false)
      setSavedItemForLabel(null)
    } catch (error) {
      console.error('Error printing label:', error)
    }
  }

  const renderHardwareAttrField = (field: HardwareAttrField) => {
    const value = formData.attributes?.[field.key]
    const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
    return (
      <div key={field.key}>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {field.label}
        </label>
        {field.type === 'select' ? (
          <select
            value={value || ''}
            onChange={(e) => handleAttributeChange(field.key, e.target.value)}
            className={inputClass}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : 'text'}
            value={value ?? ''}
            onChange={(e) => handleAttributeChange(field.key, field.type === 'number'
              ? (e.target.value === '' ? undefined : parseFloat(e.target.value))
              : e.target.value)}
            className={inputClass}
            placeholder={field.placeholder}
          />
        )}
      </div>
    )
  }

  const getBusinessSpecificFields = () => {
    switch (businessType) {
      case 'restaurant':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Restaurant-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Storage Temperature
                </label>
                <select
                  value={formData.attributes?.storageTemp || ''}
                  onChange={(e) => handleAttributeChange('storageTemp', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select temperature...</option>
                  <option value="room">Room Temperature</option>
                  <option value="refrigerated">Refrigerated</option>
                  <option value="frozen">Frozen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Expiration Days
                </label>
                <input
                  type="number"
                  value={formData.attributes?.expirationDays ?? ''}
                  onChange={(e) => handleAttributeChange('expirationDays', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Days until expiration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.attributes?.preparationTime ?? ''}
                  onChange={(e) => handleAttributeChange('preparationTime', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Prep time in minutes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Recipe Yield
                </label>
                <input
                  type="number"
                  value={formData.attributes?.recipeYield ?? ''}
                  onChange={(e) => handleAttributeChange('recipeYield', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Number of servings"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Allergens
              </label>
              <input
                type="text"
                defaultValue={formData.attributes?.allergens?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('allergens', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field"
                placeholder="Comma-separated list (e.g., Dairy, Gluten, Nuts)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Ingredients
              </label>
              <textarea
                defaultValue={formData.attributes?.ingredients?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('ingredients', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field resize-none"
                rows={3}
                placeholder="Comma-separated list of ingredients"
              />
            </div>
          </div>
        )

      case 'grocery':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Grocery-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  PLU Code
                </label>
                <input
                  type="text"
                  value={formData.attributes?.pluCode || ''}
                  onChange={(e) => handleAttributeChange('pluCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="4-5 digit PLU code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Temperature Zone
                </label>
                <select
                  value={formData.attributes?.temperatureZone || ''}
                  onChange={(e) => handleAttributeChange('temperatureZone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select zone...</option>
                  <option value="ambient">Ambient</option>
                  <option value="refrigerated">Refrigerated</option>
                  <option value="frozen">Frozen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={formData.attributes?.batchNumber || ''}
                  onChange={(e) => handleAttributeChange('batchNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Batch/lot number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={formData.attributes?.expirationDate || ''}
                  onChange={(e) => handleAttributeChange('expirationDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="organicCertified"
                checked={formData.attributes?.organicCertified || false}
                onChange={(e) => handleAttributeChange('organicCertified', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="organicCertified" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Organic Certified
              </label>
            </div>
          </div>
        )

      case 'clothing':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Clothing-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.attributes?.brand || ''}
                  onChange={(e) => handleAttributeChange('brand', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Season
                </label>
                <select
                  value={formData.attributes?.season || ''}
                  onChange={(e) => handleAttributeChange('season', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select season...</option>
                  <option value="spring">Spring</option>
                  <option value="summer">Summer</option>
                  <option value="fall">Fall</option>
                  <option value="winter">Winter</option>
                  <option value="year-round">Year Round</option>
                </select>
              </div>

            </div>

            {/* Material — its own full-width row (not squeezed into the
                Brand/Season 2-column grid), same width as Sizes/Colors below
                so its chips get just as many per row instead of needing to
                scroll a narrow, half-width list. */}
            {(() => {
              const materialValue = Array.isArray(formData.attributes?.material)
                ? formData.attributes.material
                : formData.attributes?.material
                  ? [formData.attributes.material]
                  : []
              const sizesValue = formData.attributes?.sizes || []
              const colorsValue = formData.attributes?.colors || []
              const countBadge = (n: number) => n > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">{n} selected</span>
              ) : undefined
              return (
                <>
                  <CollapsibleSection title="Material" icon="🧵" badge={countBadge(materialValue.length)}>
                    <AttributeOptionsPicker
                      businessId={businessId}
                      attributeKey="materials"
                      value={materialValue}
                      onChange={(materials) => handleAttributeChange('material', materials)}
                    />
                  </CollapsibleSection>

                  <CollapsibleSection title="Available Sizes" icon="📏" badge={countBadge(sizesValue.length)}>
                    <AttributeOptionsPicker
                      businessId={businessId}
                      attributeKey="sizes"
                      value={sizesValue}
                      onChange={(sizes) => handleAttributeChange('sizes', sizes)}
                    />
                  </CollapsibleSection>

                  <CollapsibleSection title="Available Colors" icon="🎨" badge={countBadge(colorsValue.length)}>
                    <AttributeOptionsPicker
                      businessId={businessId}
                      attributeKey="colors"
                      value={colorsValue}
                      onChange={(colors) => handleAttributeChange('colors', colors)}
                    />
                  </CollapsibleSection>
                </>
              )
            })()}
          </div>
        )

      case 'hardware': {
        const selectedCategoryName = categories.find(c => c.id === formData.categoryId)?.name
        const categoryFields = selectedCategoryName ? HARDWARE_CATEGORY_FIELDS[selectedCategoryName] : undefined

        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Hardware-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              {HARDWARE_UNIVERSAL_FIELDS.map(field => renderHardwareAttrField(field))}
            </div>

            {categoryFields && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {selectedCategoryName} Fields
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {categoryFields.map(field => renderHardwareAttrField(field))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Specifications
              </label>
              <textarea
                value={formData.attributes?.specifications ? JSON.stringify(formData.attributes.specifications, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const specs = JSON.parse(e.target.value)
                    handleAttributeChange('specifications', specs)
                  } catch {
                    // Invalid JSON, ignore for now
                  }
                }}
                className="input-field resize-none font-mono text-sm"
                rows={4}
                placeholder='{"weight": "5 lbs", "dimensions": "10x5x3 inches"}'
              />
              <p className="text-xs text-gray-500 mt-1">Anything not covered above — enter as JSON</p>
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  // MBM-299 — Cancel / Add to Cart / Update Item, shared by both the modal
  // header (so saving/cancelling doesn't require scrolling to the bottom of
  // a long form) and the form's own footer, so they're guaranteed pixel-
  // identical instead of two hand-maintained copies quietly drifting apart.
  function renderFormActionButtons() {
    return (
      <>
        <button
          type="button"
          onClick={async () => {
            if (isDirty) {
              const confirmed = await confirmDialog({
                title: 'Unsaved changes',
                description: 'You have unsaved changes on this item. Close without saving?',
                confirmText: 'Close without saving',
                cancelText: 'Keep editing',
              })
              if (!confirmed) return
            }
            onCancel()
          }}
          disabled={isNavigatingToPOS}
          className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        {mode === 'edit' && item?.id && (
          <button
            type="button"
            onClick={() => {
              // Set loading state immediately
              setIsNavigatingToPOS(true)

              // BarcodeInventoryItems have ids prefixed with 'inv_' by the list API
              const isInvItem = item.id?.startsWith('inv_')
              const rawId = isInvItem ? item.id.slice(4) : item.id

              if (isInvItem) {
                // Inventory items: use addInventoryItem param (dedicated handler in POS)
                const url = `/${businessType}/pos?businessId=${businessId}&addInventoryItem=${rawId}`
                window.location.href = url
              } else {
                // Always pass autoAdd=true — POS decides whether to add directly or open weigh modal
                const url = `/${businessType}/pos?businessId=${businessId}&addProduct=${rawId}&autoAdd=true`
                window.location.href = url
              }
            }}
            disabled={isNavigatingToPOS || !categoriesLoaded}
            className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isNavigatingToPOS ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>🛒</span> Add to Cart
              </>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={loading || !categoriesLoaded}
          className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {!categoriesLoaded ? 'Loading...' : loading ? 'Saving...' : (mode === 'edit' ? 'Update Item' : 'Create Item')}
        </button>
      </>
    )
  }

  // support rendering either as a modal (default) or inline panel
  const panel = (
    <div className={`relative text-gray-900 dark:text-gray-100${renderMode === 'modal' ? ' bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-[1600px] w-full max-h-[90vh] overflow-auto' : ''}`}>
      {/* Header — only shown in modal mode; inline mode parent provides its own header */}
      {renderMode === 'modal' && (
      <div className="p-5 border-b border-gray-200 dark:border-gray-700">
        {/* MBM-299 — flex-col on mobile so the button row sits below the
            title instead of squeezing it; the buttons themselves shrink and
            wrap their own text (no flex-shrink-0/whitespace-nowrap) exactly
            like the matching Cancel/Add to Cart/Update Item row at the
            bottom of this form, instead of overflowing off-screen. */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'edit' ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {businessType.charAt(0).toUpperCase() + businessType.slice(1)} inventory management
            </p>
          </div>
          <div className="flex items-stretch gap-3 justify-end w-full sm:w-auto">
            {/* MBM-299 — same shared buttons as the form's own footer, so the
                two are guaranteed pixel-identical (order, icons, wrap
                behavior) instead of two hand-maintained copies. */}
            {renderFormActionButtons()}
          </div>
        </div>
      </div>
      )}

      {/* Inline mode has no built-in header (the parent page supplies its
          own chrome), so it gets its own slim top Update bar instead, for
          the same "don't make me scroll to save" reason as the modal header
          button above. */}
      {renderMode === 'inline' && (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'edit' ? 'Edit Inventory Item' : 'Add New Inventory Item'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (isDirty) {
                  const confirmed = await confirmDialog({
                    title: 'Unsaved changes',
                    description: 'You have unsaved changes on this item. Leave without saving?',
                    confirmText: 'Leave without saving',
                    cancelText: 'Keep editing',
                  })
                  if (!confirmed) return
                }
                onCancel()
              }}
              className="px-3 py-2 text-secondary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading || !categoriesLoaded}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {!categoriesLoaded ? 'Loading...' : loading ? 'Saving...' : (mode === 'edit' ? 'Update Item' : 'Create Item')}
            </button>
          </div>
        </div>
      )}

      {/* Template banner (MBM-133 follow-up) — a draft/unconfigured product
          is hidden from inventory search until priced or converted here. */}
      {mode === 'edit' && item?.id && formData.isProductTemplate && (
        <div className="mx-4 sm:mx-6 mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-amber-800 dark:text-amber-300">
            📋 This is a <strong>template</strong> item — it's hidden from inventory search until it's priced or converted to regular inventory.
          </div>
          {canManageInventory && (
            <button
              type="button"
              onClick={handleConvertToRegular}
              disabled={convertingTemplate}
              className="px-3 py-1.5 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 whitespace-nowrap"
            >
              {convertingTemplate ? 'Converting...' : '✅ Convert to Regular Inventory'}
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 sm:p-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="text-red-600 text-sm">{errors.general}</div>
          </div>
        )}

        {/* Duplicate name warning — only on create */}
        {duplicateMatches.length > 0 && mode === 'create' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 mb-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              ⚠️ Similar item{duplicateMatches.length > 1 ? 's' : ''} already exist{duplicateMatches.length === 1 ? 's' : ''}:
            </p>
            <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 pl-2">
              {duplicateMatches.map(m => (
                <li key={m.id}>• {m.name}{m.sku ? ` (${m.sku})` : ''}</li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={(e) => { setDuplicateMatches([]); handleSubmit(e as any, true) }}
                className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
              >
                Create anyway
              </button>
              <button
                type="button"
                onClick={() => setDuplicateMatches([])}
                className="px-3 py-1 text-xs border border-amber-400 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Two-panel layout: basic info left, business-specific + barcode right */}
        {/* MBM-299 — lg:items-start stops the shorter right sidebar (whose
            height varies a lot now that Material/Sizes/Colors are collapsed
            by default) from being stretched by default flex behavior to
            match the taller left column, which is what made its empty
            bottom area look like a wasted, bounded-off block instead of
            just where its own content ends. */}
        <div className="flex flex-col lg:flex-row lg:gap-5 lg:items-start">

          {/* LEFT PANEL — Basic Information */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">

              {/* Item Name — full width */}
              <div className="col-span-2 xl:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Item Name *</label>
                  {categoriesLoaded && formData.name.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={handleSuggest}
                      className="text-xs px-2 py-0.5 rounded border border-amber-400 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Suggest domain / category from item name"
                    >
                      💡 Suggest Classification
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input-field ${errors.name ? 'border-red-500 border-2' : ''}`}
                  placeholder="Enter item name"
                />
                {errors.name && <p className="text-red-600 text-xs mt-1 font-medium">{errors.name}</p>}
              </div>

              {/* Domain — full width, required */}
              <div className="col-span-2 xl:col-span-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Domain *</label>
                <SearchableSelect
                  options={domains.map(d => ({ id: d.id, name: d.name, emoji: d.emoji }))}
                  value={selectedDomainId}
                  onChange={(id) => {
                    setSelectedDomainId(id || '')
                    // Reset category if it doesn't belong to the new domain
                    const cat = categories.find(c => c.id === formData.categoryId)
                    if (cat && cat.domainId && cat.domainId !== id) {
                      handleCategoryChange('')
                    }
                    if (errors.domainId) setErrors(prev => ({ ...prev, domainId: '' }))
                  }}
                  placeholder="Select domain..."
                  searchPlaceholder="Search domains..."
                  loading={!domainsLoaded}
                  error={errors.domainId}
                />
              </div>

              {/* Category + Subcategory — equal width, side by side.
                  `relative` anchors the Suggested Classifications panel
                  (below) directly under this row instead of it floating as
                  a screen-centered dialog far from where it's relevant. */}
              <div className="col-span-2 xl:col-span-3 grid grid-cols-2 gap-3 relative">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
                  <SearchableSelect
                    options={categories
                      .filter(cat => !selectedDomainId || cat.domainId === selectedDomainId || cat.id === formData.categoryId)
                      .map(cat => ({
                        id: cat.id,
                        name: cat.name,
                        emoji: cat.emoji,
                        color: cat.color
                      }))}
                    value={formData.categoryId || ''}
                    onChange={handleCategoryChange}
                    placeholder={selectedDomainId ? 'Select category...' : 'Select a domain first...'}
                    searchPlaceholder="Search categories..."
                    loading={!categoriesLoaded}
                    error={errors.categoryId}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Subcategory</label>
                    {selectedCategory && permissions?.canCreateInventorySubcategories && (
                      <button
                        type="button"
                        onClick={() => setShowSubcategoryEditor(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        + New
                      </button>
                    )}
                  </div>
                  <SearchableSelect
                    options={availableSubcategories.map(sub => ({
                      id: sub.id,
                      name: sub.name,
                      emoji: sub.emoji
                    }))}
                    value={formData.subcategoryId || ''}
                    onChange={(id) => handleInputChange('subcategoryId', id || null)}
                    placeholder="No subcategory"
                    searchPlaceholder="Search subcategories..."
                    disabled={!selectedCategory}
                    loading={!categoriesLoaded}
                    emptyMessage={selectedCategory && availableSubcategories.length === 0
                      ? 'No subcategories. Click "+ New" to add one.'
                      : 'Select a category first'}
                  />
                </div>

                {/* Suggested Classifications — anchored right below this row
                    (not a screen-centered dialog) since that's where the
                    result actually applies. */}
                {suggestOpen && (
                  <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-xl">
                    <div className="flex items-center justify-between p-3 border-b border-border">
                      <h3 className="text-sm font-semibold text-primary">💡 Suggested Classifications</h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSuggestOpen(false)}
                          className="text-sm px-2.5 py-1 rounded-md text-secondary hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                        <button type="button" onClick={() => setSuggestOpen(false)} aria-label="Close"
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-secondary mb-2">
                        Based on: <span className="font-medium text-primary">&quot;{formData.name.trim()}&quot;</span>
                      </p>
                      {suggestions.length === 0 ? (
                        <p className="text-sm text-secondary py-4 text-center">No matches found — please select manually.</p>
                      ) : (
                        <>
                          <ul className="space-y-2 max-h-64 overflow-y-auto">
                            {suggestions.slice(0, suggestVisibleCount).map((s, i) => (
                              <li key={`${s.categoryId}|${s.subcategoryId}|${i}`}>
                                <button
                                  type="button"
                                  onClick={() => applySuggestion(s)}
                                  className="w-full text-left px-3 py-2.5 rounded-md border border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                  <div className="text-xs text-secondary mb-0.5">
                                    {s.domainEmoji} {s.domainName} › {s.categoryEmoji} {s.categoryName}
                                  </div>
                                  {s.subcategoryId && (
                                    <div className="text-sm font-medium text-primary">
                                      {s.subcategoryEmoji} {s.subcategoryName}
                                    </div>
                                  )}
                                </button>
                              </li>
                            ))}
                          </ul>
                          {suggestions.length > suggestVisibleCount && (
                            <button
                              type="button"
                              onClick={() => setSuggestVisibleCount(c => c + 10)}
                              className="w-full mt-2 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md font-medium"
                            >
                              Load {Math.min(10, suggestions.length - suggestVisibleCount)} more ({suggestions.length - suggestVisibleCount} remaining)
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setSuggestOpen(false)}
                        className="w-full mt-3 py-2 text-sm border border-border text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Unit — min-w-0 overrides the grid item's default min-width:
                  auto, which otherwise refuses to shrink this column below
                  the image block's intrinsic width and lets it overflow
                  into the SKU column next to it (rendering on top of the
                  Auto-Generated SKU box instead of beside it). */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unit *</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className={`input-field ${errors.unit ? 'border-red-500 border-2' : ''}`}
                  placeholder="lbs, each, gallons…"
                />
                {errors.unit && <p className="text-red-600 text-xs mt-1 font-medium">{errors.unit}</p>}

                {/* Image (MBM-296) — sits below Unit, beside the SKU column.
                    MBM-299: laid out horizontally (thumbnail + button side by
                    side) rather than stacked, now that the Auto-Generated SKU
                    box it used to be sized to match has been shrunk to a
                    tooltip — stacked, this block ended up taller than the SKU
                    column beside it, leaving a visible empty gap there. */}
                {item?.id && (
                  <div className="flex items-center gap-3 mt-4 w-full min-w-0">
                    <div className="w-16 h-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center relative">
                      {formData.imageUrl ? (
                        <>
                          <img
                            src={formData.imageUrl}
                            alt={formData.name}
                            className="w-full h-full object-cover"
                            onLoad={() => setLoadedImageUrl(formData.imageUrl!)}
                            onError={() => setLoadedImageUrl(formData.imageUrl!)}
                          />
                          {loadedImageUrl !== formData.imageUrl && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowImageDialog(true)}
                      className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 flex-1 min-w-0"
                    >
                      📷 {formData.imageUrl ? 'Change Image' : 'Add Image'}
                    </button>
                  </div>
                )}

                {/* Create mode — no id yet, so stage the file locally and
                    upload it automatically the instant the item is created
                    (see the effect watching item?.id above). */}
                {!item?.id && (
                  <div className="flex items-center gap-3 mt-4 w-full min-w-0">
                    <div className="w-16 h-16 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                      {pendingImagePreview ? (
                        <img src={pendingImagePreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => setShowImageSourceMenu(v => !v)}
                        className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        📷 {pendingImagePreview ? 'Change Image' : 'Add Image'}
                      </button>
                      {showImageSourceMenu && (
                        <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
                          <label className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            📁 Upload from device
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) { stagePendingImage(f); setShowImageSourceMenu(false) }; e.target.value = '' }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => { setShowImagePoolBrowser(true); setShowImageSourceMenu(false) }}
                            className="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            🖼 Choose from image pool
                          </button>
                        </div>
                      )}
                    </div>
                    {pendingImagePreview && !uploadingPendingImage && (
                      <span className="text-xs text-secondary whitespace-nowrap">Applied once you create the item</span>
                    )}
                    {uploadingPendingImage && (
                      <span className="text-xs text-secondary whitespace-nowrap">Saving photo…</span>
                    )}
                  </div>
                )}

                {showImagePoolBrowser && (
                  <CreateModeImagePoolBrowser
                    businessId={businessId}
                    categoryId={formData.categoryId}
                    subcategoryId={formData.subcategoryId}
                    domainId={selectedDomainId}
                    onSelect={stagePendingPoolImage}
                    onClose={() => setShowImagePoolBrowser(false)}
                  />
                )}
              </div>

              {/* SKU */}
              <div className="xl:col-span-2">
                <SKUGenerator
                  businessId={businessId}
                  categoryName={categories.find(cat => cat.id === formData.categoryId)?.name}
                  value={formData.sku}
                  onChange={(sku) => handleInputChange('sku', sku)}
                  onModeChange={(manual) => setIsManualSku(manual)}
                  disabled={loading}
                />
                {errors.sku && <p className="text-red-600 text-xs mt-1 font-medium">{errors.sku}</p>}
              </div>

              {/* Stock — hidden for weight-based items */}
              {!effectiveWeightMode && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock {mode === 'edit' ? '(from movements)' : '*'}
                </label>
                {mode === 'edit' ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.currentStock}
                        readOnly
                        className="input-field bg-gray-100 dark:bg-gray-700 cursor-not-allowed flex-1"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const adjustment = await prompt({
                            title: '📦 Adjust Stock',
                            description: (
                              <div className="space-y-2">
                                <p>Current stock: <strong className="text-blue-600 dark:text-blue-400">{formData.currentStock} units</strong></p>
                                <p className="text-sm">Enter adjustment amount:</p>
                                <ul className="text-sm list-disc list-inside ml-2 space-y-1">
                                  <li>Positive number to <span className="text-green-600 dark:text-green-400">add stock</span> (e.g., 10)</li>
                                  <li>Negative number to <span className="text-red-600 dark:text-red-400">remove stock</span> (e.g., -5)</li>
                                </ul>
                              </div>
                            ),
                            placeholder: 'e.g., +10 or -5',
                            inputType: 'number',
                            confirmText: 'Adjust Stock',
                            cancelText: 'Cancel',
                            validator: (value) => {
                              if (!value || value.trim() === '') return 'Please enter an adjustment amount'
                              const num = parseInt(value)
                              if (isNaN(num)) return 'Please enter a valid number'
                              if (num === 0) return 'Adjustment cannot be zero'
                              const newStock = formData.currentStock + num
                              if (newStock < 0) return `Cannot adjust stock below 0 (would result in ${newStock})`
                              return null
                            }
                          })
                          if (adjustment !== null) {
                            const adjustmentAmount = parseInt(adjustment)
                            const newStock = formData.currentStock + adjustmentAmount
                            // Persist immediately (previously this only staged
                            // `_stockAdjustment` in local state, which was
                            // silently lost if the modal was closed without
                            // clicking the outer Update button).
                            if (item?.id) {
                              setAdjustingStock(true)
                              try {
                                const res = await fetch(`/api/inventory/${businessId}/items/${item.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ _stockAdjustment: adjustmentAmount }),
                                })
                                if (!res.ok) {
                                  const data = await res.json().catch(() => ({}))
                                  await alert({ title: 'Stock adjustment failed', description: data.error || 'Failed to adjust stock' })
                                } else {
                                  setFormData(prev => ({ ...prev, currentStock: newStock }))
                                  onSilentUpdate?.()
                                }
                              } catch {
                                await alert({ title: 'Stock adjustment failed', description: 'Network error occurred' })
                              } finally {
                                setAdjustingStock(false)
                              }
                            } else {
                              handleInputChange('_stockAdjustment', adjustmentAmount)
                              handleInputChange('currentStock', newStock)
                            }
                          }
                        }}
                        disabled={adjustingStock}
                        className="px-2 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap text-xs disabled:opacity-50"
                      >
                        {adjustingStock ? '⏳ Saving...' : '📦 Adjust'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="number"
                      step="1"
                      value={formData.currentStock === 0 ? '' : formData.currentStock}
                      onChange={(e) => handleInputChange('currentStock', e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className={`input-field ${errors.currentStock ? 'border-red-500 border-2' : ''}`}
                      placeholder="0"
                    />
                    {errors.currentStock && <p className="text-red-600 text-xs mt-1 font-medium">{errors.currentStock}</p>}
                  </>
                )}
              </div>
              )}

              {/* Cost Price — hidden for weight-based (managed in amber bar via purchase preset) */}
              {!effectiveWeightMode && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPrice === 0 ? '' : formData.costPrice}
                  onChange={(e) => { handleInputChange('costPrice', e.target.value === '' ? 0 : parseFloat(e.target.value)); setCalcOpen(true) }}
                  className={`input-field ${errors.costPrice ? 'border-red-500 border-2' : ''}`}
                  placeholder="0.00"
                />
                {errors.costPrice && <p className="text-red-600 text-xs mt-1 font-medium">{errors.costPrice}</p>}
              </div>
              )}

              {/* Bulk pack cost (MBM-297) — optional. When this item was bought as
                  a case/pack, record the real case cost + units per pack here so
                  Cost Price above can be derived correctly instead of the whole
                  case cost being saved as if it were one unit's cost. */}
              {!effectiveWeightMode && (
              <div className="col-span-2 xl:col-span-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Bulk pack cost (optional) — bought as a case/pack?</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Units per pack</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formData.unitsPerPack ?? ''}
                      onChange={(e) => handleInputChange('unitsPerPack', e.target.value === '' ? null : parseInt(e.target.value))}
                      className="input-field"
                      placeholder="e.g. 24"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Bulk/case cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.bulkPackCost ?? ''}
                      onChange={(e) => handleInputChange('bulkPackCost', e.target.value === '' ? null : parseFloat(e.target.value))}
                      className="input-field"
                      placeholder="e.g. 6.70"
                    />
                  </div>
                </div>
                {formData.unitsPerPack != null && formData.unitsPerPack > 0 && formData.bulkPackCost != null && formData.bulkPackCost > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    → ${(formData.bulkPackCost / formData.unitsPerPack).toFixed(2)}/unit
                    {' '}
                    <button
                      type="button"
                      onClick={() => handleInputChange('costPrice', Math.round((formData.bulkPackCost! / formData.unitsPerPack!) * 100) / 100)}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Use as Cost Price
                    </button>
                  </p>
                )}
              </div>
              )}

              {/* Sell Price — hidden for weight-based items. MBM-299:
                  positioned right above Expense Classification (rather than
                  trailing after it) since that box previously only spanned
                  2 of the 3 xl columns, leaving Sell Price to auto-flow into
                  the stray empty 3rd-column cell far to the right, visually
                  disconnected from anything nearby. */}
              {!effectiveWeightMode && <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sell Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.sellPrice === 0 ? '' : formData.sellPrice}
                  onChange={(e) => handleInputChange('sellPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  onFocus={() => setCalcOpen(true)}
                  className={`input-field ${errors.sellPrice ? 'border-red-500 border-2' : ''}`}
                  placeholder="0.00"
                />
                {errors.sellPrice && <p className="text-red-600 text-xs mt-1 font-medium">{errors.sellPrice}</p>}
                {calcOpen && !effectiveWeightMode && (
                  <PricingCalculator
                    costPrice={formData.costPrice > 0 ? formData.costPrice : null}
                    sellingPrice={formData.sellPrice > 0 ? String(formData.sellPrice) : ''}
                    onSelectPrice={(price) => { handleInputChange('sellPrice', price); setCalcOpen(false) }}
                    transportEnabled={transportConfig.enabled}
                    transportDistanceKm={transportConfig.distanceKm}
                    transportCostPerKm={transportConfig.ratePerKm}
                    batchQuantity={formData.currentStock > 0 ? formData.currentStock : 1}
                    onClose={() => setCalcOpen(false)}
                  />
                )}
                {priceChanging && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Reason for price change <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={priceChangeReason}
                      onChange={(e) => setPriceChangeReason(e.target.value)}
                      placeholder="e.g. supplier price increase"
                      className={`input-field ${errors.priceChangeReason ? 'border-red-500 border-2' : ''}`}
                    />
                    {errors.priceChangeReason && <p className="text-red-600 text-xs mt-1 font-medium">{errors.priceChangeReason}</p>}
                  </div>
                )}
              </div>}

              {/* Expense Classification (MBM-297 follow-up) — only for
                  BarcodeInventoryItems, the only catalog with these columns;
                  ported over from the Bulk Products registration modal. */}
              {item?.id?.startsWith('inv_') && (
              <div className="col-span-2 xl:col-span-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Expense Classification (optional)</p>
                  <button
                    type="button"
                    onClick={handleExpenseSuggest}
                    disabled={formData.name.trim().length < 2 || expenseSuggestLoading}
                    title="Suggest expense classification based on product name"
                    className="px-2 py-1 text-xs border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-40 whitespace-nowrap">
                    {expenseSuggestLoading ? '…' : '✨ Suggest'}
                  </button>
                </div>

                {showExpenseSuggest && (
                  <div className="border border-indigo-200 dark:border-indigo-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800">
                      <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Classification suggestions</span>
                      <button type="button" onClick={() => { setShowExpenseSuggest(false); setExpenseSuggestions([]) }}
                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 text-sm leading-none">&times;</button>
                    </div>
                    {expenseSuggestLoading ? (
                      <div className="px-3 py-3 text-xs text-gray-400">Searching…</div>
                    ) : expenseSuggestions.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-gray-400">No suggestions found for &ldquo;{formData.name}&rdquo;</div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
                        {expenseSuggestions.map((s, i) => (
                          <button key={i} type="button" onClick={() => applyExpenseSuggestion(s)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                            <div className="text-xs font-medium text-gray-800 dark:text-gray-200">
                              {s.domainEmoji && <span className="mr-1">{s.domainEmoji}</span>}{s.domainName}
                              <span className="text-gray-400 dark:text-gray-500 mx-1">›</span>
                              {s.categoryEmoji && <span className="mr-1">{s.categoryEmoji}</span>}{s.categoryName}
                              <span className="text-gray-400 dark:text-gray-500 mx-1">›</span>
                              {s.subcategoryEmoji && <span className="mr-1">{s.subcategoryEmoji}</span>}{s.subcategoryName}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <SearchableSelect
                  options={expenseDomains}
                  value={formData.expenseDomainId || ''}
                  onChange={handleExpenseDomainChange}
                  placeholder="Select domain…"
                  allLabel="No domain"
                  emptyMessage="No domains found"
                />
                {formData.expenseDomainId && (
                  loadingExpenseCategories ? (
                    <div className="text-xs text-gray-400 px-1">Loading categories…</div>
                  ) : expenseCategories.length > 0 ? (
                    <SearchableSelect
                      options={expenseCategories}
                      value={formData.expenseCategoryId || ''}
                      onChange={handleExpenseCategoryChange}
                      placeholder="Select category…"
                      allLabel="No category"
                      emptyMessage="No categories found"
                    />
                  ) : null
                )}
                {formData.expenseCategoryId && (
                  loadingExpenseSubcategories ? (
                    <div className="text-xs text-gray-400 px-1">Loading subcategories…</div>
                  ) : expenseSubcategories.length > 0 ? (
                    <SearchableSelect
                      options={expenseSubcategories}
                      value={formData.expenseSubcategoryId || ''}
                      onChange={(v) => setFormData(prev => ({ ...prev, expenseSubcategoryId: v || null }))}
                      placeholder="Select subcategory…"
                      allLabel="No subcategory"
                      emptyMessage="No subcategories found"
                    />
                  ) : null
                )}
              </div>
              )}

              {/* Weight Selling — restaurant and grocery only; hidden when parent page provides its own bar */}
              {isWeightBusiness && !hideWeightBar && (
                <div className="col-span-2 xl:col-span-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                  {/* Header row — toggle */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-200 dark:border-amber-700">
                    <input
                      type="checkbox"
                      id="sell-by-weight-toggle"
                      checked={isSoldByWeight}
                      onChange={e => {
                        setIsSoldByWeight(e.target.checked)
                        if (!e.target.checked) { setWeightPricingRuleId(''); setPricePerKg('') }
                      }}
                      className="w-4 h-4 rounded accent-amber-600"
                    />
                    <label htmlFor="sell-by-weight-toggle" className="flex items-center gap-2 cursor-pointer select-none flex-1">
                      <span className="text-sm font-bold text-amber-900 dark:text-amber-100">⚖️ Sell by Weight (kg)</span>
                      <span className="text-xs text-amber-600 dark:text-amber-400">Scale weigh prompt opens at POS when tapped</span>
                    </label>
                  </div>

                  {/* Body — two-column pricing config */}
                  {isSoldByWeight && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-amber-200 dark:bg-amber-700">

                      {/* Left — Selling Price */}
                      <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">🛒 Selling Price</p>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Selling preset *</label>
                          <select
                            value={weightPricingRuleId}
                            onChange={e => {
                              const ruleId = e.target.value
                              setWeightPricingRuleId(ruleId)
                              if (ruleId) {
                                const rule = saleRules.find(r => r.id === ruleId)
                                if (rule) setPricePerKg(String(rule.pricePerKg))
                              } else {
                                setPricePerKg('')
                              }
                            }}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">None — enter manually</option>
                            {saleRules.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.emoji} {r.categoryName} — ${r.pricePerKg.toFixed(2)}/kg
                              </option>
                            ))}
                          </select>
                        </div>
                        {weightPricingRuleId ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Sell at</span>
                            <span className="text-base font-mono font-bold text-green-700 dark:text-green-300">
                              ${saleRules.find(r => r.id === weightPricingRuleId)?.pricePerKg.toFixed(2)}/kg
                            </span>
                            <span className="text-xs text-gray-400 italic ml-auto">follows preset</span>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Manual price per kg</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={pricePerKg}
                              onChange={e => setPricePerKg(e.target.value)}
                              className="w-full input-field text-sm font-mono"
                              placeholder="0.00"
                            />
                          </div>
                        )}
                        {saleRules.length === 0 && (
                          <a href={`/${businessType}/settings/pos?businessId=${businessId}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            ⚙️ Configure selling presets →
                          </a>
                        )}
                      </div>

                      {/* Right — Cost Price */}
                      <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 space-y-2">
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">🚚 Cost per kg *</p>
                        {purchaseRules.length > 0 ? (
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Vendor purchase preset</label>
                            <select
                              value={purchaseRuleId}
                              onChange={e => {
                                const ruleId = e.target.value
                                setPurchaseRuleId(ruleId)
                                if (ruleId) {
                                  const rule = purchaseRules.find(r => r.id === ruleId)
                                  if (rule) handleInputChange('costPrice', rule.pricePerKg)
                                }
                              }}
                              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                              <option value="">Select vendor purchase preset…</option>
                              {purchaseRules.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.emoji} {r.categoryName} — ${r.pricePerKg.toFixed(2)}/kg
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <a href={`/${businessType}/settings/pos?businessId=${businessId}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                            ⚙️ Configure vendor purchase presets →
                          </a>
                        )}
                        {formData.costPrice > 0 ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                            <span className="text-xs text-gray-500 dark:text-gray-400">Cost at</span>
                            <span className="text-base font-mono font-bold text-orange-700 dark:text-orange-300">
                              ${Number(formData.costPrice).toFixed(2)}/kg
                            </span>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Or enter manually</label>
                            <input
                              type="number" min="0" step="0.01"
                              value={''}
                              onChange={e => { handleInputChange('costPrice', e.target.value === '' ? 0 : parseFloat(e.target.value)) }}
                              className={`w-full input-field text-sm font-mono ${errors.costPrice ? 'border-red-500 border-2' : ''}`}
                              placeholder="0.00"
                            />
                            {errors.costPrice && <p className="text-red-600 text-xs mt-1">{errors.costPrice}</p>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Supplier + Location — side by side */}
              <div className="col-span-2 xl:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SupplierSelector
                  businessId={businessId}
                  value={formData.supplierId || null}
                  onChange={(supplierId) => handleInputChange('supplierId', supplierId ?? null)}
                  canCreate={true}
                />
                <LocationSelector
                  businessId={businessId}
                  value={formData.locationId || null}
                  onChange={(locationId) => handleInputChange('locationId', locationId ?? null)}
                  canCreate={true}
                />
              </div>

              {/* Description — full width, compact */}
              <div className="col-span-2 xl:col-span-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="input-field"
                  placeholder="Optional description…"
                />
              </div>

              {/* Checkboxes — full width, horizontal */}
              <div className="col-span-2 xl:col-span-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Active Item</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="isAvailable"
                    checked={formData.isAvailable ?? true}
                    onChange={(e) => handleInputChange('isAvailable', e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Available at POS</span>
                    <span className="block text-xs text-gray-400">Uncheck to hide from POS without deactivating</span>
                  </div>
                </label>
                {canPrintInventoryLabels && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="printOnSave"
                      checked={printOnSave}
                      onChange={(e) => setPrintOnSave(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">🏷️ Print label after saving</span>
                  </label>
                )}
              </div>

            </div>
          </div>

          {/* RIGHT PANEL — Business-specific fields + Barcode */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0 mt-4 lg:mt-0 lg:border-l lg:border-gray-200 lg:dark:border-gray-700 lg:pl-5 space-y-4">
            {getBusinessSpecificFields()}
            <BarcodeManager
              productId={item?.id}
              businessId={businessId}
              barcodes={barcodes}
              onBarcodesChange={handleBarcodesChange}
            />
          </div>

        </div>

        {/* Tags (MBM-295) — clothing only, and only once the product actually
            has an id (BarcodeInventoryItems, prefixed 'inv_', aren't taggable
            here — see ProductTags' schema scope). */}
        {businessType === 'clothing' && item?.id && !item.id.startsWith('inv_') && (
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <CollapsibleSection title="Tags" icon="🏷️">
              <ProductTagsEditor businessId={businessId} productId={item.id} />
            </CollapsibleSection>
          </div>
        )}

        {/* Create mode — no id yet to attach tags to, so selections are
            buffered locally and applied automatically once the item is
            created (see the effect watching item?.id above). */}
        {businessType === 'clothing' && !item?.id && (
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <CollapsibleSection
              title="Tags"
              icon="🏷️"
              badge={pendingTagNames.length > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">{pendingTagNames.length} selected</span>
              ) : undefined}
            >
              <ProductTagPicker businessId={businessId} value={pendingTagNames} onChange={setPendingTagNames} />
              {pendingTagNames.length > 0 && (
                <p className="text-xs text-secondary mt-1">Tags apply once you create the item.</p>
              )}
            </CollapsibleSection>
          </div>
        )}

        <div className="flex items-stretch gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          {/* MBM-299 — same shared buttons as the header above. */}
          {renderFormActionButtons()}
        </div>
      </form>

    </div>
  )

  // Get selected category for subcategory editor
  const selectedCategoryData = categories.find(c => c.id === selectedCategory)

  if (renderMode === 'modal') {
    if (!isOpen) return null

    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="w-full flex items-start justify-center pt-8">{/* ensure modal starts lower so top isn't clipped */}
            {panel}
          </div>
        </div>
        
        {/* Subcategory Editor Modal */}
        {showSubcategoryEditor && selectedCategoryData && (
          <InventorySubcategoryEditor
            category={{
              id: selectedCategoryData.id,
              name: selectedCategoryData.name,
              emoji: selectedCategoryData.emoji,
              businessType: businessType,
              isActive: true
            } as any}
            onSuccess={handleSubcategoryCreated}
            onCancel={() => setShowSubcategoryEditor(false)}
            isOpen={showSubcategoryEditor}
          />
        )}

        {/* Label Preview Modal */}
        {savedItemForLabel && (
          <LabelPreview
            isOpen={showLabelPreview}
            onClose={() => {
              setShowLabelPreview(false)
              setSavedItemForLabel(null)
            }}
            labelData={getLabelDataFromItem(savedItemForLabel)}
            onPrint={handlePrint}
          />
        )}

        {/* Image Upload/Choose-from-Gallery (MBM-296) */}
        {showImageDialog && item?.id && (
          <ImageUploadDialog
            businessId={businessId}
            itemId={item.id.startsWith('inv_') ? item.id.slice(4) : item.id}
            itemName={formData.name || item.name}
            sourceTable={item.id.startsWith('inv_') ? 'BARCODE_ITEM' : 'BUSINESS_PRODUCT'}
            currentImageUrl={formData.imageUrl ?? null}
            onClose={() => setShowImageDialog(false)}
            onSaved={(newImageUrl) => {
              setFormData(prev => ({ ...prev, imageUrl: newImageUrl || null }))
              setShowImageDialog(false)
              onSilentUpdate?.()
            }}
          />
        )}
      </>
    )
  }

  // inline render mode — parent provides the modal wrapper
  return (
    <>
      {panel}

      {/* Subcategory Editor Modal */}
      {showSubcategoryEditor && selectedCategoryData && (
        <InventorySubcategoryEditor
          category={{
            id: selectedCategoryData.id,
            name: selectedCategoryData.name,
            emoji: selectedCategoryData.emoji,
            businessType: businessType,
            isActive: true
          } as any}
          onSuccess={handleSubcategoryCreated}
          onCancel={() => setShowSubcategoryEditor(false)}
          isOpen={showSubcategoryEditor}
        />
      )}


      {/* Label Preview Modal */}
      {savedItemForLabel && (
        <LabelPreview
          isOpen={showLabelPreview}
          onClose={() => {
            setShowLabelPreview(false)
            setSavedItemForLabel(null)
          }}
          labelData={getLabelDataFromItem(savedItemForLabel)}
          onPrint={handlePrint}
        />
      )}

      {/* Image Upload/Choose-from-Gallery (MBM-296) */}
      {showImageDialog && item?.id && (
        <ImageUploadDialog
          businessId={businessId}
          itemId={item.id.startsWith('inv_') ? item.id.slice(4) : item.id}
          itemName={formData.name || item.name}
          sourceTable={item.id.startsWith('inv_') ? 'BARCODE_ITEM' : 'BUSINESS_PRODUCT'}
          currentImageUrl={formData.imageUrl ?? null}
          onClose={() => setShowImageDialog(false)}
          onSaved={(newImageUrl) => {
            setFormData(prev => ({ ...prev, imageUrl: newImageUrl || null }))
            setShowImageDialog(false)
          }}
        />
      )}
    </>
  )
}

// Browse the shared image pool by category while creating a new item — the
// item has no id yet, so this can't reuse ImageUploadDialog's "Choose from
// Gallery" (every one of its actions is keyed off an existing item's id).
// Resolution mirrors that same tiered subcategory→category→domain fallback,
// just fed explicit ids instead of an itemId to look them up from.
function CreateModeImagePoolBrowser({ businessId, categoryId, subcategoryId, domainId, onSelect, onClose }: {
  businessId: string
  categoryId?: string
  subcategoryId?: string
  domainId?: string
  onSelect: (imageId: string, url: string) => void
  onClose: () => void
}) {
  const { isSystemAdmin, hasPermission } = useBusinessPermissionsContext()
  const canUploadToPool = isSystemAdmin || hasPermission('canManageInventory')
  const toast = useToastContext()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<Array<{ id: string; imageId: string; url: string }>>([])
  const [resolvedName, setResolvedName] = useState<string | null>(null)
  const [tier, setTier] = useState<'subcategory' | 'category' | null>(null)
  const [uploadTarget, setUploadTarget] = useState<{ domainId: string | null; categoryId: string | null; subcategoryId: string | null } | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (categoryId) params.set('categoryId', categoryId)
    if (subcategoryId) params.set('subcategoryId', subcategoryId)
    if (domainId) params.set('domainId', domainId)
    fetch(`/api/pos/quick-edit/gallery-images?${params}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        setImages(d?.images ?? [])
        setResolvedName(d?.resolvedName ?? null)
        setTier(d?.tier ?? null)
        setUploadTarget(d?.uploadTarget ?? null)
      })
      .catch(() => setImages([]))
      .finally(() => setLoading(false))
  }, [categoryId, subcategoryId, domainId])

  // Uploading straight from this "nothing here yet" state — instead of
  // making the user leave the item form, go find the Reference Pool page,
  // upload there, then come back — is worth it precisely because an empty
  // pool category is the common case, not the exception, for a lot of
  // clothing subcategories right now.
  async function handleUpload(files: FileList) {
    if (!uploadTarget?.domainId || files.length === 0) return
    setUploading(true)
    try {
      const form = new FormData()
      Array.from(files).forEach(f => form.append('files', f))
      form.append('domainId', uploadTarget.domainId)
      if (uploadTarget.categoryId) form.append('categoryId', uploadTarget.categoryId)
      if (uploadTarget.subcategoryId) form.append('subcategoryId', uploadTarget.subcategoryId)

      const res = await fetch(`/api/business/${businessId}/images/reference-pool/bulk-upload`, { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      const newImages = (data.images ?? []).map((img: { id: string; url: string }) => ({ id: img.id, imageId: img.id, url: img.url }))
      setImages(prev => [...newImages, ...prev])
      if (data.created > 0) {
        toast.push(`${data.created} image${data.created === 1 ? '' : 's'} added to the pool — select the one${data.created === 1 ? '' : 's'} you want below`)
      }
      if (data.skipped?.length > 0) toast.error(`Skipped: ${data.skipped.join(', ')}`)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">🖼 Choose from Image Pool</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">&times;</button>
        </div>
        {!loading && resolvedName && (
          <p className="text-xs text-secondary text-center">
            Category: <span className="font-medium text-primary">{resolvedName}</span>
          </p>
        )}
        {loading ? (
          <p className="text-sm text-center text-secondary py-8">Loading…</p>
        ) : images.length === 0 ? (
          <p className="text-sm text-center text-secondary py-4">
            {resolvedName
              ? `This is a new pool category — "${resolvedName}" has no images yet. Upload one below to add it, then pick it right away.`
              : 'Select a category first to browse the pool.'}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onSelect(img.imageId, img.url)}
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500"
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {!loading && canUploadToPool && uploadTarget?.domainId && (
          <label className="block w-full text-center py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer">
            {uploading ? 'Uploading…' : `⬆️ Upload New Image${images.length > 0 ? 's' : ''} to This Category`}
            <input
              type="file" accept="image/*" multiple className="hidden" disabled={uploading}
              onChange={(e) => { const files = e.target.files; if (files && files.length > 0) handleUpload(files); e.target.value = '' }}
            />
          </label>
        )}
        <button onClick={onClose} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}