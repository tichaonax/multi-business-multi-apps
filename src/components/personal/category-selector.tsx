'use client';

import React, { useState, useEffect } from 'react';
import {
  ExpenseDomain,
  ExpenseCategory,
  ExpenseSubcategory,
  ExpenseCategoryHierarchy,
} from '@/types/expense-category';

interface CategorySelectorProps {
  onCategoryChange: (categoryId: string | null, subcategoryId: string | null) => void;
  initialCategoryId?: string | null;
  initialSubcategoryId?: string | null;
  onCreateSubcategory?: () => void;
  showCreateButton?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export function CategorySelector({
  onCategoryChange,
  initialCategoryId = null,
  initialSubcategoryId = null,
  onCreateSubcategory,
  showCreateButton = false,
  disabled = false,
  required = false,
}: CategorySelectorProps) {
  const [loading, setLoading] = useState(true);
  const [hierarchy, setHierarchy] = useState<ExpenseCategoryHierarchy | null>(null);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(initialCategoryId || '');
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>(
    initialSubcategoryId || ''
  );

  // Fetch category hierarchy on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        const response = await fetch('/api/expense-categories');
        if (!response.ok) throw new Error('Failed to fetch categories');

        const data: ExpenseCategoryHierarchy = await response.json();
        setHierarchy(data);

        // If initial values provided, set the domain
        if (initialCategoryId && data.domains) {
          for (const domain of data.domains) {
            const category = domain.expense_categories?.find(
              (cat) => cat.id === initialCategoryId
            );
            if (category) {
              setSelectedDomainId(domain.id);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, [initialCategoryId]);

  // Get current domain
  const selectedDomain = hierarchy?.domains.find((d) => d.id === selectedDomainId);

  // Get current category
  const selectedCategory = selectedDomain?.expense_categories?.find(
    (c) => c.id === selectedCategoryId
  );

  // Handle domain change
  const handleDomainChange = (domainId: string) => {
    setSelectedDomainId(domainId);
    setSelectedCategoryId('');
    setSelectedSubcategoryId('');
    onCategoryChange(null, null);
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId('');
    onCategoryChange(categoryId, null);
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategoryId: string) => {
    setSelectedSubcategoryId(subcategoryId);
    onCategoryChange(selectedCategoryId, subcategoryId || null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (!hierarchy || hierarchy.domains.length === 0) {
    return (
      <div className="text-red-600 text-sm">
        No expense categories available. Please contact support.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Domain Selector */}
      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
          Domain {required && <span className="text-red-500">*</span>}
        </label>
        <select
          id="domain"
          value={selectedDomainId}
          onChange={(e) => handleDomainChange(e.target.value)}
          disabled={disabled}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select a domain...</option>
          {hierarchy.domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.emoji} {domain.name}
            </option>
          ))}
        </select>
      </div>

      {/* Category Selector */}
      {selectedDomainId && (
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category {required && <span className="text-red-500">*</span>}
          </label>
          <select
            id="category"
            value={selectedCategoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={disabled}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select a category...</option>
            {selectedDomain?.expense_categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.emoji} {category.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Subcategory Selector */}
      {selectedCategoryId && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700">
              Subcategory (Optional)
            </label>
            {showCreateButton && onCreateSubcategory && (
              <button
                type="button"
                onClick={onCreateSubcategory}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Create New
              </button>
            )}
          </div>
          <select
            id="subcategory"
            value={selectedSubcategoryId}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">No subcategory (use main category only)</option>
            {selectedCategory?.expense_subcategories?.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>
                {subcategory.emoji ? `${subcategory.emoji} ` : ''}{subcategory.name}
                {subcategory.isUserCreated && subcategory.users?.name
                  ? ` (by ${subcategory.users.name})`
                  : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary */}
      {selectedCategoryId && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
          <div className="font-medium mb-1">Selected:</div>
          <div className="flex items-center gap-2">
            <span>{selectedDomain?.emoji}</span>
            <span>{selectedDomain?.name}</span>
            <span>→</span>
            <span>{selectedCategory?.emoji}</span>
            <span>{selectedCategory?.name}</span>
            {selectedSubcategoryId && selectedCategory?.expense_subcategories && (
              <>
                <span>→</span>
                {selectedCategory.expense_subcategories.find(
                  (s) => s.id === selectedSubcategoryId
                )?.emoji && (
                  <span>
                    {
                      selectedCategory.expense_subcategories.find(
                        (s) => s.id === selectedSubcategoryId
                      )?.emoji
                    }
                  </span>
                )}
                <span>
                  {
                    selectedCategory.expense_subcategories.find(
                      (s) => s.id === selectedSubcategoryId
                    )?.name
                  }
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
