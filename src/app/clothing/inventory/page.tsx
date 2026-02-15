"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProvider } from '@/components/universal'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import {
  UniversalInventoryGrid,
  UniversalInventoryForm,
  UniversalStockMovements,
  UniversalLowStockAlerts,
  UniversalInventoryStats
} from '@/components/universal/inventory'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useGlobalCart } from '@/contexts/global-cart-context'
import { useToastContext } from '@/components/ui/toast'

function ClothingInventoryContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'bales' | 'movements' | 'alerts' | 'reports'>('overview')
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedCondition, setSelectedCondition] = useState<'all' | 'NEW' | 'USED'>('all')
  const [stats, setStats] = useState<any>(null)
  const [isSeeding, setIsSeeding] = useState(false)
  const [hasSeededProducts, setHasSeededProducts] = useState(false)
  const [checkingSeedStatus, setCheckingSeedStatus] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [bogoPromotion, setBogoPromotion] = useState<any>(null)
  const [bogoLoading, setBogoLoading] = useState(false)
  // Bale state
  const [bales, setBales] = useState<any[]>([])
  const [baleCategories, setBaleCategories] = useState<any[]>([])
  const [balesLoading, setBalesLoading] = useState(false)
  const [showBaleForm, setShowBaleForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [baleForm, setBaleForm] = useState({
    categoryId: '',
    batchNumber: '',
    itemCount: '',
    unitPrice: '',
    barcode: '',
    notes: ''
  })
  const [baleFormLoading, setBaleFormLoading] = useState(false)
  const [isLoadingProduct, setIsLoadingProduct] = useState(false)
  const searchParams = useSearchParams()
  const customAlert = useAlert()
  const confirm = useConfirm()

  const { data: session, status } = useSession()
  const router = useRouter()
  const { addToCart } = useGlobalCart()
  const { push: showToast } = useToastContext()

  const {
    currentBusiness,
    currentBusinessId,
    isAuthenticated,
    loading: businessLoading,
    businesses
  } = useBusinessPermissionsContext()

  // Handle productId from URL parameters
  useEffect(() => {
    const productId = searchParams?.get('productId')
    if (productId && currentBusinessId) {
      setIsLoadingProduct(true)
      fetch(`/api/inventory/${currentBusinessId}/items/${productId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setSelectedItem(data.data)
            setShowAddForm(true)
            setActiveTab('inventory')
            router.replace('/clothing/inventory', { scroll: false })
            setTimeout(() => setIsLoadingProduct(false), 800)
          } else {
            setIsLoadingProduct(false)
          }
        })
        .catch(err => {
          console.error('Failed to load product:', err)
          setIsLoadingProduct(false)
        })
    }
  }, [searchParams, currentBusinessId, router])

  // Handle tab param from URL (e.g. returning from barcode printing)
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam && ['overview', 'inventory', 'bales', 'movements', 'alerts', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam as typeof activeTab)
      router.replace('/clothing/inventory', { scroll: false })
    }
  }, [searchParams, router])

  // Fetch BOGO promotion status
  const fetchBogo = async () => {
    if (!currentBusinessId) return
    try {
      const response = await fetch(`/api/promotions/bogo?businessId=${currentBusinessId}`)
      const data = await response.json()
      if (data.success) {
        setBogoPromotion(data.data)
      }
    } catch (error) {
      console.error('Error fetching BOGO:', error)
    }
  }

  const handleBogoToggle = async () => {
    if (!currentBusinessId) return
    setBogoLoading(true)
    try {
      if (bogoPromotion) {
        // Toggle existing
        await fetch('/api/promotions/bogo', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentBusinessId, isActive: !bogoPromotion.isActive })
        })
      } else {
        // Create new
        await fetch('/api/promotions/bogo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentBusinessId, bogoRatio: '1+1', isActive: true })
        })
      }
      await fetchBogo()
    } catch (error) {
      console.error('Error toggling BOGO:', error)
    } finally {
      setBogoLoading(false)
    }
  }

  const handleBogoRatioChange = async (ratio: '1+1' | '1+2') => {
    if (!currentBusinessId) return
    setBogoLoading(true)
    try {
      await fetch('/api/promotions/bogo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentBusinessId, bogoRatio: ratio, isActive: bogoPromotion?.isActive ?? true })
      })
      await fetchBogo()
    } catch (error) {
      console.error('Error changing BOGO ratio:', error)
    } finally {
      setBogoLoading(false)
    }
  }

  // Fetch bales for this business
  const fetchBales = async () => {
    if (!currentBusinessId) return
    setBalesLoading(true)
    try {
      const response = await fetch(`/api/clothing/bales?businessId=${currentBusinessId}`)
      const data = await response.json()
      if (data.success) setBales(data.data)
    } catch (error) {
      console.error('Error fetching bales:', error)
    } finally {
      setBalesLoading(false)
    }
  }

  // Fetch bale categories
  const fetchBaleCategories = async () => {
    try {
      const response = await fetch('/api/clothing/bale-categories')
      const data = await response.json()
      if (data.success) setBaleCategories(data.data)
    } catch (error) {
      console.error('Error fetching bale categories:', error)
    }
  }

  // Register a new bale
  const handleBaleSubmit = async () => {
    if (!currentBusinessId) {
      showToast('No business selected', { type: 'error' })
      return
    }
    if (!baleForm.categoryId || !baleForm.itemCount || !baleForm.unitPrice) {
      showToast('Category, item count, and unit price are required', { type: 'error' })
      return
    }
    setBaleFormLoading(true)
    try {
      const response = await fetch('/api/clothing/bales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusinessId,
          categoryId: baleForm.categoryId,
          ...(baleForm.batchNumber.trim() ? { batchNumber: baleForm.batchNumber.trim() } : {}),
          itemCount: Number(baleForm.itemCount),
          unitPrice: Number(baleForm.unitPrice),
          barcode: baleForm.barcode.trim() || undefined,
          notes: baleForm.notes.trim() || undefined
        })
      })
      const data = await response.json()
      if (data.success) {
        showToast(`Bale ${data.data.batchNumber} registered (${data.data.itemCount} items)`, { type: 'success' })
        setBaleForm({ categoryId: '', batchNumber: '', itemCount: '', unitPrice: '', barcode: '', notes: '' })
        setShowBaleForm(false)
        fetchBales()
      } else {
        showToast(data.error || 'Failed to register bale', { type: 'error' })
      }
    } catch (error: any) {
      console.error('Bale registration error:', error)
      showToast(error.message || 'Failed to register bale', { type: 'error' })
    } finally {
      setBaleFormLoading(false)
    }
  }

  // Toggle BOGO on a specific bale
  const handleBaleBogoToggle = async (baleId: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/clothing/bales/${baleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bogoActive: !currentActive })
      })
      const data = await response.json()
      if (data.success) fetchBales()
    } catch (error) {
      console.error('Error toggling bale BOGO:', error)
    }
  }

  // Change BOGO ratio on a specific bale
  const handleBaleBogoRatio = async (baleId: string, ratio: number) => {
    try {
      const response = await fetch(`/api/clothing/bales/${baleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bogoRatio: ratio })
      })
      const data = await response.json()
      if (data.success) fetchBales()
    } catch (error) {
      console.error('Error changing bale BOGO ratio:', error)
    }
  }

  // Add a new bale category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const response = await fetch('/api/clothing/bale-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })
      const data = await response.json()
      if (data.success) {
        showToast(`Category "${data.data.name}" added`, { type: 'success' })
        setNewCategoryName('')
        setShowCategoryForm(false)
        fetchBaleCategories()
      } else {
        await customAlert({ title: 'Error', description: data.error || 'Failed to add category' })
      }
    } catch (error) {
      await customAlert({ title: 'Error', description: 'Failed to add category' })
    }
  }

  // Fetch department statistics
  const fetchStats = async () => {
    if (!currentBusinessId) return
    
    try {
      const response = await fetch(`/api/admin/clothing/stats?businessId=${currentBusinessId}`)
      const data = await response.json()

      if (data.success) {
        setStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  // Check if business has already seeded products
  // Check if products exist for this business (seeding creates products, not inventory items)
  const checkSeedingStatus = async () => {
    if (!currentBusinessId) {
      setHasSeededProducts(false)
      setCheckingSeedStatus(false)
      return
    }

    try {
      setCheckingSeedStatus(true)
      const queryParams = new URLSearchParams({
        businessType: 'clothing',
        limit: '1'
      })
      queryParams.set('businessId', currentBusinessId)

      const response = await fetch(`/api/universal/products?${queryParams.toString()}`)
      const data = await response.json()

      if (data.success && data.data && data.data.length > 0) {
        setHasSeededProducts(true)
      } else {
        setHasSeededProducts(false)
      }
    } catch (error) {
      console.error('Error checking seeding status:', error)
      setHasSeededProducts(false)
    } finally {
      setCheckingSeedStatus(false)
    }
  }

  // Restore active tab from sessionStorage on mount (only if no URL tab param)
  useEffect(() => {
    const urlTab = searchParams?.get('tab')
    if (urlTab) return // URL tab param takes priority
    const savedTab = sessionStorage.getItem('clothing-inventory-active-tab')
    if (savedTab && ['overview', 'inventory', 'bales', 'movements', 'alerts', 'reports'].includes(savedTab)) {
      setActiveTab(savedTab as any)
    }
  }, [])

  // Fetch stats, BOGO, and bales when business changes
  useEffect(() => {
    fetchStats()
    fetchBogo()
    fetchBales()
    fetchBaleCategories()
  }, [currentBusinessId])

  // Check seeding status when business changes
  useEffect(() => {
    checkSeedingStatus()
  }, [currentBusinessId])

  // Save active tab whenever it changes
  useEffect(() => {
    sessionStorage.setItem('clothing-inventory-active-tab', activeTab)
  }, [activeTab])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) router.push('/auth/signin')
  }, [session, status, router])

  if (status === 'loading' || businessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need to be logged in to access inventory.</p>
        </div>
      </div>
    )
  }

  const clothingBusinesses = businesses.filter((b: any) => b.businessType === 'clothing' && b.isActive)
  const hasClothingBusinesses = clothingBusinesses.length > 0

  if (!currentBusiness && hasClothingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Select a Clothing Business</h2>
          <p className="text-gray-600 mb-4">You have access to {clothingBusinesses.length} clothing business{clothingBusinesses.length > 1 ? 'es' : ''}. Please select one from the sidebar.</p>
        </div>
      </div>
    )
  }

  if (currentBusiness && !['clothing', 'grocery'].includes(currentBusiness.businessType)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wrong Business Type</h2>
          <p className="text-gray-600">This inventory page is only available for clothing and grocery businesses.</p>
        </div>
      </div>
    )
  }

  const businessId = currentBusinessId!

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'inventory', label: 'Items', icon: '👕' },
    { id: 'bales', label: 'Bales', icon: '📦' },
    { id: 'movements', label: 'Stock Movements', icon: '🔄' },
    { id: 'alerts', label: 'Low Stock & Alerts', icon: '⚠️' },
    { id: 'reports', label: 'Analytics', icon: '📈' }
  ]

  const handleItemEdit = (item: any) => {
    setSelectedItem(item)
    setShowAddForm(true)
  }

  const handleItemView = (item: any) => {
    setSelectedItem(item)
    setShowViewModal(true)
  }

  const handleItemAddToCart = async (item: any) => {
    try {
      // Fetch product with variants
      const response = await fetch(`/api/universal/products?businessId=${currentBusinessId}&productId=${item.id}&includeVariants=true&includeImages=true`)

      if (!response.ok) {
        throw new Error('Failed to fetch product')
      }

      const result = await response.json()

      if (!result.success || !result.data || result.data.length === 0) {
        throw new Error('Product not found')
      }

      const product = result.data[0]

      // Filter variants with valid prices
      const validVariants = product.variants?.filter((v: any) => {
        const price = parseFloat(v.price)
        return !isNaN(price) && price > 0
      }) || []

      if (validVariants.length === 0) {
        showToast('Product has no valid variants with prices', { type: 'error' })
        return
      }

      // Get primary image
      const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0]
      const imageUrl = primaryImage?.imageUrl || primaryImage?.url

      // If only one variant, add directly to cart
      if (validVariants.length === 1) {
        const variant = validVariants[0]
        const stock = variant.stockQuantity || 0

        // Check if item has stock
        if (stock <= 0) {
          showToast('Product is out of stock', { type: 'error' })
          return
        }

        addToCart({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          sku: variant.sku,
          price: parseFloat(variant.price),
          stock: stock,
          imageUrl: imageUrl || null,
          attributes: variant.attributes || {}
        })
        showToast(`Added ${product.name} to cart`, { type: 'success' })
      } else {
        // Multiple variants - navigate to POS for selection
        router.push(`/clothing/pos?addProduct=${item.id}`)
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      showToast('Failed to add item to cart', { type: 'error' })
    }
  }

  const handleItemDelete = async (item: any) => {
    const confirmed = await confirm({
      title: 'Delete item',
      description: `Are you sure you want to delete ${item.name}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })
    if (confirmed) {
      try {
  const response = await fetch(`/api/inventory/${businessId}/items/${item.id}`, {
          method: 'DELETE'
        })

            if (response.ok) {
              // Trigger grid refresh by updating the key
              setRefreshKey(prev => prev + 1)
            } else {
              await customAlert({ title: 'Failed to delete item' })
            }
      } catch (error) {
  await customAlert({ title: 'Error deleting item' })
      }
    }
  }

  const handleResetExternalFilters = () => {
    setSelectedDepartment('')
    setSelectedCondition('all')
  }

  const handleSeedProducts = async () => {
    // Get business name from businesses array
    const businessName = businesses.find((b: any) => b.businessId === currentBusinessId)?.businessName || 'this business'

    const confirmed = await confirm({
      title: 'Seed Common Clothing Products',
      description: (
        <div>
          <p className="mb-3">
            This will import <strong>1067 common clothing products</strong> with zero quantities for{' '}
            <span className="font-semibold text-purple-600 dark:text-purple-400">{businessName}</span>.
          </p>
          <p className="mb-3">Products with existing SKUs will be skipped.</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">This is safe to run multiple times.</p>
        </div>
      ),
      confirmText: 'Seed Products',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      setIsSeeding(true)

      const response = await fetch('/api/admin/clothing/seed-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId })
      })

      const data = await response.json()

      setIsSeeding(false)

      if (data.success) {
        const { imported, skipped, errors } = data.data
        let message = `Successfully seeded products!\n\n`
        message += `• Imported/Updated: ${imported} products\n`
        if (errors > 0) {
          message += `• Errors: ${errors}\n`
        }

        await customAlert({
          title: '✅ Products Seeded Successfully',
          description: message
        })

        // Refresh the page to show new products
        router.refresh()
        fetchStats()
        checkSeedingStatus()
      } else {
        await customAlert({
          title: 'Seeding Failed',
          description: data.error || 'Failed to seed products. Please try again.'
        })
      }
    } catch (error: any) {
      setIsSeeding(false)
      await customAlert({
        title: 'Error',
        description: `Failed to seed products: ${error.message}`
      })
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = selectedItem
        ? `/api/inventory/${businessId}/items/${selectedItem.id}`
        : `/api/inventory/${businessId}/items`

      const method = selectedItem ? 'PUT' : 'POST'

      // Attributes are already in formData.attributes from the form
      // Just ensure businessId and businessType are set
      const payload = {
        ...formData,
        businessId,
        businessType: 'clothing'
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Close form immediately
        setShowAddForm(false)
        setSelectedItem(null)
        setActiveTab('inventory')
        // Trigger grid refresh by updating the key
        setRefreshKey(prev => prev + 1)
      } else {
        // Extract error message from API response
        const errorData = await response.json()
        const errorMessage = errorData.message || errorData.error || 'Unable to save item. Please try again.'
  await customAlert({ title: 'Save failed', description: errorMessage })
      }
    } catch (error: any) {
      // Handle network errors or other exceptions
      let errorMessage = 'Unable to save item. Please check your connection and try again.'

      // Try to get a more specific error message if available
      if (error.message && !error.message.includes('fetch')) {
        errorMessage = error.message
      }

  await customAlert({ title: 'Save failed', description: errorMessage })
      console.error('Save error:', error)
    }
  }

  return (
    <>
      {/* Loading Spinner Modal */}
      {isSeeding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl max-w-md mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Seeding Products...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Importing 1067 clothing products
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  This may take 30-60 seconds. Please wait.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

  <BusinessProvider businessId={businessId}>
      <BusinessTypeRoute requiredBusinessType={["clothing", "grocery"]}>
        <ContentLayout
          title="👕 Inventory Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Clothing', href: '/clothing' },
            { label: 'Inventory', isActive: true }
          ]}
        >
          <div className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
            {/* Tab Navigation */}
            <div className="card">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-1 sm:space-x-8 px-2 sm:px-6 overflow-x-auto" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-4 px-1 sm:px-2 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 min-w-0 ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                          : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-lg sm:text-base">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-3 sm:p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Clothing-specific banner */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 sm:p-6">
                      <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-3">
                        👕 Clothing Store Inventory Features
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">📐 Size & Color Matrix</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Track variants across sizes & colors</div>
                        </div>
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">🌟 Seasonal Management</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Organize by seasons & trends</div>
                        </div>
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">🏷️ Brand & Material Tracking</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Detailed product attributes</div>
                        </div>
                        <div className="card p-3 border border-purple-200 dark:border-purple-800">
                          <div className="text-purple-700 dark:text-purple-300 font-medium text-sm">♻️ Sustainability Tracking</div>
                          <div className="text-xs text-purple-600 dark:text-purple-400">Ethical & sustainable sourcing</div>
                        </div>
                      </div>
                    </div>

                    {/* BOGO Promotion Card */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            BOGO Promotion (Used Clothing)
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Buy-one-get-one-free for used clothing items
                          </p>
                        </div>
                        <button
                          onClick={handleBogoToggle}
                          disabled={bogoLoading}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            bogoPromotion?.isActive
                              ? 'bg-green-500'
                              : 'bg-gray-300 dark:bg-gray-600'
                          } ${bogoLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              bogoPromotion?.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {bogoPromotion?.isActive && (
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Ratio:</span>
                          <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => handleBogoRatioChange('1+1')}
                              disabled={bogoLoading}
                              className={`px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors ${
                                Number(bogoPromotion?.value) === 1
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              Buy 1, Get 1 Free
                            </button>
                            <button
                              onClick={() => handleBogoRatioChange('1+2')}
                              disabled={bogoLoading}
                              className={`px-3 py-1.5 text-sm font-medium rounded-r-md transition-colors ${
                                Number(bogoPromotion?.value) === 2
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              Buy 1, Get 2 Free
                            </button>
                          </div>
                        </div>
                      )}

                      {!bogoPromotion && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                          Toggle on to activate BOGO pricing for used clothing items.
                        </p>
                      )}
                    </div>

                    {/* Universal Inventory Stats */}
                    <UniversalInventoryStats
                      businessId={businessId}
                      businessType="clothing"
                      showTrends={true}
                      showBusinessSpecific={true}
                      showCharts={false}
                      layout="detailed"
                    />
                  </div>
                )}

                {/* Inventory Items Tab */}
                {activeTab === 'inventory' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="text-lg font-semibold">Clothing Inventory</h3>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleSeedProducts}
                          disabled={isSeeding || hasSeededProducts || checkingSeedStatus}
                          className="btn-secondary border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={checkingSeedStatus ? "Checking product status..." : hasSeededProducts ? "Products already seeded for this business" : "Import 1067 common clothing products with zero quantities"}
                        >
                          {checkingSeedStatus ? '⏳ Checking...' : isSeeding ? '⏳ Seeding...' : hasSeededProducts ? '✅ Products Seeded' : '🌱 Seed Products'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(null)
                            setShowAddForm(true)
                          }}
                          className="btn-primary bg-purple-600 hover:bg-purple-700"
                        >
                          ➕ Add Item
                        </button>
                        {selectedCondition === 'USED' && (
                          <button
                            onClick={() => router.push('/clothing/inventory/transfer')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            📦 Transfer Used
                          </button>
                        )}
                        <button
                          onClick={() => router.push('/clothing/inventory/transfer?endOfSale=true')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors"
                          title="Transfer all remaining used inventory and deactivate BOGO"
                        >
                          🏁 End of Sale
                        </button>
                      </div>
                    </div>

                    {/* Condition Filter (New / Used / All) */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-secondary">Condition:</span>
                      <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700">
                        {(['all', 'NEW', 'USED'] as const).map((cond) => (
                          <button
                            key={cond}
                            onClick={() => setSelectedCondition(cond)}
                            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                              selectedCondition === cond
                                ? 'bg-purple-600 text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            } ${cond === 'all' ? 'rounded-l-md' : ''} ${cond === 'USED' ? 'rounded-r-md' : ''}`}
                          >
                            {cond === 'all' ? 'All' : cond === 'NEW' ? 'New' : 'Used'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Department Filter Badge */}
                    {selectedDepartment && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-secondary">Active filter:</span>
                        <span className="inline-flex items-center gap-2 rounded-md bg-green-100 dark:bg-green-900 px-3 py-1 text-sm font-medium text-green-800 dark:text-green-200">
                          Department: {stats?.byDepartment?.[selectedDepartment]?.emoji} {stats?.byDepartment?.[selectedDepartment]?.name}
                          <button
                            type="button"
                            onClick={() => setSelectedDepartment('')}
                            className="hover:text-green-600 dark:hover:text-green-400"
                            title="Clear department filter"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    )}

                    {/* Department Quick Navigation */}
                    {stats?.byDepartment && Object.keys(stats.byDepartment).length > 0 && !selectedDepartment && (
                      <div className="card p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Browse by Department</h3>
                          <span className="text-sm text-secondary">
                            {Object.keys(stats.byDepartment).length} departments • Click to filter
                          </span>
                        </div>
                        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                          {Object.entries(stats.byDepartment)
                            .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
                            .map(([id, dept]: [string, any]) => (
                            <button
                              key={id}
                              onClick={() => setSelectedDepartment(id)}
                              className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-purple-500 dark:hover:border-purple-400 transition-all text-center group"
                            >
                              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{dept.emoji}</span>
                              <span className="text-sm font-medium mb-1">{dept.name}</span>
                              <span className="text-xs text-secondary">
                                {dept.count} product{dept.count !== 1 ? 's' : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <UniversalInventoryGrid
                      businessId={businessId}
                      businessType="clothing"
                      departmentFilter={selectedDepartment}
                      conditionFilter={selectedCondition}
                      onItemEdit={handleItemEdit}
                      onItemView={handleItemView}
                      onItemDelete={handleItemDelete}
                      onItemAddToCart={handleItemAddToCart}
                      onResetExternalFilters={handleResetExternalFilters}
                      refreshTrigger={refreshKey}
                      showActions={true}
                      layout="table"
                      allowSearch={true}
                      allowFiltering={true}
                      allowSorting={true}
                      showBusinessSpecificFields={true}
                    />
                  </div>
                )}

                {/* Bales Tab */}
                {activeTab === 'bales' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h3 className="text-lg font-semibold">Used Clothing Bales</h3>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => setShowCategoryForm(true)}
                          className="btn-secondary text-sm"
                        >
                          + Category
                        </button>
                        <button
                          onClick={() => { setShowBaleForm(true); fetchBaleCategories() }}
                          className="btn-primary bg-purple-600 hover:bg-purple-700 text-sm"
                        >
                          + Register Bale
                        </button>
                        <button
                          onClick={() => router.push('/clothing/inventory/transfer')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          Transfer Bales
                        </button>
                        <button
                          onClick={() => router.push('/clothing/inventory/transfer?endOfSale=true')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors"
                        >
                          End of Sale
                        </button>
                      </div>
                    </div>

                    {/* Add Category Inline Form */}
                    {showCategoryForm && (
                      <div className="card p-4 border-2 border-purple-200 dark:border-purple-800">
                        <h4 className="font-semibold mb-3">Add Bale Category</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Category name (e.g., Ladies Blouses)"
                            className="input-field flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                          />
                          <button onClick={handleAddCategory} className="btn-primary bg-purple-600 hover:bg-purple-700 text-sm">Add</button>
                          <button onClick={() => { setShowCategoryForm(false); setNewCategoryName('') }} className="btn-secondary text-sm">Cancel</button>
                        </div>
                        {baleCategories.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-xs text-secondary">Existing:</span>
                            {baleCategories.map((cat: any) => (
                              <span key={cat.id} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cat.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Register Bale Form */}
                    {showBaleForm && (
                      <div className="card p-4 border-2 border-purple-200 dark:border-purple-800">
                        <h4 className="font-semibold mb-3">Register New Bale</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Category *</label>
                            <select
                              value={baleForm.categoryId}
                              onChange={(e) => setBaleForm({ ...baleForm, categoryId: e.target.value })}
                              className="input-field w-full"
                            >
                              <option value="">Select category...</option>
                              {baleCategories.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Batch Number</label>
                            <input
                              type="text"
                              value={baleForm.batchNumber}
                              onChange={(e) => setBaleForm({ ...baleForm, batchNumber: e.target.value })}
                              placeholder="Auto-generated (or type to override)"
                              className="input-field w-full"
                            />
                            <p className="text-xs text-secondary mt-1">Leave blank for auto-generated (e.g., B-260215-001)</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Item Count *</label>
                            <input
                              type="number"
                              min="1"
                              value={baleForm.itemCount}
                              onChange={(e) => setBaleForm({ ...baleForm, itemCount: e.target.value })}
                              placeholder="e.g., 150"
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Unit Price ($) *</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={baleForm.unitPrice}
                              onChange={(e) => setBaleForm({ ...baleForm, unitPrice: e.target.value })}
                              placeholder="e.g., 3.00"
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Barcode (optional)</label>
                            <input
                              type="text"
                              value={baleForm.barcode}
                              onChange={(e) => setBaleForm({ ...baleForm, barcode: e.target.value })}
                              placeholder="Scan or enter barcode"
                              className="input-field w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-secondary mb-1">Notes (optional)</label>
                            <input
                              type="text"
                              value={baleForm.notes}
                              onChange={(e) => setBaleForm({ ...baleForm, notes: e.target.value })}
                              placeholder="Any notes about this bale"
                              className="input-field w-full"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={handleBaleSubmit}
                            disabled={baleFormLoading}
                            className="btn-primary bg-purple-600 hover:bg-purple-700"
                          >
                            {baleFormLoading ? 'Registering...' : 'Register Bale'}
                          </button>
                          <button
                            onClick={() => {
                              setShowBaleForm(false)
                              setBaleForm({ categoryId: '', batchNumber: '', itemCount: '', unitPrice: '', barcode: '', notes: '' })
                            }}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bales List */}
                    {balesLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      </div>
                    ) : bales.length === 0 ? (
                      <div className="text-center py-12 text-secondary">
                        <p className="text-lg mb-2">No bales registered yet</p>
                        <p className="text-sm">Click "Register Bale" to stock used clothing bales.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Batch #</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Category</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase">Price</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase">Stock</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">SKU</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Barcode</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase">BOGO</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase">Ratio</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {bales.map((bale: any) => (
                              <tr key={bale.id} className={`${bale.remainingCount === 0 ? 'opacity-50' : ''}`}>
                                <td className="px-4 py-3 text-sm font-medium">{bale.batchNumber}</td>
                                <td className="px-4 py-3 text-sm">{bale.category?.name}</td>
                                <td className="px-4 py-3 text-sm text-right">${Number(bale.unitPrice).toFixed(2)}</td>
                                <td className="px-4 py-3 text-sm text-right">
                                  <span className={bale.remainingCount === 0 ? 'text-red-500' : bale.remainingCount < 10 ? 'text-amber-500' : ''}>
                                    {bale.remainingCount}
                                  </span>
                                  <span className="text-secondary">/{bale.itemCount}</span>
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-xs">{bale.sku}</td>
                                <td className="px-4 py-3 text-sm font-mono text-xs">{bale.barcode || '—'}</td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => handleBaleBogoToggle(bale.id, bale.bogoActive)}
                                    disabled={bale.remainingCount === 0}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                      bale.bogoActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                    } ${bale.remainingCount === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                      bale.bogoActive ? 'translate-x-5' : 'translate-x-1'
                                    }`} />
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {bale.bogoActive && (
                                    <div className="inline-flex rounded border border-gray-200 dark:border-gray-700 text-xs">
                                      <button
                                        onClick={() => handleBaleBogoRatio(bale.id, 1)}
                                        className={`px-2 py-1 rounded-l ${bale.bogoRatio === 1 ? 'bg-green-600 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                      >
                                        1+1
                                      </button>
                                      <button
                                        onClick={() => handleBaleBogoRatio(bale.id, 2)}
                                        className={`px-2 py-1 rounded-r ${bale.bogoRatio === 2 ? 'bg-green-600 text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                      >
                                        1+2
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-col gap-1 items-center">
                                    <button
                                      onClick={() => {
                                        if (bale.remainingCount <= 0) {
                                          showToast('Bale is out of stock', { type: 'error' })
                                          return
                                        }
                                        addToCart({
                                          productId: `bale_${bale.id}`,
                                          variantId: `bale_${bale.id}`,
                                          name: `${bale.category?.name || 'Bale'} - ${bale.batchNumber}`,
                                          sku: bale.sku,
                                          price: parseFloat(bale.unitPrice),
                                          stock: bale.remainingCount,
                                          attributes: {
                                            baleId: bale.id,
                                            isBale: true,
                                            bogoActive: bale.bogoActive,
                                            bogoRatio: bale.bogoRatio,
                                          },
                                        })
                                        showToast(`Added ${bale.category?.name || 'Bale'} to cart`, { type: 'success' })
                                      }}
                                      disabled={bale.remainingCount === 0}
                                      className="text-xs text-green-600 dark:text-green-400 hover:underline whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Add to Cart
                                    </button>
                                    <button
                                      onClick={() => {
                                        const params = new URLSearchParams({
                                          barcodeData: bale.sku || bale.batchNumber,
                                          productName: bale.category?.name || 'Bale',
                                          price: String(bale.unitPrice),
                                          description: `Batch ${bale.batchNumber}`,
                                          baleId: bale.id,
                                        })
                                        router.push(`/universal/barcode-management/print-jobs/new?${params.toString()}`)
                                      }}
                                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                                    >
                                      Print Barcode
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Stock Movements Tab */}
                {activeTab === 'movements' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Stock Movements</h3>

                    <UniversalStockMovements
                      businessId={businessId}
                      showFilters={true}
                      maxItems={100}
                      layout="full"
                    />
                  </div>
                )}

                {/* Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Inventory Alerts & Low Stock</h3>

                    {/* Clothing-specific alert info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">👕 Clothing Store Alert Types</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Size/Color Variants</div>
                          <div className="text-blue-700 dark:text-blue-300">Specific size/color combinations low</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Seasonal Items</div>
                          <div className="text-blue-700 dark:text-blue-300">End-of-season clearance needed</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Popular Styles</div>
                          <div className="text-blue-700 dark:text-blue-300">High-demand items running low</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-800 dark:text-blue-200">Slow-Moving Stock</div>
                          <div className="text-blue-700 dark:text-blue-300">Items needing markdown</div>
                        </div>
                      </div>
                    </div>

                    <UniversalLowStockAlerts
                      businessId={businessId}
                      businessType="clothing"
                      alertTypes={['low_stock', 'out_of_stock', 'overstock']}
                      showFilters={true}
                      showSummary={true}
                      layout="full"
                      autoRefresh={true}
                      refreshInterval={60000}
                    />
                  </div>
                )}

                {/* Reports Tab */}
                {activeTab === 'reports' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Clothing Analytics & Reports</h3>

                    {/* Clothing-specific report types */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">📐</div>
                        <h4 className="font-semibold mb-2">Size Distribution Report</h4>
                        <p className="text-sm text-secondary">Analyze size demand patterns</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🌈</div>
                        <h4 className="font-semibold mb-2">Color Performance</h4>
                        <p className="text-sm text-secondary">Best and worst selling colors</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🌟</div>
                        <h4 className="font-semibold mb-2">Seasonal Analysis</h4>
                        <p className="text-sm text-secondary">Track seasonal performance</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">🏷️</div>
                        <h4 className="font-semibold mb-2">Brand Performance</h4>
                        <p className="text-sm text-secondary">Compare brand sales and margins</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">💰</div>
                        <h4 className="font-semibold mb-2">Markdown Analysis</h4>
                        <p className="text-sm text-secondary">Track clearance and discounts</p>
                      </div>

                      <div className="card p-4 hover:shadow-lg cursor-pointer">
                        <div className="text-2xl mb-2">♻️</div>
                        <h4 className="font-semibold mb-2">Sustainability Report</h4>
                        <p className="text-sm text-secondary">Ethical and sustainable inventory</p>
                      </div>
                    </div>

                    {/* Universal stats with clothing focus */}
                    <UniversalInventoryStats
                      businessId={businessId}
                      businessType="clothing"
                      showTrends={true}
                      showBusinessSpecific={true}
                      layout="dashboard"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add/Edit Item Form Modal */}
          <UniversalInventoryForm
            businessId={businessId}
            businessType="clothing"
            item={selectedItem}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowAddForm(false)
              setSelectedItem(null)
            }}
            isOpen={showAddForm}
            mode={selectedItem ? 'edit' : 'create'}
          />

          {/* View Item Details Modal */}
          {showViewModal && selectedItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedItem.name}</h2>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {selectedItem.categoryEmoji && <span className="mr-1">{selectedItem.categoryEmoji}</span>}
                        {selectedItem.category}
                        {selectedItem.subcategory && (
                          <>
                            {' → '}
                            {selectedItem.subcategoryEmoji && <span className="mr-1">{selectedItem.subcategoryEmoji}</span>}
                            {selectedItem.subcategory}
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowViewModal(false)
                        setSelectedItem(null)
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">SKU</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.sku}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                          <div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              selectedItem.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {selectedItem.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Current Stock</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.currentStock} {selectedItem.unit}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Supplier</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.supplier || 'Not specified'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Location</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.location || 'Not specified'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Pricing</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Cost Price</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">${selectedItem.costPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Sell Price</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">${selectedItem.sellPrice.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Clothing-Specific Attributes */}
                    {selectedItem.attributes && Object.keys(selectedItem.attributes).length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Clothing Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedItem.attributes.sizes && selectedItem.attributes.sizes.length > 0 && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Sizes</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.sizes.join(', ')}</div>
                            </div>
                          )}
                          {selectedItem.attributes.colors && selectedItem.attributes.colors.length > 0 && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Colors</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.colors.join(', ')}</div>
                            </div>
                          )}
                          {selectedItem.attributes.material && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Material</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.material}</div>
                            </div>
                          )}
                          {selectedItem.attributes.brand && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Brand</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.brand}</div>
                            </div>
                          )}
                          {selectedItem.attributes.season && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Season</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.season}</div>
                            </div>
                          )}
                          {selectedItem.attributes.gender && (
                            <div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">Gender</div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">{selectedItem.attributes.gender}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {selectedItem.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">Description</h3>
                        <div className="text-gray-900 dark:text-gray-100">{selectedItem.description}</div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => {
                          setShowViewModal(false)
                          handleItemEdit(selectedItem)
                        }}
                        className="flex-1 btn-primary"
                      >
                        ✏️ Edit Item
                      </button>
                      <button
                        onClick={() => {
                          setShowViewModal(false)
                          setSelectedItem(null)
                        }}
                        className="flex-1 btn-secondary"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Overlay for Product Fetch */}
          {isLoadingProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[70]">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-sm w-full mx-4">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 dark:border-purple-400 mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Loading Product...
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Please wait while we fetch the product details
                  </p>
                </div>
              </div>
            </div>
          )}
        </ContentLayout>
      </BusinessTypeRoute>
    </BusinessProvider>
    </>
  )
}

export default function ClothingInventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    }>
      <ClothingInventoryContent />
    </Suspense>
  )
}