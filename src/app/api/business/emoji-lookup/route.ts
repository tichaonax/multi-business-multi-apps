import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { EMOJI_DATABASE } from '@/lib/data/emoji-database';

/**
 * GET /api/business/emoji-lookup
 * Search cached emojis in the lookup database
 *
 * Query params:
 * - q: Search query (description/keyword)
 * - limit: Max results (default: 20, max: 50)
 *
 * Returns cached emojis sorted by usage count
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');

    // Parse and validate limit
    let limit = 20;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 50); // Max 50 results
      }
    }

    if (!query || query.trim().length === 0) {
      // Return empty results if no query
      return NextResponse.json({
        query: '',
        results: [],
        count: 0,
        source: 'cached',
      });
    }

    // Search in emoji_lookup table
    const cachedEmojis = await prisma.emojiLookup.findMany({
      where: {
        OR: [
          {
            description: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: [
        { usageCount: 'desc' }, // Most used first
        { fetchedAt: 'desc' },  // Then most recent
      ],
      take: limit,
    });

    // If no cached results, search local emoji database
    let allResults = [...cachedEmojis];
    
    if (cachedEmojis.length < limit) {
      const queryLower = query.trim().toLowerCase();
      const localMatches = EMOJI_DATABASE.filter(emojiData => {
        return emojiData.name.toLowerCase().includes(queryLower) ||
               emojiData.keywords.some(keyword => keyword.toLowerCase().includes(queryLower));
      }).map(emojiData => ({
        id: `local-${emojiData.emoji}`,
        emoji: emojiData.emoji,
        name: emojiData.name,
        description: query.trim(),
        url: null,
        source: 'local' as const,
        usageCount: 0,
        fetchedAt: new Date(),
      }));
      
      // Add local results up to the limit
      const remainingSlots = limit - cachedEmojis.length;
      allResults.push(...localMatches.slice(0, remainingSlots));
    }

    return NextResponse.json({
      query,
      results: allResults,
      count: allResults.length,
      source: cachedEmojis.length > 0 ? 'mixed' : 'local',
    });
  } catch (error) {
    console.error('Error searching emoji lookup:', error);
    return NextResponse.json(
      { error: 'Failed to search emoji lookup' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/emoji-lookup
 * Save an emoji to the lookup cache
 *
 * Request body:
 * {
 *   emoji: string;
 *   description: string;
 *   name?: string;
 *   url?: string;
 *   source: 'local' | 'github';
 * }
 *
 * Increments usageCount if emoji already exists with same description
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { emoji, description, name, url, source } = body;

    // Validate required fields
    if (!emoji || !description || !source) {
      return NextResponse.json(
        { error: 'emoji, description, and source are required' },
        { status: 400 }
      );
    }

    // Validate source
    if (source !== 'local' && source !== 'github') {
      return NextResponse.json(
        { error: 'source must be either "local" or "github"' },
        { status: 400 }
      );
    }

    // Check if this emoji with this description already exists
    const existingEmoji = await prisma.emojiLookup.findUnique({
      where: {
        emoji_description: {
          emoji,
          description: description.trim(),
        },
      },
    });

    let savedEmoji;

    if (existingEmoji) {
      // Increment usage count
      savedEmoji = await prisma.emojiLookup.update({
        where: { id: existingEmoji.id },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    } else {
      // Create new entry
      savedEmoji = await prisma.emojiLookup.create({
        data: {
          id: randomUUID(),
          emoji,
          description: description.trim(),
          name: name || null,
          url: url || null,
          source,
          fetchedAt: new Date(),
          usageCount: 1,
        },
      });
    }

    return NextResponse.json({
      message: existingEmoji ? 'Usage count incremented' : 'Emoji saved to cache',
      emoji: savedEmoji,
    });
  } catch (error) {
    console.error('Error saving emoji to lookup:', error);
    return NextResponse.json(
      { error: 'Failed to save emoji' },
      { status: 500 }
    );
  }
}
