'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ContentLayout } from '@/components/layout/content-layout'
import { hasUserPermission, isSystemAdmin, SessionUser } from '@/lib/permission-utils'
import { VehicleForm } from '@/components/vehicles/vehicle-form'
import { VehicleList } from '@/components/vehicles/vehicle-list'
import { VehicleDetailModal } from '@/components/vehicles/vehicle-detail-modal'
import { DriverForm } from '@/components/vehicles/driver-form'
import { DriverList } from '@/components/vehicles/driver-list'
import { DriverDetailModal } from '@/components/vehicles/driver-detail-modal'
import { TripDetailModal } from '@/components/vehicles/trip-detail-modal'
import { TripForm } from '@/components/vehicles/trip-form'
import { TripList } from '@/components/vehicles/trip-list'
import { MaintenanceForm } from '@/components/vehicles/maintenance-form'
import { MaintenanceList } from '@/components/vehicles/maintenance-list'
import { MaintenanceDetailModal } from '@/components/vehicles/maintenance-detail-modal'
import { VehicleReports } from '@/components/vehicles/vehicle-reports'
import { Vehicle, VehicleDriver, VehicleTrip, VehicleMaintenanceRecord } from '@/types/vehicle'

export default function VehiclesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const currentUser = session?.user as SessionUser

  // Check if user is a driver and redirect to driver portal
  useEffect(() => {
    if (currentUser) {
      const isDriver = currentUser &&
        hasUserPermission(currentUser, 'canLogDriverTrips') &&
        hasUserPermission(currentUser, 'canLogDriverMaintenance') &&
        !hasUserPermission(currentUser, 'canAccessPersonalFinance') &&
        !isSystemAdmin(currentUser)

      if (isDriver) {
        router.push('/driver')
        return
      }
    }
  }, [currentUser, router])

  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'drivers' | 'trips' | 'maintenance' | 'reports'>('overview')
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showDriverForm, setShowDriverForm] = useState(false)
  const [showTripForm, setShowTripForm] = useState(false)
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<VehicleDriver | null>(null)
  const [selectedTrip, setSelectedTrip] = useState<VehicleTrip | null>(null)
  const [selectedMaintenance, setSelectedMaintenance] = useState<VehicleMaintenanceRecord | null>(null)
  const [tripToEdit, setTripToEdit] = useState<VehicleTrip | null>(null)
  const [maintenanceToEdit, setMaintenanceToEdit] = useState<VehicleMaintenanceRecord | null>(null)
  // simple refresh counter to signal children to re-fetch
  const [refreshCounter, setRefreshCounter] = useState(0)
  // For narrow single-vehicle refreshes: id + sequence to allow same id updates
  const [lastUpdatedVehicleId, setLastUpdatedVehicleId] = useState<string | null>(null)
  const [lastUpdateSeq, setLastUpdateSeq] = useState(0)

  // Filter tabs based on user permissions
  const allTabs = [
    { id: 'overview', label: 'Overview', icon: '🚗', description: 'Fleet summary', permission: 'canAccessVehicles' },
    { id: 'vehicles', label: 'Vehicles', icon: '🚙', description: 'Manage fleet', permission: 'canManageVehicles' },
    { id: 'drivers', label: 'Drivers', icon: '👤', description: 'Driver management', permission: 'canManageDrivers' },
    { id: 'trips', label: 'Trips', icon: '🛣️', description: 'Trip logging', permission: 'canManageTrips' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧', description: 'Service records', permission: 'canManageVehicleMaintenance' },
    { id: 'reports', label: 'Reports', icon: '📊', description: 'Analytics reports', permission: 'canViewVehicleReports' }
  ]

  const tabs = allTabs.filter(tab => {
    if (isSystemAdmin(currentUser)) return true
    return hasUserPermission(currentUser, tab.permission)
  })

  // Ensure the active tab is valid for current user permissions
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id as any)
    }
  }, [tabs, activeTab])

  // If no tabs available, show access denied
  if (tabs.length === 0) {
    return (
      <ProtectedRoute>
        <ContentLayout
          title="Access Denied"
          subtitle="You don't have permission to access vehicle management features."
        >
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">You don't have the required permissions to view this page.</p>
          </div>
        </ContentLayout>
      </ProtectedRoute>
    )
  }

  // Fleet summary fetched from reports API (FLEET_OVERVIEW)
  const [fleetSummary, setFleetSummary] = useState<{
    totalVehicles: number
    activeVehicles: number
    maintenanceDue: number
    expiringLicenses: number
    totalDrivers?: number
    activeDrivers?: number
  } | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)
  const tripsControllerRef = useRef<AbortController | null>(null)
  const maintenanceControllerRef = useRef<AbortController | null>(null)
  const complianceControllerRef = useRef<AbortController | null>(null)

  const [recentTrips, setRecentTrips] = useState<any[] | null>(null)
  const [loadingTrips, setLoadingTrips] = useState(true)

  const [upcomingMaintenanceList, setUpcomingMaintenanceList] = useState<any[] | null>(null)
  const [loadingMaintenance, setLoadingMaintenance] = useState(true)
  const [complianceAlerts, setComplianceAlerts] = useState<any[] | null>(null)
  const [loadingCompliance, setLoadingCompliance] = useState(true)
  const [processingAlerts, setProcessingAlerts] = useState<string[]>([])

  // Simple local toast implementation
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const showToast = (msg: string, ms = 3000) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), ms)
  }

  // Reusable fetch callbacks so other components (forms) can trigger refresh
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      if (controllerRef.current) controllerRef.current.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const signal = controller.signal

      const res = await fetch('/api/vehicles/reports?reportType=FLEET_OVERVIEW', { signal })
      if (!res.ok) return
      const data = await res.json()
      const summary = data?.data?.summary || {}
      setFleetSummary({
        totalVehicles: summary.totalVehicles || 0,
        activeVehicles: summary.activeVehicles || 0,
        maintenanceDue: summary.upcomingMaintenance || 0,
        expiringLicenses: summary.expiringLicenses || 0,
        totalDrivers: summary.totalDrivers ?? undefined,
        activeDrivers: summary.activeDrivers ?? undefined
      })
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return
      console.error('Failed to load fleet summary', err)
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchRecentTrips = useCallback(async () => {
    setLoadingTrips(true)
    try {
      if (tripsControllerRef.current) tripsControllerRef.current.abort()
      const controller = new AbortController()
      tripsControllerRef.current = controller
      const signal = controller.signal

      const res = await fetch('/api/vehicles/trips?limit=5&includeExpenses=true', { signal })
      if (!res.ok) {
        setRecentTrips([])
        return
      }
      const data = await res.json()
      setRecentTrips(data?.data || [])
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return
      console.error('Failed to load recent trips', err)
      setRecentTrips([])
    } finally {
      setLoadingTrips(false)
    }
  }, [])

  const fetchUpcomingMaintenance = useCallback(async () => {
    setLoadingMaintenance(true)
    try {
      if (maintenanceControllerRef.current) maintenanceControllerRef.current.abort()
      const controller = new AbortController()
      maintenanceControllerRef.current = controller
      const signal = controller.signal

      const res = await fetch('/api/vehicles/maintenance?dueSoon=true&limit=5', { signal })
      if (!res.ok) {
        setUpcomingMaintenanceList([])
        return
      }
      const data = await res.json()
      setUpcomingMaintenanceList(data?.data || [])
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return
      console.error('Failed to load upcoming maintenance', err)
      setUpcomingMaintenanceList([])
    } finally {
      setLoadingMaintenance(false)
    }
  }, [])

  const fetchComplianceAlerts = useCallback(async () => {
    setLoadingCompliance(true)
    try {
      if (complianceControllerRef.current) complianceControllerRef.current.abort()
      const controller = new AbortController()
      complianceControllerRef.current = controller
      const signal = controller.signal

      const res = await fetch('/api/vehicles/reports?reportType=COMPLIANCE_ALERTS', { signal })
      if (!res.ok) {
        setComplianceAlerts([])
        return
      }
      const data = await res.json()
      // Combine vehicle license alerts and driver license alerts into a single list
      const vehicleAlerts = (data?.data?.expiringLicenses || []).map((a: any) => ({
        id: a.id || a.vehicle?.id || `${a.vehicle?.licensePlate}-vehicle`,
        type: 'vehicle',
        licensePlate: a.vehicle?.licensePlate || a.licensePlate,
        message: a.vehicle ? `${a.vehicle.licensePlate} - ${a.note || 'License expiring'}` : a.note,
        dueDate: a.expiryDate || a.vehicle?.expiryDate
      }))
      const driverAlerts = (data?.data?.expiringDriverLicenses || []).map((d: any) => ({
        id: d.id || d.driver?.id || `${d.driver?.fullName}-driver`,
        type: 'driver',
        name: d.fullName || d.driver?.fullName || d.name,
        message: d.fullName ? `${d.fullName} - Driver license expiring` : d.note,
        dueDate: d.licenseExpiry || d.expiryDate
      }))
      setComplianceAlerts([...vehicleAlerts, ...driverAlerts])
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return
      console.error('Failed to load compliance alerts', err)
      setComplianceAlerts([])
    } finally {
      setLoadingCompliance(false)
    }
  }, [])

  // Handle renewing a vehicle license (optimistic UI)
  const handleRenew = useCallback(async (alert: any) => {
    if (!alert) return
    const id = String(alert.id)
    // Optimistically mark as renewed in the UI
    setComplianceAlerts(prev => prev ? prev.map(a => String(a.id) === id ? { ...a, renewed: true, renewedAt: new Date().toISOString() } : a) : prev)
    setProcessingAlerts(p => Array.from(new Set([...p, id])))
    try {
      // Compute a new expiry date (one year from now) as a simple renewal behavior
      const newExpiry = new Date()
      newExpiry.setFullYear(newExpiry.getFullYear() + 1)

      const res = await fetch('/api/vehicles/licenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alert.id, expiryDate: newExpiry.toISOString() })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to renew license')
      }

      showToast('License renewed')
      // Refresh summary in the background
      fetchSummary()
    } catch (err: any) {
      // Revert optimistic update on error
      setComplianceAlerts(prev => prev ? prev.map(a => String(a.id) === id ? (() => {
        const copy = { ...a }
        delete copy.renewed
        delete copy.renewedAt
        return copy
      })() : a) : prev)
      showToast(err?.message || 'Failed to renew license')
      console.error('Renew license failed', err)
    } finally {
      setProcessingAlerts(p => p.filter(x => x !== id))
      // Ensure server state is reflected eventually
      fetchComplianceAlerts()
    }
  }, [fetchComplianceAlerts, fetchSummary])

  // Handle notifying a driver (optimistic UI)
  const handleNotify = useCallback(async (alert: any) => {
    if (!alert) return
    const id = String(alert.id)
    // Optimistically mark as notified
    setComplianceAlerts(prev => prev ? prev.map(a => String(a.id) === id ? { ...a, notifiedAt: new Date().toISOString() } : a) : prev)
    setProcessingAlerts(p => Array.from(new Set([...p, id])))
    try {
      const res = await fetch('/api/vehicles/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: alert.id, message: `Your driver license is expiring on ${alert.dueDate || 'soon'}` })
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to send notification')
      }

      showToast('Driver notified')
      fetchSummary()
    } catch (err: any) {
      // Revert optimistic update on error
      setComplianceAlerts(prev => prev ? prev.map(a => String(a.id) === id ? (() => {
        const copy = { ...a }
        delete copy.notifiedAt
        return copy
      })() : a) : prev)
      showToast(err?.message || 'Failed to notify driver')
      console.error('Notify driver failed', err)
    } finally {
      setProcessingAlerts(p => p.filter(x => x !== id))
      fetchComplianceAlerts()
    }
  }, [fetchComplianceAlerts, fetchSummary])

  const refreshAll = useCallback(() => {
    // Trigger parallel refreshes
    fetchSummary()
    fetchRecentTrips()
    fetchUpcomingMaintenance()
    fetchComplianceAlerts()
  }, [fetchSummary, fetchRecentTrips, fetchUpcomingMaintenance])

  useEffect(() => {
    // Use the reusable callbacks to fetch initial data
    fetchSummary()
    fetchRecentTrips()
    fetchUpcomingMaintenance()

    return () => {
      controllerRef.current?.abort()
      tripsControllerRef.current?.abort()
      maintenanceControllerRef.current?.abort()
    }
  }, [])

  const { format: globalDateFormat } = useDateFormat()

  return (
    <ProtectedRoute>
      <ContentLayout
        title="🚗 Vehicle Management"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Vehicles', isActive: true }
        ]}
        maxWidth="full"
      >
        <div className="space-y-6">
          {/* Toast */}
          {toastMessage && (
            <div className="fixed top-5 right-5 z-50">
              <div className="px-4 py-2 bg-black text-white rounded shadow">{toastMessage}</div>
            </div>
          )}
          {/* Fleet Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-4 h-full">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Total Vehicles</p>
                    {loadingSummary ? (
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : (
                      <p className="text-2xl font-bold text-blue-600">{fleetSummary?.totalVehicles ?? 0}</p>
                    )}
                  </div>
                  <div className="text-2xl">🚗</div>
                </div>
            </div>

            <div className="card p-4 h-full">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Active Drivers</p>
                    {loadingSummary ? (
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : (
                      // Prefer activeDrivers from API, fallback to activeVehicles for backward compatibility
                      <p className="text-2xl font-bold text-green-600">{fleetSummary?.activeDrivers ?? fleetSummary?.activeVehicles ?? 0}</p>
                    )}
                  </div>
                  <div className="text-2xl">👤</div>
                </div>
            </div>

            <div className="card p-4 h-full">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Due for Service</p>
                    <p className="text-2xl font-bold text-orange-600">{fleetSummary?.maintenanceDue ?? 3}</p>
                  </div>
                  <div className="text-2xl">🔧</div>
                </div>
            </div>

            <div className="card p-4 h-full">
              <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-secondary">Expiring Licenses</p>
                    <p className="text-2xl font-bold text-red-600">{fleetSummary?.expiringLicenses ?? 2}</p>
                  </div>
                  <div className="text-2xl">⚠️</div>
                </div>
            </div>
          </div>

          {/* Vehicle Management Features Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              🚗 Vehicle Fleet Management Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-3 border border-blue-200 dark:border-blue-800 h-full">
                <div className="text-blue-700 dark:text-blue-300 font-medium text-sm break-words">🛣️ Trip Tracking</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 break-words">Mileage, purpose & business attribution</div>
              </div>
              <div className="card p-3 border border-blue-200 dark:border-blue-800 h-full">
                <div className="text-blue-700 dark:text-blue-300 font-medium text-sm break-words">📋 License Management</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 break-words">Registration, insurance & compliance</div>
              </div>
              <div className="card p-3 border border-blue-200 dark:border-blue-800 h-full">
                <div className="text-blue-700 dark:text-blue-300 font-medium text-sm break-words">🔧 Maintenance Tracking</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 break-words">Service records & scheduling</div>
              </div>
              <div className="card p-3 border border-blue-200 dark:border-blue-800 h-full">
                <div className="text-blue-700 dark:text-blue-300 font-medium text-sm break-words">💰 Expense Management</div>
                <div className="text-xs text-blue-600 dark:text-blue-400 break-words">Fuel, tolls & business reimbursement</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="card">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-2 sm:px-3 lg:py-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-secondary hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6 p-6">
                  {/* Show forms when requested */}
                  {showVehicleForm && (
                    <VehicleForm
                      onSuccess={() => {
                        setShowVehicleForm(false)
                        // Refresh overview data after creating a vehicle
                        refreshAll()
                      }}
                      onCancel={() => setShowVehicleForm(false)}
                    />
                  )}

                  {showDriverForm && (
                    <DriverForm
                      onSuccess={() => {
                        setShowDriverForm(false)
                        // Refresh overview data after creating a driver
                        refreshAll()
                      }}
                      onCancel={() => setShowDriverForm(false)}
                    />
                  )}

                  {/* Only show overview content when no forms are active */}
                  {!showVehicleForm && !showDriverForm && (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="text-lg font-semibold text-primary">Fleet Overview</h3>
                        <div className="flex gap-2 items-center">
                          <button
                            onClick={() => { refreshAll(); showToast('Refreshing data...') }}
                            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-primary rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Refresh
                          </button>
                          {(isSystemAdmin(currentUser) || hasUserPermission(currentUser, 'canManageVehicles')) && (
                            <button
                              onClick={() => setShowVehicleForm(true)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                              Add Vehicle
                            </button>
                          )}
                          {(isSystemAdmin(currentUser) || hasUserPermission(currentUser, 'canManageDrivers')) && (
                            <button
                              onClick={() => setShowDriverForm(true)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Add Driver
                            </button>
                          )}
                        </div>
                      </div>

                  {/* Recent Activity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-4 h-full">
                      <h4 className="font-semibold text-primary mb-3">Recent Trips</h4>
                      <div className="space-y-3">
                        {loadingTrips ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="card p-3 border">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1 w-full">
                                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                                </div>
                                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-4" />
                              </div>
                            </div>
                          ))
                        ) : (
                          (recentTrips || []).map((trip: any) => (
                            <div
                              key={trip.id}
                              className="card p-3 border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => setSelectedTrip(trip)}
                            >
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm break-words">{trip.vehicle?.make} {trip.vehicle?.model} ({trip.vehicle?.licensePlate})</div>
                                  <div className="text-xs text-secondary break-words">Driver: {trip.driver?.fullName}</div>
                                  <div className="text-xs text-secondary break-words">Purpose: {trip.tripPurpose}</div>
                                </div>
                                <div className="text-sm font-medium text-blue-600 whitespace-nowrap">{trip.tripMileage ?? 0} miles</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="card p-4 h-full">
                      <h4 className="font-semibold text-primary mb-3">Upcoming Maintenance</h4>
                      <div className="space-y-3">
                        {loadingMaintenance ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="card p-3 border">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1 w-full">
                                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                                </div>
                                <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse ml-4" />
                              </div>
                            </div>
                          ))
                        ) : (
                          (upcomingMaintenanceList || []).map((maintenance: any) => (
                            <div key={maintenance.id} className="card p-3 border">
                              <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-sm break-words">{maintenance.vehicle?.make} {maintenance.vehicle?.model} ({maintenance.vehicle?.licensePlate})</div>
                                  <div className="text-xs text-secondary break-words">Service: {maintenance.serviceName}</div>
                                </div>
                                <div className={`text-sm font-medium whitespace-nowrap ${
                                  new Date(maintenance.nextServiceDate) < new Date() ? 'text-red-600' : 'text-orange-600'
                                }`}> 
                                  {maintenance.nextServiceDate ? formatDateByFormat(maintenance.nextServiceDate, globalDateFormat) : 'Scheduled'}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Compliance Alerts */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">⚠️ Compliance Alerts</h4>
                      <button
                        onClick={() => { fetchComplianceAlerts(); showToast('Refreshing compliance alerts...') }}
                        className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >Refresh Alerts</button>
                    </div>
                    <div className="space-y-2">
                          {loadingCompliance ? (
                        <div className="space-y-2">
                          {[1,2].map(i => (
                            <div key={i} className="h-6 bg-yellow-200 dark:bg-yellow-800 rounded animate-pulse" />
                          ))}
                        </div>
                          ) : (
                        (complianceAlerts || []).length === 0 ? (
                          <div className="text-sm text-secondary">No compliance alerts</div>
                        ) : (
                          (complianceAlerts || []).map((alert) => (
                            <div key={alert.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <span className="text-sm text-yellow-800 dark:text-yellow-200 break-words">{alert.type === 'vehicle' ? `${alert.licensePlate} - ${alert.message}` : `${alert.name} - ${alert.message}`}</span>
                              <div className="flex gap-2 items-center">
                                {alert.type === 'vehicle' ? (
                                  <>
                                    <button
                                      onClick={() => handleRenew(alert)}
                                      disabled={processingAlerts.includes(String(alert.id)) || !!alert.renewed}
                                      className={`text-xs px-2 py-1 rounded whitespace-nowrap ${processingAlerts.includes(String(alert.id)) ? 'bg-gray-300 text-gray-700' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                                    >
                                      {alert.renewed ? 'Renewed' : (processingAlerts.includes(String(alert.id)) ? 'Processing...' : 'Renew')}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleNotify(alert)}
                                      disabled={processingAlerts.includes(String(alert.id)) || !!alert.notifiedAt}
                                      className={`text-xs px-2 py-1 rounded whitespace-nowrap ${processingAlerts.includes(String(alert.id)) ? 'bg-gray-300 text-gray-700' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                                    >
                                      {alert.notifiedAt ? 'Notified' : (processingAlerts.includes(String(alert.id)) ? 'Sending...' : 'Notify')}
                                    </button>
                                  </>
                                )}
                                {/* show a small timestamp when optimistic updates applied */}
                                {alert.renewedAt && <span className="text-xs text-secondary ml-2">Renewed</span>}
                                {alert.notifiedAt && <span className="text-xs text-secondary ml-2">Notified</span>}
                              </div>
                            </div>
                          ))
                        )
                      )}
                    </div>
                  </div>
                    </>
                  )}
                </div>
              )}

              {/* Vehicles Tab */}
              {activeTab === 'vehicles' && (
                <div className="space-y-6 p-6">
                  {showVehicleForm ? (
                    <VehicleForm
                      onSuccess={() => {
                        setShowVehicleForm(false)
                        // Refresh lists and overview after creating a vehicle
                        refreshAll()
                      }}
                      onCancel={() => setShowVehicleForm(false)}
                    />
                  ) : (
                    <VehicleList
                      onVehicleSelect={(vehicle) => setSelectedVehicle(vehicle)}
                      onAddVehicle={(isSystemAdmin(currentUser) || hasUserPermission(currentUser, 'canManageVehicles')) ? () => setShowVehicleForm(true) : undefined}
                      refreshSignal={refreshCounter}
                      updatedVehicleId={lastUpdatedVehicleId}
                      updateSeq={lastUpdateSeq}
                    />
                  )}
                </div>
              )}

              {/* Drivers Tab */}
              {activeTab === 'drivers' && (
                <div className="space-y-6 p-6">
                  {showDriverForm ? (
                    <DriverForm
                      onSuccess={() => {
                        setShowDriverForm(false)
                        // Refresh lists and overview after creating a driver
                        refreshAll()
                      }}
                      onCancel={() => setShowDriverForm(false)}
                    />
                  ) : (
                    <DriverList
                      onDriverSelect={(driver) => setSelectedDriver(driver)}
                      onAddDriver={(isSystemAdmin(currentUser) || hasUserPermission(currentUser, 'canManageDrivers')) ? () => setShowDriverForm(true) : undefined}
                      refreshSignal={refreshCounter}
                    />
                  )}
                </div>
              )}

              {/* Vehicle Detail Modal */}
              {selectedVehicle && (
                <VehicleDetailModal
                  vehicle={selectedVehicle}
                  onClose={() => setSelectedVehicle(null)}
                  onUpdate={(updated) => {
                    // Update local selection and refresh overview data
                    setSelectedVehicle(updated)
                    // bump refresh counter to signal lists to re-fetch
                    setRefreshCounter(c => c + 1)
                    refreshAll()
                    // Narrow refresh: signal the specific updated vehicle (increment seq so repeated updates still trigger)
                    setLastUpdatedVehicleId(updated.id)
                    setLastUpdateSeq(s => s + 1)
                  }}
                />
              )}

              {/* Driver Detail Modal (render above layout when selected) */}
              {selectedDriver && (
                <DriverDetailModal
                  driver={selectedDriver}
                  onClose={() => setSelectedDriver(null)}
                  onUpdate={(updated) => {
                    // Update local selection and refresh overview data
                    setSelectedDriver(updated)
                    // bump refresh counter to signal lists to re-fetch
                    setRefreshCounter(c => c + 1)
                    refreshAll()
                  }}
                />
              )}

              {/* Trips Tab */}
              {activeTab === 'trips' && (
                <div className="space-y-6 p-6">
                  {showTripForm ? (
                    <TripForm
                      trip={tripToEdit}
                      onSuccess={() => {
                        setShowTripForm(false)
                        setTripToEdit(null)
                        refreshAll()
                        showToast(tripToEdit ? 'Trip updated — overview refreshed' : 'Trip created — overview refreshed')
                      }}
                      onCancel={() => {
                        setShowTripForm(false)
                        setTripToEdit(null)
                      }}
                    />
                  ) : (
                    <TripList
                      onTripSelect={(trip) => setSelectedTrip(trip)}
                      onAddTrip={(isSystemAdmin(currentUser) || hasUserPermission(currentUser, 'canManageTrips')) ? () => setShowTripForm(true) : undefined}
                    />
                  )}
                </div>
              )}

              {/* Trip Detail Modal */}
              {selectedTrip && (
                <TripDetailModal
                  trip={selectedTrip}
                  onClose={() => setSelectedTrip(null)}
                  onUpdate={(trip) => {
                    setTripToEdit(trip)
                    setSelectedTrip(null)
                    setShowTripForm(true)
                    setActiveTab('trips')
                  }}
                  onTripStatusChanged={() => {
                    refreshAll()
                    showToast('Trip status updated — overview refreshed')
                  }}
                />
              )}

              {/* Maintenance Tab */}
              {activeTab === 'maintenance' && (
                <div className="space-y-6 p-6">
                  {showMaintenanceForm || maintenanceToEdit ? (
                    <MaintenanceForm
                      maintenance={maintenanceToEdit || undefined}
                      onSuccess={() => {
                        setShowMaintenanceForm(false)
                        setMaintenanceToEdit(null)
                        refreshAll()
                        showToast(maintenanceToEdit ? 'Maintenance record updated' : 'Maintenance record created — overview refreshed')
                      }}
                      onCancel={() => {
                        setShowMaintenanceForm(false)
                        setMaintenanceToEdit(null)
                      }}
                    />
                  ) : (
                    <MaintenanceList
                      onMaintenanceSelect={(maintenance) => setSelectedMaintenance(maintenance)}
                      onAddMaintenance={(isSystemAdmin(currentUser) || hasUserPermission(currentUser, 'canManageVehicleMaintenance')) ? () => setShowMaintenanceForm(true) : undefined}
                      refreshSignal={refreshCounter}
                    />
                  )}
                </div>
              )}

              {/* Maintenance Detail Modal */}
              {selectedMaintenance && (
                <MaintenanceDetailModal
                  maintenance={selectedMaintenance}
                  onClose={() => setSelectedMaintenance(null)}
                  onStatusChanged={() => {
                    setRefreshCounter(c => c + 1)
                    refreshAll()
                    showToast('Maintenance status updated')
                  }}
                  onEdit={(maintenance) => {
                    setMaintenanceToEdit(maintenance)
                    setSelectedMaintenance(null)
                    setActiveTab('maintenance')
                  }}
                />
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && (
                <VehicleReports />
              )}
            </div>
          </div>
        </div>
      </ContentLayout>
    </ProtectedRoute>
  )
}