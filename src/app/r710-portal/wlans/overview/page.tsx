'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { MainLayout } from '@/components/layout/main-layout'
import { ContentLayout } from '@/components/layout/content-layout'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface VLANSlot {
  vlanId: number
  status: 'AVAILABLE' | 'OCCUPIED'
  wlan: {
    wlanId: string
    ssid: string
    business: {
      id: string
      name: string
      type: string
    }
  } | null
}

interface DeviceVLANOverview {
  device: {
    id: string
    ipAddress: string
    description: string | null
    connectionStatus: string
  }
  vlanSlots: VLANSlot[]
  usage: {
    total: number
    occupied: number
    available: number
    utilizationPercent: number
  }
}

export default function VLANOverviewPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <ContentLayout>
          <VLANOverviewContent />
        </ContentLayout>
      </MainLayout>
    </ProtectedRoute>
  )
}

function VLANOverviewContent() {
  const { data: session } = useSession()
  const [deviceOverviews, setDeviceOverviews] = useState<DeviceVLANOverview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVLANOverview()
  }, [])

  const loadVLANOverview = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/r710/wlans/overview', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDeviceOverviews(data.devices || [])
      }
    } catch (error) {
      console.error('Failed to load VLAN overview:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSlotColor = (slot: VLANSlot) => {
    if (slot.status === 'AVAILABLE') {
      return 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
    } else {
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
    }
  }

  const getUtilizationColor = (percent: number) => {
    if (percent < 50) return 'text-green-600 dark:text-green-400'
    if (percent < 80) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Link href="/r710-portal/wlans" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            VLAN Overview
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-8">
          Visual representation of all 31 VLAN slots per R710 device
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200">
              VLAN Limit
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
              Each R710 device supports a maximum of 31 VLANs. Plan your business WiFi networks accordingly.
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading VLAN overview...</p>
        </div>
      )}

      {/* Device VLAN Overviews */}
      {!loading && deviceOverviews.length > 0 && (
        <div className="space-y-8">
          {deviceOverviews.map((deviceOverview) => (
            <div key={deviceOverview.device.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Device Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {deviceOverview.device.ipAddress}
                    </h2>
                    {deviceOverview.device.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {deviceOverview.device.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {deviceOverview.usage.occupied}/{deviceOverview.usage.total}
                  </div>
                  <div className={`text-sm font-medium ${getUtilizationColor(deviceOverview.usage.utilizationPercent)}`}>
                    {deviceOverview.usage.utilizationPercent}% utilized
                  </div>
                </div>
              </div>

              {/* VLAN Slots Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                {deviceOverview.vlanSlots.map((slot) => (
                  <div
                    key={slot.vlanId}
                    className={`relative aspect-square border-2 rounded-lg p-2 transition-all hover:scale-105 ${getSlotColor(slot)} ${
                      slot.status === 'OCCUPIED' ? 'cursor-pointer' : ''
                    }`}
                    title={
                      slot.status === 'OCCUPIED' && slot.wlan
                        ? `VLAN ${slot.vlanId}\nSSID: ${slot.wlan.ssid}\nBusiness: ${slot.wlan.business.name}`
                        : `VLAN ${slot.vlanId} - Available`
                    }
                  >
                    {/* VLAN Number */}
                    <div className={`text-xs font-bold text-center ${
                      slot.status === 'OCCUPIED'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {slot.vlanId}
                    </div>

                    {/* Occupied Indicator */}
                    {slot.status === 'OCCUPIED' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                      </div>
                    )}

                    {/* Hover Info */}
                    {slot.status === 'OCCUPIED' && slot.wlan && (
                      <div className="hidden group-hover:block absolute z-10 top-full left-0 mt-2 w-48 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg">
                        <div className="font-semibold">{slot.wlan.ssid}</div>
                        <div className="text-gray-300">{slot.wlan.business.name}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Occupied ({deviceOverview.usage.occupied})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Available ({deviceOverview.usage.available})</span>
                    </div>
                  </div>

                  {deviceOverview.usage.utilizationPercent >= 80 && (
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium">High utilization</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Occupied VLANs Details */}
              {deviceOverview.vlanSlots.filter(s => s.status === 'OCCUPIED').length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Occupied VLANs ({deviceOverview.vlanSlots.filter(s => s.status === 'OCCUPIED').length})
                  </h3>
                  <div className="space-y-2">
                    {deviceOverview.vlanSlots
                      .filter(s => s.status === 'OCCUPIED' && s.wlan)
                      .sort((a, b) => a.vlanId - b.vlanId)
                      .map((slot) => (
                        <div
                          key={slot.vlanId}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-400 w-12">
                              VLAN {slot.vlanId}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {slot.wlan!.ssid}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {slot.wlan!.business.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {slot.wlan!.business.type}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && deviceOverviews.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No R710 Devices
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Register R710 devices to view VLAN allocation.
          </p>
          <Link
            href="/r710-portal/devices"
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Go to Devices
          </Link>
        </div>
      )}
    </div>
  )
}
