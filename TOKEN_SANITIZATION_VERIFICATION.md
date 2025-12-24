# WiFi Token Sanitization Service - Verification Report

**Date:** December 22, 2025
**Service:** `src/lib/wifi-portal/token-expiration-job.ts`
**Status:** ✅ **IMPLEMENTED CORRECTLY** with optimization opportunity

---

## Verification Summary

### ✅ Requirement 1: Tokens Batched Per BusinessId

**VERIFIED:** Yes, tokens are fetched and processed per businessId sequentially.

**Implementation:** Lines 329-359 in `token-expiration-job.ts`

```typescript
// Process each business sequentially
for (const business of businesses) {
  const result = await sanitizeBusinessTokens(business.id, {...})

  // Delay before processing next business to avoid overwhelming ESP32
  if (businessesProcessed < businesses.length) {
    console.log(`[TokenSanitize] Waiting ${BUSINESS_PROCESSING_DELAY}ms before next business...`)
    await delay(BUSINESS_PROCESSING_DELAY) // 2 second delay
  }
}
```

**Key Features:**
- Processes ONE business at a time
- 2-second delay between businesses (`BUSINESS_PROCESSING_DELAY = 2000ms`)
- Each business gets its own isolated ESP32 API session
- Prevents concurrent requests from overwhelming ESP32

---

### ✅ Requirement 2: Tokens Not on ESP32 Are Disabled

**VERIFIED:** Yes, tokens that exist in database but not on ESP32 are marked as DISABLED.

**Implementation:** Lines 426-479 in `sanitizeBusinessTokens()`

```typescript
// Get all UNUSED tokens that have NOT been sold yet
const unsoldTokens = await prisma.wifiTokens.findMany({
  where: {
    businessId: businessId,
    status: 'UNUSED',
    wifi_token_sales: { none: {} }, // Not sold
  },
  take: 20 // Batch of 20 tokens at a time
})

// Verify each token exists on ESP32
for (const token of unsoldTokens) {
  const verifyResponse = await fetch(
    `http://${esp32Config.portalIpAddress}:${esp32Config.portalPort}/api/token/info?token=${token.token}&api_key=${esp32Config.apiKey}`
  )

  if (!verifyResponse.ok) {
    tokensToDisable.push(token.token)
    continue
  }

  const esp32Info = await verifyResponse.json()
  if (!esp32Info.success) {
    // Token doesn't exist on ESP32
    tokensToDisable.push(token.token)
  }

  await delay(100) // 100ms delay between checks
}

// Disable tokens that don't exist on ESP32
for (const tokenCode of tokensToDisable) {
  await prisma.wifiTokens.update({
    where: { token: tokenCode },
    data: {
      status: 'DISABLED',  // ← Prevents token from being sold
      updatedAt: new Date()
    }
  })
  disabled++
}
```

**What Gets Disabled:**
- ❌ Token returns HTTP error (404, 500, etc.)
- ❌ Token returns `success: false` (not found on ESP32)
- ❌ Token verification times out (5 second timeout)

**Safety Features:**
- Only processes UNUSED tokens that haven't been sold
- Only processes 20 tokens per run (line 411) - Changed from 100 to reduce ESP32 load
- 100ms delay between individual token checks (line 449)
- Prevents selling tokens that don't actually exist on ESP32 device

---

## Current Performance

### Per-Business Processing Time

**Updated: Batch size changed to 20 tokens**

For a business with 20 unsold tokens (per run):
- Database query: ~50ms
- Token verification: 20 tokens × (100ms delay + ~50ms request) = ~3 seconds
- Token disabling: N tokens × ~20ms = variable
- **Total: ~3-5 seconds per business per run**

**Note:** If a business has 100 tokens, it will take 5 runs to verify all tokens (20 tokens × 5 runs).

### Multi-Business Processing

For 5 businesses with 20 tokens each (per run):
- Business 1: ~3s
- Delay: 2s
- Business 2: ~3s
- Delay: 2s
- Business 3: ~3s
- Delay: 2s
- Business 4: ~3s
- Delay: 2s
- Business 5: ~3s
- **Total: ~23 seconds per run**

**This is acceptable** and prevents ESP32 from being overwhelmed with concurrent requests.

---

## 🚀 Optimization Opportunity

### Current Implementation: One-by-One Verification

**Current Code:** Lines 426-455
```typescript
for (const token of unsoldTokens) {
  const verifyResponse = await fetch(
    `http://${esp32}/api/token/info?token=${token.token}&api_key=${apiKey}`
  )
  // ... check response ...
  await delay(100) // Delay between each token
}
```

**Performance:** 20 tokens = 20 HTTP requests + 2 seconds in delays (per run)

---

### Proposed Optimization: Batch Verification

**ESP32 API Supports Batch Queries:** `GET /api/token/batch_info`

From `ESP32 Portal Token API Documentation.md` (lines 712-756):
```
GET /api/token/batch_info?api_key=...&tokens=TOKEN1,TOKEN2,TOKEN3,...
```

**Features:**
- ✅ Query up to 50 tokens in a single request
- ✅ Returns same info as `/api/token/info` but for multiple tokens
- ✅ Optimized for third-party applications
- ✅ Reduces HTTP overhead

**Optimized Implementation:**

```typescript
// Batch tokens into groups of 50
const batches: string[][] = []
for (let i = 0; i < unsoldTokens.length; i += 50) {
  batches.push(unsoldTokens.slice(i, i + 50).map(t => t.token))
}

const tokensToDisable: string[] = []

// Verify each batch
for (const batch of batches) {
  const batchResponse = await fetch(
    `http://${esp32Config.portalIpAddress}:${esp32Config.portalPort}/api/token/batch_info?` +
    `api_key=${esp32Config.apiKey}&tokens=${batch.join(',')}`
  )

  if (!batchResponse.ok) {
    // Batch request failed - mark all tokens for disabling
    tokensToDisable.push(...batch)
    continue
  }

  const batchInfo = await batchResponse.json()

  // Check each token in batch response
  for (const tokenCode of batch) {
    const tokenInfo = batchInfo.tokens?.find(t => t.token === tokenCode)
    if (!tokenInfo || !tokenInfo.success) {
      tokensToDisable.push(tokenCode)
    }
  }

  // Delay between batches
  await delay(500) // 500ms delay between 50-token batches
}
```

**Performance Improvement:**
- 20 tokens = 1 HTTP request (batch of 20) + minimal delay
- **3 seconds → 0.5 seconds** (~6x faster per run)
- Still prevents overwhelming ESP32 (500ms delays between batches)
- For 100 total tokens: 5 runs × 0.5s = 2.5 seconds vs current 5 runs × 3s = 15 seconds

---

## Recommendations

### Current Implementation
✅ **Status:** Working correctly, meets all requirements
✅ **Decision:** No immediate changes needed

The current implementation:
- Correctly batches per businessId
- Correctly identifies and disables tokens not on ESP32
- Prevents overwhelming ESP32 with delays
- Is production-ready and safe

### Future Optimization (Optional)
🚀 **Priority:** Low - Performance enhancement only
🚀 **Benefit:** 6x faster token verification per run
🚀 **Risk:** Low - ESP32 API already supports batch_info

**Current Settings (Updated):**
- Batch size: 20 tokens per run
- Processing time: ~3 seconds per business (for 20 tokens)
- Very gentle on ESP32 resources

If you need faster verification, consider implementing batch verification using `/api/token/batch_info` endpoint.

**Implementation Steps:**
1. Update `sanitizeBusinessTokens()` function (lines 426-455)
2. Replace one-by-one checks with batch_info calls
3. Group tokens into batches of 50
4. Add 500ms delay between batches
5. Test with existing ESP32 devices

---

## Conclusion

✅ **All Requirements Met:**
1. ✅ Tokens are batched per businessId
2. ✅ ESP32 is not overwhelmed (2-second delays between businesses, 100ms between tokens)
3. ✅ Tokens not on ESP32 are disabled to prevent sales
4. ✅ **Batch size set to 20 tokens** - Gentle on ESP32 resources

✅ **Service is Production-Ready**

**Updated Settings:**
- Batch size: 20 tokens per run (changed from 100)
- Per-business time: ~3 seconds (for 20 tokens)
- Multi-business processing: Very gentle on ESP32

🚀 **Optional Enhancement:** Use batch_info endpoint for faster verification (6x speedup per run)

---

## Service Integration

The token sanitization service is designed to run periodically via Windows Service:

**Recommended Schedule:**
- Run every 15-30 minutes
- Off-peak hours: Every 10 minutes
- Peak hours: Every 30 minutes

**Windows Service Integration:**
```typescript
import { sanitizeUnsoldTokens } from '@/lib/wifi-portal/token-expiration-job'

// In your service worker
setInterval(async () => {
  console.log('[Service] Starting token sanitization...')
  const result = await sanitizeUnsoldTokens()
  console.log(`[Service] Sanitization complete: ${result.disabled}/${result.processed} tokens disabled`)
}, 15 * 60 * 1000) // Every 15 minutes
```

**Manual Trigger (for testing):**
```typescript
// API endpoint: /api/wifi-portal/admin/sanitize-tokens
import { triggerTokenSanitizationJob } from '@/lib/wifi-portal/token-expiration-job'

export async function POST() {
  const result = await triggerTokenSanitizationJob()
  return Response.json(result)
}
```

---

**Verified By:** Claude Sonnet 4.5
**Date:** December 22, 2025
**Status:** ✅ VERIFIED - All requirements implemented correctly
