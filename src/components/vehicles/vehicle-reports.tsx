'use client'

import { useState, useEffect, useRef } from 'react'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'
import { DateInput } from '@/components/ui/date-input'

interface VehicleReportsData {
  fleetSummary: {
    totalVehicles: number
    activeVehicles: number
    totalDrivers: number
    activeDrivers: number
    totalTrips: number
    totalMileage: number
    totalExpenses: number
    maintenanceDue: number
  }
  fuelEfficiency: {
    avgEfficiency: number
    avgCostPerDistance: number
    totalFuelConsumed: number
    totalFuelCost: number
    byType: Record<string, any>
  }
  maintenanceBreakdown: Record<string, { count: number; totalCost: number; services: string[] }>
  expenseCategories: Record<string, { count: number; totalAmount: number }>
  driverAuthorizations: {
    total: number
    active: number
    expiring: number
    expired: number
    byLevel: Record<string, number>
  }
  vehicleLicenseCompliance: {
    expiringLicenses: number
    expiringDriverLicenses: number
    licenseByType: Record<string, { count: number; licenses: any[] }>
    driverLicensesByUrgency: Record<string, { count: number; drivers: any[] }>
  }
  monthlyMetrics: {
    month: string
    trips: number
    mileage: number
    expenses: number
    fuelCost: number
  }[]
  vehicleUtilization: {
    vehicleId: string
    licensePlate: string
    make: string
    model: string
    totalTrips: number
    totalMileage: number
    totalExpenses: number
    lastTrip: string
  }[]
  expenseBreakdown: {
    category: string
    amount: number
    percentage: number
  }[]
  maintenanceAlerts: {
    vehicleId: string
    licensePlate: string
    alertType: string
    message: string
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    dueDate?: string
  }[]
}

export function VehicleReports() {
  const [reportsData, setReportsData] = useState<VehicleReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 30 days ago
    endDate: new Date().toISOString().slice(0, 10)
  })

  // Keep a reference to an in-flight fetch so we can cancel it when
  // the component unmounts or when a new fetch is started. This avoids
  // duplicate network calls when the component is remounted (e.g. tab
  // switch, React StrictMode double-mount in dev, or quick user actions).
  const controllerRef = useRef<AbortController | null>(null)

  const { format: globalDateFormat } = useDateFormat()

  const fetchReportsData = async () => {
    // Abort any previous in-flight request before starting a new one
    if (controllerRef.current) {
      controllerRef.current.abort()
    }

    const controller = new AbortController()
    controllerRef.current = controller
    const signal = controller.signal

    try {
      setLoading(true)
      setError('')

      // Fetch multiple report types and combine them
      const [fleetOverview, mileageSummary, expenseSummary, maintenanceSchedule, complianceAlerts, driverActivity] = await Promise.all([
        fetch(`/api/vehicles/reports?reportType=FLEET_OVERVIEW&dateFrom=${dateRange.startDate}&dateTo=${dateRange.endDate}`, { signal }).then(res => res.json()),
        fetch(`/api/vehicles/reports?reportType=MILEAGE_SUMMARY&dateFrom=${dateRange.startDate}&dateTo=${dateRange.endDate}`, { signal }).then(res => res.json()),
        fetch(`/api/vehicles/reports?reportType=EXPENSE_SUMMARY&dateFrom=${dateRange.startDate}&dateTo=${dateRange.endDate}`, { signal }).then(res => res.json()),
        fetch(`/api/vehicles/reports?reportType=MAINTENANCE_SCHEDULE`, { signal }).then(res => res.json()),
        fetch(`/api/vehicles/reports?reportType=COMPLIANCE_ALERTS`, { signal }).then(res => res.json()),
        fetch(`/api/vehicles/reports?reportType=DRIVER_ACTIVITY&dateFrom=${dateRange.startDate}&dateTo=${dateRange.endDate}`, { signal }).then(res => res.json())
      ])

      // Combine all report data into the expected format
      const combinedData: VehicleReportsData = {
        fleetSummary: {
          totalVehicles: fleetOverview.data?.summary?.totalVehicles || 0,
          activeVehicles: fleetOverview.data?.summary?.activeVehicles || 0,
          totalDrivers: driverActivity.data?.length || 0,
          activeDrivers: driverActivity.data?.filter((d: any) => d.driver?.isActive)?.length || 0,
          totalTrips: fleetOverview.data?.summary?.totalTrips || 0,
          totalMileage: mileageSummary.data?.summary?.totalMileage || 0,
          totalExpenses: expenseSummary.data?.summary?.totalAmount || 0,
          maintenanceDue: maintenanceSchedule.data?.summary?.upcomingCount || 0
        },
        fuelEfficiency: {
          avgEfficiency: mileageSummary.data?.summary?.fuelEfficiency?.avgEfficiency || 0,
          avgCostPerDistance: mileageSummary.data?.summary?.fuelEfficiency?.avgCostPerDistance || 0,
          totalFuelConsumed: mileageSummary.data?.summary?.fuelEfficiency?.totalFuelConsumed || 0,
          totalFuelCost: mileageSummary.data?.summary?.fuelEfficiency?.totalFuelCost || 0,
          byType: mileageSummary.data?.summary?.fuelEfficiency?.byType || {}
        },
        maintenanceBreakdown: maintenanceSchedule.data?.serviceTypeBreakdown || {},
        expenseCategories: expenseSummary.data?.summary?.byCategory || {},
        driverAuthorizations: {
          total: driverActivity.data?.reduce((sum: number, d: any) => sum + (d.summary?.totalAuthorizations || 0), 0) || 0,
          active: driverActivity.data?.reduce((sum: number, d: any) => sum + (d.summary?.activeAuthorizations || 0), 0) || 0,
          expiring: driverActivity.data?.reduce((sum: number, d: any) => sum + (d.summary?.expiringAuthorizations || 0), 0) || 0,
          expired: driverActivity.data?.reduce((sum: number, d: any) => sum + (d.summary?.expiredAuthorizations || 0), 0) || 0,
          byLevel: {}
        },
        vehicleLicenseCompliance: {
          expiringLicenses: complianceAlerts.data?.summary?.expiringLicensesCount || 0,
          expiringDriverLicenses: complianceAlerts.data?.summary?.expiringDriverLicensesCount || 0,
          licenseByType: complianceAlerts.data?.licenseByType || {},
          driverLicensesByUrgency: complianceAlerts.data?.driverLicensesByUrgency || {}
        },
        monthlyMetrics: [], // We'll populate this from API data
        vehicleUtilization: fleetOverview.data?.vehicles?.map((vehicle: any) => ({
          vehicleId: vehicle.id,
          licensePlate: vehicle.licensePlate,
          make: vehicle.make,
          model: vehicle.model,
          totalTrips: 0, // Calculate from trips
          totalMileage: vehicle.currentMileage,
          totalExpenses: 0, // Calculate from expenses
          lastTrip: '' // Calculate from trips
        })) || [],
        expenseBreakdown: Object.entries(expenseSummary.data?.summary?.byType || {}).map(([category, amount]) => ({
          category,
          amount: amount as number,
          percentage: ((amount as number) / (expenseSummary.data?.summary?.totalAmount || 1)) * 100
        })),
        maintenanceAlerts: [
          ...(maintenanceSchedule.data?.upcomingMaintenance?.map((maintenance: any) => ({
            vehicleId: maintenance.vehicleId,
            licensePlate: maintenance.vehicle.licensePlate,
            alertType: 'Maintenance Due',
            message: `${maintenance.serviceName} due soon`,
            priority: 'MEDIUM' as const,
            dueDate: maintenance.nextServiceDate
          })) || []),
          ...(maintenanceSchedule.data?.overdueMaintenance?.map((maintenance: any) => ({
            vehicleId: maintenance.vehicleId,
            licensePlate: maintenance.vehicle.licensePlate,
            alertType: 'Maintenance Overdue',
            message: `${maintenance.serviceName} is overdue`,
            priority: 'HIGH' as const,
            dueDate: maintenance.nextServiceDate
          })) || [])
        ]
      }

      // If the fetch was aborted between completion and this line,
      // do not update state.
      if (signal.aborted) return
      setReportsData(combinedData)
    } catch (err) {
      // Ignore AbortError - it means we intentionally cancelled the request
      const name = (err as any)?.name
      if (name === 'AbortError') {
        // swallow aborts silently in normal operation
        return
      }
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      // Clear controller if it's still the current one
      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
    }
  }

  useEffect(() => {
    // Fetch when dateRange changes or on mount. The fetchReportsData
    // implementation uses controllerRef and will abort any previous
    // request. Return a cleanup that aborts the current request when
    // the component unmounts or before the next effect run.
    fetchReportsData()

    return () => {
      controllerRef.current?.abort()
    }
  }, [dateRange])

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200'
      case 'MEDIUM': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'LOW': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
            onClick={fetchReportsData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!reportsData) {
    return (
      <div className="card p-6">
        <div className="text-center text-secondary">
          <p>No reports data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-primary mb-4">Vehicle Fleet Reports</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
          <div>
              <label className="block text-sm font-medium text-primary mb-1">Start Date</label>
              <div className="w-full sm:w-auto">
                <DateInput
                  value={dateRange.startDate}
                  onChange={(iso) => setDateRange(prev => ({ ...prev, startDate: iso }))}
                  label=""
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">End Date</label>
              <div className="w-full sm:w-auto">
                <DateInput
                  value={dateRange.endDate}
                  onChange={(iso) => setDateRange(prev => ({ ...prev, endDate: iso }))}
                  label=""
                  className="w-full"
                />
              </div>
            </div>
          <button
            onClick={fetchReportsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 self-start sm:self-auto"
          >
            Update Report
          </button>
        </div>
      </div>

      {/* Fleet Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Total Vehicles</p>
              <p className="text-2xl font-bold text-blue-600">{reportsData.fleetSummary.totalVehicles}</p>
              <p className="text-xs text-secondary">{reportsData.fleetSummary.activeVehicles} active</p>
            </div>
            <div className="text-2xl">🚗</div>
          </div>
        </div>

        <div className="card p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Total Drivers</p>
              <p className="text-2xl font-bold text-green-600">{reportsData.fleetSummary.totalDrivers}</p>
              <p className="text-xs text-secondary">{reportsData.fleetSummary.activeDrivers} active</p>
            </div>
            <div className="text-2xl">👤</div>
          </div>
        </div>

        <div className="card p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Total Mileage</p>
              <p className="text-2xl font-bold text-purple-600">{reportsData.fleetSummary.totalMileage?.toLocaleString()}</p>
              <p className="text-xs text-secondary">{reportsData.fleetSummary.totalTrips} trips</p>
            </div>
            <div className="text-2xl">🛣️</div>
          </div>
        </div>

        <div className="card p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Total Expenses</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(reportsData.fleetSummary.totalExpenses)}</p>
              <p className="text-xs text-secondary">{reportsData.fleetSummary.maintenanceDue} due for service</p>
            </div>
            <div className="text-2xl">💰</div>
          </div>
        </div>
      </div>

      {/* Fuel Efficiency Metrics */}
      {reportsData.fuelEfficiency.totalFuelConsumed > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">⛽ Fuel Efficiency</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-secondary">Avg Efficiency</p>
              <p className="text-xl font-bold text-blue-600">{reportsData.fuelEfficiency.avgEfficiency.toFixed(2)} mi/gal</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-secondary">Avg Cost/Distance</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(reportsData.fuelEfficiency.avgCostPerDistance)}/mi</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-secondary">Total Fuel</p>
              <p className="text-xl font-bold text-purple-600">{reportsData.fuelEfficiency.totalFuelConsumed.toFixed(2)} gal</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-secondary">Total Fuel Cost</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(reportsData.fuelEfficiency.totalFuelCost)}</p>
            </div>
          </div>
          {Object.keys(reportsData.fuelEfficiency.byType).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-secondary mb-2">By Fuel Type</h4>
              <div className="space-y-2">
                {Object.entries(reportsData.fuelEfficiency.byType).map(([type, data]: [string, any]) => (
                  <div key={type} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="text-sm font-medium text-primary">{type}</span>
                    <div className="text-right">
                      <span className="text-sm text-primary">{data.quantity.toFixed(2)} gal</span>
                      <span className="text-xs text-secondary ml-2">{formatCurrency(data.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Service Breakdown */}
      {Object.keys(reportsData.maintenanceBreakdown).length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">🔧 Maintenance Services</h3>
          <div className="space-y-3">
            {Object.entries(reportsData.maintenanceBreakdown).map(([type, data]) => (
              <div key={type} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-primary">{type}</h4>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatCurrency(data.totalCost)}</p>
                    <p className="text-xs text-secondary">{data.count} services</p>
                  </div>
                </div>
                <div className="text-xs text-secondary">
                  {data.services.slice(0, 3).join(', ')}
                  {data.services.length > 3 && ` +${data.services.length - 3} more`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Driver Authorization Metrics */}
      {reportsData.driverAuthorizations.total > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">👤 Driver Authorizations</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-secondary">Total</p>
              <p className="text-2xl font-bold text-blue-600">{reportsData.driverAuthorizations.total}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-secondary">Active</p>
              <p className="text-2xl font-bold text-green-600">{reportsData.driverAuthorizations.active}</p>
            </div>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <p className="text-sm text-secondary">Expiring</p>
              <p className="text-2xl font-bold text-orange-600">{reportsData.driverAuthorizations.expiring}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-secondary">Expired</p>
              <p className="text-2xl font-bold text-red-600">{reportsData.driverAuthorizations.expired}</p>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle License Compliance */}
      {(reportsData.vehicleLicenseCompliance.expiringLicenses > 0 || reportsData.vehicleLicenseCompliance.expiringDriverLicenses > 0) && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">📋 License Compliance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle Licenses */}
            {Object.keys(reportsData.vehicleLicenseCompliance.licenseByType).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-secondary mb-3">Vehicle Licenses Expiring</h4>
                <div className="space-y-2">
                  {Object.entries(reportsData.vehicleLicenseCompliance.licenseByType).map(([type, data]) => (
                    <div key={type} className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-primary">{type}</span>
                        <span className="text-lg font-bold text-orange-600">{data.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Driver Licenses */}
            {Object.keys(reportsData.vehicleLicenseCompliance.driverLicensesByUrgency).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-secondary mb-3">Driver Licenses by Urgency</h4>
                <div className="space-y-2">
                  {Object.entries(reportsData.vehicleLicenseCompliance.driverLicensesByUrgency).map(([urgency, data]) => {
                    const urgencyColor = urgency === 'CRITICAL' ? 'red' : urgency === 'HIGH' ? 'orange' : 'yellow'
                    return (
                      <div key={urgency} className={`p-3 bg-${urgencyColor}-50 dark:bg-${urgencyColor}-900/20 rounded-lg border border-${urgencyColor}-200 dark:border-${urgencyColor}-800`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-primary">{urgency}</span>
                          <span className={`text-lg font-bold text-${urgencyColor}-600`}>{data.count}</span>
                        </div>
                        {data.drivers.length > 0 && (
                          <div className="text-xs text-secondary mt-1">
                            {data.drivers.slice(0, 2).map((d: any) => d.fullName).join(', ')}
                            {data.drivers.length > 2 && ` +${data.drivers.length - 2} more`}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expense Category Breakdown */}
      {Object.keys(reportsData.expenseCategories).length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">💳 Expense Categories</h3>
          <div className="space-y-2">
            {Object.entries(reportsData.expenseCategories).map(([category, data]) => (
              <div key={category} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-primary">{category}</span>
                  <span className="text-xs text-secondary ml-2">({data.count} transactions)</span>
                </div>
                <span className="text-sm font-bold text-primary">{formatCurrency(data.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Alerts */}
      {reportsData.maintenanceAlerts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">🚨 Maintenance Alerts</h3>
          <div className="space-y-3">
            {reportsData.maintenanceAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getPriorityColor(alert.priority)}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{alert.licensePlate} - {alert.alertType}</h4>
                    <p className="text-sm">{alert.message}</p>
                    {alert.dueDate && (
                      <p className="text-xs mt-1">Due: {formatDateByFormat(alert.dueDate, globalDateFormat)}</p>
                    )}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded">
                    {alert.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle Utilization */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Vehicle Utilization</h3>

  {/* Desktop Table View - Hidden on small screens, show from lg up */}
  <div className="hidden lg:block overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Trips
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Last Trip
                </th>
              </tr>
            </thead>
            <tbody className="card divide-y divide-gray-200 dark:divide-gray-700">
              {reportsData.vehicleUtilization.map((vehicle) => (
                <tr key={vehicle.vehicleId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-primary">
                        {vehicle.make} {vehicle.model}
                      </div>
                      <div className="text-sm text-secondary">{vehicle.licensePlate}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {vehicle.totalTrips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {vehicle.totalMileage?.toLocaleString()} miles
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {formatCurrency(vehicle.totalExpenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                    {vehicle.lastTrip ? formatDateByFormat(vehicle.lastTrip, globalDateFormat) : 'No trips'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

  {/* Mobile Card View - Shown on mobile, tables hidden on lg+ */}
  <div className="lg:hidden space-y-4">
          {reportsData.vehicleUtilization.map((vehicle) => (
            <div key={vehicle.vehicleId} className="card p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-medium text-primary">
                    {vehicle.make} {vehicle.model}
                  </div>
                  <div className="text-sm text-secondary">{vehicle.licensePlate}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-secondary">Trips</div>
                  <div className="font-medium text-primary">{vehicle.totalTrips}</div>
                </div>
                <div>
                  <div className="text-secondary">Mileage</div>
                  <div className="font-medium text-primary">{vehicle.totalMileage?.toLocaleString()} miles</div>
                </div>
                <div>
                  <div className="text-secondary">Expenses</div>
                  <div className="font-medium text-primary">{formatCurrency(vehicle.totalExpenses)}</div>
                </div>
                <div>
                  <div className="text-secondary">Last Trip</div>
                  <div className="font-medium text-primary">{vehicle.lastTrip ? formatDateByFormat(vehicle.lastTrip, globalDateFormat) : 'No trips'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Expense Breakdown</h3>
        <div className="space-y-3">
          {reportsData.expenseBreakdown.map((expense, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: `hsl(${index * 60}, 70%, 60%)` }}></div>
                <span className="text-sm font-medium text-primary">{expense.category}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-primary">{formatCurrency(expense.amount)}</div>
                <div className="text-xs text-secondary">{expense.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary mb-4">Monthly Trends</h3>

        {/* Desktop Table View - Hidden on mobile, cards show instead */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Month
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Trips
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Total Expenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  Fuel Costs
                </th>
              </tr>
            </thead>
            <tbody className="card divide-y divide-gray-200 dark:divide-gray-700">
              {reportsData.monthlyMetrics.map((month, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                    {month.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {month.trips}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {month.mileage?.toLocaleString()} miles
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {formatCurrency(month.expenses)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary">
                    {formatCurrency(month.fuelCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Shown on mobile, tables hidden */}
        <div className="xl:hidden space-y-4">
          {reportsData.monthlyMetrics.map((month, index) => (
            <div key={index} className="card p-4 border border-gray-200 dark:border-gray-700">
              <div className="font-medium text-primary mb-3">{month.month}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-secondary">Trips</div>
                  <div className="font-medium text-primary">{month.trips}</div>
                </div>
                <div>
                  <div className="text-secondary">Mileage</div>
                  <div className="font-medium text-primary">{month.mileage?.toLocaleString()} miles</div>
                </div>
                <div>
                  <div className="text-secondary">Total Expenses</div>
                  <div className="font-medium text-primary">{formatCurrency(month.expenses)}</div>
                </div>
                <div>
                  <div className="text-secondary">Fuel Costs</div>
                  <div className="font-medium text-primary">{formatCurrency(month.fuelCost)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}