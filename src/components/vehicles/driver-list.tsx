'use client'

import { useState, useEffect, useRef } from 'react'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { VehicleDriver, DriverApiResponse } from '@/types/vehicle'

interface DriverListProps {
  onDriverSelect?: (driver: VehicleDriver) => void
  onAddDriver?: () => void
  // external signal to trigger a refresh (incrementing number)
  refreshSignal?: number
}

export function DriverList({ onDriverSelect, onAddDriver, refreshSignal }: DriverListProps) {
  const [drivers, setDrivers] = useState<VehicleDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const controllerRef = useRef<AbortController | null>(null)

  const fetchDrivers = async () => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controller.signal

    try {
      setLoading(true)
      const response = await fetch(`/api/vehicles/drivers?page=${page}&limit=20`, { signal })

      if (!response.ok) {
        throw new Error('Failed to fetch drivers')
      }

      const result: DriverApiResponse = await response.json()
      if (signal.aborted) return

      if (result.success) {
        setDrivers(result.data)
        setTotalPages(result.meta?.totalPages || 1)
      } else {
        throw new Error(result.error || 'Failed to fetch drivers')
      }
    } catch (err) {
      const name = (err as any)?.name
      if (name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }

  useEffect(() => {
    fetchDrivers()

    return () => {
      controllerRef.current?.abort()
    }
  }, [page, refreshSignal])

  const handleDelete = async (driverId: string) => {
    if (!confirm('Are you sure you want to delete this driver?')) {
      return
    }

    try {
      const response = await fetch(`/api/vehicles/drivers?id=${driverId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete driver')
      }

      // Refresh the list
      fetchDrivers()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete driver')
    }
  }

  const { format: globalDateFormat } = useDateFormat()
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return formatDateByFormat(dateString, globalDateFormat)
  }

  const isLicenseExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
  }

  const isLicenseExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    return expiry < today
  }

  if (loading) {
    return (
      <div className="card p-6 max-w-full overflow-x-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6 max-w-full overflow-x-hidden">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchDrivers}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card max-w-full overflow-x-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">Driver Management</h2>
          {onAddDriver && (
            <button
              onClick={onAddDriver}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              + Add Driver
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {drivers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👤</div>
            <h3 className="text-lg font-medium text-primary mb-2">No Drivers Yet</h3>
            <p className="text-secondary mb-6">Register your first driver to get started.</p>
            {onAddDriver && (
              <button
                onClick={onAddDriver}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Register First Driver
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {drivers.map((driver) => {
                const licenseExpiringSoon = isLicenseExpiringSoon(driver.licenseExpiry)
                const licenseExpired = isLicenseExpired(driver.licenseExpiry)

                return (
                  <div
                      key={driver.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative z-[9998] pointer-events-auto"
                      onClick={() => onDriverSelect?.(driver)}
                    >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-primary">
                            {driver.fullName}
                          </h3>
                          {!driver.isActive && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                          {licenseExpired && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              License Expired
                            </span>
                          )}
                          {licenseExpiringSoon && !licenseExpired && (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                              License Expiring Soon
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-secondary">
                          <div>
                            <span className="font-medium">License:</span> {driver.licenseNumber}
                          </div>
                          <div>
                            <span className="font-medium">Expires:</span> {formatDate(driver.licenseExpiry)}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {formatPhoneNumberForDisplay(driver.phoneNumber || '') || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span> {driver.emailAddress || 'N/A'}
                          </div>
                        </div>

                        {driver.emergencyContact && (
                            <div className="mt-2 text-sm text-secondary">
                            <span className="font-medium">Emergency Contact:</span> {driver.emergencyContact}
                            {driver.emergencyPhone && ` (${formatPhoneNumberForDisplay(driver.emergencyPhone)})`}
                          </div>
                        )}

                        {driver.user && (
                          <div className="mt-2 text-sm text-secondary">
                            <span className="font-medium">Linked User:</span> {driver.user.name} ({driver.user.email})
                          </div>
                        )}

                        {driver.address && (
                          <div className="mt-2 text-sm text-secondary">
                            <span className="font-medium">Address:</span> {driver.address}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDriverSelect?.(driver)
                          }}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors relative z-[9999] pointer-events-auto"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(driver.id)
                          }}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors relative z-[9999] pointer-events-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <span className="text-sm text-secondary">
                  Page {page} of {totalPages}
                </span>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}