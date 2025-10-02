'use client'

import { useState, useEffect, useRef } from 'react'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'
import { DateInput } from '@/components/ui/date-input'
import { VehicleMaintenanceRecord, MaintenanceApiResponse } from '@/types/vehicle'

interface MaintenanceListProps {
  onMaintenanceSelect?: (maintenance: VehicleMaintenanceRecord) => void
  onAddMaintenance?: () => void
  vehicleId?: string
}

export function MaintenanceList({ onMaintenanceSelect, onAddMaintenance, vehicleId }: MaintenanceListProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<VehicleMaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState({
    serviceType: '',
    isCompleted: '',
    vehicleId: vehicleId || '',
    search: '',
    dateFrom: '',
    dateTo: '',
    costMin: '',
    costMax: '',
    provider: ''
  })
  // Debounced filter to avoid refetching on every keystroke / input change
  const [debouncedFilter, setDebouncedFilter] = useState(filter)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const controllerRef = useRef<AbortController | null>(null)

  const fetchMaintenanceRecords = async () => {
    if (controllerRef.current) controllerRef.current.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controller.signal

    try {
      setLoading(true)
      // Use the debounced filter to avoid refetching while the user is still typing
      const activeFilter = debouncedFilter
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(activeFilter).filter(([_, value]) => value))
      })

      const response = await fetch(`/api/vehicles/maintenance?${queryParams}`, { signal })

      if (!response.ok) {
        throw new Error('Failed to fetch maintenance records')
      }

      const result: MaintenanceApiResponse = await response.json()
      if (signal.aborted) return

      if (result.success) {
        setMaintenanceRecords(result.data)
        setTotalPages(result.meta?.totalPages || 1)
      } else {
        throw new Error(result.error || 'Failed to fetch maintenance records')
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
    fetchMaintenanceRecords()

    return () => {
      controllerRef.current?.abort()
    }
  }, [page, debouncedFilter])

  // Debounce the filter updates so we don't refetch while the user is typing
  useEffect(() => {
    const t = setTimeout(() => {
      // Reset page to 1 when filters change
      setPage(1)
      setDebouncedFilter(filter)
    }, 500)

    return () => clearTimeout(t)
  }, [filter])

  const handleDelete = async (maintenanceId: string) => {
    if (!confirm('Are you sure you want to delete this maintenance record?')) {
      return
    }
    try {
      const response = await fetch(`/api/vehicles/maintenance?id=${maintenanceId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete maintenance record')
      }

      // Refresh the list immediately
      fetchMaintenanceRecords()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete maintenance record')
    }
  }

  const { format: globalDateFormat } = useDateFormat()
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return formatDateByFormat(dateString, globalDateFormat)
  }

  const getServiceTypeColor = (serviceType: string) => {
    switch (serviceType) {
      case 'ROUTINE': return 'bg-green-100 text-green-800'
      case 'REPAIR': return 'bg-red-100 text-red-800'
      case 'INSPECTION': return 'bg-blue-100 text-blue-800'
      case 'EMERGENCY': return 'bg-orange-100 text-orange-800'
      case 'WARRANTY': return 'bg-purple-100 text-purple-800'
      case 'UPGRADE': return 'bg-indigo-100 text-indigo-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMaintenanceStatus = (record: VehicleMaintenanceRecord) => {
    if (!record.isCompleted) {
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' }
    }

    if (record.nextServiceDate) {
      const nextDate = new Date(record.nextServiceDate)
      const today = new Date()
      const daysUntilNext = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilNext < 0) {
        return { label: 'Service Overdue', color: 'bg-red-100 text-red-800' }
      } else if (daysUntilNext <= 30) {
        return { label: 'Service Due Soon', color: 'bg-orange-100 text-orange-800' }
      }
    }

    return { label: 'Completed', color: 'bg-green-100 text-green-800' }
  }

  if (loading) {
    return (
      <div className="card p-6 max-w-full overflow-x-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
            onClick={fetchMaintenanceRecords}
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-primary">Maintenance Records</h2>
          {onAddMaintenance && (
            <button
              onClick={onAddMaintenance}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              + Record Service
            </button>
          )}
        </div>

        {/* Basic Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <input
            type="text"
            placeholder="Search services..."
            value={filter.search}
            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
          />

          <select
            value={filter.serviceType}
            onChange={(e) => setFilter(prev => ({ ...prev, serviceType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
          >
            <option value="">All Service Types</option>
            <option value="ROUTINE">Routine</option>
            <option value="REPAIR">Repair</option>
            <option value="INSPECTION">Inspection</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="WARRANTY">Warranty</option>
            <option value="UPGRADE">Upgrade</option>
          </select>

          <select
            value={filter.isCompleted}
            onChange={(e) => setFilter(prev => ({ ...prev, isCompleted: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
          >
            <option value="">All Records</option>
            <option value="true">Completed</option>
            <option value="false">Pending</option>
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors flex items-center justify-center gap-1"
          >
            {showAdvancedFilters ? '▲' : '▼'} Advanced
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <input
              type="text"
              placeholder="Service provider..."
              value={filter.provider}
              onChange={(e) => setFilter(prev => ({ ...prev, provider: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <DateInput
                  value={filter.dateFrom}
                  onChange={(isoDate) => setFilter(prev => ({ ...prev, dateFrom: isoDate }))}
                  placeholder="From date"
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <DateInput
                  value={filter.dateTo}
                  onChange={(isoDate) => setFilter(prev => ({ ...prev, dateTo: isoDate }))}
                  placeholder="To date"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                placeholder="Min cost"
                value={filter.costMin}
                onChange={(e) => setFilter(prev => ({ ...prev, costMin: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              />
              <input
                type="number"
                placeholder="Max cost"
                value={filter.costMax}
                onChange={(e) => setFilter(prev => ({ ...prev, costMax: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-primary transition-colors"
              />
            </div>
          </div>
        )}

        {/* Filter Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const cleared = {
                serviceType: '',
                isCompleted: '',
                vehicleId: vehicleId || '',
                search: '',
                dateFrom: '',
                dateTo: '',
                costMin: '',
                costMax: '',
                provider: ''
              }
              setFilter(cleared)
              // apply immediately so UI updates and fetch happens right away
              setDebouncedFilter(cleared)
              setShowAdvancedFilters(false)
            }}
            className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Clear All Filters
          </button>

          {(filter.search || filter.serviceType || filter.isCompleted || filter.provider || filter.dateFrom || filter.dateTo || filter.costMin || filter.costMax) && (
            <span className="px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md">
              Filters active
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {maintenanceRecords.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔧</div>
            <h3 className="text-lg font-medium text-primary mb-2">No Maintenance Records</h3>
            <p className="text-secondary mb-6">Start tracking your vehicle maintenance and service history.</p>
            {onAddMaintenance && (
              <button
                onClick={onAddMaintenance}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Record First Service
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {maintenanceRecords.map((record) => {
                const status = getMaintenanceStatus(record)
                return (
                  <div
                      key={record.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-800/50 transition-all bg-white dark:bg-gray-800/50 backdrop-blur-sm relative z-[9998] pointer-events-auto"
                    >
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header with badges - responsive wrapping */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="text-lg font-semibold text-primary break-words">
                            {record.serviceName}
                          </h3>
                          <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${getServiceTypeColor(record.serviceType)}`}>
                            {record.serviceType}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${status.color}`}>
                            {status.label}
                          </span>
                        </div>

                        {/* Key details - responsive grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-secondary mb-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-primary">Vehicle:</span>
                            <span className="break-words">{record.vehicle?.licensePlate || 'N/A'}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-primary">Date:</span>
                            <span>{formatDate(record.serviceDate)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-primary">Cost:</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">{record.currency} {record.cost?.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="font-medium text-primary">Mileage:</span>
                            <span>{record.mileageAtService?.toLocaleString() || 'N/A'} {record.vehicle?.mileageUnit || 'km'}</span>
                          </div>
                        </div>

                        {/* Additional details - collapsible on mobile */}
                        <div className="space-y-2 text-sm">
                          {record.serviceProvider && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium text-primary">Provider:</span>
                              <span className="text-secondary break-words">{record.serviceProvider}</span>
                            </div>
                          )}

                          {(record.nextServiceDate || record.nextServiceMileage) && (
                            <div className="flex flex-wrap items-start gap-1">
                              <span className="font-medium text-primary flex-shrink-0">Next Service:</span>
                              <span className="text-secondary">
                                {record.nextServiceDate && formatDate(record.nextServiceDate)}
                                {record.nextServiceMileage && ` at ${record.nextServiceMileage.toLocaleString()} ${record.vehicle?.mileageUnit || 'km'}`}
                              </span>
                            </div>
                          )}

                          {record.warrantyUntil && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-medium text-primary">Warranty Until:</span>
                              <span className="text-orange-600 dark:text-orange-400">{formatDate(record.warrantyUntil)}</span>
                            </div>
                          )}

                          {record.notes && (
                            <div className="flex flex-col gap-1 mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                              <span className="font-medium text-primary text-xs">Notes:</span>
                              <span className="text-secondary text-sm break-words">{record.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons - responsive layout */}
                      <div className="flex flex-row lg:flex-col gap-2 lg:ml-4 flex-wrap lg:flex-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onMaintenanceSelect?.(record)
                          }}
                          className="flex-1 lg:flex-none px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/70 transition-colors text-center relative z-[9999] pointer-events-auto"
                        >
                          View
                        </button>
                        {record.receiptUrl && (
                          <a
                              href={record.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 lg:flex-none px-3 py-1 text-sm bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors text-center relative z-[9999] pointer-events-auto"
                            >
                              Receipt
                            </a>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(record.id)
                          }}
                          className="flex-1 lg:flex-none px-3 py-1 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors text-center relative z-[9999] pointer-events-auto"
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