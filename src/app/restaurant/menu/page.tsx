'use client'

import { BusinessTypeRoute } from '@/components/auth/business-type-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import { MenuItemCard, MenuItem as MenuItemType } from '@/components/restaurant/menu-item-card'
import { MenuItemForm } from '@/components/restaurant/menu-item-form'
import { MenuCategoryFilter } from '@/components/restaurant/menu-category-filter'
import { PromotionManager } from '@/components/restaurant/promotion-manager'
import { ComboBuilder } from '@/components/restaurant/combo-builder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type MenuItem = MenuItemType

export default function MenuManagementPage() {
  const customAlert = useAlert()
  const confirm = useConfirm()
  // NOTE: we will import hooks properly below via patch to avoid accidental lint issues
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'unavailable'>('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'discounted' | 'regular'>('all')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'menu' | 'combos' | 'promotions'>('menu')

  // Load menu items and categories
  useEffect(() => {
    loadMenuData()
  }, [])

  const loadMenuData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use consistent restaurant demo business ID
      const businessId = 'restaurant-demo'

      // Load categories first (independent of products)
      const categoriesResponse = await fetch(`/api/universal/categories?businessId=${businessId}&businessType=restaurant`)
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        if (categoriesData.success) {
          setCategories(categoriesData.data)
        }
      }

      // Load menu items (products) - include variants and images
      const menuResponse = await fetch('/api/universal/products?businessType=restaurant&includeVariants=true&includeImages=true')
      if (menuResponse.ok) {
        const menuData = await menuResponse.json()
        if (menuData.success) {
          // Transform API response to MenuItem format
          const transformedItems: MenuItem[] = menuData.data.map((product: any) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            basePrice: parseFloat(product.basePrice),
            originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : undefined,
            discountPercent: product.discountPercent ? parseFloat(product.discountPercent) : undefined,
            categoryId: product.categoryId,
            category: product.category,
            isActive: product.isActive,
            isAvailable: product.isAvailable ?? true, // Default to true if not specified
            isCombo: product.productType === 'COMBO' || product.attributes?.isCombo || false,
            preparationTime: product.attributes?.preparationTime,
            spiceLevel: product.attributes?.spiceLevel ?
              (typeof product.attributes.spiceLevel === 'string' ?
                (product.attributes.spiceLevel === 'mild' ? 1 : product.attributes.spiceLevel === 'medium' ? 2 : product.attributes.spiceLevel === 'hot' ? 3 : 0) :
                product.attributes.spiceLevel) : 0,
            dietaryRestrictions: product.attributes?.dietary || product.attributes?.dietaryRestrictions || [],
            allergens: product.attributes?.allergens || [],
            calories: product.attributes?.calories,
            images: product.images || [],
            variants: product.variants || []
          }))
          setMenuItems(transformedItems)
        } else {
          setError(menuData.error || 'Failed to load menu items')
        }
      } else {
        setError('Failed to fetch menu items')
      }
    } catch (err) {
      setError('Network error while loading menu data')
      console.error('Menu loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter menu items based on search and filters
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory

    const matchesAvailability = availabilityFilter === 'all' ||
                               (availabilityFilter === 'available' && item.isAvailable) ||
                               (availabilityFilter === 'unavailable' && !item.isAvailable)

    const matchesPrice = priceFilter === 'all' ||
                        (priceFilter === 'discounted' && (item.discountPercent || item.originalPrice)) ||
                        (priceFilter === 'regular' && !item.discountPercent && !item.originalPrice)

    return matchesSearch && matchesCategory && matchesAvailability && matchesPrice
  })

  const handleCreateItem = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      const url = editingItem
        ? `/api/universal/products/${editingItem.id}`
        : '/api/universal/products'

      const method = editingItem ? 'PUT' : 'POST'

      // For new items, we need to add required fields
      let submitData = {
        ...formData,
        businessType: 'restaurant'
      }

      // Add required fields for new items
      if (!editingItem) {
        // Use the consistent restaurant demo business ID
        const businessId = 'restaurant-demo'

        submitData = {
          ...submitData,
          businessId: businessId,
          sku: `MENU-${Date.now()}`, // Generate a unique SKU
          productType: 'PHYSICAL' as const
        }
      } else {
        // For updates, include the product ID
        submitData = {
          ...submitData,
          id: editingItem.id
        }
      }

      console.log('[Menu Page] Submitting to:', method, url)
      console.log('[Menu Page] Data:', {
        id: submitData.id,
        name: submitData.name,
        variantsCount: submitData.variants?.length || 0,
        variants: submitData.variants?.map((v: any) => ({ id: v.id, name: v.name, price: v.price, sku: v.sku }))
      })

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      const result = await response.json()

      console.log('[Menu Page] Response:', {
        success: result.success,
        error: result.error,
        variantsInResponse: result.data?.variants?.length || 0
      })

      if (response.ok && result.success) {
        // Return the created/updated product to the caller so the form can continue (e.g. upload images)
        return result.data
      } else {
        setError(result.error || 'Failed to save menu item')
        console.error('[Menu Page] Save failed:', result)
        return null
      }
    } catch (err) {
      setError('Network error while saving')
      console.error('Save error:', err)
    }
  }

  const handleToggleAvailability = async (itemId: string, isAvailable: boolean) => {
    try {
      const response = await fetch(`/api/universal/products/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !isAvailable })
      })

      const result = await response.json()
      if (response.ok && result.success) {
        await loadMenuData()
      } else {
        setError(result.error || 'Failed to update availability')
      }
    } catch (err) {
      setError('Network error while updating availability')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    // use the app confirm modal
    const ok = await confirm({
      title: 'Delete menu item',
      description: 'Are you sure you want to delete this menu item? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/universal/products/${itemId}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (response.ok && result.success) {
        await loadMenuData()
      } else {
        setError(result.error || 'Failed to delete menu item')
      }
    } catch (err) {
      setError('Network error while deleting')
    }
  }

  if (loading) {
    return (
      <BusinessTypeRoute requiredBusinessType="restaurant">
        <ContentLayout
          title="Menu Management"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Restaurant', href: '/restaurant' },
            { label: 'Menu Management', isActive: true }
          ]}
        >
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-secondary">Loading menu items...</p>
            </div>
          </div>
        </ContentLayout>
      </BusinessTypeRoute>
    )
  }

  return (
    <BusinessTypeRoute requiredBusinessType="restaurant">
      <ContentLayout
        title="Menu Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Restaurant', href: '/restaurant' },
          { label: 'Menu Management', isActive: true }
        ]}
      >
  {/* Navigation Tabs */}
  <div className="flex items-center gap-4 mb-6 border-b border-primary">
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'menu'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            🍽️ Menu Items
          </button>
          <button
            onClick={() => setActiveTab('combos')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'combos'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            🍽️ Combos
          </button>
          <button
            onClick={() => setActiveTab('promotions')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'promotions'
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            🎯 Promotions
          </button>
        </div>

        {activeTab === 'menu' && (
          <div>
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-primary">
                  Menu Items ({filteredMenuItems.length})
                </h2>
                <Badge variant="outline">
                  Total: {menuItems.length}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleCreateItem} className="bg-primary hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-500">
                  ➕ Add Menu Item
                </Button>
                <Button
                  variant="outline"
                  onClick={loadMenuData}
                  disabled={loading}
                >
                  🔄 Refresh
                </Button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-red-600">❌</span>
                  <span className="text-red-800 dark:text-red-200">{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="card bg-white dark:bg-gray-800 p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Search Items
                  </label>
                  <Input
                    type="text"
                    placeholder="🔍 Search by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>

                {/* Category Filter */}
                <MenuCategoryFilter
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />

                {/* Availability Filter */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Availability
                  </label>
                  <select
                    value={availabilityFilter}
                    onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="all">All Items</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>

                {/* Price Filter */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Pricing
                  </label>
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="all">All Prices</option>
                    <option value="discounted">On Discount</option>
                    <option value="regular">Regular Price</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Menu Items Grid */}
            {filteredMenuItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🍽️</div>
                <h3 className="text-lg font-medium text-primary mb-2">No menu items found</h3>
                <p className="text-secondary mb-4">
                  {menuItems.length === 0
                    ? "Get started by adding your first menu item"
                    : "Try adjusting your search criteria"
                  }
                </p>
                {menuItems.length === 0 && (
                  <Button onClick={handleCreateItem} className="bg-primary hover:bg-primary/90">
                    Add Your First Menu Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMenuItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onToggleAvailability={handleToggleAvailability}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Combo Builder Tab */}
        {activeTab === 'combos' && (
          <ComboBuilder
            businessId="restaurant"
            menuItems={menuItems}
            onComboChange={loadMenuData}
          />
        )}

        {/* Promotions Tab */}
        {activeTab === 'promotions' && (
          <PromotionManager
            businessId="restaurant"
            categories={categories}
            menuItems={menuItems}
            onPromotionChange={loadMenuData}
          />
        )}

        {/* Menu Item Form Modal */}
        {showForm && (
          <MenuItemForm
            item={editingItem}
            categories={categories}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingItem(null)
            }}
            onDone={(saved) => {
                  // after form completes uploads, merge saved product into local state so UI updates immediately
                  setShowForm(false)
                  setEditingItem(null)

                  if (saved && saved.id) {
                    // transform saved product into MenuItem shape used in this page
                    const transformed: MenuItem = {
                      id: saved.id,
                      name: saved.name,
                      description: saved.description,
                      basePrice: parseFloat(saved.basePrice || '0'),
                      originalPrice: saved.originalPrice ? parseFloat(saved.originalPrice) : undefined,
                      discountPercent: saved.discountPercent ? parseFloat(saved.discountPercent) : undefined,
                      categoryId: saved.categoryId,
                      category: saved.category,
                      isActive: saved.isActive,
                      isAvailable: saved.isAvailable ?? true,
                      isCombo: saved.productType === 'COMBO' || saved.attributes?.isCombo || false,
                      preparationTime: saved.attributes?.preparationTime,
                      spiceLevel: saved.attributes?.spiceLevel ?? 0,
                      dietaryRestrictions: saved.attributes?.dietary || saved.dietaryRestrictions || saved.attributes?.dietaryRestrictions || [],
                      allergens: saved.attributes?.allergens || saved.allergens || [],
                      calories: saved.attributes?.calories,
                      images: saved.images || [],
                      variants: saved.variants || []
                    }

                    setMenuItems(prev => {
                      const idx = prev.findIndex(i => i.id === transformed.id)
                      if (idx >= 0) {
                        const copy = [...prev]
                        copy[idx] = transformed
                        return copy
                      }
                      // new item - insert at front
                      return [transformed, ...prev]
                    })
                  } else {
                    // fallback to full reload if saved product not returned
                    loadMenuData()
                  }
                }}
          />
        )}
      </ContentLayout>
    </BusinessTypeRoute>
  )
}