'use client';

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { hasUserPermission } from '@/lib/permission-utils';
import { ExpenseCategoryHierarchy, ExpenseCategory } from '@/types/expense-category';
import { SubcategoryCreator } from '@/components/personal/subcategory-creator';

export default function CategoriesPage() {
  const { data: session } = useSession();
  const [hierarchy, setHierarchy] = useState<ExpenseCategoryHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Subcategory creator state
  const [showSubcategoryCreator, setShowSubcategoryCreator] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
    emoji: string;
  } | null>(null);

  const canCreateSubcategories = hasUserPermission(session?.user, 'canCreateExpenseSubcategories');

  // Fetch category hierarchy
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await fetch('/api/expense-categories');
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

  const handleCreateSubcategory = (category: ExpenseCategory) => {
    setSelectedCategory({
      id: category.id,
      name: category.name,
      emoji: category.emoji,
    });
    setShowSubcategoryCreator(true);
  };

  const handleSubcategoryCreated = () => {
    setShowSubcategoryCreator(false);
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

  if (!session?.user || !hasUserPermission(session.user, 'canAccessPersonalFinance')) {
    return (
      <ProtectedRoute>
        <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-4">Access Denied</h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            You don't have permission to access personal finance categories.
          </p>
          <Link href="/personal" className="btn-secondary">
            ← Back to Personal Finance
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
              <h1 className="text-2xl font-bold text-primary">Expense Categories</h1>
              <p className="text-sm text-secondary mt-1">
                Browse and manage expense categories and subcategories
              </p>
            </div>
            <Link
              href="/personal"
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
                <button
                  onClick={() => toggleDomain(domain.id)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{domain.emoji}</span>
                    <div className="text-left">
                      <h2 className="text-lg font-semibold text-primary">{domain.name}</h2>
                      <p className="text-sm text-secondary">{domain.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-secondary">
                      {domain.expense_categories?.length || 0} categories
                    </div>
                    <svg
                      className={`h-5 w-5 text-gray-400 transform transition-transform ${
                        expandedDomains.has(domain.id) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

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
                          {canCreateSubcategories && (
                            <button
                              onClick={() => handleCreateSubcategory(category)}
                              className="ml-4 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                            >
                              + Add Subcategory
                            </button>
                          )}
                        </div>

                        {/* Subcategories */}
                        {expandedCategories.has(category.id) && category.expense_subcategories && (
                          <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900">
                            {category.expense_subcategories.length === 0 ? (
                              <div className="py-4 text-center text-sm text-secondary">
                                No subcategories yet.
                                {canCreateSubcategories && (
                                  <button
                                    onClick={() => handleCreateSubcategory(category)}
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

      {/* Subcategory Creator Modal */}
      {showSubcategoryCreator && selectedCategory && (
        <SubcategoryCreator
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
          categoryEmoji={selectedCategory.emoji}
          onSuccess={handleSubcategoryCreated}
          onCancel={() => setShowSubcategoryCreator(false)}
          isOpen={showSubcategoryCreator}
        />
      )}
    </ProtectedRoute>
  );
}
