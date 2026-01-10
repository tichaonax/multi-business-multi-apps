/**
 * useCustomerDisplaySync Hook
 *
 * React hook for managing customer display synchronization.
 * Wraps the SyncManager and provides React-friendly interface with state management.
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SyncManager, SyncManagerOptions, SyncMode, createSyncManager } from '@/lib/customer-display/sync-manager'
import { CartMessage, CartMessageType } from '@/lib/customer-display/broadcast-sync'
import { ConnectionStatus } from '@/lib/customer-display/websocket-sync'

export interface UseCustomerDisplaySyncOptions {
  businessId: string
  terminalId: string
  mode?: SyncMode
  serverUrl?: string
  autoConnect?: boolean
  onMessage?: (message: CartMessage) => void
  onError?: (error: Error) => void
}

export interface UseCustomerDisplaySyncReturn {
  // Connection state
  isConnected: boolean
  syncMode: SyncMode | null
  connectionStatus: ConnectionStatus | 'connected' | null

  // Methods
  connect: () => Promise<void>
  disconnect: () => void
  send: (type: CartMessageType, payload: CartMessage['payload']) => void

  // Errors
  error: Error | null
}

/**
 * Hook for customer display synchronization
 *
 * @example
 * // In POS page - sending cart updates
 * const { send, isConnected } = useCustomerDisplaySync({
 *   businessId: 'business-123',
 *   terminalId: 'terminal-1',
 *   autoConnect: true
 * })
 *
 * const addItem = (item) => {
 *   send('ADD_ITEM', { item, subtotal, tax, total })
 * }
 *
 * @example
 * // In customer display page - receiving updates
 * const { isConnected, syncMode } = useCustomerDisplaySync({
 *   businessId: 'business-123',
 *   terminalId: 'terminal-1',
 *   autoConnect: true,
 *   onMessage: (message) => {
 *     if (message.type === 'ADD_ITEM') {
 *       setCart(prev => [...prev, message.payload.item])
 *     }
 *   }
 * })
 */
export function useCustomerDisplaySync(
  options: UseCustomerDisplaySyncOptions
): UseCustomerDisplaySyncReturn {
  const {
    businessId,
    terminalId,
    mode,
    serverUrl,
    autoConnect = false,
    onMessage,
    onError
  } = options

  // State
  const [isConnected, setIsConnected] = useState(false)
  const [syncMode, setSyncMode] = useState<SyncMode | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | 'connected' | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Refs
  const syncManagerRef = useRef<SyncManager | null>(null)
  const mountedRef = useRef(true)
  const onMessageRef = useRef(onMessage)
  const onErrorRef = useRef(onError)

  // Update refs when callbacks change
  useEffect(() => {
    onMessageRef.current = onMessage
    onErrorRef.current = onError
  }, [onMessage, onError])

  /**
   * Initialize sync manager
   */
  const initializeSyncManager = useCallback(() => {
    if (syncManagerRef.current) {
      return syncManagerRef.current
    }

    const syncOptions: SyncManagerOptions = {
      businessId,
      terminalId,
      mode,
      serverUrl,
      onMessage: (message) => {
        console.log('🔔 [useCustomerDisplaySync] onMessage callback invoked:', {
          type: message.type,
          isMounted: mountedRef.current,
          hasOnMessageRef: !!onMessageRef.current
        })
        if (mountedRef.current) {
          console.log('🔔 [useCustomerDisplaySync] Calling onMessageRef.current')
          onMessageRef.current?.(message)
          console.log('🔔 [useCustomerDisplaySync] Called onMessageRef.current')
        } else {
          console.warn('⚠️ [useCustomerDisplaySync] Component not mounted, message dropped')
        }
      },
      onSyncModeChanged: (newMode) => {
        if (mountedRef.current) {
          setSyncMode(newMode)
          console.log('[useCustomerDisplaySync] Sync mode changed:', newMode)
        }
      },
      onConnected: () => {
        if (mountedRef.current) {
          setIsConnected(true)
          setError(null)
          console.log('[useCustomerDisplaySync] Connected')
        }
      },
      onDisconnected: () => {
        if (mountedRef.current) {
          setIsConnected(false)
          console.log('[useCustomerDisplaySync] Disconnected')
        }
      },
      onError: (err) => {
        if (mountedRef.current) {
          setError(err)
          console.error('[useCustomerDisplaySync] Error:', err)
          onErrorRef.current?.(err)
        }
      }
    }

    const manager = createSyncManager(syncOptions)
    syncManagerRef.current = manager
    return manager
  }, [businessId, terminalId, mode, serverUrl])

  /**
   * Connect to sync
   */
  const connect = useCallback(async () => {
    try {
      const manager = initializeSyncManager()
      await manager.connect()

      if (mountedRef.current) {
        const status = manager.getConnectionStatus()
        setConnectionStatus(status)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      if (mountedRef.current) {
        setError(error)
        onError?.(error)
      }
    }
  }, [initializeSyncManager, onError])

  /**
   * Disconnect from sync
   */
  const disconnect = useCallback(() => {
    if (syncManagerRef.current) {
      syncManagerRef.current.disconnect()
      syncManagerRef.current = null
    }

    if (mountedRef.current) {
      setIsConnected(false)
      setSyncMode(null)
      setConnectionStatus(null)
    }
  }, [])

  /**
   * Send a message through sync
   */
  const send = useCallback((type: CartMessageType, payload: CartMessage['payload']) => {
    console.log(`[useCustomerDisplaySync] send() called - type: ${type}, isConnected: ${isConnected}, hasManager: ${!!syncManagerRef.current}`)

    if (!syncManagerRef.current) {
      console.warn('[useCustomerDisplaySync] Cannot send, sync manager not initialized')
      return
    }

    // Don't check isConnected for BroadcastChannel - it's always ready
    // The state update might lag behind actual connection
    console.log(`[useCustomerDisplaySync] Sending message type: ${type}`)

    try {
      syncManagerRef.current.send(type, payload)
      console.log(`[useCustomerDisplaySync] Message sent successfully: ${type}`)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error(`[useCustomerDisplaySync] Error sending message:`, err)
      setError(error)
      onError?.(error)
    }
  }, [isConnected, onError])

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    // CRITICAL: Set mounted to true at the start of the effect
    // This ensures it's true even after React StrictMode double-runs the effect
    mountedRef.current = true

    if (autoConnect) {
      connect()
    }

    return () => {
      mountedRef.current = false
      disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect])

  /**
   * Update connection status periodically
   */
  useEffect(() => {
    if (!isConnected || !syncManagerRef.current) return

    const interval = setInterval(() => {
      if (syncManagerRef.current && mountedRef.current) {
        const status = syncManagerRef.current.getConnectionStatus()
        setConnectionStatus(status)
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [isConnected])

  return {
    isConnected,
    syncMode,
    connectionStatus,
    connect,
    disconnect,
    send,
    error
  }
}

/**
 * Utility hook for POS pages to easily open customer display
 * Automatically detects and uses secondary monitor if available
 */
export function useOpenCustomerDisplay(businessId: string, terminalId: string) {
  const openDisplay = useCallback(async () => {
    // Set display marker in localStorage for same-device detection
    SyncManager.setDisplayMarker(businessId, terminalId)

    const displayUrl = `/customer-display?businessId=${businessId}&terminalId=${terminalId}`

    try {
      // Check if Window Management API is supported (Chrome 100+, Edge 100+)
      if ('getScreenDetails' in window) {
        console.log('[useOpenCustomerDisplay] Window Management API detected')

        try {
          // Request permission to access screen details
          const screenDetails = await (window as any).getScreenDetails()
          const screens = screenDetails.screens

          console.log(`[useOpenCustomerDisplay] Found ${screens.length} screen(s)`)

          // Find secondary screen (not the current screen)
          const currentScreen = screenDetails.currentScreen
          const secondaryScreen = screens.find((screen: any) => screen !== currentScreen)

          if (secondaryScreen) {
            console.log('[useOpenCustomerDisplay] Secondary monitor detected, opening display there')

            // Calculate position on secondary screen (centered)
            const width = 1920
            const height = 1080
            const left = secondaryScreen.availLeft + (secondaryScreen.availWidth - width) / 2
            const top = secondaryScreen.availTop + (secondaryScreen.availHeight - height) / 2

            // Open window on secondary screen
            const features = `left=${left},top=${top},width=${width},height=${height},toolbar=no,menubar=no,location=no,status=no`
            const displayWindow = window.open(displayUrl, 'CustomerDisplay', features)

            if (!displayWindow) {
              throw new Error('Failed to open display window. Please allow popups for this site.')
            }

            // Request fullscreen on the secondary display after a brief delay
            setTimeout(() => {
              if (displayWindow && !displayWindow.closed) {
                displayWindow.focus()
                // Attempt to enter fullscreen (user gesture required in some browsers)
                try {
                  displayWindow.document.documentElement.requestFullscreen?.()
                    .catch((err: any) => console.log('[useOpenCustomerDisplay] Fullscreen not available:', err.message))
                } catch (err) {
                  console.log('[useOpenCustomerDisplay] Fullscreen API not available')
                }
              }
            }, 500)

            console.log('[useOpenCustomerDisplay] Display opened on secondary monitor')
            return displayWindow
          } else {
            console.log('[useOpenCustomerDisplay] No secondary monitor detected, opening on primary')
          }
        } catch (error) {
          console.warn('[useOpenCustomerDisplay] Window Management API permission denied or error:', error)
          // Fall through to standard window.open
        }
      }

      // Fallback: Standard window.open (manual positioning required)
      console.log('[useOpenCustomerDisplay] Using standard window.open (manual positioning required)')
      const features = 'width=1920,height=1080,toolbar=no,menubar=no,location=no,status=no'
      const displayWindow = window.open(displayUrl, 'CustomerDisplay', features)

      if (!displayWindow) {
        throw new Error('Failed to open display window. Please allow popups for this site.')
      }

      console.log('[useOpenCustomerDisplay] Display opened (drag to secondary monitor and press F11 for fullscreen)')
      return displayWindow
    } catch (error) {
      console.error('[useOpenCustomerDisplay] Error:', error)
      throw error
    }
  }, [businessId, terminalId])

  return { openDisplay }
}
