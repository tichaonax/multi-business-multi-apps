'use client'

import { useState, useEffect, useRef } from 'react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { Vehicle, VehicleApiResponse } from '@/types/vehicle'
import { LicenseStatusIndicator } from './license-status-indicator'

interface VehicleListProps {
  onVehicleSelect?: (vehicle: Vehicle) => void
  onAddVehicle?: () => void
  refreshSignal?: number
  updatedVehicleId?: string | null
  updateSeq?: number
}

export function VehicleList({ onVehicleSelect, onAddVehicle, refreshSignal, updatedVehicleId, updateSeq }: VehicleListProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  // Keep a ref to the current in-flight request so we can cancel it
  const controllerRef = useRef<AbortController | null>(null)

  const fetchVehicles = async () => {
    // Abort any previous in-flight request
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controller.signal

    try {
      setLoading(true)
      const response = await fetch(`/api/vehicles?page=${page}&limit=20&includeLicenses=true`, { signal })

      if (!response.ok) {
        throw new Error('Failed to fetch vehicles')
      }

      const result: VehicleApiResponse = await response.json()

      if (signal.aborted) return

      if (result.success) {
        setVehicles(result.data)
        setTotalPages(result.meta?.totalPages || 1)
      } else {
        throw new Error(result.error || 'Failed to fetch vehicles')
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

  const confirm = useConfirm()
  const toast = useToastContext()

  useEffect(() => {
    fetchVehicles()

    return () => {
      controllerRef.current?.abort()
    }
    // include refreshSignal so parent can trigger a reload (e.g., after edits)
  }, [page, refreshSignal])

  // Narrow refresh: when parent signals a single vehicle update, fetch only that vehicle and patch it into the list
  useEffect(() => {
    if (!updatedVehicleId) return

    const controller = new AbortController()
    const signal = controller.signal

    const fetchSingle = async () => {
      try {
        const res = await fetch(`/api/vehicles?id=${updatedVehicleId}&includeLicenses=true`, { signal })
        if (!res.ok) return
        const body = await res.json()
        if (!body?.success || !Array.isArray(body.data) || body.data.length === 0) return
        const updatedVehicle: Vehicle = body.data[0]

        setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v))
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return
        console.error('Failed to fetch single updated vehicle', err)
      }
    }

    fetchSingle()

    return () => controller.abort()
    // Trigger when the sequence increments (so same id repeated will still refetch)
  }, [updatedVehicleId, updateSeq])

  const handleDelete = async (vehicleId: string) => {
    const ok = await confirm({
      title: 'Delete vehicle',
      description: 'Are you sure you want to delete this vehicle? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/vehicles?id=${vehicleId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete vehicle')
      }

      // Refresh the list
      fetchVehicles()
    } catch (err) {
  toast.push(err instanceof Error ? err.message : 'Failed to delete vehicle')
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchVehicles}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary">Vehicle Fleet</h2>
          {onAddVehicle && (
            <button
              onClick={onAddVehicle}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Vehicle
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚗</div>
            <h3 className="text-lg font-medium text-primary mb-2">No Vehicles Yet</h3>
            <p className="text-secondary mb-6">Get started by adding your first vehicle to the fleet.</p>
            {onAddVehicle && (
              <button
                onClick={onAddVehicle}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add First Vehicle
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="card border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-primary break-words">
                          {vehicle.make} {vehicle.model}
                        </h3>
                        <span className="text-sm text-secondary">({vehicle.year})</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          vehicle.ownershipType === 'BUSINESS'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                          {vehicle.ownershipType}
                        </span>
                        {!vehicle.isActive && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-secondary">
                        <div>
                          <span className="font-medium">License:</span> {vehicle.licensePlate}
                        </div>
                        <div>
                          <span className="font-medium">VIN:</span> {vehicle.vin}
                        </div>
                        <div>
                          <span className="font-medium">Mileage:</span> {vehicle.currentMileage.toLocaleString()} {vehicle.mileageUnit.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium">Color:</span> {vehicle.color || 'N/A'}
                        </div>
                      </div>

                      {vehicle.business && (
                        <div className="mt-2 text-sm text-secondary">
                          <span className="font-medium">Business:</span> {vehicle.businesses.name}
                        </div>
                      )}

                      {vehicle.user && (
                        <div className="mt-1 text-sm text-secondary">
                          <span className="font-medium">Owner:</span> {vehicle.users.name}
                        </div>
                      )}

                      {/* License Status */}
                      {vehicle.vehicleLicenses && vehicle.vehicle_licenses.length > 0 && (
                        <div className="mt-2">
                          <LicenseStatusIndicator
                            licenses={vehicle.vehicleLicenses}
                            compact={true}
                          />
                        </div>
                      )}

                      {vehicle.notes && (
                        <div className="mt-2 text-sm text-secondary">
                          <span className="font-medium">Notes:</span> {vehicle.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:ml-4 w-full sm:w-auto">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onVehicleSelect?.(vehicle)
                        }}
                        className="w-full sm:w-auto px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-center cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(vehicle.id)
                        }}
                        className="w-full sm:w-auto px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-center cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

                <span className="text-sm text-gray-600">
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