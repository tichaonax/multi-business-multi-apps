/**
 * WiFi Token Auto-Expiration Job
 * Automatically expires tokens ≤24h duration, 30 minutes after their expiration
 * Calls ESP32 API to disable expired tokens
 *
 * DESIGNED FOR SERVICE INTEGRATION:
 * - Processes one business at a time to avoid overwhelming ESP32
 * - Adds delays between API calls to prevent 503 errors
 * - Can be run as part of sync service or standalone
 */

import { prisma } from '@/lib/prisma'

// Delay between processing different businesses (milliseconds)
const BUSINESS_PROCESSING_DELAY = 2000 // 2 seconds

// Delay between ESP32 API calls (milliseconds)
const ESP32_API_DELAY = 1000 // 1 second

/**
 * Main entry point - processes all businesses sequentially
 * This prevents overwhelming ESP32 devices with concurrent requests
 *
 * This job should be run periodically (e.g., every 15 minutes)
 * Can be integrated into your existing service worker
 */
export async function checkAndExpireTokens(): Promise<{
  processed: number
  expired: number
  disabled: number
  errors: string[]
  businessesProcessed: number
}> {
  const errors: string[] = []
  let totalProcessed = 0
  let totalExpired = 0
  let totalDisabled = 0
  let businessesProcessed = 0

  try {
    console.log('[TokenExpiration] Starting token expiration check...')

    // Get all businesses with WiFi integration
    const businesses = await prisma.businesses.findMany({
      where: {
        wifiIntegrationEnabled: true,
      },
      select: {
        id: true,
        name: true,
        type: true,
        esp32Url: true,
        esp32ApiKey: true,
      },
    })

    console.log(`[TokenExpiration] Found ${businesses.length} businesses with WiFi integration`)

    // Process each business sequentially to avoid overwhelming ESP32
    for (const business of businesses) {
      try {
        console.log(`[TokenExpiration] Processing business: ${business.name} (${business.id})`)

        const result = await processBusinessTokenExpiration(business)

        totalProcessed += result.processed
        totalExpired += result.expired
        totalDisabled += result.disabled
        businessesProcessed++

        if (result.errors.length > 0) {
          errors.push(...result.errors.map(e => `[${business.name}] ${e}`))
        }

        // Delay before processing next business to avoid overwhelming ESP32
        if (businessesProcessed < businesses.length) {
          console.log(`[TokenExpiration] Waiting ${BUSINESS_PROCESSING_DELAY}ms before next business...`)
          await delay(BUSINESS_PROCESSING_DELAY)
        }
      } catch (error: any) {
        errors.push(`[${business.name}] Business processing error: ${error.message}`)
        console.error(`[TokenExpiration] Failed to process business ${business.name}:`, error)
      }
    }

    console.log(`[TokenExpiration] Complete: ${totalDisabled}/${totalExpired} tokens disabled across ${businessesProcessed} businesses`)
    return {
      processed: totalProcessed,
      expired: totalExpired,
      disabled: totalDisabled,
      errors,
      businessesProcessed,
    }
  } catch (error: any) {
    errors.push(`Job error: ${error.message}`)
    console.error('[TokenExpiration] Job failed:', error)
    return {
      processed: totalProcessed,
      expired: totalExpired,
      disabled: totalDisabled,
      errors,
      businessesProcessed,
    }
  }
}

/**
 * Process token expiration for a single business
 * This ensures we only hit one ESP32 device at a time
 */
async function processBusinessTokenExpiration(business: {
  id: string
  name: string
  type: string
  esp32Url: string | null
  esp32ApiKey: string | null
}): Promise<{
  processed: number
  expired: number
  disabled: number
  errors: string[]
}> {
  const errors: string[] = []
  let processed = 0
  let expired = 0
  let disabled = 0

  const now = new Date()

  // Get ESP32 configuration
  const esp32Url = business.esp32Url || process.env.ESP32_PORTAL_URL
  const esp32ApiKey = business.esp32ApiKey || process.env.ESP32_API_KEY

  if (!esp32Url || !esp32ApiKey) {
    errors.push('No ESP32 configuration found')
    return { processed, expired, disabled, errors }
  }

  // Find tokens that need expiration for this business
  const tokensToExpire = await prisma.wifiTokenSales.findMany({
    where: {
      businessId: business.id,
      durationMinutes: { lte: 1440 }, // ≤24 hours
      status: { in: ['active', 'used'] },
    },
  })

  processed = tokensToExpire.length

  if (tokensToExpire.length === 0) {
    return { processed, expired, disabled, errors }
  }

  // Filter tokens that are actually expired (with 30 min grace)
  const expiredTokens = tokensToExpire.filter(token => {
    const createdAt = new Date(token.createdAt)
    const expiresAt = new Date(createdAt.getTime() + (token.durationMinutes + 30) * 60 * 1000)
    return expiresAt < now
  })

  expired = expiredTokens.length

  if (expiredTokens.length === 0) {
    return { processed, expired, disabled, errors }
  }

  console.log(`[TokenExpiration] ${business.name}: ${expired} tokens expired`)

  // Disable tokens on ESP32
  try {
    await disableTokensOnESP32(
      esp32Url,
      esp32ApiKey,
      expiredTokens.map(t => t.tokenCode)
    )
    disabled = expiredTokens.length

    // Update database to mark as expired
    await prisma.wifiTokenSales.updateMany({
      where: {
        id: { in: expiredTokens.map(t => t.id) },
      },
      data: {
        status: 'expired',
        updatedAt: new Date(),
      },
    })

    console.log(`[TokenExpiration] ${business.name}: Disabled ${disabled} tokens`)
  } catch (error: any) {
    errors.push(`ESP32 disable failed: ${error.message}`)
    console.error(`[TokenExpiration] ${business.name}: Failed to disable tokens:`, error)
  }

  return { processed, expired, disabled, errors }
}

/**
 * Disable tokens on ESP32 device using bulk API
 * Reference: ai-contexts/wip/API - Condensed Doc.md
 *
 * Includes delays between batches to avoid overwhelming ESP32
 *
 * @param esp32Url - ESP32 base URL (e.g., http://192.168.0.100)
 * @param apiKey - ESP32 API key
 * @param tokens - Array of token codes to disable (max 50 per batch)
 */
async function disableTokensOnESP32(
  esp32Url: string,
  apiKey: string,
  tokens: string[]
): Promise<void> {
  if (tokens.length === 0) return

  // ESP32 API supports up to 50 tokens per request
  const batches: string[][] = []
  for (let i = 0; i < tokens.length; i += 50) {
    batches.push(tokens.slice(i, i + 50))
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]

    const response = await fetch(`${esp32Url}/api/token/disable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        api_key: apiKey,
        tokens: batch.join(','),
      }),
    })

    if (response.status === 503) {
      // Server busy - wait and retry
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10)
      console.log(`[TokenExpiration] ESP32 busy, retrying in ${retryAfter}s...`)
      await delay(retryAfter * 1000)

      // Retry once
      const retryResponse = await fetch(`${esp32Url}/api/token/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_key: apiKey,
          tokens: batch.join(','),
        }),
      })

      if (!retryResponse.ok) {
        throw new Error(`ESP32 disable failed: ${retryResponse.status}`)
      }

      const retryData = await retryResponse.json()
      console.log(`[TokenExpiration] ESP32 response (retry):`, {
        disabled: retryData.disabled_count,
        available_slots: retryData.available_slots,
      })
    } else if (!response.ok) {
      throw new Error(`ESP32 disable failed: ${response.status}`)
    } else {
      const data = await response.json()
      console.log(`[TokenExpiration] ESP32 response:`, {
        disabled: data.disabled_count,
        available_slots: data.available_slots,
      })
    }

    // Delay between batches to avoid overwhelming ESP32
    if (i < batches.length - 1) {
      console.log(`[TokenExpiration] Waiting ${ESP32_API_DELAY}ms before next batch...`)
      await delay(ESP32_API_DELAY)
    }
  }
}

/**
 * Utility: Sleep/delay for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Sanitize unsold tokens - verify they exist on ESP32
 * This prevents selling tokens that don't exist on ESP32 device
 * Should be run periodically to clean up database
 *
 * CRITICAL: Only sellable (UNUSED, not sold) tokens should be verified
 * If token doesn't exist on ESP32, mark as DISABLED to prevent sale
 */
export async function sanitizeUnsoldTokens(): Promise<{
  processed: number
  disabled: number
  errors: string[]
  businessesProcessed: number
}> {
  const errors: string[] = []
  let totalProcessed = 0
  let totalDisabled = 0
  let businessesProcessed = 0

  try {
    console.log('[TokenSanitize] Starting unsold token sanitization...')

    // Get all businesses with portal integration
    const businesses = await prisma.businesses.findMany({
      where: {
        portal_integrations: {
          some: {
            isActive: true
          }
        }
      },
      include: {
        portal_integrations: {
          where: { isActive: true },
          take: 1
        }
      }
    })

    console.log(`[TokenSanitize] Found ${businesses.length} businesses with active portal integration`)

    // Process each business sequentially
    for (const business of businesses) {
      try {
        const integration = business.portal_integrations[0]
        if (!integration) continue

        console.log(`[TokenSanitize] Processing business: ${business.name} (${business.id})`)

        const result = await sanitizeBusinessTokens(business.id, {
          portalIpAddress: integration.portalIpAddress,
          portalPort: integration.portalPort,
          apiKey: integration.apiKey
        })

        totalProcessed += result.processed
        totalDisabled += result.disabled
        businessesProcessed++

        if (result.errors.length > 0) {
          errors.push(...result.errors.map(e => `[${business.name}] ${e}`))
        }

        // Delay before processing next business
        if (businessesProcessed < businesses.length) {
          console.log(`[TokenSanitize] Waiting ${BUSINESS_PROCESSING_DELAY}ms before next business...`)
          await delay(BUSINESS_PROCESSING_DELAY)
        }
      } catch (error: any) {
        errors.push(`[${business.name}] Business processing error: ${error.message}`)
        console.error(`[TokenSanitize] Failed to process business ${business.name}:`, error)
      }
    }

    console.log(`[TokenSanitize] Complete: ${totalDisabled}/${totalProcessed} tokens disabled across ${businessesProcessed} businesses`)
    return {
      processed: totalProcessed,
      disabled: totalDisabled,
      errors,
      businessesProcessed,
    }
  } catch (error: any) {
    errors.push(`Job error: ${error.message}`)
    console.error('[TokenSanitize] Job failed:', error)
    return {
      processed: totalProcessed,
      disabled: totalDisabled,
      errors,
      businessesProcessed,
    }
  }
}

/**
 * Sanitize tokens for a single business
 * Verifies unsold tokens exist on ESP32, marks as DISABLED if not
 */
async function sanitizeBusinessTokens(
  businessId: string,
  esp32Config: {
    portalIpAddress: string
    portalPort: number
    apiKey: string
  }
): Promise<{
  processed: number
  disabled: number
  errors: string[]
}> {
  const errors: string[] = []
  let processed = 0
  let disabled = 0

  // Get all UNUSED tokens that have NOT been sold yet
  const unsoldTokens = await prisma.wifiTokens.findMany({
    where: {
      businessId: businessId,
      status: 'UNUSED',
      wifi_token_sales: { none: {} }, // Not sold
    },
    select: {
      id: true,
      token: true,
    },
    take: 20 // Process in batches to avoid overloading ESP32
  })

  processed = unsoldTokens.length

  if (unsoldTokens.length === 0) {
    console.log(`[TokenSanitize] No unsold tokens to verify for business ${businessId}`)
    return { processed, disabled, errors }
  }

  console.log(`[TokenSanitize] Verifying ${unsoldTokens.length} unsold tokens on ESP32...`)

  // Verify each token exists on ESP32
  const tokensToDisable: string[] = []

  for (const token of unsoldTokens) {
    try {
      const verifyResponse = await fetch(
        `http://${esp32Config.portalIpAddress}:${esp32Config.portalPort}/api/token/info?token=${token.token}&api_key=${esp32Config.apiKey}`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        }
      )

      if (!verifyResponse.ok) {
        console.warn(`[TokenSanitize] Token ${token.token}: ESP32 returned ${verifyResponse.status}`)
        tokensToDisable.push(token.token)
        continue
      }

      const esp32Info = await verifyResponse.json()
      if (!esp32Info.success) {
        console.warn(`[TokenSanitize] Token ${token.token}: Not found on ESP32`)
        tokensToDisable.push(token.token)
      }

      // Small delay between checks to avoid overwhelming ESP32
      await delay(100)

    } catch (error: any) {
      console.error(`[TokenSanitize] Token ${token.token}: Verification error - ${error.message}`)
      tokensToDisable.push(token.token)
    }
  }

  // Disable tokens that don't exist on ESP32
  if (tokensToDisable.length > 0) {
    console.log(`[TokenSanitize] Disabling ${tokensToDisable.length} tokens not found on ESP32`)

    for (const tokenCode of tokensToDisable) {
      try {
        await prisma.wifiTokens.update({
          where: { token: tokenCode },
          data: {
            status: 'DISABLED',
            updatedAt: new Date()
          }
        })
        disabled++
      } catch (dbError: any) {
        errors.push(`Failed to disable token ${tokenCode}: ${dbError.message}`)
      }
    }
  }

  console.log(`[TokenSanitize] Business ${businessId}: Disabled ${disabled}/${processed} tokens`)
  return { processed, disabled, errors }
}

/**
 * Manual trigger for testing
 * Call this from an API endpoint for testing purposes
 */
export async function triggerTokenExpirationJob() {
  return await checkAndExpireTokens()
}

/**
 * Manual trigger for token sanitization
 */
export async function triggerTokenSanitizationJob() {
  return await sanitizeUnsoldTokens()
}
