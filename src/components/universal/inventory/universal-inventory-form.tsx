'use client'

import { useState, useEffect } from 'react'
import { SupplierSelector } from '@/components/suppliers/supplier-selector'
import { LocationSelector } from '@/components/locations/location-selector'
import { InventorySubcategoryEditor } from '@/components/inventory/inventory-subcategory-editor'
import { BarcodeManager, ProductBarcode } from '@/components/universal/barcode-manager'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useSession } from 'next-auth/react'
import { hasUserPermission } from '@/lib/permission-utils'
import { LabelPreview } from '@/components/printing/label-preview'
import { usePrinterPermissions } from '@/hooks/use-printer-permissions'
import { usePrintJobMonitor } from '@/hooks/use-print-job-monitor'
import { usePrompt, useAlert } from '@/components/ui/confirm-modal'
import type { LabelData, NetworkPrinter, BarcodeFormat, LabelFormat } from '@/types/printing'

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
  supplier?: string // Legacy - for display only
  supplierId?: string
  location?: string // Legacy - for display only
  locationId?: string
  isActive: boolean
  barcodes?: ProductBarcode[]
  attributes?: Record<string, any>
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
  isOpen?: boolean
  customFields?: any[]
  mode?: 'create' | 'edit'
  // renderMode controls whether the component renders its built-in modal wrapper
  // or only the inner form panel so a parent can supply a modal wrapper.
  renderMode?: 'modal' | 'inline'
}

export function UniversalInventoryForm({
  businessId,
  businessType,
  item,
  onSave,
  onSubmit,
  onCancel,
  isOpen = true,
  customFields = [],
  mode = 'create'
  , renderMode = 'modal'
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
    supplier: '',
    supplierId: undefined,
    location: '',
    locationId: undefined,
    isActive: true,
    attributes: {}
  })

  const [categories, setCategories] = useState<Array<{
    id: string
    name: string
    emoji?: string
    color?: string
    subcategories?: InventorySubcategory[]
  }>>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [availableSubcategories, setAvailableSubcategories] = useState<InventorySubcategory[]>([])
  const [generatingSKU, setGeneratingSKU] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isNavigatingToPOS, setIsNavigatingToPOS] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSubcategoryEditor, setShowSubcategoryEditor] = useState(false)
  const [printOnSave, setPrintOnSave] = useState(false)
  const [showLabelPreview, setShowLabelPreview] = useState(false)
  const [savedItemForLabel, setSavedItemForLabel] = useState<UniversalInventoryItem | null>(null)
  const [barcodes, setBarcodes] = useState<ProductBarcode[]>([])

  const { data: session } = useSession()

  // Modal hooks
  const prompt = usePrompt()
  const alert = useAlert()

  // Printing hooks
  const { canPrintInventoryLabels } = usePrinterPermissions()
  const { monitorJob, notifyJobQueued } = usePrintJobMonitor()

  // Initialize form data when item prop changes
  useEffect(() => {
    if (item) {
      setFormData(item)
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
        attributes: {}
      })
      setBarcodes([])
      setSelectedCategory('')
      setAvailableSubcategories([])
    }
  }, [item, businessId, businessType])

  // Set selected category and subcategories when categories are loaded and item has a category
  useEffect(() => {
    const categoryId = item?.categoryId || formData.categoryId
    if (categoryId && categories.length > 0) {
      setSelectedCategory(categoryId)
      // Find and set subcategories for the selected category
      const category = categories.find(c => c.id === categoryId)
      if (category?.subcategories) {
        setAvailableSubcategories(category.subcategories)
      }
    }
  }, [item, categories, formData.categoryId])

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
          subcategories: cat.subcategories || []
        })) || []
        
        setCategories(fetchedCategories)
        
        // Re-populate available subcategories if a category is selected
        if (selectedCategory) {
          const category = fetchedCategories.find((c: any) => c.id === selectedCategory)
          if (category?.subcategories) {
            setAvailableSubcategories(category.subcategories)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  useEffect(() => {
    fetchCategories()

    if (businessId) {
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
  }

  const handleCategoryChange = (categoryId: string) => {
    // Update form data with new category
    setFormData(prev => ({
      ...prev,
      categoryId,
      subcategoryId: '' // Reset subcategory when category changes
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

  const handleGenerateSKU = async () => {
    if (!formData.name) {
      await alert({
        title: 'Name Required',
        description: 'Please enter a product name first to generate a SKU.'
      })
      return
    }

    setGeneratingSKU(true)
    try {
      const response = await fetch(`/api/inventory/${businessId}/generate-sku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: formData.name,
          category: selectedCategory || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, sku: data.sku }))

        // Show pattern info if available
        if (data.pattern) {
          console.log(`SKU generated following pattern: ${data.pattern.sample}`)
        }
      } else {
        throw new Error('Failed to generate SKU')
      }
    } catch (error) {
      console.error('Error generating SKU:', error)
      await alert({
        title: 'Generation Failed',
        description: 'Could not auto-generate SKU. Please enter one manually.'
      })
    } finally {
      setGeneratingSKU(false)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Name is required'
    // SKU is optional - backend will auto-generate if not provided
    // if (!formData.sku.trim()) newErrors.sku = 'SKU is required'
    if (!formData.categoryId?.trim()) newErrors.categoryId = 'Category is required'
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required'
    if (formData.currentStock < 0) newErrors.currentStock = 'Stock cannot be negative'
    if (formData.costPrice < 0) newErrors.costPrice = 'Cost price cannot be negative'
    if (formData.sellPrice < 0) newErrors.sellPrice = 'Sell price cannot be negative'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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
      const submissionData = { ...formData, barcodes }

      // If onSubmit is provided, let the parent handle the submission
      if (onSubmit) {
        await onSubmit(submissionData)
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
        setErrors({ general: errorData.error || 'Failed to save item' })
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

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Material
                </label>
                <input
                  type="text"
                  value={formData.attributes?.material || ''}
                  onChange={(e) => handleAttributeChange('material', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cotton, Polyester, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Available Sizes
              </label>
              <input
                type="text"
                defaultValue={formData.attributes?.sizes?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('sizes', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field"
                placeholder="Comma-separated (e.g., XS, S, M, L, XL)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Available Colors
              </label>
              <input
                type="text"
                defaultValue={formData.attributes?.colors?.join(', ') || ''}
                onBlur={(e) => {
                  // Convert to array on blur
                  const value = e.target.value
                  handleAttributeChange('colors', value.split(',').map(s => s.trim()).filter(Boolean))
                }}
                className="input-field"
                placeholder="Comma-separated (e.g., Red, Blue, Black)"
              />
            </div>
          </div>
        )

      case 'hardware':
        return (
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Hardware-Specific Fields</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.attributes?.manufacturer || ''}
                  onChange={(e) => handleAttributeChange('manufacturer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Manufacturer name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Model Number
                </label>
                <input
                  type="text"
                  value={formData.attributes?.model || ''}
                  onChange={(e) => handleAttributeChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Model number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Warranty Period
                </label>
                <input
                  type="text"
                  value={formData.attributes?.warranty || ''}
                  onChange={(e) => handleAttributeChange('warranty', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 1 year, 5 years"
                />
              </div>
            </div>

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
              <p className="text-xs text-gray-500 mt-1">Enter as JSON format</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // support rendering either as a modal (default) or inline panel
  const panel = (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full min-h-[60vh] max-h-[90vh] overflow-auto text-gray-900 dark:text-gray-100">
      {/* Close button (visible on small screens where header may be off-screen) */}
      <button
        type="button"
        onClick={onCancel}
        disabled={isNavigatingToPOS}
        aria-label="Close"
        className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white rounded focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ×
      </button>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'edit' ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {businessType.charAt(0).toUpperCase() + businessType.slice(1)} inventory management
            </p>
          </div>
          {mode === 'edit' && item?.id && (
            <button
              type="button"
              onClick={() => {
                // Set loading state immediately
                setIsNavigatingToPOS(true)

                // Check if unit is "each" or similar single-unit types
                const isSingleUnit = ['each', 'ea', 'piece', 'pc', 'pcs', 'unit', 'item'].includes(
                  (formData.unit || item.unit || '').toLowerCase().trim()
                )

                if (isSingleUnit) {
                  // Auto-add to cart with quantity 1 for single-unit items
                  const url = `/${businessType}/pos?businessId=${businessId}&addProduct=${item.id}&autoAdd=true`
                  window.location.href = url
                } else {
                  // Just navigate to POS for weight-based or other unit types
                  const url = `/${businessType}/pos?businessId=${businessId}&addProduct=${item.id}`
                  window.location.href = url
                }
              }}
              disabled={isNavigatingToPOS}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 whitespace-nowrap flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isNavigatingToPOS ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>🛒</span> Sell this Item
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 text-sm">{errors.general}</div>
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Item Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`input-field ${errors.name ? 'border-red-500 border-2' : ''}`}
                placeholder="Enter item name"
              />
              {errors.name && <p className="text-red-600 text-sm mt-1 font-medium">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                SKU <span className="text-gray-400 font-normal">(optional - auto-generated if empty)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className={`input-field flex-1 ${errors.sku ? 'border-red-500 border-2' : ''}`}
                  placeholder="Auto-generated or enter custom SKU"
                />
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  disabled={generatingSKU || !formData.name}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Auto-generate SKU based on product name and existing patterns"
                >
                  {generatingSKU ? '⏳ Generating...' : '✨ Auto-generate'}
                </button>
              </div>
              {errors.sku && <p className="text-red-600 text-sm mt-1 font-medium">{errors.sku}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Leave empty for automatic SKU, or click "Auto-generate" to preview before saving. Follows existing patterns in your inventory.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Category *
              </label>
              <SearchableSelect
                options={categories.map(cat => ({
                  id: cat.id,
                  name: cat.name,
                  emoji: cat.emoji,
                  color: cat.color
                }))}
                value={formData.categoryId || ''}
                onChange={handleCategoryChange}
                placeholder="Select category..."
                searchPlaceholder="Search categories..."
                error={errors.categoryId}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                  Subcategory (Optional)
                </label>
                {selectedCategory && session?.user && hasUserPermission(session.user, 'canCreateInventorySubcategories') && (
                  <button
                    type="button"
                    onClick={() => setShowSubcategoryEditor(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  >
                    + Create Subcategory
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
                onChange={(id) => handleInputChange('subcategoryId', id || '')}
                placeholder="No subcategory"
                searchPlaceholder="Search subcategories..."
                disabled={!selectedCategory}
                emptyMessage={selectedCategory && availableSubcategories.length === 0 
                  ? 'No subcategories available. Click "+ Create Subcategory" to add one.' 
                  : 'Select a category first'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Unit *
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                className={`input-field ${errors.unit ? 'border-red-500 border-2' : ''}`}
                placeholder="lbs, each, gallons, etc."
              />
              {errors.unit && <p className="text-red-600 text-sm mt-1 font-medium">{errors.unit}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Current Stock {mode === 'edit' ? '(Calculated from movements)' : '*'}
              </label>
              {mode === 'edit' ? (
                <div className="space-y-2">
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
                            if (!value || value.trim() === '') {
                              return 'Please enter an adjustment amount'
                            }
                            const num = parseInt(value)
                            if (isNaN(num)) {
                              return 'Please enter a valid number'
                            }
                            if (num === 0) {
                              return 'Adjustment cannot be zero'
                            }
                            const newStock = formData.currentStock + num
                            if (newStock < 0) {
                              return `Cannot adjust stock below 0 (would result in ${newStock})`
                            }
                            return null
                          }
                        })

                        if (adjustment !== null) {
                          const adjustmentAmount = parseInt(adjustment)
                          const newStock = formData.currentStock + adjustmentAmount
                          // Store adjustment to be processed on save
                          handleInputChange('_stockAdjustment', adjustmentAmount)
                          handleInputChange('currentStock', newStock)
                        }
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap text-sm"
                    >
                      📦 Adjust Stock
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Click "Adjust Stock" to add or remove inventory. Stock is calculated from movements.</p>
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
                  {errors.currentStock && <p className="text-red-600 text-sm mt-1 font-medium">{errors.currentStock}</p>}
                  <p className="text-xs text-gray-500 mt-1">Initial stock quantity when creating this product</p>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Cost Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.costPrice === 0 ? '' : formData.costPrice}
                onChange={(e) => handleInputChange('costPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className={`input-field ${errors.costPrice ? 'border-red-500 border-2' : ''}`}
                placeholder="0.00"
              />
              {errors.costPrice && <p className="text-red-600 text-sm mt-1 font-medium">{errors.costPrice}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Sell Price
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.sellPrice === 0 ? '' : formData.sellPrice}
                onChange={(e) => handleInputChange('sellPrice', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className={`input-field ${errors.sellPrice ? 'border-red-500 border-2' : ''}`}
                placeholder="0.00"
              />
              {errors.sellPrice && <p className="text-red-600 text-sm mt-1 font-medium">{errors.sellPrice}</p>}
            </div>

            <SupplierSelector
              businessId={businessId}
              value={formData.supplierId || null}
              onChange={(supplierId) => handleInputChange('supplierId', supplierId || undefined)}
              canCreate={true}
            />

            <LocationSelector
              businessId={businessId}
              value={formData.locationId || null}
              onChange={(locationId) => handleInputChange('locationId', locationId || undefined)}
              canCreate={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Optional description..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Active Item
              </label>
            </div>

            {canPrintInventoryLabels && (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="printOnSave"
                  checked={printOnSave}
                  onChange={(e) => setPrintOnSave(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="printOnSave" className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                  🏷️ Print label after saving
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Barcode Management */}
        <BarcodeManager
          productId={item?.id}
          businessId={businessId}
          barcodes={barcodes}
          onBarcodesChange={setBarcodes}
        />

        {/* Business-Specific Fields */}
        {getBusinessSpecificFields()}

        <div className="flex justify-between gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isNavigatingToPOS}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
          <div className="flex gap-3">
            {mode === 'edit' && item?.id && (
              <button
                type="button"
                onClick={() => {
                  // Set loading state immediately
                  setIsNavigatingToPOS(true)

                  // Check if unit is "each" or similar single-unit types
                  const isSingleUnit = ['each', 'ea', 'piece', 'pc', 'pcs', 'unit', 'item'].includes(
                    (formData.unit || item.unit || '').toLowerCase().trim()
                  )

                  if (isSingleUnit) {
                    // Auto-add to cart with quantity 1 for single-unit items
                    const url = `/${businessType}/pos?businessId=${businessId}&addProduct=${item.id}&autoAdd=true`
                    window.location.href = url
                  } else {
                    // Just navigate to POS for weight-based or other unit types
                    const url = `/${businessType}/pos?businessId=${businessId}&addProduct=${item.id}`
                    window.location.href = url
                  }
                }}
                disabled={isNavigatingToPOS}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNavigatingToPOS ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>🛒</span> Sell this Item
                  </>
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (mode === 'edit' ? 'Update Item' : 'Create Item')}
            </button>
          </div>
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
    </>
  )
}