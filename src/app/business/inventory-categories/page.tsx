'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useState, useEffect } from 'react';
import { useAlert, useConfirm } from '@/components/ui/confirm-modal';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { hasUserPermission } from '@/lib/permission-utils';
import { InventoryCategory, InventorySubcategory } from '@/types/inventory-category';
import { InventoryCategoryEditor } from '@/components/inventory/inventory-category-editor';
import { InventorySubcategoryEditor } from '@/components/inventory/inventory-subcategory-editor';

// For testing, use actual business IDs
// In production, this would come from user's current business selection
const DEMO_BUSINESS_MAP: Record<string, string> = {
  clothing: '40544cfd-f742-4849-934d-04e79b2a0935', // HXI Bhero (clothing business)
  hardware: 'hardware-demo-business',
  grocery: 'grocery-demo-business',
  restaurant: 'restaurant-demo-business',
};

export default function InventoryCategoriesPage() {
  const { data: session } = useSession();
  const customAlert = useAlert();
  const confirm = useConfirm();
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('clothing');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

  // Editor state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showSubcategoryEditor, setShowSubcategoryEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<InventorySubcategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null);

  // Get current business ID from selected type
  const currentBusinessId = DEMO_BUSINESS_MAP[selectedBusinessType];
  const currentBusinessType = selectedBusinessType;

  // Permissions
  const canCreateCategories = hasUserPermission(session?.user, 'canCreateInventoryCategories');
  const canEditCategories = hasUserPermission(session?.user, 'canEditInventoryCategories');
  const canDeleteCategories = hasUserPermission(session?.user, 'canDeleteInventoryCategories');
  const canCreateSubcategories = hasUserPermission(session?.user, 'canCreateInventorySubcategories');
  const canEditSubcategories = hasUserPermission(session?.user, 'canEditInventorySubcategories');
  const canDeleteSubcategories = hasUserPermission(session?.user, 'canDeleteInventorySubcategories');

  // Fetch department statistics for clothing business
  useEffect(() => {
    async function fetchStats() {
      if (selectedBusinessType !== 'clothing') {
        setStats(null);
        return;
      }

      try {
        const response = await fetch('/api/admin/clothing/stats');
        const data = await response.json();

        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    }

    fetchStats();
  }, [selectedBusinessType]);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      if (!currentBusinessType) {
        setError('No business type selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/inventory/categories?businessType=${currentBusinessType}&includeSubcategories=true`);
        if (!response.ok) throw new Error('Failed to fetch categories');

        const data = await response.json();
        setCategories(data.categories || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
    // Reset department filter when business type changes
    setSelectedDepartment('');
  }, [currentBusinessType, selectedBusinessType]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowCategoryEditor(true);
  };

  const handleEditCategory = (category: InventoryCategory) => {
    setEditingCategory(category);
    setShowCategoryEditor(true);
  };

  const handleDeleteCategory = async (category: InventoryCategory) => {
    const ok = await confirm({ title: 'Delete Category', description: `Are you sure you want to delete the category "${category.name}"?`, confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return;

    try {
      const response = await fetch(`/api/inventory/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete category');
      }

      // Refresh categories
      setCategories(categories.filter(c => c.id !== category.id));
    } catch (err) {
      await customAlert({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Failed to delete category' })
    }
  };

  const handleCreateSubcategory = (category: InventoryCategory) => {
    setSelectedCategory(category);
    setEditingSubcategory(null);
    setShowSubcategoryEditor(true);
  };

  const handleEditSubcategory = (category: InventoryCategory, subcategory: InventorySubcategory) => {
    setSelectedCategory(category);
    setEditingSubcategory(subcategory);
    setShowSubcategoryEditor(true);
  };

  const handleDeleteSubcategory = async (subcategory: InventorySubcategory) => {
    const ok = await confirm({ title: 'Delete Subcategory', description: `Are you sure you want to delete the subcategory "${subcategory.name}"?`, confirmText: 'Delete', cancelText: 'Cancel' })
    if (!ok) return;

    try {
      const response = await fetch(`/api/inventory/subcategories/${subcategory.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete subcategory');
      }

      // Refresh categories
      const updatedCategories = categories.map(cat => {
        if (cat.id === subcategory.categoryId) {
          return {
            ...cat,
            inventory_subcategories: cat.inventory_subcategories?.filter(s => s.id !== subcategory.id)
          };
        }
        return cat;
      });
      setCategories(updatedCategories);
    } catch (err) {
      await customAlert({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Failed to delete subcategory' })
    }
  };

  const handleEditorSuccess = async () => {
    setShowCategoryEditor(false);
    setShowSubcategoryEditor(false);
    setEditingCategory(null);
    setEditingSubcategory(null);
    setSelectedCategory(null);

    // Refresh categories
    try {
      const response = await fetch(`/api/inventory/categories?businessType=${currentBusinessType}&includeSubcategories=true`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to refresh categories:', err);
    }
  };

  const filteredCategories = categories.filter(cat => {
    // Search filter
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cat.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Department filter (only for clothing)
    const matchesDepartment = !selectedDepartment || cat.domainId === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDepartment('');
  };

  const hasActiveFilters = searchQuery !== '' || selectedDepartment !== '';

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            📦 Inventory Categories
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your inventory categories and subcategories with emoji support
          </p>
        </div>

        {/* Business Type Selector */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Business Type:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { type: 'clothing', emoji: '👕', label: 'Clothing' },
              { type: 'hardware', emoji: '🔧', label: 'Hardware' },
              { type: 'grocery', emoji: '🛒', label: 'Grocery' },
              { type: 'restaurant', emoji: '🍽️', label: 'Restaurant' },
            ].map(({ type, emoji, label }) => (
              <button
                key={type}
                onClick={() => setSelectedBusinessType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedBusinessType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex gap-2">
            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors whitespace-nowrap"
                title="Reset all filters"
              >
                🔄 Reset Filters
              </button>
            )}

            {/* Create Button */}
            {canCreateCategories && (
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                ➕ Create Category
              </button>
            )}
          </div>
        </div>

        {/* Active Department Filter Badge */}
        {selectedDepartment && selectedBusinessType === 'clothing' && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400">Active filter:</span>
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

        {/* Department Quick Navigation (Clothing Only) */}
        {selectedBusinessType === 'clothing' && stats?.byDepartment && Object.keys(stats.byDepartment).length > 0 && !selectedDepartment && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Browse by Department</h3>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Object.keys(stats.byDepartment).length} departments • Click to filter categories
              </span>
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {Object.entries(stats.byDepartment)
                .sort(([, a]: [string, any], [, b]: [string, any]) => b.count - a.count)
                .map(([id, dept]: [string, any]) => (
                <button
                  key={id}
                  onClick={() => setSelectedDepartment(id)}
                  className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:border-blue-500 dark:hover:border-blue-400 transition-all text-center group"
                >
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{dept.emoji}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{dept.name}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {dept.count} product{dept.count !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Categories List */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery ? 'No categories found matching your search' : 'No categories yet'}
                </p>
                {canCreateCategories && !searchQuery && (
                  <button
                    onClick={handleCreateCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Your First Category
                  </button>
                )}
              </div>
            ) : (
              filteredCategories.map(category => (
                <div
                  key={category.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Category Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{category.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {category.name}
                          </h3>
                          <Link
                            href={`/admin/products?businessType=${selectedBusinessType}&categoryId=${category.id}`}
                            className="px-2 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
                            style={{
                              backgroundColor: category.color + '20',
                              color: category.color,
                              border: `1px solid ${category.color}40`
                            }}
                            title="View products in this category"
                          >
                            {category._count?.business_products || 0} products
                          </Link>
                          {category.inventory_subcategories && category.inventory_subcategories.length > 0 && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              • {category.inventory_subcategories.length} subcategories
                            </span>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Expand Button */}
                      {category.inventory_subcategories && category.inventory_subcategories.length > 0 && (
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title={expandedCategories.has(category.id) ? 'Collapse' : 'Expand'}
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${expandedCategories.has(category.id) ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}

                      {/* Add Subcategory */}
                      {canCreateSubcategories && (
                        <button
                          onClick={() => handleCreateSubcategory(category)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                          title="Add Subcategory"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}

                      {/* Edit Button */}
                      {canEditCategories && (
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                          title="Edit Category"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}

                      {/* Delete Button */}
                      {canDeleteCategories && (
                        <button
                          onClick={() => handleDeleteCategory(category)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                          title="Delete Category"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategories */}
                  {expandedCategories.has(category.id) && category.inventory_subcategories && category.inventory_subcategories.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                      <div className="space-y-2">
                        {category.inventory_subcategories
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map(subcategory => (
                            <div
                              key={subcategory.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center gap-2 flex-1">
                                {subcategory.emoji && <span className="text-lg">{subcategory.emoji}</span>}
                                <div>
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {subcategory.name}
                                  </span>
                                  {subcategory.description && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {subcategory.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {canEditSubcategories && (
                                  <button
                                    onClick={() => handleEditSubcategory(category, subcategory)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-gray-600 dark:text-gray-400"
                                    title="Edit Subcategory"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                )}
                                {canDeleteSubcategories && (
                                  <button
                                    onClick={() => handleDeleteSubcategory(subcategory)}
                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors text-red-600 dark:text-red-400"
                                    title="Delete Subcategory"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Category Editor Modal */}
        {showCategoryEditor && (
          <InventoryCategoryEditor
            category={editingCategory}
            businessId={currentBusinessId || ''}
            businessType={currentBusinessType}
            onSuccess={handleEditorSuccess}
            onCancel={() => {
              setShowCategoryEditor(false);
              setEditingCategory(null);
            }}
            isOpen={showCategoryEditor}
          />
        )}

        {/* Subcategory Editor Modal */}
        {showSubcategoryEditor && selectedCategory && (
          <InventorySubcategoryEditor
            subcategory={editingSubcategory}
            category={selectedCategory}
            onSuccess={handleEditorSuccess}
            onCancel={() => {
              setShowSubcategoryEditor(false);
              setEditingSubcategory(null);
              setSelectedCategory(null);
            }}
            isOpen={showSubcategoryEditor}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
