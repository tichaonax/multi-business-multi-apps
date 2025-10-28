'use client';

import React, { useState, useEffect } from 'react';
import { EmojiPickerEnhanced } from '../business/emoji-picker-enhanced';
import { InventorySubcategory, InventoryCategory } from '@/types/inventory-category';

interface InventorySubcategoryEditorProps {
  subcategory?: InventorySubcategory | null; // null/undefined = create mode, otherwise edit mode
  category: InventoryCategory;
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function InventorySubcategoryEditor({
  subcategory,
  category,
  onSuccess,
  onCancel,
  isOpen,
}: InventorySubcategoryEditorProps) {
  const isEditMode = !!subcategory;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with subcategory data (edit mode) or defaults (create mode)
  useEffect(() => {
    if (isEditMode && subcategory) {
      setName(subcategory.name);
      setEmoji(subcategory.emoji || '');
      setDescription(subcategory.description || '');
    } else {
      setName('');
      setEmoji('');
      setDescription('');
    }
  }, [subcategory, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Subcategory name is required');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        categoryId: category.id,
        name: name.trim(),
        emoji: emoji.trim() || undefined,
        description: description.trim() || undefined,
      };

      const url = isEditMode
        ? `/api/inventory/subcategories/${subcategory!.id}`
        : '/api/inventory/subcategories';

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
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} subcategory`);
      }

      onSuccess();

      // Reset form
      setName('');
      setEmoji('');
      setDescription('');
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} subcategory:`, err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setEmoji('');
    setDescription('');
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
            {isEditMode ? 'Edit Subcategory' : 'Create New Subcategory'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode ? 'Update subcategory details' : `Add a subcategory under ${category.emoji} ${category.name}`}
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

          {/* Parent Category Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Parent Category:</p>
            <div className="flex items-center gap-2">
              <span className="text-xl">{category.emoji}</span>
              <span className="font-medium text-blue-900 dark:text-blue-100">{category.name}</span>
            </div>
          </div>

          {/* Subcategory Name */}
          <div>
            <label htmlFor="subcategory-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subcategory Name <span className="text-red-500">*</span>
            </label>
            <input
              id="subcategory-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cordless Drills, Organic Vegetables"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A more specific classification under the parent category
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="subcategory-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="subcategory-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe this subcategory..."
              rows={2}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {/* Emoji Picker (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Emoji (Optional)
            </label>
            <EmojiPickerEnhanced
              onSelect={setEmoji}
              selectedEmoji={emoji}
              searchPlaceholder="Search for an emoji (optional)..."
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Subcategories can optionally have their own emoji for additional visual distinction
            </p>
          </div>

          {/* Preview */}
          {name && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">{category.emoji}</span>
                <span className="text-gray-600 dark:text-gray-400">{category.name}</span>
                <span className="text-gray-400 dark:text-gray-600">→</span>
                {emoji && <span className="text-lg">{emoji}</span>}
                <span className="font-medium text-gray-900 dark:text-gray-100">{name}</span>
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
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (isEditMode ? 'Update Subcategory' : 'Create Subcategory')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
