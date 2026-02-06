'use client'

import { useState, useEffect } from 'react'

interface SourceBusiness {
  id: string
  name: string
  configCount: number
}

interface SourceConfig {
  id: string
  name: string
  description: string | null
  durationValue: number
  durationUnit: string
  deviceLimit: number
  basePrice: number
}

interface CloneTokenConfigsModalProps {
  isOpen: boolean
  onClose: () => void
  onCloned: () => void
  currentBusinessId: string
}

export function CloneTokenConfigsModal({
  isOpen,
  onClose,
  onCloned,
  currentBusinessId
}: CloneTokenConfigsModalProps) {
  const [businesses, setBusinesses] = useState<SourceBusiness[]>([])
  const [selectedBusinessId, setSelectedBusinessId] = useState('')
  const [configs, setConfigs] = useState<SourceConfig[]>([])
  const [selectedConfigIds, setSelectedConfigIds] = useState<Set<string>>(new Set())
  const [targetWlanId, setTargetWlanId] = useState<string | null>(null)

  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [loadingWlan, setLoadingWlan] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSelectedBusinessId('')
      setConfigs([])
      setSelectedConfigIds(new Set())
      setError(null)
      setSuccessMessage(null)
      loadBusinesses()
      loadTargetWlan()
    }
  }, [isOpen, currentBusinessId])

  const loadBusinesses = async () => {
    try {
      setLoadingBusinesses(true)
      const response = await fetch(
        `/api/r710/businesses-with-configs?excludeBusinessId=${currentBusinessId}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setBusinesses(data.businesses || [])
      } else {
        setError('Failed to load businesses')
      }
    } catch (err) {
      console.error('Failed to load businesses:', err)
      setError('Failed to load businesses')
    } finally {
      setLoadingBusinesses(false)
    }
  }

  const loadTargetWlan = async () => {
    try {
      setLoadingWlan(true)
      const response = await fetch(
        `/api/r710/integration?businessId=${currentBusinessId}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.hasIntegration && data.integration.wlans?.length > 0) {
          setTargetWlanId(data.integration.wlans[0].id)
        } else {
          setError('No WLAN found for this business. Set up R710 integration first.')
        }
      }
    } catch (err) {
      console.error('Failed to load WLAN:', err)
      setError('Failed to load WLAN information')
    } finally {
      setLoadingWlan(false)
    }
  }

  const loadConfigs = async (businessId: string) => {
    try {
      setLoadingConfigs(true)
      setSelectedConfigIds(new Set())
      setError(null)

      const response = await fetch(
        `/api/r710/token-configs?businessId=${businessId}`,
        { credentials: 'include' }
      )

      if (response.ok) {
        const data = await response.json()
        setConfigs(data.configs || [])
      } else {
        setError('Failed to load token configs')
      }
    } catch (err) {
      console.error('Failed to load configs:', err)
      setError('Failed to load token configs')
    } finally {
      setLoadingConfigs(false)
    }
  }

  const handleBusinessChange = (businessId: string) => {
    setSelectedBusinessId(businessId)
    setConfigs([])
    setSelectedConfigIds(new Set())
    setSuccessMessage(null)
    if (businessId) {
      loadConfigs(businessId)
    }
  }

  const toggleConfig = (configId: string) => {
    setSelectedConfigIds(prev => {
      const next = new Set(prev)
      if (next.has(configId)) {
        next.delete(configId)
      } else {
        next.add(configId)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedConfigIds.size === configs.length) {
      setSelectedConfigIds(new Set())
    } else {
      setSelectedConfigIds(new Set(configs.map(c => c.id)))
    }
  }

  const handleClone = async () => {
    if (!targetWlanId || selectedConfigIds.size === 0) return

    try {
      setCloning(true)
      setError(null)

      const response = await fetch('/api/r710/token-configs/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceBusinessId: selectedBusinessId,
          targetBusinessId: currentBusinessId,
          targetWlanId,
          configIds: Array.from(selectedConfigIds)
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccessMessage(data.message)
        setSelectedConfigIds(new Set())
        onCloned()
      } else {
        setError(data.error || 'Failed to clone configurations')
      }
    } catch (err) {
      console.error('Clone failed:', err)
      setError('Failed to clone configurations')
    } finally {
      setCloning(false)
    }
  }

  const formatDuration = (value: number, unit: string) => {
    const unitDisplay = unit.split('_')[1] || unit
    return `${value} ${value === 1 ? unitDisplay.slice(0, -1) : unitDisplay}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Clone Token Packages
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Copy token package definitions from another business
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success */}
          {successMessage && (
            <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-800 dark:text-green-300">{successMessage}</p>
            </div>
          )}

          {/* Business Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Clone from Business
            </label>
            {loadingBusinesses || loadingWlan ? (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Loading...
              </div>
            ) : businesses.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No other businesses have token packages to clone.
              </p>
            ) : (
              <select
                value={selectedBusinessId}
                onChange={(e) => handleBusinessChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a business...</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.configCount} package{b.configCount !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Loading Configs */}
          {loadingConfigs && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
              Loading token packages...
            </div>
          )}

          {/* Config List */}
          {!loadingConfigs && configs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select packages to clone ({selectedConfigIds.size} of {configs.length} selected)
                </span>
                <button
                  onClick={toggleAll}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  {selectedConfigIds.size === configs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="space-y-2">
                {configs.map(config => (
                  <label
                    key={config.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedConfigIds.has(config.id)
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedConfigIds.has(config.id)}
                      onChange={() => toggleConfig(config.id)}
                      className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded mr-3 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {config.name}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2">
                          {formatCurrency(config.basePrice)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDuration(config.durationValue, config.durationUnit)}
                        {' · '}
                        {config.deviceLimit} device{config.deviceLimit !== 1 ? 's' : ''}
                        {config.description && ` · ${config.description}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* No configs found */}
          {!loadingConfigs && selectedBusinessId && configs.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No active token packages found for this business.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {successMessage ? 'Done' : 'Cancel'}
          </button>
          {!successMessage && (
            <button
              onClick={handleClone}
              disabled={cloning || selectedConfigIds.size === 0 || !targetWlanId}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {cloning ? (
                <span className="flex items-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cloning...
                </span>
              ) : (
                `Clone ${selectedConfigIds.size} Package${selectedConfigIds.size !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
