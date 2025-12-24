'use client'

import { useCallback } from 'react'

export interface WiFiTokenQuantityMap {
  [tokenConfigId: string]: number
}

/**
 * WiFi Token ESP32 Sync Hook
 * Syncs token availability between database and ESP32 device
 * Extracted from grocery and restaurant POS pages
 */
export function useWiFiTokenSync() {
  /**
   * Sync ESP32 token quantities for given token config IDs
   * Returns a map of tokenConfigId -> available quantity on ESP32
   */
  const syncESP32TokenQuantities = useCallback(
    async (
      businessId: string,
      tokenConfigIds: string[]
    ): Promise<WiFiTokenQuantityMap> => {
      try {
        console.log('🔄 Starting batched ESP32 sync in background...')

        const BATCH_SIZE = 20
        let offset = 0
        let hasMore = true
        const esp32TokenSet = new Set<string>()

        // Fetch ESP32 tokens in batches
        while (hasMore && offset < 1000) {
          try {
            const batchUrl = `/api/wifi-portal/esp32-tokens?businessId=${businessId}&status=unused&limit=${BATCH_SIZE}&offset=${offset}`
            const batchResponse = await fetch(batchUrl)

            if (!batchResponse.ok) {
              console.warn(
                `⚠️ ESP32 batch ${Math.floor(offset / BATCH_SIZE) + 1} failed`
              )
              break
            }

            const batchData = await batchResponse.json()
            const batchTokens = batchData.tokens || []

            batchTokens.forEach((t: any) => {
              if (t.token) esp32TokenSet.add(t.token)
            })

            hasMore = batchData.hasMore === true
            offset += BATCH_SIZE
          } catch (batchError) {
            console.error(
              `❌ ESP32 batch ${Math.floor(offset / BATCH_SIZE) + 1} error:`,
              batchError
            )
            break
          }
        }

        console.log(`✅ ESP32 sync complete. Total: ${esp32TokenSet.size}`)

        // Get database tokens
        const dbResponse = await fetch(
          `/api/wifi-portal/tokens?businessId=${businessId}&status=UNUSED&excludeSold=true&limit=1000`
        )

        if (!dbResponse.ok) {
          console.warn('⚠️ Failed to fetch database tokens')
          return {}
        }

        const dbData = await dbResponse.json()
        const dbTokens = dbData.tokens || []

        // Cross-reference ESP32 tokens with database tokens
        const esp32QuantityMap: WiFiTokenQuantityMap = {}

        dbTokens.forEach((dbToken: any) => {
          if (esp32TokenSet.has(dbToken.token)) {
            const configId = dbToken.tokenConfigId
            if (configId && tokenConfigIds.includes(configId)) {
              esp32QuantityMap[configId] = (esp32QuantityMap[configId] || 0) + 1
            }
          }
        })

        console.log('✅ ESP32 quantity map:', esp32QuantityMap)

        return esp32QuantityMap
      } catch (error) {
        console.error('❌ Background ESP32 sync error:', error)
        return {}
      }
    },
    []
  )

  /**
   * Check ESP32 health before syncing
   */
  const checkESP32Health = useCallback(async (businessId: string): Promise<boolean> => {
    try {
      const response = await fetch(
        `/api/wifi-portal/admin/health?businessId=${businessId}`
      )
      return response.ok
    } catch (error) {
      console.warn('⚠️ ESP32 health check failed:', error)
      return false
    }
  }, [])

  return {
    syncESP32TokenQuantities,
    checkESP32Health
  }
}
