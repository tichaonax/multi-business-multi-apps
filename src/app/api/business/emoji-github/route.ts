import { NextRequest, NextResponse } from 'next/server';


import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { getServerUser } from '@/lib/get-server-user'

// GitHub emoji API endpoint
const GITHUB_EMOJI_API = 'https://api.github.com/emojis';

// Cache the full GitHub emoji list for 1 hour
let githubEmojiCache: { data: Record<string, string> | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Helper function to convert GitHub emoji names to Unicode characters
// This is a basic mapping for common emojis
function convertGithubEmojiToChar(name: string): string | null {
  const emojiMap: Record<string, string> = {
    'smile': '😊',
    'grinning': '😀',
    'heart': '❤️',
    'thumbsup': '👍',
    'thumbsdown': '👎',
    'fire': '🔥',
    'star': '⭐',
    'money_with_wings': '💸',
    'moneybag': '💰',
    'dollar': '💵',
    'credit_card': '💳',
    'bank': '🏦',
    'chart_with_upwards_trend': '📈',
    'chart_with_downwards_trend': '📉',
    'bar_chart': '📊',
    'pizza': '🍕',
    'hamburger': '🍔',
    'coffee': '☕',
    'car': '🚗',
    'airplane': '✈️',
    'house': '🏠',
    'office': '🏢',
    'computer': '💻',
    'phone': '📞',
    'email': '📧',
    'package': '📦',
    'shopping_cart': '🛒',
    'gift': '🎁',
    'wrench': '🔧',
    'hammer': '🔨',
    'nut_and_bolt': '🔩',
    'hammer_and_wrench': '🛠️',
    'hammer_and_pick': '⚒️',
    'pick': '⛏️',
    'axe': '🪓',
    'saw': '🪚',
    'screwdriver': '🪛',
    'lightbulb': '💡',
    'books': '📚',
    'briefcase': '💼',
    // Add more mappings as needed
  };
  
  return emojiMap[name] || null;
}

// Helper function to extract Unicode character from GitHub emoji URL
function extractUnicodeFromUrl(url: string): string | null {
  // GitHub emoji URLs are like: https://github.githubassets.com/images/icons/emoji/unicode/1faa6.png?v8
  // For multi-codepoint emojis: https://github.githubassets.com/images/icons/emoji/unicode/1f6d2-fe0f.png
  // The hex part represents one or more Unicode codepoints separated by hyphens
  const match = url.match(/unicode\/([0-9a-f-]+)\.png/i);
  if (match) {
    try {
      const codepointStr = match[1];
      // Split by hyphen to handle multi-codepoint emojis (e.g., skin tones, ZWJ sequences)
      const codepoints = codepointStr.split('-').map(hex => parseInt(hex, 16));
      // Convert all codepoints to a single string
      return String.fromCodePoint(...codepoints);
    } catch (error) {
      console.error('Error converting codepoint:', error);
      return null;
    }
  }
  return null;
}

/**
 * GET /api/business/emoji-github
 * Fetch emojis from GitHub's gemoji API
 *
 * Query params:
 * - q: Search query (required)
 * - limit: Max results (default: 10, max: 20)
 *
 * Features:
 * - Fetches from GitHub API (public, free, no auth)
 * - Caches results in emoji_lookup table
 * - Gracefully falls back if offline
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Parse and validate limit
    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 20); // Max 20 results
      }
    }

    // Check cache first
    const now = Date.now();
    let githubEmojis: Record<string, string>;

    if (githubEmojiCache.data && (now - githubEmojiCache.timestamp) < CACHE_DURATION) {
      // Use cached data
      githubEmojis = githubEmojiCache.data;
    } else {
      // Fetch fresh data from GitHub
      try {
        const response = await fetch(GITHUB_EMOJI_API, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Business-Expense-App',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`);
        }

        githubEmojis = await response.json();

        // Update cache
        githubEmojiCache = {
          data: githubEmojis,
          timestamp: now,
        };
      } catch (fetchError) {
        console.error('Error fetching from GitHub API:', fetchError);

        // Graceful fallback: return error with helpful message
        return NextResponse.json(
          {
            error: 'Unable to fetch emojis from GitHub. Please check your internet connection or try again later.',
            offline: true,
            fallback: 'Use local emoji database instead',
          },
          { status: 503 } // Service Unavailable
        );
      }
    }

    // Filter emojis by search query
    const searchLower = query.trim().toLowerCase();
    const matchingEmojis: Array<{
      emoji: string;
      name: string;
      url: string;
      relevance: number;
    }> = [];

    for (const [name, url] of Object.entries(githubEmojis)) {
      const nameLower = name.toLowerCase();

      // Calculate relevance score
      let relevance = 0;
      if (nameLower === searchLower) {
        relevance = 100; // Exact match
      } else if (nameLower.startsWith(searchLower)) {
        relevance = 75; // Starts with query
      } else if (nameLower.includes(searchLower)) {
        relevance = 50; // Contains query
      } else {
        continue; // No match
      }

      // Try to convert emoji name to actual emoji character
      // First try the hardcoded mapping, then extract from URL
      const emojiChar = convertGithubEmojiToChar(name) || extractUnicodeFromUrl(url);

      // Only include emojis where we successfully got a Unicode character
      // Skip emojis that we can't convert (to avoid saving text names like "package")
      if (emojiChar) {
        matchingEmojis.push({
          emoji: emojiChar,
          name,
          url,
          relevance,
        });
      }
    }

    // Sort by relevance and take top results
    const sortedEmojis = matchingEmojis
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    // Cache the matched emojis in our database
    for (const emojiData of sortedEmojis) {
      try {
        await prisma.emojiLookup.upsert({
          where: {
            emoji_description: {
              emoji: emojiData.emoji, // Using the actual emoji character or extracted Unicode
              description: query.trim(),
            },
          },
          update: {
            usageCount: {
              increment: 1,
            },
          },
          create: {
            id: randomUUID(),
            emoji: emojiData.emoji,
            description: query.trim(),
            name: emojiData.name,
            url: emojiData.url,
            source: 'github',
            fetchedAt: new Date(),
            usageCount: 1,
          },
        });
      } catch (cacheError) {
        // Log but don't fail the request if caching fails
        console.error('Error caching emoji:', cacheError);
      }
    }

    return NextResponse.json({
      query,
      results: sortedEmojis,
      count: sortedEmojis.length,
      source: 'github',
      cached: githubEmojiCache.timestamp < now - 1000, // Was it from cache?
    });
  } catch (error) {
    console.error('Error processing GitHub emoji request:', error);
    return NextResponse.json(
      { error: 'Failed to process emoji request' },
      { status: 500 }
    );
  }
}
