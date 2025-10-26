# Enhanced Emoji Picker System - Technical Documentation

**Version:** 1.0.0
**Last Updated:** 2025-10-26
**Component:** Business Expense Categories Emoji System

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Usage Examples](#usage-examples)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling](#error-handling)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Enhanced Emoji Picker is a hybrid system that combines local database caching with GitHub's gemoji API to provide users with:

- **Fast local search** from a curated emoji database
- **Extensive selection** via GitHub API (3000+ emojis)
- **Smart caching** of frequently used emojis
- **Usage tracking** to highlight popular choices
- **Offline capability** with graceful degradation

### Key Features

✅ **Dual-Source Architecture:** Local database + GitHub API
✅ **Auto-Caching:** GitHub selections automatically saved locally
✅ **Usage Analytics:** Track and sort by emoji popularity
✅ **Debounced Search:** 300ms delay for optimal performance
✅ **Offline-Ready:** Works without internet connection
✅ **Visual Indicators:** Badges show emoji source and popularity

---

## Architecture

### System Flow

```
User Types Search Query
       ↓
Debounced Input (300ms)
       ↓
Local Database Search ──→ Display Results (instant)
       ↓
[Optional] User Clicks "Find More on GitHub"
       ↓
GitHub API Request ──→ 1-Hour Cache ──→ Display Results
       ↓
User Selects Emoji
       ↓
Auto-Save to Local DB ──→ Increment Usage Count
```

### Component Hierarchy

```
EmojiPickerEnhanced (Frontend Component)
    ↓
├── /api/business/emoji-lookup (Local Search API)
│   ├── GET: Search local database
│   └── POST: Cache emoji + update usage
│
└── /api/business/emoji-github (GitHub Integration API)
    └── GET: Fetch from GitHub (with cache)
```

---

## Components

### 1. `EmojiPickerEnhanced` Component

**Location:** `src/components/business/emoji-picker-enhanced.tsx`

**Props:**
```typescript
interface EmojiPickerEnhancedProps {
  onSelect: (emoji: string) => void;      // Callback when emoji selected
  selectedEmoji?: string;                  // Currently selected emoji
  searchPlaceholder?: string;              // Search input placeholder
}
```

**State Management:**
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [localResults, setLocalResults] = useState<EmojiResult[]>([]);
const [githubResults, setGithubResults] = useState<EmojiResult[]>([]);
const [loading, setLoading] = useState(false);
const [githubLoading, setGithubLoading] = useState(false);
const [showGithubButton, setShowGithubButton] = useState(false);
const [githubError, setGithubError] = useState<string | null>(null);
```

**Key Methods:**
- `searchLocalEmojis()` - Searches local database (debounced)
- `searchGithubEmojis()` - Fetches from GitHub API
- `handleEmojiSelect()` - Processes selection + auto-caching

---

### 2. Local Search API

**Endpoint:** `GET /api/business/emoji-lookup`

**Query Parameters:**
- `q` (required) - Search query string
- `limit` (optional) - Max results (default: 20)

**Response:**
```json
{
  "results": [
    {
      "emoji": "💰",
      "name": "money bag",
      "description": "money finances cash",
      "usageCount": 15,
      "source": "local"
    }
  ],
  "count": 1
}
```

**Search Algorithm:**
- Full-text search on emoji, name, and description
- Case-insensitive matching
- Sorts by usage count (descending)
- Returns top N results

---

### 3. GitHub Integration API

**Endpoint:** `GET /api/business/emoji-github`

**External API:** `https://api.github.com/emojis`

**Query Parameters:**
- `q` (required) - Search query string
- `limit` (optional) - Max results (default: 20)

**Response:**
```json
{
  "results": [
    {
      "emoji": "🚀",
      "name": "rocket",
      "url": "https://github.githubassets.com/images/icons/emoji/unicode/1f680.png",
      "source": "github"
    }
  ],
  "count": 1,
  "cached": true
}
```

**Caching Strategy:**
- In-memory cache duration: 1 hour
- Cache key: Full GitHub emoji list
- Cache invalidation: Time-based (60 minutes)

---

### 4. Cache Save API

**Endpoint:** `POST /api/business/emoji-lookup`

**Request Body:**
```json
{
  "emoji": "🚀",
  "name": "rocket",
  "description": "space launch startup",
  "source": "github"
}
```

**Behavior:**
- If emoji + description exists: Increment `usageCount`
- If not exists: Create new entry with `usageCount = 1`

**Response:**
```json
{
  "message": "Emoji cached successfully",
  "usageCount": 1
}
```

---

## Database Schema

### `emoji_lookup` Table

```sql
CREATE TABLE "emoji_lookup" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "emoji" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "source" TEXT NOT NULL,           -- 'local' | 'github' | 'manual'
  "usageCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Indexes for performance
CREATE INDEX "emoji_lookup_emoji_idx" ON "emoji_lookup"("emoji");
CREATE INDEX "emoji_lookup_name_idx" ON "emoji_lookup"("name");
CREATE INDEX "emoji_lookup_description_idx" ON "emoji_lookup"("description");
CREATE INDEX "emoji_lookup_source_idx" ON "emoji_lookup"("source");
CREATE INDEX "emoji_lookup_usageCount_idx" ON "emoji_lookup"("usageCount");
```

### Schema Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | TEXT | UUID primary key |
| `emoji` | TEXT | The actual emoji character |
| `name` | TEXT | Emoji name (e.g., "money bag") |
| `description` | TEXT | Searchable keywords |
| `source` | TEXT | Origin: local, github, or manual |
| `usageCount` | INTEGER | Times this emoji was selected |
| `createdAt` | TIMESTAMP | Initial cache time |
| `updatedAt` | TIMESTAMP | Last usage time |

---

## Usage Examples

### Example 1: Basic Integration

```typescript
import { EmojiPickerEnhanced } from '@/components/business/emoji-picker-enhanced';

function CategoryForm() {
  const [selectedEmoji, setSelectedEmoji] = useState('');

  return (
    <div>
      <label>Category Emoji</label>
      <EmojiPickerEnhanced
        onSelect={setSelectedEmoji}
        selectedEmoji={selectedEmoji}
        searchPlaceholder="Search for an emoji..."
      />
    </div>
  );
}
```

### Example 2: Custom Search Implementation

```typescript
// Direct API call to local search
const searchLocalEmojis = async (query: string) => {
  const params = new URLSearchParams();
  params.append('q', query);
  params.append('limit', '50');

  const response = await fetch(`/api/business/emoji-lookup?${params}`);
  const data = await response.json();

  return data.results;
};
```

### Example 3: Manual Caching

```typescript
// Cache a custom emoji selection
const cacheEmoji = async (emoji: string, description: string) => {
  await fetch('/api/business/emoji-lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emoji,
      name: emoji,
      description,
      source: 'manual',
    }),
  });
};
```

---

## Performance Optimization

### 1. Debounced Search

**Implementation:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    searchLocalEmojis(searchQuery);
  }, 300);  // 300ms debounce

  return () => clearTimeout(timer);
}, [searchQuery]);
```

**Benefits:**
- Reduces API calls during typing
- Prevents rapid re-renders
- Improves user experience

### 2. GitHub API Caching

**In-Memory Cache:**
```typescript
let githubEmojiCache: {
  data: Record<string, string> | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
```

**Cache Hit Rate:**
- First request: Fetch from GitHub (~1-2 seconds)
- Subsequent requests: Instant (in-memory)
- Cache expiry: 1 hour

### 3. Database Indexing

**Performance Indexes:**
```sql
-- Search performance
CREATE INDEX "emoji_lookup_name_idx" ON "emoji_lookup"("name");
CREATE INDEX "emoji_lookup_description_idx" ON "emoji_lookup"("description");

-- Sort performance
CREATE INDEX "emoji_lookup_usageCount_idx" ON "emoji_lookup"("usageCount");
```

**Query Optimization:**
```typescript
// Prisma query with selective fields
const results = await prisma.emojiLookup.findMany({
  where: {
    OR: [
      { emoji: { contains: query, mode: 'insensitive' } },
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ],
  },
  select: {
    emoji: true,
    name: true,
    description: true,
    usageCount: true,
    source: true,
  },
  orderBy: [
    { usageCount: 'desc' },
    { createdAt: 'desc' },
  ],
  take: limit,
});
```

---

## Error Handling

### 1. GitHub API Failures

**Error Types:**
- Network timeout
- API rate limit (60 req/hour for unauthenticated)
- GitHub service down

**Handling:**
```typescript
try {
  const response = await fetch(GITHUB_EMOJI_API, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Multi-Business-App',
    },
    signal: AbortSignal.timeout(5000), // 5 second timeout
  });

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`);
  }

  const data = await response.json();
  // Process data...
} catch (error) {
  console.error('Error fetching from GitHub API:', error);
  return NextResponse.json({
    error: 'Unable to reach GitHub emoji API',
    offline: true,
  }, { status: 503 });
}
```

**Frontend Handling:**
```typescript
if (errorData.offline) {
  setGithubError('Unable to reach GitHub. Use local results or check your connection.');
}
```

### 2. Local Database Failures

**Error Handling:**
```typescript
try {
  const results = await prisma.emojiLookup.findMany({...});
  return NextResponse.json({ results, count: results.length });
} catch (error) {
  console.error('Database error:', error);
  return NextResponse.json({
    error: 'Failed to search local emojis',
    results: [],  // Return empty array to allow graceful degradation
    count: 0,
  }, { status: 500 });
}
```

### 3. User Feedback

**Visual Error States:**
- **Loading:** Spinner animation
- **GitHub Offline:** Yellow warning banner
- **Search Error:** Red error message
- **No Results:** Gray info message

---

## Testing

### Unit Tests (Example)

```typescript
describe('Emoji Lookup API', () => {
  it('should search local database', async () => {
    const response = await fetch('/api/business/emoji-lookup?q=money&limit=10');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toBeInstanceOf(Array);
    expect(data.count).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty queries', async () => {
    const response = await fetch('/api/business/emoji-lookup?q=');
    const data = await response.json();

    expect(data.results).toEqual([]);
  });

  it('should increment usage count on cache', async () => {
    const emoji = '🎉';
    const description = 'celebration party';

    // First save
    await fetch('/api/business/emoji-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, description, name: emoji, source: 'test' }),
    });

    // Second save (should increment)
    const response = await fetch('/api/business/emoji-lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji, description, name: emoji, source: 'test' }),
    });

    const data = await response.json();
    expect(data.usageCount).toBeGreaterThan(1);
  });
});
```

### Integration Tests

```typescript
describe('EmojiPickerEnhanced Component', () => {
  it('should display local results on search', async () => {
    render(<EmojiPickerEnhanced onSelect={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search emojis...');
    userEvent.type(searchInput, 'money');

    await waitFor(() => {
      expect(screen.getByText(/emojis? found/)).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('should show GitHub button when few results', async () => {
    render(<EmojiPickerEnhanced onSelect={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText('Search emojis...');
    userEvent.type(searchInput, 'xyzabc'); // Unlikely query

    await waitFor(() => {
      expect(screen.getByText(/Find more on GitHub/)).toBeInTheDocument();
    });
  });
});
```

---

## Troubleshooting

### Issue 1: Slow Search Performance

**Symptoms:**
- Search takes > 1 second
- UI feels sluggish

**Diagnosis:**
```sql
-- Check database size
SELECT COUNT(*) FROM emoji_lookup;

-- Check for missing indexes
SELECT * FROM pg_indexes WHERE tablename = 'emoji_lookup';

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM emoji_lookup
WHERE name ILIKE '%money%' OR description ILIKE '%money%'
ORDER BY "usageCount" DESC
LIMIT 20;
```

**Solutions:**
- Ensure all indexes are created
- Run `VACUUM ANALYZE emoji_lookup;`
- Increase search debounce time to 500ms
- Reduce result limit

### Issue 2: GitHub API Not Working

**Symptoms:**
- "Find more on GitHub" button doesn't work
- Error: "Unable to reach GitHub"

**Diagnosis:**
1. Check network connectivity: `curl https://api.github.com/emojis`
2. Check rate limit: GitHub allows 60 requests/hour unauthenticated
3. Review browser console for CORS errors
4. Check server logs for timeout errors

**Solutions:**
- Increase timeout: `signal: AbortSignal.timeout(10000)` (10 seconds)
- Implement authentication for higher rate limit
- Add retry logic with exponential backoff
- Extend cache duration to reduce API calls

### Issue 3: Usage Count Not Incrementing

**Symptoms:**
- Emojis always show usageCount = 1
- Popular emojis don't show ⭐ badge

**Diagnosis:**
```sql
-- Check recent emoji saves
SELECT emoji, name, "usageCount", "updatedAt"
FROM emoji_lookup
ORDER BY "updatedAt" DESC
LIMIT 10;

-- Check for duplicates
SELECT emoji, description, COUNT(*) as count
FROM emoji_lookup
GROUP BY emoji, description
HAVING COUNT(*) > 1;
```

**Solutions:**
- Ensure POST request includes correct emoji + description
- Check for case-sensitivity issues in matching logic
- Verify Prisma `increment` operation is working
- Review `handleEmojiSelect` function logic

### Issue 4: Emojis Not Displaying

**Symptoms:**
- Empty squares instead of emojis
- Broken emoji rendering

**Diagnosis:**
- Check font support: Not all fonts include emoji glyphs
- Browser compatibility: Older browsers may not support newer emojis
- Encoding issues: Ensure UTF-8 encoding throughout

**Solutions:**
```css
/* Add emoji font fallback */
.emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
}
```

---

## API Reference

### Complete API Specification

#### GET /api/business/emoji-lookup

**Description:** Search local emoji database

**Authentication:** Required (session-based)

**Parameters:**
- `q` (string, required): Search query
- `limit` (number, optional): Max results (default: 20, max: 100)

**Response:**
```typescript
{
  results: Array<{
    emoji: string;
    name: string;
    description: string | null;
    usageCount: number;
    source: 'local' | 'github' | 'manual';
  }>;
  count: number;
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 500: Server error

---

#### POST /api/business/emoji-lookup

**Description:** Cache emoji selection and increment usage

**Authentication:** Required (session-based)

**Request Body:**
```typescript
{
  emoji: string;         // Required: The emoji character
  name: string;          // Required: Emoji name
  description?: string;  // Optional: Search keywords
  source: 'local' | 'github' | 'manual';
}
```

**Response:**
```typescript
{
  message: string;
  usageCount: number;
}
```

**Status Codes:**
- 200: Success (created or updated)
- 400: Invalid request body
- 401: Unauthorized
- 500: Server error

---

#### GET /api/business/emoji-github

**Description:** Fetch emojis from GitHub API

**Authentication:** Required (session-based)

**Parameters:**
- `q` (string, required): Search query
- `limit` (number, optional): Max results (default: 20, max: 50)

**Response:**
```typescript
{
  results: Array<{
    emoji: string;
    name: string;
    url: string;
    source: 'github';
  }>;
  count: number;
  cached: boolean;  // Was response from cache?
}
```

**Error Response (Offline):**
```typescript
{
  error: string;
  offline: boolean;  // Always true for network errors
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 503: GitHub API unavailable

---

## Maintenance

### Regular Tasks

**Weekly:**
- Monitor cache hit rates
- Review slow query logs
- Check GitHub API rate limit usage

**Monthly:**
- Analyze most popular emojis
- Clean up unused emojis (usageCount = 0, > 90 days old)
- Review error logs

**Quarterly:**
- Update seed data with new popular emojis
- Performance optimization review
- User feedback analysis

### Monitoring Queries

```sql
-- Most popular emojis
SELECT emoji, name, "usageCount"
FROM emoji_lookup
ORDER BY "usageCount" DESC
LIMIT 20;

-- Recently added emojis
SELECT emoji, name, source, "createdAt"
FROM emoji_lookup
ORDER BY "createdAt" DESC
LIMIT 20;

-- Source distribution
SELECT source, COUNT(*) as count
FROM emoji_lookup
GROUP BY source;
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-26 | Initial release with local + GitHub integration |

---

**End of Emoji System Documentation**
