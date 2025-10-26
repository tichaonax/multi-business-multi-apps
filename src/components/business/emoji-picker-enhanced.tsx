'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface EmojiResult {
  emoji: string;
  name: string;
  description?: string;
  url?: string;
  source: 'local' | 'github';
  usageCount?: number;
}

interface EmojiPickerEnhancedProps {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
  searchPlaceholder?: string;
}

export function EmojiPickerEnhanced({
  onSelect,
  selectedEmoji,
  searchPlaceholder = 'Search emojis...',
}: EmojiPickerEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localResults, setLocalResults] = useState<EmojiResult[]>([]);
  const [githubResults, setGithubResults] = useState<EmojiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showGithubButton, setShowGithubButton] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Search local emoji database
  const searchLocalEmojis = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setLocalResults([]);
      setShowGithubButton(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('q', query.trim());
      params.append('limit', '20');

      const response = await fetch(`/api/business/emoji-lookup?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to search local emojis: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];
      
      // Filter out any invalid emoji results
      const validResults = results.filter((result: EmojiResult) => 
        result && result.emoji && result.emoji.trim().length > 0
      );
      
      setLocalResults(validResults);

      // Show GitHub button if we have few or no local results
      setShowGithubButton(data.results.length < 10);
    } catch (error) {
      console.error('Error searching local emojis:', error);
      setLocalResults([]);
      setShowGithubButton(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search GitHub emoji API
  const searchGithubEmojis = async () => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return;
    }

    try {
      setGithubLoading(true);
      setGithubError(null);
      const params = new URLSearchParams();
      params.append('q', searchQuery.trim());
      params.append('limit', '20');

      const response = await fetch(`/api/business/emoji-github?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.offline) {
          setGithubError('Unable to reach GitHub. Use local results or check your connection.');
        } else {
          throw new Error(errorData.error || 'Failed to fetch from GitHub');
        }
        return;
      }

      const data = await response.json();

      // Convert GitHub results to our format
      const githubEmojis: EmojiResult[] = (data.results || []).map((result: any) => ({
        emoji: result.emoji,
        name: result.name,
        url: result.url,
        source: 'github' as const,
      }));

      setGithubResults(githubEmojis);

      // After fetching from GitHub, refresh local results as they may be cached
      await searchLocalEmojis(searchQuery);
    } catch (error) {
      console.error('Error searching GitHub emojis:', error);
      setGithubError(error instanceof Error ? error.message : 'Failed to fetch from GitHub');
    } finally {
      setGithubLoading(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocalEmojis(searchQuery);
      // Clear GitHub results when search changes
      setGithubResults([]);
      setGithubError(null);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchLocalEmojis]);

  const handleEmojiSelect = async (emoji: string, source: 'local' | 'github') => {
    onSelect(emoji);

    // If selected from GitHub, save to local cache
    if (source === 'github' && searchQuery.trim()) {
      try {
        await fetch('/api/business/emoji-lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emoji,
            description: searchQuery.trim(),
            name: emoji, // For GitHub emojis, name is the emoji itself
            source: 'github',
          }),
        });
      } catch (error) {
        console.error('Error caching emoji selection:', error);
        // Non-critical error, don't show to user
      }
    }
  };

  // Task 4.3.4: Sort results by usage count (most used first)
  const sortedLocalResults = [...localResults].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

  const allResults = [...sortedLocalResults, ...githubResults];

  // Task 4.3.3: Helper function to get source indicator badge
  const getSourceBadge = (result: EmojiResult) => {
    const usageCount = result.usageCount || 0;
    if (usageCount > 5) {
      return (
        <span 
          className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center text-[10px] border border-yellow-300 dark:border-yellow-600" 
          title={`Cached - used ${usageCount} times`}
        >
          ⭐
        </span>
      );
    } else if (result.source === "github") {
      return (
        <span 
          className="absolute -top-1 -right-1 w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-[10px] border border-gray-300 dark:border-gray-600" 
          title="From GitHub"
        >
          🐙
        </span>
      );
    } else if (result.source === "local") {
      return (
        <span 
          className="absolute -top-1 -right-1 w-4 h-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-[10px] border border-green-300 dark:border-green-600" 
          title="Local emoji"
        >
          🏠
        </span>
      );
    }
    return null;
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

      {/* Selected Emoji Display */}
      {selectedEmoji && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <span className="text-2xl">{selectedEmoji}</span>
          <span className="text-sm font-medium text-blue-800">Selected</span>
        </div>
      )}

      {/* Local Results Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">Searching local database...</p>
        </div>
      )}

      {/* Emoji Grid */}
      {!loading && allResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {allResults.length} emoji{allResults.length !== 1 ? 's' : ''} found
              {localResults.length > 0 && githubResults.length > 0 &&
                ` (${localResults.length} local, ${githubResults.length} from GitHub)`
              }
            </p>
            {githubLoading && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="animate-spin w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full"></div>
                <span>Loading GitHub...</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-800">
            {allResults.map((result, index) => (
              <button
                key={`${result.emoji}-${result.source}-${index}`}
                type="button"
                onClick={() => handleEmojiSelect(result.emoji, result.source)}
                title={`${result.name || result.emoji}${result.usageCount ? ` (used ${result.usageCount} times)` : ''}`}
                className={`
                  w-12 h-12 p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors relative flex items-center justify-center border
                  ${selectedEmoji === result.emoji ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500 border-blue-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}
                `}
              >
                {result.source === 'github' && result.url ? (
                  <img 
                    src={result.url} 
                    alt={result.name || result.emoji}
                    className="w-6 h-6 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const span = document.createElement('span');
                        span.className = 'text-xl text-gray-800 dark:text-gray-200';
                        span.textContent = result.name || '❓';
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-xl text-gray-800 dark:text-gray-200 select-none">{result.emoji}</span>
                )}
                {getSourceBadge(result)}
              </button>
            ))}
          </div>
          
          {/* Legend for source badges */}
          {allResults.length > 0 && (localResults.length > 0 || githubResults.length > 0) && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-[8px] border border-green-300 dark:border-green-600">🏠</span>
                  Local
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-[8px] border border-gray-300 dark:border-gray-600">🐙</span>
                  GitHub
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center text-[8px] border border-yellow-300 dark:border-yellow-600">⭐</span>
                  Popular
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!loading && searchQuery && allResults.length === 0 && !showGithubButton && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No emojis found for "{searchQuery}"</p>
        </div>
      )}

      {/* Find More on GitHub Button */}
      {!loading && searchQuery && showGithubButton && githubResults.length === 0 && (
        <div className="text-center py-4">
          {localResults.length > 0 && (
            <p className="text-xs text-gray-600 mb-3">
              Need more options? Search GitHub's emoji database
            </p>
          )}
          {localResults.length === 0 && (
            <p className="text-xs text-gray-600 mb-3">
              No local results. Try searching GitHub's emoji database
            </p>
          )}
          <button
            type="button"
            onClick={searchGithubEmojis}
            disabled={githubLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {githubLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
            )}
            {githubLoading ? 'Searching GitHub...' : '🔍 Find more on GitHub'}
          </button>
        </div>
      )}

      {/* GitHub Error */}
      {githubError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
          <div className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div className="flex-1">
              <p className="font-medium text-red-700 dark:text-red-300">GitHub Search Unavailable</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{githubError}</p>
              <button
                type="button"
                onClick={() => {
                  setGithubError(null);
                  searchGithubEmojis();
                }}
                className="text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors mt-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !searchQuery && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Type to search for emojis</p>
          <p className="text-xs mt-1">Start by describing what you're looking for</p>
        </div>
      )}
    </div>
  );
}
