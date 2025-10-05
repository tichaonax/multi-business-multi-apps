'use client'

import { useState, useEffect, useRef } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat, formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { VehicleDriver, DriverApiResponse } from '@/types/vehicle'
import { DriverPromotionModal } from '@/components/user-management/driver-promotion-modal'
import { VehicleAssignmentModal } from '@/components/vehicles/vehicle-assignment-modal'
import { useSession } from 'next-auth/react'
import { hasPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'

interface DriverListProps {
  onDriverSelect?: (driver: VehicleDriver) => void
  onAddDriver?: () => void
  // external signal to trigger a refresh (incrementing number)
  refreshSignal?: number
}

export function DriverList({ onDriverSelect, onAddDriver, refreshSignal }: DriverListProps) {
  const { data: session } = useSession()
  const [drivers, setDrivers] = useState<VehicleDriver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({})
  const controllerRef = useRef<AbortController | null>(null)

  // Driver promotion modal state
  const [promotionModalOpen, setPromotionModalOpen] = useState(false)
  const [selectedDriverForPromotion, setSelectedDriverForPromotion] = useState<VehicleDriver | null>(null)
  const [userOperationLoading, setUserOperationLoading] = useState<string | null>(null)

  // Vehicle assignment modal state
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [selectedDriverForAssignment, setSelectedDriverForAssignment] = useState<VehicleDriver | null>(null)

  // Check if current user can manage business users
  const canManageUsers = session?.user && (
    isSystemAdmin(session.user as SessionUser) ||
    hasPermission(session.user as SessionUser, 'canManageBusinessUsers')
  )

  // Check if current user can manage driver assignments
  const canManageAssignments = session?.user && (
    isSystemAdmin(session.user as SessionUser) ||
    hasPermission(session.user as SessionUser, 'canManageDrivers')
  )

  const fetchVehicleCounts = async (driverIds: string[]) => {
    try {
      const counts: Record<string, number> = {}

      // Fetch vehicle assignments for all drivers in parallel
      const promises = driverIds.map(async (driverId) => {
        try {
          const response = await fetch(`/api/vehicles/driver-authorizations?driverId=${driverId}`)
          if (response.ok) {
            const result = await response.json()
            if (result.success && result.data) {
              // Count active assignments that are not expired
              const activeCount = result.data.filter((assignment: any) =>
                assignment.isActive &&
                (!assignment.expiryDate || new Date(assignment.expiryDate) > new Date())
              ).length
              counts[driverId] = activeCount
            } else {
              counts[driverId] = 0
            }
          } else {
            counts[driverId] = 0
          }
        } catch {
          counts[driverId] = 0
        }
      })

      await Promise.all(promises)
      setVehicleCounts(counts)
    } catch (error) {
      console.error('Failed to fetch vehicle counts:', error)
    }
  }

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

        // Fetch vehicle counts for all drivers
        const driverIds = result.data.map(driver => driver.id)
        if (driverIds.length > 0) {
          fetchVehicleCounts(driverIds)
        }
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
    const ok = await confirm({
      title: 'Delete driver',
      description: 'Are you sure you want to delete this driver? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

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
      toast.push(err instanceof Error ? err.message : 'Failed to delete driver')
    }
  }

  const handlePromoteDriver = (driver: VehicleDriver) => {
    setSelectedDriverForPromotion(driver)
    setPromotionModalOpen(true)
  }

  const handleAssignVehicles = (driver: VehicleDriver) => {
    setSelectedDriverForAssignment(driver)
    setAssignmentModalOpen(true)
  }

  const handleAssignmentSuccess = () => {
    // Refresh vehicle counts for all drivers
    const driverIds = drivers.map(driver => driver.id)
    if (driverIds.length > 0) {
      fetchVehicleCounts(driverIds)
    }

    setAssignmentModalOpen(false)
    setSelectedDriverForAssignment(null)
    // Optionally refresh the driver list to show updated assignment counts
    fetchDrivers()
  }

  const handleDeactivateUser = async (driverId: string, driverName: string) => {
    const ok = await confirm({
      title: `Deactivate user account for ${driverName}?`,
      description: `Are you sure you want to deactivate the user account for ${driverName}?`,
      confirmText: 'Deactivate',
      cancelText: 'Cancel'
    })

    if (!ok) return

    setUserOperationLoading(driverId)
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/deactivate-user`, {
        method: 'PUT',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to deactivate user')
      }

      toast.push(`User account for ${driverName} has been deactivated successfully`)
      fetchDrivers() // Refresh list
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to deactivate user')
    } finally {
      setUserOperationLoading(null)
    }
  }

  const handleReactivateUser = async (driverId: string, driverName: string) => {
    const ok = await confirm({
      title: `Reactivate user account for ${driverName}?`,
      description: `Are you sure you want to reactivate the user account for ${driverName}?`,
      confirmText: 'Reactivate',
      cancelText: 'Cancel'
    })

    if (!ok) return

    setUserOperationLoading(driverId)
    try {
      const response = await fetch(`/api/admin/drivers/${driverId}/deactivate-user`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reactivate user')
      }

      toast.push(`User account for ${driverName} has been reactivated successfully`)
      fetchDrivers() // Refresh list
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Failed to reactivate user')
    } finally {
      setUserOperationLoading(null)
    }
  }

  const handlePromotionSuccess = (message: string) => {
    toast.push(message)
    fetchDrivers() // Refresh list to show updated user status
    setPromotionModalOpen(false)
    setSelectedDriverForPromotion(null)
  }

  const handlePromotionError = (error: string) => {
    toast.push(error)
  }

  const { format: globalDateFormat } = useDateFormat()
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return formatDateByFormat(dateString, globalDateFormat)
  }

  const confirm = useConfirm()
  const toast = useToastContext()

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

  const getUserStatusBadge = (driver: VehicleDriver) => {
    if (!driver.user) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          No Login Access
        </span>
      )
    }

    if (driver.user.isActive) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Active Login
        </span>
      )
    } else {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Login Disabled
        </span>
      )
    }
  }

  const renderUserActionButtons = (driver: VehicleDriver) => {
    if (!canManageUsers) return null

    const isLoading = userOperationLoading === driver.id

    if (!driver.user) {
      // No user account - show promote button
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handlePromoteDriver(driver)
          }}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[32px] min-w-[100px] text-center"
        >
          {isLoading ? 'Loading...' : 'Promote to User'}
        </button>
      )
    }

    if (driver.user.isActive) {
      // Active user - show deactivate button
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDeactivateUser(driver.id, driver.fullName)
          }}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[32px] min-w-[100px] text-center"
        >
          {isLoading ? 'Loading...' : 'Disable Login'}
        </button>
      )
    } else {
      // Inactive user - show reactivate button
      return (
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleReactivateUser(driver.id, driver.fullName)
          }}
          disabled={isLoading}
          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[32px] min-w-[100px] text-center"
        >
          {isLoading ? 'Loading...' : 'Enable Login'}
        </button>
      )
    }
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
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
                      onClick={() => onDriverSelect?.(driver)}
                    >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-primary">
                            {driver.fullName}
                          </h3>
                          {!driver.isActive && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Inactive
                            </span>
                          )}
                          {licenseExpired && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              License Expired
                            </span>
                          )}
                          {licenseExpiringSoon && !licenseExpired && (
                            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              License Expiring Soon
                            </span>
                          )}
                          {getUserStatusBadge(driver)}
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

                      <div className="flex flex-col sm:flex-row gap-2 ml-4">
                        {/* User Management Buttons (Mobile-Responsive) */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          {renderUserActionButtons(driver)}

                          {/* Standard Action Buttons */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDriverSelect?.(driver)
                            }}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors min-h-[32px]"
                          >
                            View
                          </button>
                          {canManageAssignments && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAssignVehicles(driver)
                              }}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors min-h-[32px] relative"
                            >
                              🚗 Vehicles
                              {vehicleCounts[driver.id] !== undefined && (
                                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                                  vehicleCounts[driver.id] > 0
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-400 text-white'
                                }`}>
                                  {vehicleCounts[driver.id]}
                                </span>
                              )}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(driver.id)
                            }}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors min-h-[32px]"
                          >
                            Delete
                          </button>
                        </div>
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

      {/* Driver Promotion Modal */}
      <DriverPromotionModal
        isOpen={promotionModalOpen}
        onClose={() => {
          setPromotionModalOpen(false)
          setSelectedDriverForPromotion(null)
        }}
        driver={selectedDriverForPromotion}
        onSuccess={handlePromotionSuccess}
        onError={handlePromotionError}
      />

      <VehicleAssignmentModal
        driver={selectedDriverForAssignment}
        isOpen={assignmentModalOpen}
        onClose={() => {
          setAssignmentModalOpen(false)
          setSelectedDriverForAssignment(null)
        }}
        onSuccess={handleAssignmentSuccess}
      />
    </div>
  )
}