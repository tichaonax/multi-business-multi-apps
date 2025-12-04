'use client'

import { useEffect, useState, useRef } from 'react'

interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime?: {
    milliseconds: number
    formatted: string
  }
  startTime?: string
  database: 'connected' | 'disconnected'
  userCount?: number
  environment?: string
}

interface HealthIndicatorProps {
  pollInterval?: number
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'bottom-center'
  showFullOnDesktop?: boolean
  enableClickToExpand?: boolean
}

export default function HealthIndicator({
  pollInterval = 30000,
  position = 'bottom-center',
  showFullOnDesktop = true,
  enableClickToExpand = true
}: HealthIndicatorProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [extensionWarning, setExtensionWarning] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  // Refs for click-outside detection
  const popoverRef = useRef<HTMLDivElement>(null)
  const ledRef = useRef<HTMLDivElement>(null)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Click outside to close popover
  useEffect(() => {
    if (!isExpanded) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        ledRef.current &&
        !ledRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        // Add a small delay to avoid rapid requests that might trigger extension blocking
        await new Promise(resolve => setTimeout(resolve, 100))

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

        let response: Response
        try {
          response = await fetch('/api/health', {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          })
        } catch (fetchErr) {
          // Handle fetch-level errors (including extension interference)
          if (fetchErr instanceof Error) {
            if (fetchErr.name === 'TypeError' || fetchErr.message.includes('Failed to fetch')) {
              console.warn('Browser extension detected - fetch request blocked, trying XMLHttpRequest fallback:', fetchErr.message)

              // Try XMLHttpRequest as fallback
              try {
                const xhrResponse = await new Promise<{ status: number; data: any }>((resolve, reject) => {
                  const xhr = new XMLHttpRequest()
                  xhr.open('GET', '/api/health')
                  xhr.setRequestHeader('Cache-Control', 'no-cache')
                  xhr.setRequestHeader('Pragma', 'no-cache')

                  xhr.timeout = 10000
                  xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                      try {
                        const data = JSON.parse(xhr.responseText)
                        resolve({ status: xhr.status, data })
                      } catch (parseErr) {
                        reject(new Error('Invalid JSON response'))
                      }
                    } else {
                      reject(new Error(`XHR failed with status: ${xhr.status}`))
                    }
                  }
                  xhr.onerror = () => reject(new Error('XHR network error'))
                  xhr.ontimeout = () => reject(new Error('XHR timeout'))
                  xhr.send()
                })

                // If XMLHttpRequest succeeds, process the response
                const data: HealthResponse = xhrResponse.data
                if (!data || typeof data.status !== 'string') {
                  throw new Error('Invalid health check response format')
                }

                setHealth(data)
                setError(false)
                setExtensionWarning(false)
                setLoading(false)
                setLastCheck(new Date())
                return
              } catch (xhrErr) {
                console.warn('XMLHttpRequest fallback also failed:', xhrErr)
                setExtensionWarning(true)
                setError(true)
                setLoading(false)
                setLastCheck(new Date())
                return
              }
            }
          }
          throw fetchErr // Re-throw other errors to be handled below
        }

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Health check failed with status: ${response.status}`)
        }

        const data: HealthResponse = await response.json()

        // Validate the response structure
        if (!data || typeof data.status !== 'string') {
          throw new Error('Invalid health check response format')
        }

        setHealth(data)
        setError(false)
        setExtensionWarning(false)
        setLoading(false)
        setLastCheck(new Date())
      } catch (err) {
        // Handle different types of errors more specifically
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            console.warn('Health check timed out')
          } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('TypeError')) {
            console.warn('Health check blocked by browser extension or network issue:', err.message)
            setExtensionWarning(true)
          } else {
            console.error('Health check error:', err.message)
            setExtensionWarning(false)
          }
        } else {
          console.error('Unknown health check error:', err)
          setExtensionWarning(false)
        }

        setError(true)
        setLoading(false)
        setLastCheck(new Date())
      }
    }

    // Initial fetch with a slight delay to avoid immediate blocking
    const initialTimeout = setTimeout(fetchHealth, 1000)

    // Set up polling interval
    const interval = setInterval(fetchHealth, pollInterval)

    // Cleanup on unmount
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [pollInterval])

  // Determine status and styling
  const getStatusInfo = () => {
    if (loading) {
      return {
        color: 'bg-gray-500',
        borderColor: 'border-gray-200',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        label: 'Loading...',
        icon: '⏳'
      }
    }

    if (error || !health) {
      return {
        color: extensionWarning ? 'bg-orange-500' : 'bg-red-500',
        borderColor: extensionWarning ? 'border-orange-200' : 'border-red-200',
        bgColor: extensionWarning ? 'bg-orange-50' : 'bg-red-50',
        textColor: extensionWarning ? 'text-orange-700' : 'text-red-700',
        label: extensionWarning ? 'Extension Block' : 'Offline',
        icon: extensionWarning ? '🛡️' : '❌'
      }
    }

    if (health.database === 'disconnected') {
      return {
        color: 'bg-yellow-500',
        borderColor: 'border-yellow-200',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        label: 'Degraded',
        icon: '⚠️'
      }
    }

    return {
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      label: 'Running',
      icon: '✓'
    }
  }

  const statusInfo = getStatusInfo()

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-center': 'bottom-2 left-1/2 -translate-x-1/2'
  }

  // Format relative time for last check
  const getRelativeTime = () => {
    const now = new Date()
    const seconds = Math.floor((now.getTime() - lastCheck.getTime()) / 1000)
    
    if (seconds < 5) return 'Just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    return lastCheck.toLocaleTimeString()
  }

  // Format start time
  const formatStartTime = (startTime?: string) => {
    if (!startTime) return 'Unknown'
    const date = new Date(startTime)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleLedClick = () => {
    if (isMobile && enableClickToExpand) {
      setIsExpanded(!isExpanded)
    }
  }

  // Mobile LED-only view
  if (isMobile && !isExpanded) {
    return (
      <>
        <div
          ref={ledRef}
          onClick={handleLedClick}
          className={`fixed ${positionClasses[position]} z-[9999] cursor-pointer animate-pulse`}
          title="Click for details"
        >
          <div className={`h-4 w-4 rounded-full ${statusInfo.color} shadow-lg`} />
        </div>
      </>
    )
  }

  // Mobile expanded popover
  if (isMobile && isExpanded) {
    return (
      <>
        {/* LED indicator (still visible when expanded) */}
        <div
          ref={ledRef}
          onClick={handleLedClick}
          className={`fixed ${positionClasses[position]} z-[9999] cursor-pointer`}
        >
          <div className={`h-4 w-4 rounded-full ${statusInfo.color} shadow-lg`} />
        </div>

        {/* Popover with details */}
        <div
          ref={popoverRef}
          className={`fixed ${
            position === 'bottom-right' ? 'bottom-20 right-4' :
            position === 'bottom-left' ? 'bottom-20 left-4' :
            position === 'bottom-center' ? 'bottom-20 left-1/2 -translate-x-1/2' :
            'top-20 right-4'
          } z-[9999] w-64 animate-in slide-in-from-bottom-2 duration-200`}
        >
          <div className={`rounded-lg border shadow-lg bg-white ${statusInfo.borderColor}`}>
            {/* Header */}
            <div className={`flex items-center gap-2 p-3 border-b ${statusInfo.borderColor} ${statusInfo.bgColor}`}>
              <div className={`h-3 w-3 rounded-full ${statusInfo.color}`} />
              <span className={`text-sm font-medium ${statusInfo.textColor}`}>
                {statusInfo.icon} {statusInfo.label}
              </span>
            </div>

            {/* Details */}
            <div className="p-3 space-y-2 text-xs">
              {extensionWarning && (
                <div className="bg-orange-100 border border-orange-200 rounded p-2 mb-2">
                  <div className="text-orange-800 font-medium text-xs mb-1">Browser Extension Detected</div>
                  <div className="text-orange-700 text-xs">
                    A browser extension (like uBlock Origin) may be blocking health checks. Try disabling it for this site or adding an exception.
                  </div>
                </div>
              )}
              {health?.uptime && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Uptime:</span>
                  <span className="font-medium text-gray-700">{health.uptime.formatted}</span>
                </div>
              )}
              {health?.startTime && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Started:</span>
                  <span className="font-medium text-gray-700">{formatStartTime(health.startTime)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Last Check:</span>
                <span className="font-medium text-gray-700">{getRelativeTime()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Database:</span>
                <span className={`font-medium ${health?.database === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {health?.database === 'connected' ? '✓ Connected' : '✗ Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop full card view - compact thin version
  return (
    <div
      className={`fixed ${positionClasses[position]} z-[9999] flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-md ${statusInfo.bgColor} ${statusInfo.borderColor} transition-all duration-200`}
    >
      <div className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
      <span className={`text-xs font-medium ${statusInfo.textColor}`}>
        {statusInfo.label}
      </span>
      {health?.uptime && (
        <span className="text-xs text-gray-500 border-l border-gray-300 pl-2 ml-1">
          {health.uptime.formatted}
        </span>
      )}
    </div>
  )
}
