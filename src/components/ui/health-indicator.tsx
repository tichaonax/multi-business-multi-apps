'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

// MBM-281 follow-up: this indicator was previously server-health-only. It
// now also layers in a live, local check of the workstation agent (same
// http://127.0.0.1:47710/probe the pairing card and dashboard widget use) —
// system admins/business owners get a second signal from the same glance,
// and a click straight to where they can fix it, instead of a separate
// dedicated widget being the only place this showed up.
const PAIRING_PORT = 47710
const BASE_AGENT_POLL_MS = 30000
const FAST_AGENT_POLL_MS = 3000
const FAST_AGENT_POLL_CAP_MS = 3 * 60 * 1000

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
  inline?: boolean
}

export default function HealthIndicator({
  pollInterval = 30000,
  position = 'bottom-center',
  showFullOnDesktop = true,
  enableClickToExpand = true,
  inline = false,
}: HealthIndicatorProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [extensionWarning, setExtensionWarning] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  const { isSystemAdmin, isBusinessOwner } = useBusinessPermissionsContext()
  const isAdmin = isSystemAdmin || isBusinessOwner
  const [agentChecked, setAgentChecked] = useState(false)
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentVersion, setAgentVersion] = useState<string | null>(null)
  const [latestAgentVersion, setLatestAgentVersion] = useState<string | null>(null)
  // Started the moment the admin clicks through to fix an agent issue (see
  // handleActionClick below) — the realistic next few minutes are "go
  // download/restart the agent, come back," and the pill should flip green
  // the moment that's actually done, not whenever the base 30s window
  // happens to land. Stops itself once the issue's gone, or at a cap.
  const [fastPolling, setFastPolling] = useState(false)
  const agentMountedRef = useRef(true)
  useEffect(() => () => { agentMountedRef.current = false }, [])

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

  const checkAgent = useCallback(() => {
    fetch(`http://127.0.0.1:${PAIRING_PORT}/probe?serverUrl=${encodeURIComponent(window.location.origin)}`, { signal: AbortSignal.timeout(2500) })
      .then(async (res) => {
        if (!agentMountedRef.current) return
        setAgentRunning(res.ok)
        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (!agentMountedRef.current) return
          setAgentVersion(data?.agentVersion || null)
        }
      })
      .catch(() => { if (agentMountedRef.current) setAgentRunning(false) })
      .finally(() => { if (agentMountedRef.current) setAgentChecked(true) })
  }, [])

  // Live local probe — same call the "Pair This Workstation" card and the
  // dashboard's WorkstationAgentStatusWidget use. Only meaningful for an
  // admin/owner (matches who can act on it); skipped entirely otherwise so
  // this never fires a stray localhost request for a plain staff account.
  // 30s poll is just the fallback — also re-check immediately on window
  // focus/tab visibility regain, since the realistic path is the admin
  // alt-tabbing to run the installer and coming straight back to the
  // browser, not sitting and waiting out a timer.
  useEffect(() => {
    if (!isAdmin) { setAgentChecked(true); return }
    checkAgent()
    const agentInterval = setInterval(checkAgent, BASE_AGENT_POLL_MS)

    const onFocus = () => checkAgent()
    const onVisibility = () => { if (document.visibilityState === 'visible') checkAgent() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(agentInterval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAdmin, checkAgent])

  // Fast-poll window — see handleActionClick below for what starts it.
  // Stops itself the moment there's no longer an agent issue to resolve
  // (about to render green again), or at the cap either way.
  const hasAgentIssue = agentChecked && isAdmin && (!agentRunning || !!(agentVersion && latestAgentVersion && agentVersion !== latestAgentVersion))
  useEffect(() => {
    if (!fastPolling) return
    if (!hasAgentIssue) { setFastPolling(false); return }
    const fastInterval = setInterval(checkAgent, FAST_AGENT_POLL_MS)
    const capTimeout = setTimeout(() => setFastPolling(false), FAST_AGENT_POLL_CAP_MS)
    return () => { clearInterval(fastInterval); clearTimeout(capTimeout) }
  }, [fastPolling, hasAgentIssue, checkAgent])

  const handleActionClick = () => setFastPolling(true)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    fetch('/api/admin/r710/agents/latest-version', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.data?.version) setLatestAgentVersion(data.data.version) })
      .catch(() => { /* non-critical — agent update check just won't fire */ })
    return () => { cancelled = true }
  }, [isAdmin])

  // Determine status and styling
  const getStatusInfo = () => {
    if (loading) {
      return {
        color: 'bg-gray-500',
        borderColor: 'border-gray-200',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-700',
        label: 'Loading...',
        icon: '⏳',
        actionHref: undefined as string | undefined,
      }
    }

    if (error || !health) {
      return {
        color: extensionWarning ? 'bg-orange-500' : 'bg-red-500',
        borderColor: extensionWarning ? 'border-orange-200' : 'border-red-200',
        bgColor: extensionWarning ? 'bg-orange-50' : 'bg-red-50',
        textColor: extensionWarning ? 'text-orange-700' : 'text-red-700',
        label: extensionWarning ? 'Extension Block' : 'Offline',
        icon: extensionWarning ? '🛡️' : '❌',
        actionHref: undefined as string | undefined,
      }
    }

    if (health.database === 'disconnected') {
      return {
        color: 'bg-yellow-500',
        borderColor: 'border-yellow-200',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        label: 'Degraded',
        icon: '⚠️',
        actionHref: undefined as string | undefined,
      }
    }

    // Server itself is healthy — layer the workstation agent's live local
    // status on top. Only checked for an admin/owner, and only once the
    // probe has actually resolved (agentChecked) — an unresolved check
    // silently falls through to "Running" rather than flashing a false
    // warning during the couple of seconds the probe is still in flight.
    if (isAdmin && agentChecked) {
      if (!agentRunning) {
        return {
          color: 'bg-orange-500',
          borderColor: 'border-orange-200',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          label: 'Agent Offline',
          icon: '⚠️',
          actionHref: '/admin/workstation-agents' as string | undefined,
        }
      }
      if (agentVersion && latestAgentVersion && agentVersion !== latestAgentVersion) {
        return {
          color: 'bg-orange-500',
          borderColor: 'border-orange-200',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          label: 'Agent Update',
          icon: '⬆️',
          actionHref: '/admin/workstation-agents' as string | undefined,
        }
      }
    }

    return {
      color: 'bg-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      label: 'Running',
      icon: '✓',
      actionHref: undefined as string | undefined,
    }
  }

  const statusInfo = getStatusInfo()

  // MBM-281 follow-up: "easy to find" home for the workstation agent's own
  // version on this machine — a hover tooltip works everywhere this
  // component renders (desktop pill, inline header pill) with zero added
  // UI, and costs nothing extra since agentVersion is already fetched for
  // the status check above. Only meaningful once the probe has actually
  // resolved and found a running agent.
  const agentVersionTitle = isAdmin && agentChecked && agentRunning && agentVersion
    ? `Workstation agent v${agentVersion} on this machine`
    : undefined

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

  // Inline mode — no fixed positioning, just a compact dot + label
  if (inline) {
    const pill = (
      <span title={agentVersionTitle} className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.textColor}`}>
        <span className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
        {statusInfo.label}
      </span>
    )
    return statusInfo.actionHref ? (
      <Link href={statusInfo.actionHref} onClick={handleActionClick} className="hover:opacity-80 transition-opacity">{pill}</Link>
    ) : pill
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
              {isAdmin && agentChecked && agentRunning && agentVersion && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Workstation agent:</span>
                  <span className="font-medium text-gray-700">v{agentVersion}</span>
                </div>
              )}
              {statusInfo.actionHref && (
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <Link
                    href={statusInfo.actionHref}
                    onClick={() => { setIsExpanded(false); handleActionClick() }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {statusInfo.label === 'Agent Update' ? 'Update the agent →' : 'View Workstation Agents →'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop full card view - compact thin version
  const cardClasses = `fixed ${positionClasses[position]} z-[9999] flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-md ${statusInfo.bgColor} ${statusInfo.borderColor} transition-all duration-200 ${statusInfo.actionHref ? 'cursor-pointer hover:shadow-lg' : ''}`
  const cardContent = (
    <>
      <div className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
      <span className={`text-xs font-medium ${statusInfo.textColor}`}>
        {statusInfo.label}
      </span>
      {health?.uptime && (
        <span className="text-xs text-gray-500 border-l border-gray-300 pl-2 ml-1">
          {health.uptime.formatted}
        </span>
      )}
    </>
  )

  return statusInfo.actionHref ? (
    <Link href={statusInfo.actionHref} onClick={handleActionClick} className={cardClasses} title="Click to view Workstation Agents">
      {cardContent}
    </Link>
  ) : (
    <div className={cardClasses} title={agentVersionTitle}>{cardContent}</div>
  )
}
