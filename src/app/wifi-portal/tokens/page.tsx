'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { ContentLayout } from '@/components/layout/content-layout'
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'
import { formatCurrency } from '@/lib/format-currency'
import type { TokenListItem, MacFilterEntry } from '@/lib/wifi-portal/api-client'

type TabType = 'ledger' | 'portal-tokens' | 'bulk-create' | 'mac-filters'

interface WifiTokenDevice {
  id: string
  macAddress: string
  isOnline: boolean
  currentIp: string | null
  firstSeen: string | Date
  lastSeen: string | Date
}

interface WifiToken {
  id: string
  businessId: string
  token: string
  status: string
  expiresAt: string | Date | null
  createdAt: string | Date
  lastSyncedAt: string | Date | null
  bandwidthUsedDown: number | string | null
  bandwidthUsedUp: number | string | null
  usageCount: number | null
  // Device tracking (v3.4)
  hostname: string | null
  deviceType: string | null
  firstSeen: string | Date | null
  lastSeen: string | Date | null
  deviceCount: number
  primaryMac: string | null
  wifi_token_devices?: WifiTokenDevice[]
  tokenConfig: {
    name: string
    durationMinutes: number
    bandwidthDownMb: number
    bandwidthUpMb: number
  }
}

interface TokenConfig {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  bandwidthDownMb: number
  bandwidthUpMb: number
  basePrice: number
  isActive: boolean
}

export default function WiFiTokensPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { currentBusinessId, currentBusiness, loading: businessLoading } = useBusinessPermissionsContext()
  const confirm = useConfirm()
  const alert = useAlert()

  const [activeTab, setActiveTab] = useState<TabType>('ledger')
  const [loading, setLoading] = useState(true)

  // Ledger Tab
  const [tokens, setTokens] = useState<WifiToken[]>([])
  const [filteredTokens, setFilteredTokens] = useState<WifiToken[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set())

  // Portal Tokens Tab
  const [portalTokens, setPortalTokens] = useState<TokenListItem[]>([])
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalSearchQuery, setPortalSearchQuery] = useState('')
  const [portalStatusFilter, setPortalStatusFilter] = useState<string>('ALL')
  const [selectedPortalTokens, setSelectedPortalTokens] = useState<Set<string>>(new Set())

  // Bulk Create Tab
  const [bulkConfigs, setBulkConfigs] = useState<TokenConfig[]>([])
  const [selectedConfig, setSelectedConfig] = useState<string>('')
  const [bulkQuantity, setBulkQuantity] = useState<number>(10)
  const [bulkCreating, setBulkCreating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)

  // MAC Filters Tab
  const [macFilters, setMacFilters] = useState<{ blacklist: MacFilterEntry[]; whitelist: MacFilterEntry[] }>({ blacklist: [], whitelist: [] })
  const [macLoading, setMacLoading] = useState(false)
  const [macSearchQuery, setMacSearchQuery] = useState('')
  const [manualMac, setManualMac] = useState('')
  const [manualMacType, setManualMacType] = useState<'blacklist' | 'whitelist'>('blacklist')
  const [manualMacNote, setManualMacNote] = useState('')
  const [addingMac, setAddingMac] = useState(false)

  const [syncing, setSyncing] = useState<string | null>(null)
  const [batchSyncing, setBatchSyncing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const canManage = session?.user ? (isSystemAdmin(session.user) || hasPermission(session.user, 'canSellWifiTokens')) : false

  useEffect(() => {
    if (businessLoading || !currentBusinessId) return

    // Check business type
    if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
      setErrorMessage('WiFi tokens are only available for restaurant and grocery businesses')
      setLoading(false)
      return
    }

    if (!canManage) {
      router.push('/dashboard')
      return
    }

    fetchTokens()
    fetchTokenConfigs()
  }, [currentBusinessId, businessLoading])

  useEffect(() => {
    // Apply filters to ledger tokens
    let filtered = tokens

    if (searchQuery) {
      filtered = filtered.filter(token =>
        token.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.tokenConfig.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(token => token.status === statusFilter)
    }

    setFilteredTokens(filtered)
  }, [tokens, searchQuery, statusFilter])

  const fetchTokens = async () => {
    if (!currentBusinessId) return

    try {
      setLoading(true)
      setErrorMessage(null)

      const response = await fetch(`/api/wifi-portal/tokens?businessId=${currentBusinessId}&limit=200`)

      if (response.ok) {
        const data = await response.json()
        setTokens(data.tokens || [])
      } else {
        throw new Error('Failed to fetch tokens')
      }
    } catch (error) {
      console.error('Error fetching tokens:', error)
      setErrorMessage('Failed to load WiFi tokens from database')
    } finally {
      setLoading(false)
    }
  }

  const fetchPortalTokens = async () => {
    if (!currentBusinessId) return

    try {
      setPortalLoading(true)
      setErrorMessage(null)

      const response = await fetch(`/api/wifi-portal/integration/tokens/list?businessId=${currentBusinessId}`)

      if (response.ok) {
        const data = await response.json()
        setPortalTokens(data.tokens || [])
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch portal tokens')
      }
    } catch (error: any) {
      console.error('Error fetching portal tokens:', error)
      setErrorMessage(error.message || 'Failed to load tokens from ESP32 Portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const fetchTokenConfigs = async () => {
    try {
      const response = await fetch('/api/wifi-portal/token-configs')

      if (response.ok) {
        const data = await response.json()
        setBulkConfigs(data.configs?.filter((c: TokenConfig) => c.isActive) || [])
        if (data.configs?.length > 0) {
          setSelectedConfig(data.configs[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching token configs:', error)
    }
  }

  const fetchMacFilters = async () => {
    if (!currentBusinessId) return

    try {
      setMacLoading(true)
      setErrorMessage(null)

      const response = await fetch(`/api/wifi-portal/integration/mac/list?businessId=${currentBusinessId}`)

      if (response.ok) {
        const data = await response.json()
        setMacFilters({
          blacklist: data.blacklist || [],
          whitelist: data.whitelist || []
        })
      } else {
        throw new Error('Failed to fetch MAC filters')
      }
    } catch (error: any) {
      console.error('Error fetching MAC filters:', error)
      setErrorMessage(error.message || 'Failed to load MAC filters')
    } finally {
      setMacLoading(false)
    }
  }

  const handleSyncToken = async (tokenId: string) => {
    try {
      setSyncing(tokenId)
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/wifi-portal/tokens/${tokenId}/sync`, {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Token usage synced successfully!')
        fetchTokens()
      } else {
        setErrorMessage(data.error || 'Failed to sync token')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to sync token')
    } finally {
      setSyncing(null)
    }
  }

  const handleBatchSync = async () => {
    if (!currentBusinessId || filteredTokens.length === 0) return

    try {
      setBatchSyncing(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      // Only sync ACTIVE tokens (skip expired ones that were removed from ESP32)
      const activeTokens = filteredTokens.filter(t => t.status === 'ACTIVE')
      if (activeTokens.length === 0) {
        setErrorMessage('No active tokens to sync')
        setBatchSyncing(false)
        return
      }

      // Batch in groups of 50
      const tokensToSync = activeTokens.map(t => t.token)
      const batches = []
      for (let i = 0; i < tokensToSync.length; i += 50) {
        batches.push(tokensToSync.slice(i, i + 50))
      }

      for (const batch of batches) {
        const response = await fetch('/api/wifi-portal/tokens/sync-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: currentBusinessId,
            tokens: batch,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to sync batch')
        }
      }

      setSuccessMessage(`Successfully synced ${tokensToSync.length} tokens!`)
      fetchTokens()
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to batch sync tokens')
    } finally {
      setBatchSyncing(false)
    }
  }

  const handleMacAction = async (mac: string, action: 'blacklist' | 'whitelist') => {
    if (!currentBusinessId) return

    const confirmed = await confirm({
      title: `${action === 'blacklist' ? 'Blacklist' : 'Whitelist'} MAC Address`,
      description: `Are you sure you want to ${action} ${mac}?`,
      confirmText: action === 'blacklist' ? 'Blacklist' : 'Whitelist',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/wifi-portal/integration/mac/${action}?businessId=${currentBusinessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`MAC address ${action === 'blacklist' ? 'blacklisted' : 'whitelisted'} successfully!`)
        fetchMacFilters() // Refresh the list
      } else {
        setErrorMessage(data.error || `Failed to ${action} MAC address`)
      }
    } catch (error: any) {
      setErrorMessage(error.message || `Failed to ${action} MAC address`)
    }
  }

  const handleManualMacSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate MAC address format
    const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i
    if (!macRegex.test(manualMac)) {
      setErrorMessage('Invalid MAC address format. Use XX:XX:XX:XX:XX:XX')
      return
    }

    if (!currentBusinessId) return

    try {
      setAddingMac(true)
      setErrorMessage(null)
      setSuccessMessage(null)

      const body: any = { mac: manualMac.toUpperCase() }
      if (manualMacNote.trim()) {
        if (manualMacType === 'blacklist') {
          body.reason = manualMacNote.trim().substring(0, 31)
        } else {
          body.note = manualMacNote.trim().substring(0, 31)
        }
      }

      const response = await fetch(`/api/wifi-portal/integration/mac/${manualMacType}?businessId=${currentBusinessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`MAC address ${manualMacType === 'blacklist' ? 'blacklisted' : 'whitelisted'} successfully!`)
        setManualMac('')
        setManualMacNote('')
        fetchMacFilters()
      } else {
        setErrorMessage(data.error || `Failed to ${manualMacType} MAC address`)
      }
    } catch (error: any) {
      setErrorMessage(error.message || `Failed to ${manualMacType} MAC address`)
    } finally {
      setAddingMac(false)
    }
  }

  const handleDisableToken = async (token: WifiToken) => {
    const confirmed = await confirm({
      title: 'Disable Token',
      description: `Are you sure you want to disable token ${token.token}? This action cannot be undone.`,
      confirmText: 'Disable',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setErrorMessage(null)
      setSuccessMessage(null)

      const response = await fetch(`/api/wifi-portal/tokens/${token.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable' }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Token disabled successfully!')
        fetchTokens()
      } else {
        setErrorMessage(data.error || 'Failed to disable token')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to disable token')
    }
  }

  const handleBulkDisable = async () => {
    if (selectedTokens.size === 0) {
      await alert({
        title: 'No Tokens Selected',
        description: 'Please select at least one token to disable.',
      })
      return
    }

    const confirmed = await confirm({
      title: 'Bulk Disable Tokens',
      description: `Are you sure you want to disable ${selectedTokens.size} token(s)? This action cannot be undone.`,
      confirmText: 'Disable All',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setErrorMessage(null)
      let successCount = 0
      let failCount = 0

      for (const tokenId of selectedTokens) {
        try {
          const response = await fetch(`/api/wifi-portal/tokens/${tokenId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'disable' }),
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      setSuccessMessage(`Successfully disabled ${successCount} token(s)${failCount > 0 ? `, ${failCount} failed` : ''}`)
      setSelectedTokens(new Set())
      fetchTokens()
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to bulk disable tokens')
    }
  }

  const handleBulkCreate = async () => {
    if (!selectedConfig) {
      await alert({
        title: 'No Configuration Selected',
        description: 'Please select a token configuration.',
      })
      return
    }

    if (bulkQuantity < 1 || bulkQuantity > 100) {
      await alert({
        title: 'Invalid Quantity',
        description: 'Please enter a quantity between 1 and 100.',
      })
      return
    }

    const confirmed = await confirm({
      title: 'Create Bulk Tokens',
      description: `Are you sure you want to create ${bulkQuantity} WiFi tokens? These will be created on the ESP32 Portal and saved to the database.`,
      confirmText: 'Create Tokens',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setBulkCreating(true)
      setBulkProgress(0)
      setErrorMessage(null)

      const config = bulkConfigs.find(c => c.id === selectedConfig)
      if (!config) throw new Error('Configuration not found')

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < bulkQuantity; i++) {
        try {
          const response = await fetch('/api/wifi-portal/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId: currentBusinessId,
              tokenConfigId: selectedConfig,
              isPrepaid: true, // Mark as pre-created for bulk sale
            }),
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }

          setBulkProgress(Math.round(((i + 1) / bulkQuantity) * 100))
        } catch {
          failCount++
        }
      }

      setSuccessMessage(`Successfully created ${successCount} token(s)${failCount > 0 ? `, ${failCount} failed` : ''}`)
      fetchTokens()
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to bulk create tokens')
    } finally {
      setBulkCreating(false)
      setBulkProgress(0)
    }
  }

  const handleDisablePortalToken = async (token: string) => {
    const confirmed = await confirm({
      title: 'Disable Portal Token',
      description: `Are you sure you want to disable token ${token} on the ESP32 Portal? This will immediately revoke access.`,
      confirmText: 'Disable',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setErrorMessage(null)

      const response = await fetch(`/api/wifi-portal/integration/tokens/disable?businessId=${currentBusinessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Token disabled on portal successfully!')
        fetchPortalTokens()
      } else {
        setErrorMessage(data.error || 'Failed to disable token on portal')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to disable token on portal')
    }
  }

  const handleBulkDisablePortal = async () => {
    if (selectedPortalTokens.size === 0) {
      await alert({
        title: 'No Tokens Selected',
        description: 'Please select at least one token to disable.',
      })
      return
    }

    const confirmed = await confirm({
      title: 'Bulk Disable Portal Tokens',
      description: `Are you sure you want to disable ${selectedPortalTokens.size} token(s) on the ESP32 Portal? This will immediately revoke access.`,
      confirmText: 'Disable All',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setErrorMessage(null)
      let successCount = 0
      let failCount = 0

      for (const token of selectedPortalTokens) {
        try {
          const response = await fetch(`/api/wifi-portal/integration/tokens/disable?businessId=${currentBusinessId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      setSuccessMessage(`Successfully disabled ${successCount} token(s)${failCount > 0 ? `, ${failCount} failed` : ''}`)
      setSelectedPortalTokens(new Set())
      fetchPortalTokens()
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to bulk disable portal tokens')
    }
  }

  const handleBlacklistMac = async (mac: string, token: string) => {
    const confirmed = await confirm({
      title: 'Blacklist Device',
      description: `Are you sure you want to blacklist MAC address ${mac}? This device will be permanently blocked from accessing the network.`,
      confirmText: 'Blacklist',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setErrorMessage(null)

      const response = await fetch(`/api/wifi-portal/integration/mac/blacklist?businessId=${currentBusinessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reason: 'Blocked by admin' }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('Device blacklisted successfully!')
        fetchMacFilters()
      } else {
        setErrorMessage(data.error || 'Failed to blacklist device')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to blacklist device')
    }
  }

  const handleRemoveMacFilter = async (mac: string, list: 'blacklist' | 'whitelist') => {
    const confirmed = await confirm({
      title: `Remove from ${list === 'blacklist' ? 'Blacklist' : 'Whitelist'}`,
      description: `Are you sure you want to remove MAC address ${mac} from the ${list}?`,
      confirmText: 'Remove',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    try {
      setErrorMessage(null)

      const response = await fetch(`/api/wifi-portal/integration/mac/remove?businessId=${currentBusinessId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac, list }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage('MAC filter removed successfully!')
        fetchMacFilters()
      } else {
        setErrorMessage(data.error || 'Failed to remove MAC filter')
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to remove MAC filter')
    }
  }

  const formatDuration = (minutes: number): string => {
    if (!minutes || isNaN(minutes) || minutes <= 0) return 'N/A'
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const formatDateTime = (dateStr: string | number | Date | null | undefined): string => {
    if (!dateStr) return 'N/A'
    const date = dateStr instanceof Date ? dateStr : (typeof dateStr === 'number' ? new Date(dateStr * 1000) : new Date(dateStr))
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatBandwidth = (mb: number | string | null | undefined): string => {
    if (mb === null || mb === undefined || mb === '') return 'N/A'

    // Convert to number if it's a string
    const numValue = typeof mb === 'string' ? parseFloat(mb) : mb

    // Check if it's a valid number
    if (isNaN(numValue) || !isFinite(numValue)) return 'N/A'

    if (numValue >= 1024) {
      return `${(numValue / 1024).toFixed(2)} GB`
    }
    return `${numValue.toFixed(0)} MB`
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; darkBg: string; text: string; darkText: string; label: string }> = {
      ACTIVE: { bg: 'bg-green-100', darkBg: 'dark:bg-green-900/20', text: 'text-green-800', darkText: 'dark:text-green-200', label: '● Active' },
      active: { bg: 'bg-green-100', darkBg: 'dark:bg-green-900/20', text: 'text-green-800', darkText: 'dark:text-green-200', label: '● Active' },
      EXPIRED: { bg: 'bg-gray-100', darkBg: 'dark:bg-gray-700', text: 'text-gray-800', darkText: 'dark:text-gray-200', label: '● Expired' },
      expired: { bg: 'bg-gray-100', darkBg: 'dark:bg-gray-700', text: 'text-gray-800', darkText: 'dark:text-gray-200', label: '● Expired' },
      DISABLED: { bg: 'bg-red-100', darkBg: 'dark:bg-red-900/20', text: 'text-red-800', darkText: 'dark:text-red-200', label: '● Disabled' },
      unused: { bg: 'bg-blue-100', darkBg: 'dark:bg-blue-900/20', text: 'text-blue-800', darkText: 'dark:text-blue-200', label: '● Unused' },
    }

    const config = statusMap[status] || statusMap.EXPIRED
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.darkBg} ${config.text} ${config.darkText}`}>
        {config.label}
      </span>
    )
  }

  const filteredPortalTokens = portalTokens.filter(token => {
    const matchesSearch = portalSearchQuery === '' ||
      token.token.toLowerCase().includes(portalSearchQuery.toLowerCase())
    const matchesStatus = portalStatusFilter === 'ALL' || token.status === portalStatusFilter.toLowerCase()
    return matchesSearch && matchesStatus
  })

  const filteredMacBlacklist = macFilters.blacklist.filter(entry =>
    macSearchQuery === '' || entry.mac.toLowerCase().includes(macSearchQuery.toLowerCase())
  )

  const filteredMacWhitelist = macFilters.whitelist.filter(entry =>
    macSearchQuery === '' || entry.mac.toLowerCase().includes(macSearchQuery.toLowerCase())
  )

  if (businessLoading || loading) {
    return (
      <ContentLayout title="WiFi Token Management">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </ContentLayout>
    )
  }

  if (currentBusiness?.businessType !== 'restaurant' && currentBusiness?.businessType !== 'grocery') {
    return (
      <ContentLayout title="WiFi Token Management">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            WiFi tokens are only available for restaurant and grocery businesses.
          </p>
        </div>
      </ContentLayout>
    )
  }

  if (!canManage) {
    return (
      <ContentLayout title="WiFi Token Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            You do not have permission to manage WiFi tokens.
          </p>
        </div>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="WiFi Token Management"
      description="Manage WiFi access tokens, bulk operations, and MAC filtering"
    >
      {/* Status Messages */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200">{successMessage}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'ledger'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            📋 Database Ledger
          </button>
          <button
            onClick={() => {
              setActiveTab('portal-tokens')
              fetchPortalTokens()
            }}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'portal-tokens'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            🌐 Portal Tokens (Live)
          </button>
          <button
            onClick={() => setActiveTab('bulk-create')}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'bulk-create'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            ⚡ Bulk Create
          </button>
          <button
            onClick={() => {
              setActiveTab('mac-filters')
              fetchMacFilters()
            }}
            className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'mac-filters'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            🛡️ MAC Filters
          </button>
        </nav>
      </div>

      {/* Database Ledger Tab */}
      {activeTab === 'ledger' && (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by token code or package name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredTokens.length} of {tokens.length} tokens
                  {selectedTokens.size > 0 && ` • ${selectedTokens.size} selected`}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedTokens.size > 0 && (
                  <button
                    onClick={handleBulkDisable}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    🚫 Disable Selected ({selectedTokens.size})
                  </button>
                )}
                <button
                  onClick={handleBatchSync}
                  disabled={batchSyncing || filteredTokens.filter(t => t.status === 'ACTIVE').length === 0}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sync all active tokens with ESP32 Portal"
                >
                  {batchSyncing ? '⏳ Syncing...' : `⚡ Batch Sync (${filteredTokens.filter(t => t.status === 'ACTIVE').length})`}
                </button>
                <button
                  onClick={fetchTokens}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Tokens Table */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredTokens.length > 0 && selectedTokens.size === filteredTokens.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTokens(new Set(filteredTokens.map(t => t.id)))
                          } else {
                            setSelectedTokens(new Set())
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Token
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Device Info
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredTokens.map((token) => (
                    <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTokens.has(token.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedTokens)
                            if (e.target.checked) {
                              newSet.add(token.id)
                            } else {
                              newSet.delete(token.id)
                            }
                            setSelectedTokens(newSet)
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <code className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                          {token.token}
                        </code>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{token.tokenConfig.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDuration(token.tokenConfig.durationMinutes)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {getStatusBadge(token.status)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatDateTime(token.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {formatDateTime(token.expiresAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-xs space-y-1">
                          <div className="text-gray-700 dark:text-gray-300">
                            📥 {formatBandwidth(token.bandwidthUsedDown)} / {token.tokenConfig.bandwidthDownMb} MB
                          </div>
                          <div className="text-gray-700 dark:text-gray-300">
                            📤 {formatBandwidth(token.bandwidthUsedUp)} / {token.tokenConfig.bandwidthUpMb} MB
                          </div>
                          {token.lastSyncedAt && (
                            <div className="text-gray-500 dark:text-gray-400">
                              Synced: {formatDateTime(token.lastSyncedAt)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs space-y-1">
                          {token.hostname && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{token.hostname}</span>
                              {token.deviceType && (
                                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                                  {token.deviceType}
                                </span>
                              )}
                            </div>
                          )}
                          {token.wifi_token_devices && token.wifi_token_devices.length > 0 && (
                            <div className="space-y-1">
                              {token.wifi_token_devices.map((device) => (
                                <div key={device.id} className="flex items-center gap-2">
                                  <span className={device.isOnline ? '🟢' : '🔴'} title={device.isOnline ? 'Online' : 'Offline'} />
                                  <code className="text-xs text-gray-600 dark:text-gray-400">{device.macAddress}</code>
                                  {device.currentIp && (
                                    <span className="text-gray-500 dark:text-gray-500 text-xs">({device.currentIp})</span>
                                  )}
                                  <button
                                    onClick={() => handleMacAction(device.macAddress, 'blacklist')}
                                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                    title="Blacklist this MAC"
                                  >
                                    ⛔
                                  </button>
                                  <button
                                    onClick={() => handleMacAction(device.macAddress, 'whitelist')}
                                    className="text-xs text-green-600 dark:text-green-400 hover:underline"
                                    title="Whitelist this MAC"
                                  >
                                    ✅
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {(!token.hostname && (!token.wifi_token_devices || token.wifi_token_devices.length === 0)) && (
                            <span className="text-gray-400 dark:text-gray-500">No device info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm space-x-2">
                        <button
                          onClick={() => handleSyncToken(token.id)}
                          disabled={syncing === token.id || token.status !== 'ACTIVE'}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={token.status !== 'ACTIVE' ? 'Token is not active on portal' : 'Sync usage from portal'}
                        >
                          {syncing === token.id ? '⏳' : '🔄'}
                        </button>

                        {token.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleDisableToken(token)}
                            className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                            title="Disable token"
                          >
                            🚫
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTokens.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No tokens found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Portal Tokens Tab */}
      {activeTab === 'portal-tokens' && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              📡 These are live tokens from your ESP32 Portal. This list shows all tokens currently active on the portal device.
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={portalSearchQuery}
                  onChange={(e) => setPortalSearchQuery(e.target.value)}
                  placeholder="Search by token code..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={portalStatusFilter}
                  onChange={(e) => setPortalStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="unused">Unused</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {filteredPortalTokens.length} of {portalTokens.length} portal tokens
                  {selectedPortalTokens.size > 0 && ` • ${selectedPortalTokens.size} selected`}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedPortalTokens.size > 0 && (
                  <button
                    onClick={handleBulkDisablePortal}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                  >
                    🚫 Disable Selected ({selectedPortalTokens.size})
                  </button>
                )}
                <button
                  onClick={fetchPortalTokens}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Portal Tokens Table */}
          {portalLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading portal tokens...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={filteredPortalTokens.length > 0 && selectedPortalTokens.size === filteredPortalTokens.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPortalTokens(new Set(filteredPortalTokens.map(t => t.token)))
                            } else {
                              setSelectedPortalTokens(new Set())
                            }
                          }}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Token
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Remaining
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Bandwidth Used
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Devices
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPortalTokens.map((token) => (
                      <tr key={token.token} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedPortalTokens.has(token.token)}
                            onChange={(e) => {
                              const newSet = new Set(selectedPortalTokens)
                              if (e.target.checked) {
                                newSet.add(token.token)
                              } else {
                                newSet.delete(token.token)
                              }
                              setSelectedPortalTokens(newSet)
                            }}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <code className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                            {token.token}
                          </code>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(token.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {formatDuration(token.durationMinutes)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {token.remainingSeconds > 0 ? formatDuration(Math.floor(token.remainingSeconds / 60)) : 'Expired'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                            <div>📥 {formatBandwidth(token.bandwidthUsedDown)} / {token.bandwidthDownMb} MB</div>
                            <div>📤 {formatBandwidth(token.bandwidthUsedUp)} / {token.bandwidthUpMb} MB</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-700 dark:text-gray-300">
                            <div>{token.deviceCount} / 2 devices</div>
                            {token.clientMacs && token.clientMacs.length > 0 && (
                              <div className="text-gray-500 dark:text-gray-400 mt-1">
                                {token.clientMacs.map((mac, idx) => (
                                  <div key={idx}>{mac}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          {token.status === 'active' && (
                            <button
                              onClick={() => handleDisablePortalToken(token.token)}
                              className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                              title="Disable token on portal"
                            >
                              🚫
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredPortalTokens.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>No portal tokens found matching your filters.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Bulk Create Tab */}
      {activeTab === 'bulk-create' && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              ⚡ Create multiple WiFi tokens at once for pre-sale. These tokens will be created on the ESP32 Portal and saved to the database as unused tokens.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token Package
                </label>
                <select
                  value={selectedConfig}
                  onChange={(e) => setSelectedConfig(e.target.value)}
                  disabled={bulkCreating}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {bulkConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} - {formatDuration(config.durationMinutes)} - {formatCurrency(config.basePrice)}
                    </option>
                  ))}
                </select>
                {bulkConfigs.length === 0 && (
                  <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                    No token configurations available. Please create one first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity (1-100)
                </label>
                <input
                  type="number"
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(parseInt(e.target.value) || 1)}
                  min={1}
                  max={100}
                  disabled={bulkCreating}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {bulkCreating && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Creating tokens...</span>
                    <span>{bulkProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${bulkProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={handleBulkCreate}
                disabled={bulkCreating || !selectedConfig || bulkConfigs.length === 0}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {bulkCreating ? '⏳ Creating...' : `⚡ Create ${bulkQuantity} Token${bulkQuantity > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* MAC Filters Tab */}
      {activeTab === 'mac-filters' && (
        <>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              🛡️ Manage device access control. Blacklisted devices are permanently blocked. Whitelisted devices get VIP bypass access.
            </p>
          </div>

          {/* Manual MAC Entry Form */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ➕ Add MAC Address Manually
            </h3>
            <form onSubmit={handleManualMacSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* MAC Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    MAC Address *
                  </label>
                  <input
                    type="text"
                    value={manualMac}
                    onChange={(e) => setManualMac(e.target.value)}
                    placeholder="XX:XX:XX:XX:XX:XX"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={addingMac}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format: XX:XX:XX:XX:XX:XX</p>
                </div>

                {/* Filter Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Action *
                  </label>
                  <select
                    value={manualMacType}
                    onChange={(e) => setManualMacType(e.target.value as 'blacklist' | 'whitelist')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={addingMac}
                  >
                    <option value="blacklist">🚫 Blacklist (Block)</option>
                    <option value="whitelist">✅ Whitelist (VIP)</option>
                  </select>
                </div>

                {/* Reason/Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {manualMacType === 'blacklist' ? 'Reason' : 'Note'} (optional)
                  </label>
                  <input
                    type="text"
                    value={manualMacNote}
                    onChange={(e) => setManualMacNote(e.target.value)}
                    placeholder={manualMacType === 'blacklist' ? 'e.g., Abuse detected' : 'e.g., Owner device'}
                    maxLength={31}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={addingMac}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 31 characters</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={addingMac || !manualMac.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {addingMac ? '⏳ Adding...' : `➕ Add to ${manualMacType === 'blacklist' ? 'Blacklist' : 'Whitelist'}`}
              </button>
            </form>
          </div>

          {/* Search */}
          <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search MAC Address
              </label>
              <input
                type="text"
                value={macSearchQuery}
                onChange={(e) => setMacSearchQuery(e.target.value)}
                placeholder="Search by MAC address..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {macFilters.blacklist.length} blacklisted • {macFilters.whitelist.length} whitelisted
              </p>
              <button
                onClick={fetchMacFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {macLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading MAC filters...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blacklist */}
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
                <div className="bg-red-50 dark:bg-red-900/20 border-b dark:border-gray-700 px-4 py-3">
                  <h3 className="font-medium text-red-900 dark:text-red-200">🚫 Blacklist ({filteredMacBlacklist.length})</h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">Devices permanently blocked from network access</p>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {filteredMacBlacklist.map((entry) => (
                    <div key={entry.mac} className="border dark:border-gray-600 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <code className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                            {entry.mac}
                          </code>
                          <div className="mt-2 text-xs space-y-1 text-gray-600 dark:text-gray-400">
                            <div><strong>Token:</strong> {entry.token}</div>
                            <div><strong>Reason:</strong> {entry.reason || 'N/A'}</div>
                            <div><strong>Added:</strong> {formatDateTime(entry.added)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMacFilter(entry.mac, 'blacklist')}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                          title="Remove from blacklist"
                        >
                          ✖️
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredMacBlacklist.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      No blacklisted devices
                    </div>
                  )}
                </div>
              </div>

              {/* Whitelist */}
              <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
                <div className="bg-green-50 dark:bg-green-900/20 border-b dark:border-gray-700 px-4 py-3">
                  <h3 className="font-medium text-green-900 dark:text-green-200">✅ Whitelist ({filteredMacWhitelist.length})</h3>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">VIP devices with bypass access</p>
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {filteredMacWhitelist.map((entry) => (
                    <div key={entry.mac} className="border dark:border-gray-600 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <code className="text-sm font-mono text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                            {entry.mac}
                          </code>
                          <div className="mt-2 text-xs space-y-1 text-gray-600 dark:text-gray-400">
                            <div><strong>Token:</strong> {entry.token}</div>
                            <div><strong>Note:</strong> {entry.note || 'N/A'}</div>
                            <div><strong>Added:</strong> {formatDateTime(entry.added)}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMacFilter(entry.mac, 'whitelist')}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-xs"
                          title="Remove from whitelist"
                        >
                          ✖️
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredMacWhitelist.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                      No whitelisted devices
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </ContentLayout>
  )
}
