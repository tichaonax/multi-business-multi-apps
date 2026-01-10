/**
 * Hybrid Sync Manager
 *
 * Intelligently chooses between BroadcastChannel (same-device) and WebSocket (separate devices)
 * to provide optimal synchronization performance for customer displays.
 *
 * Detection Strategy:
 * - POS sets localStorage marker when opening display
 * - Display checks marker age to determine if same device
 * - Same device (< 5s): Use BroadcastChannel (instant, zero latency)
 * - Separate device: Use WebSocket (real-time, requires server)
 */

import { BroadcastSync, BroadcastSyncOptions, CartMessage, CartMessageType } from './broadcast-sync'
import { WebSocketSync, WebSocketSyncOptions, ConnectionStatus } from './websocket-sync'

export enum SyncMode {
  BROADCAST = 'broadcast',
  WEBSOCKET = 'websocket',
  HYBRID = 'hybrid'
}

export interface SyncManagerOptions {
  businessId: string
  terminalId: string
  mode?: SyncMode // Auto-detect if not specified
  serverUrl?: string
  onMessage?: (message: CartMessage) => void
  onSyncModeChanged?: (mode: SyncMode) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

interface DisplayMarker {
  timestamp: number
  businessId: string
  terminalId: string
}

/**
 * Hybrid sync manager that intelligently chooses sync method
 */
export class SyncManager {
  private options: SyncManagerOptions
  private broadcastSync: BroadcastSync | null = null
  private websocketSync: WebSocketSync | null = null
  private currentMode: SyncMode
  private isConnected: boolean = false

  private static readonly DISPLAY_MARKER_KEY = 'customer-display-marker'
  private static readonly MARKER_MAX_AGE_MS = 5000 // 5 seconds

  constructor(options: SyncManagerOptions) {
    this.options = options
    this.currentMode = options.mode || SyncMode.HYBRID
  }

  /**
   * Initialize sync connection based on detected mode
   */
  async connect(): Promise<void> {
    try {
      // Determine sync mode if not explicitly set
      if (this.options.mode === undefined || this.options.mode === SyncMode.HYBRID) {
        const isSameDevice = this.checkIfSameDevice()
        this.currentMode = isSameDevice ? SyncMode.BROADCAST : SyncMode.WEBSOCKET
        console.log(`[SyncManager] Auto-detected mode: ${this.currentMode}`)
      } else {
        this.currentMode = this.options.mode
        console.log(`[SyncManager] Using forced mode: ${this.currentMode}`)
      }

      // Notify mode change
      this.options.onSyncModeChanged?.(this.currentMode)

      // Initialize appropriate sync method
      if (this.currentMode === SyncMode.BROADCAST) {
        await this.initBroadcastSync()
      } else {
        await this.initWebSocketSync()
      }

      this.isConnected = true
      this.options.onConnected?.()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.options.onError?.(err)

      // Try fallback if initial connection fails
      await this.tryFallback()
    }
  }

  /**
   * Initialize BroadcastChannel sync
   */
  private async initBroadcastSync(): Promise<void> {
    if (!BroadcastSync.isSupported()) {
      throw new Error('BroadcastChannel not supported in this browser')
    }

    const syncOptions: BroadcastSyncOptions = {
      businessId: this.options.businessId,
      terminalId: this.options.terminalId,
      onMessage: (message) => {
        console.log('🔔 [SyncManager] onMessage callback invoked in SyncManager:', {
          type: message.type,
          hasOptionsOnMessage: !!this.options.onMessage
        })
        this.options.onMessage?.(message)
        console.log('🔔 [SyncManager] Forwarded to this.options.onMessage')
      },
      onError: this.options.onError
    }

    this.broadcastSync = new BroadcastSync(syncOptions)
    this.broadcastSync.connect()
    console.log('[SyncManager] BroadcastChannel sync initialized')
  }

  /**
   * Initialize WebSocket sync
   */
  private async initWebSocketSync(): Promise<void> {
    const syncOptions: WebSocketSyncOptions = {
      businessId: this.options.businessId,
      terminalId: this.options.terminalId,
      serverUrl: this.options.serverUrl,
      onMessage: this.options.onMessage,
      onConnected: () => {
        console.log('[SyncManager] WebSocket connected')
      },
      onDisconnected: () => {
        console.log('[SyncManager] WebSocket disconnected')
        this.options.onDisconnected?.()
      },
      onError: (error) => {
        console.error('[SyncManager] WebSocket error:', error)
        this.options.onError?.(error)
        // Try fallback to BroadcastChannel if WebSocket fails
        this.tryFallback()
      }
    }

    this.websocketSync = new WebSocketSync(syncOptions)
    this.websocketSync.connect()
    console.log('[SyncManager] WebSocket sync initialized')
  }

  /**
   * Try fallback to alternative sync method
   */
  private async tryFallback(): Promise<void> {
    console.log('[SyncManager] Attempting fallback...')

    try {
      if (this.currentMode === SyncMode.WEBSOCKET && BroadcastSync.isSupported()) {
        // Fallback from WebSocket to BroadcastChannel
        console.log('[SyncManager] Falling back to BroadcastChannel')
        this.currentMode = SyncMode.BROADCAST
        this.options.onSyncModeChanged?.(this.currentMode)
        await this.initBroadcastSync()
        this.isConnected = true
      } else if (this.currentMode === SyncMode.BROADCAST) {
        // Fallback from BroadcastChannel to WebSocket
        console.log('[SyncManager] Falling back to WebSocket')
        this.currentMode = SyncMode.WEBSOCKET
        this.options.onSyncModeChanged?.(this.currentMode)
        await this.initWebSocketSync()
        this.isConnected = true
      }
    } catch (fallbackError) {
      const err = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
      console.error('[SyncManager] Fallback failed:', err)
      this.options.onError?.(err)
    }
  }

  /**
   * Send a cart update message
   */
  send(type: CartMessageType, payload: CartMessage['payload']): void {
    if (!this.isConnected) {
      console.warn('[SyncManager] Cannot send message, not connected')
      return
    }

    try {
      if (this.currentMode === SyncMode.BROADCAST && this.broadcastSync) {
        this.broadcastSync.send(type, payload)
      } else if (this.currentMode === SyncMode.WEBSOCKET && this.websocketSync) {
        this.websocketSync.send(type, payload)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      this.options.onError?.(err)
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    if (this.broadcastSync) {
      this.broadcastSync.disconnect()
      this.broadcastSync = null
    }

    if (this.websocketSync) {
      this.websocketSync.disconnect()
      this.websocketSync = null
    }

    this.isConnected = false
    this.options.onDisconnected?.()
    console.log('[SyncManager] Disconnected')
  }

  /**
   * Get current sync mode
   */
  getCurrentMode(): SyncMode {
    return this.currentMode
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus | 'connected' {
    if (this.currentMode === SyncMode.WEBSOCKET && this.websocketSync) {
      return this.websocketSync.getStatus()
    }
    return this.isConnected ? 'connected' : ConnectionStatus.DISCONNECTED
  }

  /**
   * Check if currently connected
   */
  isConnectedNow(): boolean {
    return this.isConnected
  }

  // Static utility methods for display marker management

  /**
   * Set display marker (called by POS when opening display)
   */
  static setDisplayMarker(businessId: string, terminalId: string): void {
    if (typeof window === 'undefined') return

    const marker: DisplayMarker = {
      timestamp: Date.now(),
      businessId,
      terminalId
    }

    try {
      localStorage.setItem(SyncManager.DISPLAY_MARKER_KEY, JSON.stringify(marker))
      console.log('[SyncManager] Display marker set')
    } catch (error) {
      console.warn('[SyncManager] Failed to set display marker:', error)
    }
  }

  /**
   * Clear display marker
   */
  static clearDisplayMarker(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(SyncManager.DISPLAY_MARKER_KEY)
      console.log('[SyncManager] Display marker cleared')
    } catch (error) {
      console.warn('[SyncManager] Failed to clear display marker:', error)
    }
  }

  /**
   * Check if display is on same device (marker exists and is recent)
   */
  private checkIfSameDevice(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const markerJson = localStorage.getItem(SyncManager.DISPLAY_MARKER_KEY)
      if (!markerJson) return false

      const marker: DisplayMarker = JSON.parse(markerJson)
      const age = Date.now() - marker.timestamp

      // Check if marker is recent and matches business/terminal
      const isRecent = age < SyncManager.MARKER_MAX_AGE_MS
      const isMatching =
        marker.businessId === this.options.businessId &&
        marker.terminalId === this.options.terminalId

      console.log('[SyncManager] Marker check:', { isRecent, isMatching, age })
      return isRecent && isMatching
    } catch (error) {
      console.warn('[SyncManager] Failed to check display marker:', error)
      return false
    }
  }
}

/**
 * Utility function to create a SyncManager instance
 */
export function createSyncManager(options: SyncManagerOptions): SyncManager {
  return new SyncManager(options)
}
