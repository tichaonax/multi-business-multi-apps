'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmojiSearchResult } from '@/types/expense-category';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
  searchPlaceholder?: string;
}

export function EmojiPicker({
  onSelect,
  selectedEmoji,
  searchPlaceholder = 'Search emojis...',
}: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmojiSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Debounced search
  const searchEmojis = useCallback(async (query: string, category: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (category) params.append('category', category);
      params.append('limit', '30');

      const response = await fetch(`/api/expense-categories/search-emoji?${params}`);
      if (!response.ok) throw new Error('Failed to search emojis');

      const data: EmojiSearchResult = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching emojis:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load - fetch default emojis
  useEffect(() => {
    searchEmojis('');
  }, [searchEmojis]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEmojis(searchQuery, selectedCategory);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, searchEmojis]);

  const handleEmojiSelect = (emoji: string) => {
    onSelect(emoji);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Category Filter */}
      {searchResults && searchResults.categories && searchResults.categories.length > 0 && (
        <div>
          <label htmlFor="emoji-category" className="block text-xs font-medium text-gray-600 mb-1">
            Filter by category:
          </label>
          <select
            id="emoji-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All categories</option>
            {searchResults.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Emoji Display */}
      {selectedEmoji && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <span className="text-2xl">{selectedEmoji}</span>
          <span className="text-sm font-medium text-blue-800">Selected</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Searching...</p>
        </div>
      )}

      {/* Emoji Grid */}
      {!loading && searchResults && searchResults.results.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-2">
            {searchResults.count} emoji{searchResults.count !== 1 ? 's' : ''} found
          </p>
          <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
            {searchResults.results.map((result, index) => (
              <button
                key={`${result.emoji}-${index}`}
                type="button"
                onClick={() => handleEmojiSelect(result.emoji)}
                title={`${result.name} - ${result.keywords.join(', ')}`}
                className={`
                  text-2xl p-2 rounded hover:bg-blue-100 transition-colors
                  ${selectedEmoji === result.emoji ? 'bg-blue-200 ring-2 ring-blue-500' : 'bg-white'}
                `}
              >
                {result.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && searchResults && searchResults.results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No emojis found for "{searchQuery}"</p>
          <p className="text-xs mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
