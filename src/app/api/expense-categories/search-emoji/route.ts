import { NextRequest, NextResponse } from 'next/server';


import { searchEmojis, getEmojiCategories, getEmojisByCategory } from '@/lib/data/emoji-database';
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/expense-categories/search-emoji
 * Search the embedded emoji database (offline)
 *
 * Query params:
 * - q: Search query (required)
 * - limit: Max number of results (default: 20, max: 50)
 * - category: Filter by emoji category (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    const category = searchParams.get('category');

    // Parse and validate limit
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 50); // Max 50 results
      }
    }

    let results;

    if (category) {
      // Filter by category first, then search
      const categoryEmojis = getEmojisByCategory(category);
      if (query) {
        results = categoryEmojis.filter((emoji) =>
          emoji.name.toLowerCase().includes(query.toLowerCase()) ||
          emoji.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
        ).slice(0, limit);
      } else {
        results = categoryEmojis.slice(0, limit);
      }
    } else {
      // Search all emojis
      results = searchEmojis(query, limit);
    }

    return NextResponse.json({
      query,
      results,
      count: results.length,
      categories: getEmojiCategories(), // Return available categories for filtering
    });

  } catch (error) {
    console.error('Error searching emojis:', error);
    return NextResponse.json(
      { error: 'Failed to search emojis' },
      { status: 500 }
    );
  }
}
