'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { hasUserPermission } from '@/lib/permission-utils';
import { ExpenseCategoryHierarchy, ExpenseCategory, ExpenseSubcategory } from '@/types/expense-category';
import { CategoryEditor } from '@/components/business/category-editor';
import { SubcategoryEditor } from '@/components/business/subcategory-editor';

export default function BusinessCategoriesPage() {
  const { data: session } = useSession();
  const [hierarchy, setHierarchy] = useState<ExpenseCategoryHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Editor state
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showSubcategoryEditor, setShowSubcategoryEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<ExpenseSubcategory | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    emoji: string;
  } | null>(null);

  // Permissions
  const canCreateCategories = hasUserPermission(session?.user, 'canCreateBusinessCategories');
  const canEditCategories = hasUserPermission(session?.user, 'canEditBusinessCategories');
  const canDeleteCategories = hasUserPermission(session?.user, 'canDeleteBusinessCategories');
  const canCreateSubcategories = hasUserPermission(session?.user, 'canCreateBusinessSubcategories');
  const canEditSubcategories = hasUserPermission(session?.user, 'canEditBusinessSubcategories');
  const canDeleteSubcategories = hasUserPermission(session?.user, 'canDeleteBusinessSubcategories');

  // Fetch category hierarchy
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await fetch('/api/business/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');

        const data: ExpenseCategoryHierarchy = await response.json();
        setHierarchy(data);

        // Expand first domain by default
        if (data.domains.length > 0) {
          setExpandedDomains(new Set([data.domains[0].id]));
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const toggleDomain = (domainId: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domainId)) {
      newExpanded.delete(domainId);
    } else {
      newExpanded.add(domainId);
    }
    setExpandedDomains(newExpanded);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddCategory = (domainId: string) => {
    setSelectedDomainId(domainId);
    setEditingCategory(null);
    setShowCategoryEditor(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setSelectedDomainId(category.domainId || null);
    setShowCategoryEditor(true);
  };

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/business/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete category');
        return;
      }

      // Refresh categories
      window.location.reload();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    }
  };

  const handleAddSubcategory = (category: ExpenseCategory) => {
    setSelectedCategory({
      id: category.id,
      name: category.name,
      emoji: category.emoji,
    });
    setEditingSubcategory(null);
    setShowSubcategoryEditor(true);
  };

  const handleEditSubcategory = (subcategory: ExpenseSubcategory) => {
    setEditingSubcategory(subcategory);
    setSelectedCategory(null); // Not needed in edit mode
    setShowSubcategoryEditor(true);
  };

  const handleDeleteSubcategory = async (subcategory: ExpenseSubcategory) => {
    if (!confirm(`Are you sure you want to delete "${subcategory.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/business/subcategories/${subcategory.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete subcategory');
        return;
      }

      // Refresh categories
      window.location.reload();
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      alert('Failed to delete subcategory');
    }
  };

  const handleEditorSuccess = () => {
    setShowCategoryEditor(false);
    setShowSubcategoryEditor(false);
    // Refresh categories
    window.location.reload();
  };

  // Filter categories based on search
  const filteredHierarchy = hierarchy ? {
    ...hierarchy,
    domains: hierarchy.domains.map(domain => ({
      ...domain,
      expense_categories: domain.expense_categories?.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.expense_subcategories?.some(sub =>
          sub.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ),
    })).filter(domain => domain.expense_categories && domain.expense_categories.length > 0),
  } : null;

  if (!session?.user) {
    return (
      <ProtectedRoute>
        <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-4">Access Denied</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            You must be logged in to access business categories.
          </p>
          <Link href="/dashboard" className="btn-secondary">
            ← Back to Dashboard
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-primary">Business Expense Categories</h1>
              <p className="text-sm text-secondary mt-1">
                Manage business-wide expense categories and subcategories
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Back
            </Link>
          </div>

          {/* Summary Stats */}
          {hierarchy && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="card p-4 bg-blue-50 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600">{hierarchy.count.domains}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Domains</div>
              </div>
              <div className="card p-4 bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600">{hierarchy.count.categories}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
              </div>
              <div className="card p-4 bg-purple-50 dark:bg-purple-900/20">
                <div className="text-2xl font-bold text-purple-600">{hierarchy.count.subcategories}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Subcategories</div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-600">Loading categories...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200">
            <p className="text-red-600">Error: {error}</p>
          </div>
        )}

        {/* Categories List */}
        {!loading && !error && filteredHierarchy && (
          <div className="space-y-4">
            {filteredHierarchy.domains.map((domain) => (
              <div key={domain.id} className="card overflow-hidden">
                {/* Domain Header */}
                <div className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
                  <button
                    onClick={() => toggleDomain(domain.id)}
                    className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded p-2 -m-2"
                  >
                    <span className="text-2xl">{domain.emoji}</span>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-primary">{domain.name}</h2>
                      <p className="text-sm text-secondary">{domain.description}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-4">
                    {canCreateCategories && (
                      <button
                        onClick={() => handleAddCategory(domain.id)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                      >
                        + Add Category
                      </button>
                    )}
                    <div className="text-sm text-secondary">
                      {domain.expense_categories?.length || 0} categories
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedDomains.has(domain.id) ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Domain Content */}
                {expandedDomains.has(domain.id) && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {domain.expense_categories?.map((category) => (
                      <div key={category.id}>
                        {/* Category Header */}
                        <div className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                          <button
                            onClick={() => toggleCategory(category.id)}
                            className="flex-1 flex items-center gap-3 text-left"
                          >
                            <span className="text-xl">{category.emoji}</span>
                            <div className="flex-1">
                              <div className="font-medium text-primary">{category.name}</div>
                              {category.description && (
                                <div className="text-xs text-secondary">{category.description}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-secondary">
                              <span>{category.expense_subcategories?.length || 0} subcategories</span>
                              <svg
                                className={`h-4 w-4 transform transition-transform ${
                                  expandedCategories.has(category.id) ? 'rotate-180' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>

                          {/* Category Actions */}
                          <div className="flex items-center gap-2 ml-4">
                            {canCreateSubcategories && (
                              <button
                                onClick={() => handleAddSubcategory(category)}
                                className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                              >
                                + Add Subcategory
                              </button>
                            )}
                            {canEditCategories && (
                              <button
                                onClick={() => handleEditCategory(category)}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit category"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                            {canDeleteCategories && (
                              <button
                                onClick={() => handleDeleteCategory(category)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete category"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Subcategories */}
                        {expandedCategories.has(category.id) && category.expense_subcategories && (
                          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900">
                            {category.expense_subcategories.length === 0 ? (
                              <div className="py-4 text-center text-sm text-secondary">
                                No subcategories yet.
                                {canCreateSubcategories && (
                                  <button
                                    onClick={() => handleAddSubcategory(category)}
                                    className="ml-2 text-blue-600 hover:underline"
                                  >
                                    Create one?
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 py-2">
                                {category.expense_subcategories.map((subcategory) => (
                                  <div
                                    key={subcategory.id}
                                    className="flex items-center gap-2 p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                  >
                                    {subcategory.emoji && <span>{subcategory.emoji}</span>}
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-primary">
                                        {subcategory.name}
                                      </div>
                                      {subcategory.isUserCreated && subcategory.users && (
                                        <div className="text-xs text-secondary">
                                          Created by {subcategory.users.name}
                                        </div>
                                      )}
                                    </div>
                                    {subcategory.isUserCreated && (
                                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                        Custom
                                      </span>
                                    )}
                                    {subcategory.isDefault && (
                                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                        Default
                                      </span>
                                    )}

                                    {/* Subcategory Actions */}
                                    <div className="flex items-center gap-1">
                                      {canEditSubcategories && (
                                        <button
                                          onClick={() => handleEditSubcategory(subcategory)}
                                          className="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                                          title="Edit subcategory"
                                        >
                                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                        </button>
                                      )}
                                      {canDeleteSubcategories && (
                                        <button
                                          onClick={() => handleDeleteSubcategory(subcategory)}
                                          className="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                                          title="Delete subcategory"
                                        >
                                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filteredHierarchy && filteredHierarchy.domains.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No categories found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* Category Editor Modal */}
      <CategoryEditor
        category={editingCategory}
        domainId={selectedDomainId || undefined}
        onSuccess={handleEditorSuccess}
        onCancel={() => setShowCategoryEditor(false)}
        isOpen={showCategoryEditor}
      />

      {/* Subcategory Editor Modal */}
      <SubcategoryEditor
        subcategory={editingSubcategory}
        categoryId={selectedCategory?.id}
        categoryName={selectedCategory?.name}
        categoryEmoji={selectedCategory?.emoji}
        onSuccess={handleEditorSuccess}
        onCancel={() => setShowSubcategoryEditor(false)}
        isOpen={showSubcategoryEditor}
      />
    </ProtectedRoute>
  );
}
