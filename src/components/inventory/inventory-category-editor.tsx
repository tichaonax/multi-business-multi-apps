'use client';

import React, { useState, useEffect } from 'react';
import { EmojiPickerEnhanced } from '../business/emoji-picker-enhanced';
import { InventoryCategory, InventoryDomain } from '@/types/inventory-category';

interface InventoryCategoryEditorProps {
  category?: InventoryCategory | null; // null/undefined = create mode, otherwise edit mode
  businessId: string;
  businessType: string;
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function InventoryCategoryEditor({
  category,
  businessId,
  businessType,
  onSuccess,
  onCancel,
  isOpen,
}: InventoryCategoryEditorProps) {
  const isEditMode = !!category;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📦');
  const [color, setColor] = useState('#3B82F6');
  const [description, setDescription] = useState('');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [domains, setDomains] = useState<InventoryDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load domains for domain selector
  useEffect(() => {
    async function fetchDomains() {
      try {
        setLoadingDomains(true);
        const response = await fetch(`/api/inventory/domains?businessType=${businessType}`);
        if (!response.ok) throw new Error('Failed to fetch domains');

        const data = await response.json();
        setDomains(data.domains || []);
      } catch (err) {
        console.error('Error fetching domains:', err);
      } finally {
        setLoadingDomains(false);
      }
    }

    if (isOpen) {
      fetchDomains();
    }
  }, [isOpen, businessType]);

  // Initialize form with category data (edit mode) or defaults (create mode)
  useEffect(() => {
    if (isEditMode && category) {
      setName(category.name);
      setEmoji(category.emoji);
      setColor(category.color);
      setDescription(category.description || '');
      setSelectedDomainId(category.domainId || '');
    } else {
      setName('');
      setEmoji('📦');
      setColor('#3B82F6');
      setDescription('');
      setSelectedDomainId('');
    }
  }, [category, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    if (!emoji.trim()) {
      setError('Emoji is required');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        businessId,
        name: name.trim(),
        emoji: emoji.trim(),
        color: color || '#3B82F6',
        description: description.trim() || undefined,
        domainId: selectedDomainId || undefined,
        businessType,
      };

      const url = isEditMode
        ? `/api/inventory/categories/${category!.id}`
        : '/api/inventory/categories';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} category`);
      }

      onSuccess();

      // Reset form
      setName('');
      setEmoji('📦');
      setColor('#3B82F6');
      setDescription('');
      setSelectedDomainId('');
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} category:`, err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setEmoji('📦');
    setColor('#3B82F6');
    setDescription('');
    setSelectedDomainId('');
    setError(null);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditMode ? 'Edit Inventory Category' : 'Create New Inventory Category'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode ? 'Update category details' : 'Add a new inventory category with emoji'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Domain Selector (Optional) */}
          <div>
            <label htmlFor="category-domain" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Domain Template (Optional)
            </label>
            <select
              id="category-domain"
              value={selectedDomainId}
              onChange={(e) => setSelectedDomainId(e.target.value)}
              disabled={loading || loadingDomains}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">No template (custom category)</option>
              {domains.map((domain) => (
                <option key={domain.id} value={domain.id}>
                  {domain.emoji} {domain.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Link to a domain template or create a custom category
            </p>
          </div>

          {/* Category Name */}
          <div>
            <label htmlFor="category-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Power Tools, Fresh Produce"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              This category will appear in your inventory navigation
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="category-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="category-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe this category..."
              rows={2}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Emoji <span className="text-red-500">*</span>
            </label>
            <EmojiPickerEnhanced
              onSelect={setEmoji}
              selectedEmoji={emoji}
              searchPlaceholder="Search for an appropriate emoji..."
            />
            {!emoji && (
              <p className="mt-2 text-xs text-red-500">Emoji is required for all categories</p>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label htmlFor="category-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category Color
            </label>
            <div className="flex items-center gap-4">
              <input
                id="category-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={loading}
                className="h-10 w-20 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3B82F6"
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Used for category badges and visual distinction
            </p>
          </div>

          {/* Preview */}
          {(name || emoji) && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                {emoji && <span className="text-2xl">{emoji}</span>}
                <span
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: color + '20',
                    color: color,
                    border: `1px solid ${color}40`
                  }}
                >
                  {name || 'Category name'}
                </span>
              </div>
              {description && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{description}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !emoji.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Category' : 'Create Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
