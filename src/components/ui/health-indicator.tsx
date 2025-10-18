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
  position?: 'bottom-right' | 'bottom-left' | 'top-right'
  showFullOnDesktop?: boolean
  enableClickToExpand?: boolean
}

export default function HealthIndicator({
  pollInterval = 30000,
  position = 'bottom-right',
  showFullOnDesktop = true,
  enableClickToExpand = true
}: HealthIndicatorProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())
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
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error('Health check failed')
        }
        const data: HealthResponse = await response.json()
        setHealth(data)
        setError(false)
        setLoading(false)
        setLastCheck(new Date())
      } catch (err) {
        console.error('Health check error:', err)
        setError(true)
        setLoading(false)
        setLastCheck(new Date())
      }
    }

    // Initial fetch
    fetchHealth()

    // Set up polling interval
    const interval = setInterval(fetchHealth, pollInterval)

    // Cleanup on unmount
    return () => clearInterval(interval)
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
        color: 'bg-red-500',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        label: 'Offline',
        icon: '❌'
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
    'top-right': 'top-4 right-4'
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
          className={`fixed ${position === 'bottom-right' ? 'bottom-20 right-4' : position === 'bottom-left' ? 'bottom-20 left-4' : 'top-20 right-4'} z-[9999] w-64 animate-in slide-in-from-bottom-2 duration-200`}
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

  // Desktop full card view
  return (
    <div
      className={`fixed ${positionClasses[position]} z-[9999] flex flex-col gap-1 rounded-lg border p-3 shadow-md ${statusInfo.bgColor} ${statusInfo.borderColor} transition-all duration-200`}
    >
      <div className="flex items-center gap-2">
        <div className={`h-3 w-3 rounded-full ${statusInfo.color}`} />
        <span className={`text-sm font-medium ${statusInfo.textColor}`}>
          {statusInfo.label}
        </span>
      </div>
      {health?.uptime && (
        <div className="text-xs text-gray-500 pl-5">
          Uptime: {health.uptime.formatted}
        </div>
      )}
    </div>
  )
}
