'use client'


// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';
import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import Link from 'next/link'

interface MacFilterEntry {
  mac: string
  note?: string
  added_at?: string
}

interface MacFilterData {
  blacklist: MacFilterEntry[]
  whitelist: MacFilterEntry[]
  blacklist_count: number
  whitelist_count: number
  total_count: number
}

export default function ESP32MacFilteringPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute requiredPermission="canManageWifiPortal">
      <MainLayout>
        <ContentLayout>
          <ESP32MacFilteringContent params={params} />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function ESP32MacFilteringContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const user = session?.user as any
  const { hasPermission } = useBusinessPermissionsContext()

  const [macData, setMacData] = useState<MacFilterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'blacklist' | 'whitelist'>('blacklist')

  // Add to blacklist
  const [newBlacklistToken, setNewBlacklistToken] = useState('')
  const [blacklistReason, setBlacklistReason] = useState('')

  // Add to whitelist
  const [newWhitelistToken, setNewWhitelistToken] = useState('')
  const [whitelistNote, setWhitelistNote] = useState('VIP access')

  useEffect(() => {
    loadMacFilters()
  }, [resolvedParams.id])

  const loadMacFilters = async () => {
    try {
      setLoading(true)

      const response = await fetch(`/api/esp32/${resolvedParams.id}/mac-list`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setMacData(data.data)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to load MAC filters')
      }
    } catch (error) {
      console.error('Failed to load MAC filters:', error)
      setError('Failed to load MAC filters')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToBlacklist = async () => {
    if (!newBlacklistToken.trim()) {
      setError('Token is required')
      return
    }

    try {
      setProcessing(true)
      setError('')

      const response = await fetch(`/api/esp32/${resolvedParams.id}/mac-blacklist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          token: newBlacklistToken.trim(),
          reason: blacklistReason.trim() || 'Blocked by admin'
        })
      })

      if (response.ok) {
        setNewBlacklistToken('')
        setBlacklistReason('')
        await loadMacFilters()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to add to blacklist')
      }
    } catch (error) {
      console.error('Failed to add to blacklist:', error)
      setError('Failed to add to blacklist')
    } finally {
      setProcessing(false)
    }
  }

  const handleAddToWhitelist = async () => {
    if (!newWhitelistToken.trim()) {
      setError('Token is required')
      return
    }

    try {
      setProcessing(true)
      setError('')

      const response = await fetch(`/api/esp32/${resolvedParams.id}/mac-whitelist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          token: newWhitelistToken.trim(),
          note: whitelistNote.trim() || 'VIP access'
        })
      })

      if (response.ok) {
        setNewWhitelistToken('')
        setWhitelistNote('VIP access')
        await loadMacFilters()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to add to whitelist')
      }
    } catch (error) {
      console.error('Failed to add to whitelist:', error)
      setError('Failed to add to whitelist')
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveMac = async (mac: string, list: 'blacklist' | 'whitelist') => {
    if (!confirm(`Remove ${mac} from ${list}?`)) {
      return
    }

    try {
      setProcessing(true)
      setError('')

      const response = await fetch(`/api/esp32/${resolvedParams.id}/mac-remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          mac,
          list
        })
      })

      if (response.ok) {
        await loadMacFilters()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to remove MAC')
      }
    } catch (error) {
      console.error('Failed to remove MAC:', error)
      setError('Failed to remove MAC')
    } finally {
      setProcessing(false)
    }
  }

  const handleClearAll = async (list: 'blacklist' | 'whitelist' | 'both') => {
    const confirmMsg = list === 'both'
      ? 'Clear ALL MAC filters (blacklist and whitelist)? This cannot be undone.'
      : `Clear entire ${list}? This cannot be undone.`

    if (!confirm(confirmMsg)) {
      return
    }

    // Check admin permission for destructive operations
    if (!hasPermission('isAdmin')) {
      setError('Only administrators can clear all MAC filters')
      return
    }

    try {
      setProcessing(true)
      setError('')

      const response = await fetch(`/api/esp32/${resolvedParams.id}/mac-clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ list })
      })

      if (response.ok) {
        await loadMacFilters()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to clear MAC filters')
      }
    } catch (error) {
      console.error('Failed to clear MAC filters:', error)
      setError('Failed to clear MAC filters')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading MAC filters...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Link href="/wifi-portal" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📡 ESP32 MAC Filtering
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage blacklist (blocked) and whitelist (VIP) MAC addresses
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Stats */}
      {macData && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Blacklist (Blocked)</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{macData.blacklist_count}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Whitelist (VIP)</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{macData.whitelist_count}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="text-sm text-gray-500 dark:text-gray-400">Total Filtered</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{macData.total_count}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'blacklist'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            🚫 Blacklist ({macData?.blacklist_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('whitelist')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'whitelist'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            ✅ Whitelist ({macData?.whitelist_count || 0})
          </button>
        </nav>
      </div>

      {/* Blacklist Tab */}
      {activeTab === 'blacklist' && (
        <div className="space-y-6">
          {/* Add to Blacklist */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Block Device</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={newBlacklistToken}
                onChange={(e) => setNewBlacklistToken(e.target.value)}
                placeholder="Enter WiFi token"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                type="text"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Reason (optional)"
                maxLength={31}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                onClick={handleAddToBlacklist}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Adding...' : 'Block Device'}
              </button>
            </div>
          </div>

          {/* Blacklist Table */}
          {macData && macData.blacklist.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Blocked Devices</h2>
                {hasPermission('isAdmin') && (
                  <button
                    onClick={() => handleClearAll('blacklist')}
                    disabled={processing}
                    className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        MAC Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {macData.blacklist.map((entry) => (
                      <tr key={entry.mac}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                          {entry.mac}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {entry.note || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleRemoveMac(entry.mac, 'blacklist')}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {macData && macData.blacklist.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <p className="text-gray-500 dark:text-gray-400">No blocked devices</p>
            </div>
          )}
        </div>
      )}

      {/* Whitelist Tab */}
      {activeTab === 'whitelist' && (
        <div className="space-y-6">
          {/* Add to Whitelist */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add VIP Device</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                value={newWhitelistToken}
                onChange={(e) => setNewWhitelistToken(e.target.value)}
                placeholder="Enter WiFi token"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <input
                type="text"
                value={whitelistNote}
                onChange={(e) => setWhitelistNote(e.target.value)}
                placeholder="Note (optional)"
                maxLength={31}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                onClick={handleAddToWhitelist}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Adding...' : 'Add VIP Device'}
              </button>
            </div>
          </div>

          {/* Whitelist Table */}
          {macData && macData.whitelist.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">VIP Devices</h2>
                {hasPermission('isAdmin') && (
                  <button
                    onClick={() => handleClearAll('whitelist')}
                    disabled={processing}
                    className="px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        MAC Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Note
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {macData.whitelist.map((entry) => (
                      <tr key={entry.mac}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                          {entry.mac}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {entry.note || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleRemoveMac(entry.mac, 'whitelist')}
                            disabled={processing}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {macData && macData.whitelist.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <p className="text-gray-500 dark:text-gray-400">No VIP devices</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
