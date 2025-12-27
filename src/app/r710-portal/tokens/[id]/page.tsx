'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useAlert, useConfirm } from '@/components/ui/confirm-modal'
import Link from 'next/link'

interface TokenDetail {
  id: string
  username: string
  password: string
  status: 'AVAILABLE' | 'SOLD' | 'ACTIVE' | 'EXPIRED' | 'INVALIDATED'
  validTimeSeconds: number
  expiresAt: Date | null
  firstUsedAt: Date | null
  soldAt: Date | null
  salePrice: number | null
  connectedMac: string | null
  createdAt: Date
  createdAtR710: Date | null
  lastSyncedAt: Date | null
  tokenConfig: {
    id: string
    name: string
    description: string | null
    durationValue: number
    durationUnit: string
    deviceLimit: number
    basePrice: number
  }
  wlan: {
    id: string
    ssid: string
    wlanId: string
    device_registry: {
      ipAddress: string
      description: string | null
    }
  } | null
  business: {
    id: string
    name: string
    type: string
  }
}

export default function TokenDetailPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <TokenDetailContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function TokenDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const alert = useAlert()
  const confirm = useConfirm()
  const tokenId = params.id as string

  const [token, setToken] = useState<TokenDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadTokenDetail()
  }, [tokenId])

  const loadTokenDetail = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/r710/tokens/${tokenId}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setToken(data.token)
      } else if (response.status === 404) {
        await alert({ title: 'Token Not Found', description: 'The requested token could not be found.' })
        router.push('/r710-portal/tokens')
      } else if (response.status === 403) {
        await alert({ title: 'Access Denied', description: 'You do not have permission to view this token.' })
        router.push('/r710-portal/tokens')
      }
    } catch (error) {
      console.error('Failed to load token detail:', error)
      await alert({ title: 'Error', description: 'Failed to load token details. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInvalidate = async () => {
    if (!token) return

    const confirmed = await confirm({
      title: 'Invalidate Token?',
      description: 'This action cannot be undone and the token will no longer work on the R710 device. Are you sure you want to continue?',
      confirmText: 'Yes, Invalidate',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    try {
      setUpdating(true)

      const response = await fetch(`/api/r710/tokens/${tokenId}/invalidate`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        await alert({ title: 'Success', description: 'Token invalidated successfully.' })
        await loadTokenDetail() // Refresh
      } else {
        const data = await response.json()
        await alert({ title: 'Error', description: `Failed to invalidate token: ${data.error}` })
      }
    } catch (error) {
      console.error('Failed to invalidate token:', error)
      await alert({ title: 'Error', description: 'Failed to invalidate token. Please try again.' })
    } finally {
      setUpdating(false)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      await alert({ title: 'Copied!', description: `${label} copied to clipboard.` })
    } catch (error) {
      await alert({ title: 'Error', description: 'Failed to copy to clipboard.' })
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      AVAILABLE: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          ● Available
        </span>
      ),
      SOLD: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          ● Sold
        </span>
      ),
      ACTIVE: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          ● Active
        </span>
      ),
      EXPIRED: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
          ● Expired
        </span>
      ),
      INVALIDATED: (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          ● Invalidated
        </span>
      )
    }
    return badges[status as keyof typeof badges] || null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDuration = (value: number, unit: string) => {
    // unit format is like "hour_Hours", "day_Days", "week_Weeks"
    const unitDisplay = unit.split('_')[1] || unit
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  const formatValidTime = (seconds: number) => {
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      return `${minutes} minute${minutes > 1 ? 's' : ''}`
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600)
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else if (seconds < 604800) {
      const days = Math.floor(seconds / 86400)
      return `${days} day${days > 1 ? 's' : ''}`
    } else {
      const weeks = Math.floor(seconds / 604800)
      return `${weeks} week${weeks > 1 ? 's' : ''}`
    }
  }

  const formatBandwidth = (mbps: number | null) => {
    if (!mbps) return 'Unlimited'
    if (mbps >= 1000) {
      return `${mbps / 1000} Gbps`
    }
    return `${mbps} Mbps`
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading token details...</p>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Token not found</h3>
        <Link href="/r710-portal/tokens" className="text-primary hover:underline">
          Return to token inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <Link href="/r710-portal/tokens" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                WiFi Token Details
              </h1>
            </div>
            <p className="mt-1 ml-8 text-sm text-gray-500 dark:text-gray-400">
              Viewing token for {token.business.name}
            </p>
          </div>

          <div>
            {getStatusBadge(token.status)}
          </div>
        </div>
      </div>

      {/* Important Notice for AVAILABLE tokens */}
      {token.status === 'AVAILABLE' && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Token Not Yet Sold</h3>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-400">
                This token is available for sale. To mark it as sold with proper payment tracking, sell it through:
              </p>
              <ul className="mt-2 text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
                <li>The <Link href="/r710-portal/sales" className="underline font-medium">Direct Sales page</Link> in R710 Portal (with payment collection)</li>
                <li>The POS system when customer checks out</li>
              </ul>
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-500 italic">
                Note: Tokens should never be manually marked as sold without collecting payment to prevent bookkeeping issues.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credentials Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Access Credentials
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded font-mono text-lg">
                    {token.username}
                  </code>
                  <button
                    onClick={() => copyToClipboard(token.username, 'Username')}
                    className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded font-mono text-lg">
                    {token.password}
                  </code>
                  <button
                    onClick={() => copyToClipboard(token.password, 'Password')}
                    className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Token Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Package Configuration
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Package Name</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">{token.tokenConfig.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Base Price</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">{formatCurrency(token.tokenConfig.basePrice)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Duration</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">{formatDuration(token.tokenConfig.durationValue, token.tokenConfig.durationUnit)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Valid Time</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">{formatValidTime(token.validTimeSeconds)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Device Limit</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white">{token.tokenConfig.deviceLimit} device{token.tokenConfig.deviceLimit > 1 ? 's' : ''}</div>
              </div>
            </div>
            {token.tokenConfig.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Description</div>
                <div className="text-sm text-gray-900 dark:text-white mt-1">{token.tokenConfig.description}</div>
              </div>
            )}
          </div>

          {/* WLAN Information */}
          {token.wlan && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                WLAN Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">SSID</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">{token.wlan.ssid}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">WLAN ID</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white font-mono">{token.wlan.wlanId}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400">R710 Device</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">{token.wlan.device_registry.ipAddress}</div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Details */}
          {token.connectedMac && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Connection Details
              </h2>
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Connected MAC Address</div>
                <div className="text-lg font-medium text-gray-900 dark:text-white font-mono">{token.connectedMac}</div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {(token.status === 'AVAILABLE' || token.status === 'SOLD' || token.status === 'ACTIVE') && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Actions
              </h3>
              <button
                onClick={handleInvalidate}
                disabled={updating}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                Invalidate Token
              </button>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Invalidating this token will immediately terminate WiFi access. This action cannot be undone.
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Timeline
            </h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Created (Database)</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(token.createdAt)}</div>
              </div>
              {token.createdAtR710 && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Created (R710)</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(token.createdAtR710)}</div>
                </div>
              )}
              {token.soldAt && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sold At</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(token.soldAt)}</div>
                </div>
              )}
              {token.firstUsedAt && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">First Used</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(token.firstUsedAt)}</div>
                </div>
              )}
              {token.expiresAt && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Expires At</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(token.expiresAt)}</div>
                </div>
              )}
              {token.lastSyncedAt && (
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Last Synced</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(token.lastSyncedAt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Sale Information */}
          {(token.status === 'SOLD' || token.soldAt) && token.salePrice !== null && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sale Information
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sale Price</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(token.salePrice)}</div>
                </div>
                {token.soldAt && (
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Sold On</div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDateTime(token.soldAt)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Token ID */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Token ID</div>
            <div className="text-xs font-mono text-gray-900 dark:text-white break-all">{token.id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
