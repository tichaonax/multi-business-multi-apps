/**
 * Connection Status Component
 *
 * Small, non-intrusive indicator showing the sync connection status.
 * Auto-hides after 3 seconds when connected for a cleaner display.
 */

'use client'

import { useState, useEffect } from 'react'
import { ConnectionStatus as ConnectionStatusEnum } from '@/lib/customer-display/websocket-sync'
import { SyncMode } from '@/lib/customer-display/sync-manager'

interface ConnectionStatusProps {
  isConnected: boolean
  syncMode: SyncMode | null
  status: ConnectionStatusEnum | 'connected' | null
  error: Error | null
}

export function ConnectionStatus({
  isConnected,
  syncMode,
  status,
  error
}: ConnectionStatusProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [hasBeenConnected, setHasBeenConnected] = useState(false)

  // Auto-hide after 3 seconds when connected
  useEffect(() => {
    if (isConnected && !hasBeenConnected) {
      setHasBeenConnected(true)
      setIsVisible(true)

      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 3000)

      return () => clearTimeout(timer)
    }

    // Show again if connection is lost
    if (!isConnected && hasBeenConnected) {
      setIsVisible(true)
    }
  }, [isConnected, hasBeenConnected])

  // Don't render if hidden and connected
  if (!isVisible && isConnected && !error) {
    return null
  }

  // Determine status text and style
  let statusText: string
  let statusColor: string
  let statusIcon: string
  let pulseAnimation = false

  if (error) {
    statusText = 'Connection Error'
    statusColor = 'bg-red-600'
    statusIcon = '❌'
  } else if (!isConnected) {
    statusText = 'Connecting...'
    statusColor = 'bg-yellow-500'
    statusIcon = '⚡'
    pulseAnimation = true
  } else if (status === ConnectionStatusEnum.RECONNECTING) {
    statusText = 'Reconnecting...'
    statusColor = 'bg-yellow-500'
    statusIcon = '🔄'
    pulseAnimation = true
  } else if (syncMode === SyncMode.BROADCAST) {
    statusText = 'Connected (Local)'
    statusColor = 'bg-green-600'
    statusIcon = '✅'
  } else if (syncMode === SyncMode.WEBSOCKET) {
    statusText = 'Connected (Network)'
    statusColor = 'bg-green-600'
    statusIcon = '✅'
  } else {
    statusText = 'Connected'
    statusColor = 'bg-green-600'
    statusIcon = '✅'
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div
        className={`${statusColor} text-white rounded-full shadow-lg px-6 py-3 flex items-center gap-3 ${
          pulseAnimation ? 'animate-pulse' : ''
        }`}
      >
        <span className="text-2xl">{statusIcon}</span>
        <div className="flex flex-col">
          <span className="text-lg font-semibold">{statusText}</span>
          {error && (
            <span className="text-xs text-white/90 mt-0.5">
              {error.message}
            </span>
          )}
          {syncMode && isConnected && (
            <span className="text-xs text-white/80 mt-0.5">
              {syncMode === SyncMode.BROADCAST
                ? 'Same Device • Instant Sync'
                : 'Separate Device • Real-time Sync'}
            </span>
          )}
        </div>

        {/* Dismiss button (only show when visible and connected) */}
        {isVisible && isConnected && !error && (
          <button
            onClick={() => setIsVisible(false)}
            className="ml-2 text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
