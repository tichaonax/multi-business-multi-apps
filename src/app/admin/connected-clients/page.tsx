'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'

interface ConnectedClient {
  id: string
  system: 'ESP32' | 'R710'
  macAddress: string
  ipAddress: string | null
  hostname: string | null
  deviceType: string | null
  isOnline: boolean
  connectedAt: string
  disconnectedAt: string | null
  lastSyncedAt: string
  bandwidthUsedDown: number
  bandwidthUsedUp: number
  wlanName: string | null
  tokenInfo: {
    id: string
    token?: string
    username?: string
    password?: string
    status: string
    expiresAt?: string | null
  }
  business: {
    id: string
    name: string
    type: string
  }
}

interface Statistics {
  total: number
  online: number
  offline: number
  esp32: number
  r710: number
  bySystem: {
    ESP32: { total: number; online: number }
    R710: { total: number; online: number }
  }
}

export default function ConnectedClientsPage() {
  return (
    <ProtectedRoute requiredPermission="canManageWifiPortal">
      <MainLayout>
        <ContentLayout>
          <ConnectedClientsContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function ConnectedClientsContent() {
  const [clients, setClients] = useState<ConnectedClient[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string; type: string }>>([])

  // Determine default system filter based on URL parameter or referrer
  const getDefaultSystemFilter = (): 'BOTH' | 'ESP32' | 'R710' => {
    // Check URL parameter first
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const systemParam = params.get('system')
      if (systemParam === 'ESP32' || systemParam === 'R710') {
        return systemParam
      }

      // Fallback to referrer detection
      const referrer = document.referrer
      if (referrer.includes('/r710-portal')) {
        return 'R710'
      } else if (referrer.includes('/wifi-portal')) {
        return 'ESP32'
      }
    }
    return 'BOTH'
  }

  // Filters
  const [systemFilter, setSystemFilter] = useState<'BOTH' | 'ESP32' | 'R710'>(getDefaultSystemFilter())
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')

  // Pagination
  const [offset, setOffset] = useState(0)
  const [limit] = useState(50)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchClients = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      const params = new URLSearchParams({
        system: systemFilter,
        status: statusFilter,
        limit: limit.toString(),
        offset: offset.toString()
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      if (selectedBusiness) {
        params.append('businessId', selectedBusiness)
      }

      const response = await fetch(`/api/admin/connected-clients?${params}`)
      const data = await response.json()

      if (data.success) {
        setClients(data.data.clients)
        setStatistics(data.data.statistics)
        setTotal(data.data.pagination.total)
        setHasMore(data.data.pagination.hasMore)
      } else {
        setError('Failed to fetch connected clients')
      }
    } catch (error) {
      console.error('Error fetching connected clients:', error)
      setError('Error fetching connected clients')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [systemFilter, statusFilter, selectedBusiness, offset])

  // Fetch businesses for dropdown
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch('/api/business')
        const data = await response.json()
        if (data.success) {
          setBusinesses(data.data)
        }
      } catch (error) {
        console.error('Error fetching businesses:', error)
      }
    }
    fetchBusinesses()
  }, [])

  // Sync R710 clients
  const syncR710Clients = async () => {
    try {
      setSyncing(true)
      setError(null)

      console.log('Syncing R710 connected clients...')
      const response = await fetch('/api/r710/connected-clients/sync')
      const data = await response.json()

      if (data.success) {
        console.log(`Sync complete: ${data.synced} clients from ${data.devices} devices`)
        // Refresh the client list
        await fetchClients(false)
      } else {
        setError(data.error || 'Failed to sync R710 clients')
      }
    } catch (error) {
      console.error('Error syncing R710 clients:', error)
      setError('Error syncing R710 clients')
    } finally {
      setSyncing(false)
    }
  }

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery || searchQuery === '') {
        setOffset(0)
        fetchClients()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const formatBytes = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(2)} MB`
  }

  const formatDuration = (connectedAt: string, disconnectedAt: string | null, isOnline: boolean) => {
    const start = new Date(connectedAt)
    const end = disconnectedAt ? new Date(disconnectedAt) : new Date()
    const durationMs = end.getTime() - start.getTime()
    const minutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Connected Clients</h1>
            <p className="text-muted-foreground mt-1">
              Monitor WiFi clients across ESP32 and R710 systems
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={syncR710Clients}
              disabled={syncing || systemFilter === 'ESP32'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title={systemFilter === 'ESP32' ? 'Sync only works for R710 systems' : 'Sync R710 clients from devices'}
            >
              {syncing ? 'Syncing...' : '📶 Sync R710'}
            </button>
            <button
              onClick={() => fetchClients(false)}
              disabled={refreshing}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Clients</div>
              <div className="text-2xl font-bold text-foreground mt-1">{statistics.total}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Online</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{statistics.online}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Offline</div>
              <div className="text-2xl font-bold text-gray-500 mt-1">{statistics.offline}</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">📡 ESP32</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {statistics.bySystem.ESP32.online}/{statistics.esp32}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">📶 R710</div>
              <div className="text-2xl font-bold text-foreground mt-1">
                {statistics.bySystem.R710.online}/{statistics.r710}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* System Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                System
              </label>
              <select
                value={systemFilter}
                onChange={(e) => {
                  setSystemFilter(e.target.value as 'BOTH' | 'ESP32' | 'R710')
                  setOffset(0)
                }}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
              >
                <option value="BOTH">Both (ESP32 + R710)</option>
                <option value="ESP32">📡 ESP32 Only</option>
                <option value="R710">📶 R710 Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | 'online' | 'offline')
                  setOffset(0)
                }}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
              >
                <option value="all">All</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* Business Filter */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Business
              </label>
              <select
                value={selectedBusiness}
                onChange={(e) => {
                  setSelectedBusiness(e.target.value)
                  setOffset(0)
                }}
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
              >
                <option value="">All Businesses</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name} ({business.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="MAC address, hostname, IP, device type..."
                className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading connected clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No connected clients found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      System
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Device
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      MAC Address
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Business
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Token
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                      Bandwidth
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {client.system === 'ESP32' ? '📡 ESP32' : '📶 R710'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {client.isOnline ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            🟢 Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                            ⚪ Offline
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div>{client.hostname || 'Unknown'}</div>
                        {client.deviceType && (
                          <div className="text-xs text-muted-foreground">{client.deviceType}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-foreground">
                        {client.macAddress}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-foreground">
                        {client.ipAddress || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div>{client.business.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {client.business.type}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-foreground">
                        {client.system === 'ESP32' ? (
                          <div>
                            <div>{client.tokenInfo.token}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.tokenInfo.status}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div>{client.tokenInfo.username}</div>
                            <div className="text-xs text-muted-foreground">
                              {client.tokenInfo.password}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {formatDuration(client.connectedAt, client.disconnectedAt, client.isOnline)}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div>↓ {formatBytes(client.bandwidthUsedDown)}</div>
                        <div className="text-xs text-muted-foreground">
                          ↑ {formatBytes(client.bandwidthUsedUp)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && clients.length > 0 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} clients
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={!hasMore}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
