/**
 * WiFi Portal Health Check Utility
 * Checks if the ESP32 portal integration is available and healthy
 */

export interface PortalHealthStatus {
  success: boolean
  status: 'healthy' | 'unhealthy' | 'unknown'
  uptime_seconds?: number
  time_synced?: boolean
  last_time_sync?: number
  current_time?: number
  active_tokens?: number
  max_tokens?: number
  free_heap_bytes?: number
  error?: string
}

/**
 * Check if the portal integration is healthy
 * @param portalBaseUrl - Base URL of the ESP32 portal (e.g., "http://192.168.0.100:8080")
 * @param timeout - Request timeout in milliseconds (default: 5000ms)
 * @returns Health status object
 */
export async function checkPortalHealth(
  portalBaseUrl: string,
  timeout: number = 5000
): Promise<PortalHealthStatus> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(`${portalBaseUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return {
        success: false,
        status: 'unhealthy',
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()

    return {
      success: data.success || false,
      status: data.status === 'healthy' ? 'healthy' : 'unhealthy',
      uptime_seconds: data.uptime_seconds,
      time_synced: data.time_synced,
      last_time_sync: data.last_time_sync,
      current_time: data.current_time,
      active_tokens: data.active_tokens,
      max_tokens: data.max_tokens,
      free_heap_bytes: data.free_heap_bytes,
    }
  } catch (error: any) {
    // Network error, timeout, or portal unreachable
    return {
      success: false,
      status: 'unhealthy',
      error: error.name === 'AbortError' ? 'Request timeout' : error.message || 'Portal unreachable',
    }
  }
}

/**
 * Check portal integration health via our backend API
 * This uses the portal integration settings stored in our database
 * @param businessId - Business ID to check integration for
 * @returns Health status object
 */
export async function checkBusinessPortalHealth(
  businessId: string
): Promise<PortalHealthStatus> {
  try {
    const response = await fetch(
      `/api/wifi-portal/integration/health?businessId=${businessId}`,
      {
        method: 'GET',
      }
    )

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return {
        success: false,
        status: 'unknown',
        error: data.error || `HTTP ${response.status}`,
      }
    }

    const data = await response.json()

    return {
      success: data.success || false,
      status: data.health?.status === 'healthy' ? 'healthy' : 'unhealthy',
      uptime_seconds: data.health?.uptime_seconds,
      time_synced: data.health?.time_synced,
      last_time_sync: data.health?.last_time_sync,
      current_time: data.health?.current_time,
      active_tokens: data.health?.active_tokens,
      max_tokens: data.health?.max_tokens,
      free_heap_bytes: data.health?.free_heap_bytes,
      error: data.error,
    }
  } catch (error: any) {
    return {
      success: false,
      status: 'unknown',
      error: error.message || 'Failed to check portal health',
    }
  }
}

/**
 * Format uptime in a human-readable format
 * @param seconds - Uptime in seconds
 * @returns Formatted string (e.g., "2d 5h 30m")
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []

  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.length > 0 ? parts.join(' ') : '< 1m'
}

/**
 * Get status color for UI display
 * @param status - Health status
 * @returns Tailwind color class prefix (e.g., "green", "red", "yellow")
 */
export function getHealthStatusColor(status: 'healthy' | 'unhealthy' | 'unknown'): string {
  switch (status) {
    case 'healthy':
      return 'green'
    case 'unhealthy':
      return 'red'
    case 'unknown':
      return 'yellow'
  }
}

/**
 * Get status icon emoji
 * @param status - Health status
 * @returns Emoji string
 */
export function getHealthStatusIcon(status: 'healthy' | 'unhealthy' | 'unknown'): string {
  switch (status) {
    case 'healthy':
      return '✅'
    case 'unhealthy':
      return '❌'
    case 'unknown':
      return '⚠️'
  }
}
