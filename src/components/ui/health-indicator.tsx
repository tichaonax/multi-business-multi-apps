'use client'

import { useEffect, useState } from 'react'

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
}

export default function HealthIndicator({
  pollInterval = 30000,
  position = 'bottom-right'
}: HealthIndicatorProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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
      } catch (err) {
        console.error('Health check error:', err)
        setError(true)
        setLoading(false)
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
        label: 'Loading...'
      }
    }

    if (error || !health) {
      return {
        color: 'bg-red-500',
        borderColor: 'border-red-200',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        label: 'Offline'
      }
    }

    if (health.database === 'disconnected') {
      return {
        color: 'bg-yellow-500',
        borderColor: 'border-yellow-200',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        label: 'Degraded'
      }
    }

    return {
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      label: 'Running'
    }
  }

  const statusInfo = getStatusInfo()

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4'
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-1 rounded-lg border p-3 shadow-md ${statusInfo.bgColor} ${statusInfo.borderColor}`}
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
