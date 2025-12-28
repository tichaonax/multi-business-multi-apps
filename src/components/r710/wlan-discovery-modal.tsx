'use client'

import { useState, useEffect } from 'react'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface DiscoveredWLAN {
  name: string
  ssid: string
  wlanId: string
  description: string
  usage: string
  isGuest: boolean
  guestServiceId: string
  enableFriendlyKey: boolean
  isActive: boolean
  registeredInDatabase: boolean
  databaseId?: string
}

interface WLANDiscoveryModalProps {
  isOpen: boolean
  onClose: () => void
  onWLANRegistered: () => void
}

export function WLANDiscoveryModal({ isOpen, onClose, onWLANRegistered }: WLANDiscoveryModalProps) {
  const { activeBusinesses } = useBusinessPermissionsContext()
  const [loading, setLoading] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [discoveredWlans, setDiscoveredWlans] = useState<DiscoveredWLAN[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      loadDevices()
    }
  }, [isOpen])

  const loadDevices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/r710/devices', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices || [])
        if (data.devices?.length > 0) {
          setSelectedDeviceId(data.devices[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load devices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDiscover = async () => {
    if (!selectedDeviceId) {
      setError('Please select a device')
      return
    }

    setDiscovering(true)
    setError(null)
    setDiscoveredWlans([])

    try {
      const response = await fetch(`/api/r710/discover-wlans?deviceId=${selectedDeviceId}`, {
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setDiscoveredWlans(data.wlans || [])
      } else {
        setError(data.error || 'Failed to discover WLANs')
      }
    } catch (error) {
      console.error('Discovery failed:', error)
      setError('Failed to discover WLANs from device')
    } finally {
      setDiscovering(false)
    }
  }

  const handleRegister = async (wlan: DiscoveredWLAN) => {
    if (!selectedBusinessId) {
      setError('Please select a business to register this WLAN to')
      return
    }

    setRegistering(true)
    setError(null)

    try {
      const response = await fetch('/api/r710/register-wlan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          businessId: selectedBusinessId,
          deviceId: selectedDeviceId,
          wlanId: wlan.wlanId,
          ssid: wlan.ssid
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh discovery
        await handleDiscover()
        onWLANRegistered()
      } else {
        setError(data.error || 'Failed to register WLAN')
      }
    } catch (error) {
      console.error('Registration failed:', error)
      setError('Failed to register WLAN')
    } finally {
      setRegistering(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Discover R710 WLANs
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
            Query the R710 device to find available WLANs and register them to businesses
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Device Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              R710 Device
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              disabled={loading || discovering}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white disabled:opacity-50"
            >
              <option value="">Select device...</option>
              {devices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.ipAddress} - {device.description || 'No description'}
                </option>
              ))}
            </select>
          </div>

          {/* Discover Button */}
          <div className="mb-6">
            <button
              onClick={handleDiscover}
              disabled={!selectedDeviceId || discovering}
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {discovering ? (
                <span className="flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Discovering WLANs...
                </span>
              ) : (
                'Discover WLANs from Device'
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Discovered WLANs */}
          {discoveredWlans.length > 0 && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Discovered WLANs ({discoveredWlans.length})
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {discoveredWlans.filter(w => w.registeredInDatabase).length} registered
                  </span>
                  {' • '}
                  <span className="text-gray-600 dark:text-gray-400">
                    {discoveredWlans.filter(w => !w.registeredInDatabase).length} unregistered
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {discoveredWlans.map((wlan, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      wlan.registeredInDatabase
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-base font-medium text-gray-900 dark:text-white">
                            {wlan.ssid}
                          </h4>
                          {wlan.registeredInDatabase && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              ✓ Registered
                            </span>
                          )}
                          {wlan.isGuest && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                              Guest
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <div>WLAN ID: <span className="font-mono text-xs">{wlan.wlanId}</span></div>
                          <div>Guest Service: <span className="font-mono text-xs">{wlan.guestServiceId}</span></div>
                          <div>Usage: {wlan.usage} | Friendly Key: {wlan.enableFriendlyKey ? 'Yes' : 'No'}</div>
                        </div>
                      </div>

                      {!wlan.registeredInDatabase && (
                        <div className="ml-4">
                          <select
                            value={selectedBusinessId}
                            onChange={(e) => setSelectedBusinessId(e.target.value)}
                            disabled={registering}
                            className="mb-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select business...</option>
                            {activeBusinesses?.map(business => (
                              <option key={business.businessId} value={business.businessId}>
                                {business.businessName}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRegister(wlan)}
                            disabled={registering || !selectedBusinessId}
                            className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {registering ? 'Registering...' : 'Register'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
