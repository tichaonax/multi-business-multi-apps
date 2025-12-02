'use client';

import React, { useState, useEffect } from 'react';
import { EmojiPickerEnhanced } from './emoji-picker-enhanced';
import { ExpenseSubcategory } from '@/types/expense-category';

interface SubcategoryEditorProps {
  subcategory?: ExpenseSubcategory | null; // null/undefined = create mode, otherwise edit mode
  categoryId?: string; // Required for create mode
  categoryName?: string; // For display in create mode
  categoryEmoji?: string; // For display in create mode
  onSuccess: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export function SubcategoryEditor({
  subcategory,
  categoryId,
  categoryName,
  categoryEmoji,
  onSuccess,
  onCancel,
  isOpen,
}: SubcategoryEditorProps) {
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

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    try { e?.preventDefault?.() } catch (ex) {}
    setError(null);

    if (!name.trim()) {
      setError('Subcategory name is required');
      return;
    }

    if (!emoji.trim()) {
      setError('Emoji is required');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        emoji: emoji.trim(),
        description: description.trim() || undefined,
        ...(isEditMode ? {} : { categoryId }),
      };

      const url = isEditMode
        ? `/api/business/subcategories/${subcategory!.id}`
        : '/api/business/subcategories';

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

  const modal = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditMode ? 'Edit Subcategory' : 'Create New Subcategory'}
          </h2>
          {!isEditMode && categoryName && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Adding to: {categoryEmoji} {categoryName}
            </p>
          )}
        </div>

        {/* Form (non-HTML form to avoid nested forms inside parent forms) */}
        <div
          role="form"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const t = e.target as HTMLElement
              if (t && t.tagName !== 'TEXTAREA') {
                e.preventDefault();
                void handleSubmit()
              }
            }
          }}
          className="px-6 py-4 space-y-6"
        >
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
              <p className="text-sm">{error}</p>
            </div>
          )}

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
              placeholder="e.g., Stationery"
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
  return (
    <ModalPortal>
      {modal}
    </ModalPortal>
  );
              This subcategory will be visible to all users
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
              <p className="mt-2 text-xs text-red-500">Emoji is required for all subcategories</p>
            )}
          </div>

          {/* Preview */}
          {(name || emoji) && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
              <div className="flex items-center gap-2">
                {emoji && <span className="text-2xl">{emoji}</span>}
                <span className="font-medium text-gray-900 dark:text-gray-100">{name || 'Subcategory name'}</span>
              </div>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading || !name.trim() || !emoji.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
            )}
            {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Subcategory' : 'Create Subcategory')}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <ModalPortal>
      {modal}
    </ModalPortal>
  )
}
