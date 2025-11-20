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

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  selectedEmoji?: string;
  searchPlaceholder?: string;
  compact?: boolean;              // Compact mode for inline use
  showRecent?: boolean;           // Show recently used emojis
  businessId?: string;            // For usage tracking per business
  context?: string;               // Usage context (supplier, location, etc.)
}

// Helper to check if a string is a valid emoji character (not text)
function isValidEmoji(str: string | undefined): boolean {
  if (!str || str.trim().length === 0) return false;
  // Check if the string contains actual emoji characters
  // Emojis are typically in these Unicode ranges
  const emojiRegex = /[\p{Emoji}\p{Emoji_Presentation}]/u;
  return emojiRegex.test(str);
}

export function EmojiPicker({
  onSelect,
  selectedEmoji,
  searchPlaceholder = 'Search emojis...',
  compact = false,
  showRecent = true,
  businessId,
  context,
}: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localResults, setLocalResults] = useState<EmojiResult[]>([]);
  const [githubResults, setGithubResults] = useState<EmojiResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showGithubButton, setShowGithubButton] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [selectedEmojiResult, setSelectedEmojiResult] = useState<EmojiResult | null>(null);

  // Check if the selected emoji is valid
  const isSelectedEmojiValid = isValidEmoji(selectedEmoji);

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
      params.append('limit', compact ? '12' : '20');

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
  }, [compact]);

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
      params.append('limit', compact ? '12' : '20');

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

  // Initialize selected emoji display
  useEffect(() => {
    if (selectedEmoji && !searchQuery && isSelectedEmojiValid) {
      // Create a result for the selected emoji to display in the grid
      setSelectedEmojiResult({
        emoji: selectedEmoji,
        name: selectedEmoji,
        source: 'local',
        usageCount: 0,
      });
    } else {
      setSelectedEmojiResult(null);
    }
  }, [selectedEmoji, searchQuery, isSelectedEmojiValid]);

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
            name: emoji,
            source: 'github',
            businessId,
            context,
          }),
        });
      } catch (error) {
        console.error('Error caching emoji selection:', error);
      }
    }
  };

  // Sort results by usage count (most used first)
  const sortedLocalResults = [...localResults].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

  // Include selected emoji in results if no search query
  const resultsWithSelected = selectedEmojiResult && !searchQuery
    ? [selectedEmojiResult, ...sortedLocalResults]
    : sortedLocalResults;

  const allResults = [...resultsWithSelected, ...githubResults];

  // Helper function to get source indicator badge
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
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {/* Search Input */}
      <div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className={`
            w-full px-3 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm
            focus:ring-blue-500 focus:border-blue-500
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            ${compact ? 'py-1.5 text-sm' : 'py-2'}
          `}
        />
      </div>

      {/* Selected Emoji Display */}
      {selectedEmoji && isSelectedEmojiValid && (
        <div className={`flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded ${compact ? 'text-sm' : ''}`}>
          <span className={compact ? 'text-xl' : 'text-2xl'}>{selectedEmoji}</span>
          <span className={`font-medium text-blue-800 dark:text-blue-300 ${compact ? 'text-xs' : 'text-sm'}`}>Selected</span>
        </div>
      )}

      {/* Invalid Emoji Warning */}
      {selectedEmoji && !isSelectedEmojiValid && (
        <div className={`flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded ${compact ? 'text-sm' : ''}`}>
          <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
          <div className="flex-1">
            <p className={`font-medium text-yellow-800 dark:text-yellow-300 ${compact ? 'text-xs' : 'text-sm'}`}>
              Invalid Emoji: "{selectedEmoji}"
            </p>
            <p className={`text-yellow-700 dark:text-yellow-400 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              This appears to be text instead of an emoji. Please search and select a new emoji below.
            </p>
          </div>
        </div>
      )}

      {/* Local Results Loading */}
      {loading && (
        <div className="text-center py-4">
          <div className={`inline-block animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}></div>
          <p className={`mt-2 text-gray-600 dark:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>Searching...</p>
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
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="animate-spin w-3 h-3 border border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full"></div>
                <span>Loading...</span>
              </div>
            )}
          </div>
          <div className={`
            grid gap-2 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-800
            ${compact ? 'grid-cols-6 max-h-48' : 'grid-cols-6 sm:grid-cols-8 max-h-64'}
          `}>
            {allResults.map((result, index) => (
              <button
                key={`${result.emoji}-${result.source}-${index}`}
                type="button"
                onClick={() => handleEmojiSelect(result.emoji, result.source)}
                title={`${result.name || result.emoji}${result.usageCount ? ` (used ${result.usageCount} times)` : ''}`}
                className={`
                  ${compact ? 'w-10 h-10 p-1' : 'w-12 h-12 p-2'}
                  rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors relative flex items-center justify-center border
                  ${selectedEmoji === result.emoji ? 'bg-blue-200 dark:bg-blue-800 ring-2 ring-blue-500 border-blue-300 dark:border-blue-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'}
                `}
              >
                {result.source === 'github' && result.url ? (
                  <div className="relative">
                    {/* Show emoji character as primary display */}
                    <span className={`${compact ? 'text-lg' : 'text-xl'} text-gray-800 dark:text-gray-200 select-none`}>
                      {result.emoji && result.emoji !== result.name ? result.emoji : '❓'}
                    </span>
                    {/* Image as overlay for visual consistency */}
                    <img
                      src={result.url}
                      alt={result.name || result.emoji}
                      className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} absolute inset-0 object-contain opacity-0`}
                      loading="lazy"
                      onLoad={(e) => {
                        // If image loads successfully, hide text and show image
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent) {
                          const span = parent.querySelector('span');
                          if (span) span.style.display = 'none';
                          target.style.opacity = '1';
                        }
                      }}
                      onError={(e) => {
                        // Keep the emoji character visible if image fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <span className={`${compact ? 'text-lg' : 'text-xl'} text-gray-800 dark:text-gray-200 select-none`}>{result.emoji}</span>
                )}
                {getSourceBadge(result)}
              </button>
            ))}
          </div>

          {/* Legend for source badges */}
          {!compact && allResults.length > 0 && (localResults.length > 0 || githubResults.length > 0) && (
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
        <div className={`text-center text-gray-500 dark:text-gray-400 ${compact ? 'py-4' : 'py-8'}`}>
          <p className="text-sm">No emojis found for "{searchQuery}"</p>
        </div>
      )}

      {/* Find More on GitHub Button */}
      {!loading && searchQuery && showGithubButton && githubResults.length === 0 && (
        <div className={`text-center ${compact ? 'py-2' : 'py-4'}`}>
          {localResults.length > 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Need more options? Search GitHub
            </p>
          )}
          {localResults.length === 0 && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              No local results. Try GitHub
            </p>
          )}
          <button
            type="button"
            onClick={searchGithubEmojis}
            disabled={githubLoading}
            className={`
              ${compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
              font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2 mx-auto
            `}
          >
            {githubLoading && (
              <div className={`animate-spin rounded-full border-2 border-solid border-white border-r-transparent ${compact ? 'h-3 w-3' : 'h-4 w-4'}`}></div>
            )}
            {githubLoading ? 'Searching...' : '🔍 Find more on GitHub'}
          </button>
        </div>
      )}

      {/* GitHub Error */}
      {githubError && (
        <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded ${compact ? 'p-2' : 'p-3'}`}>
          <div className="flex items-start gap-2">
            <span className={`text-red-500 ${compact ? 'text-sm' : ''}`}>⚠️</span>
            <div className="flex-1">
              <p className={`font-medium text-red-700 dark:text-red-300 ${compact ? 'text-xs' : 'text-sm'}`}>GitHub Search Unavailable</p>
              <p className={`text-red-600 dark:text-red-400 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>{githubError}</p>
              <button
                type="button"
                onClick={() => {
                  setGithubError(null);
                  searchGithubEmojis();
                }}
                className={`
                  ${compact ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'}
                  bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200
                  rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors mt-2
                `}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !searchQuery && (
        <div className={`text-center text-gray-500 dark:text-gray-400 ${compact ? 'py-4' : 'py-8'}`}>
          <p className="text-sm">Type to search for emojis</p>
          {!compact && <p className="text-xs mt-1">Start by describing what you're looking for</p>}
        </div>
      )}
    </div>
  );
}
