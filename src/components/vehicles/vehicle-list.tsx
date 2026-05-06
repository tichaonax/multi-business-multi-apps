'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useToastContext } from '@/components/ui/toast'
import { Vehicle, VehicleApiResponse, VehicleLicense } from '@/types/vehicle'
import { LicenseStatusIndicator } from './license-status-indicator'
import { LicenseDetailModal } from './license-detail-modal'
import { isSystemAdmin, SessionUser } from '@/lib/permission-utils'

interface VehicleListProps {
  onVehicleSelect?: (vehicle: Vehicle) => void
  onAddVehicle?: () => void
  refreshSignal?: number
  updatedVehicleId?: string | null
  updateSeq?: number
}

export function VehicleList({ onVehicleSelect, onAddVehicle, refreshSignal, updatedVehicleId, updateSeq }: VehicleListProps) {
  const { data: session } = useSession()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewingLicense, setViewingLicense] = useState<VehicleLicense | null>(null)
  const [exportPdfVehicle, setExportPdfVehicle] = useState<Vehicle | null>(null)
  // Keep a ref to the current in-flight request so we can cancel it
  const controllerRef = useRef<AbortController | null>(null)

  // Check if user has permission to delete vehicles
  const canDeleteVehicles = session?.user && isSystemAdmin(session.user as SessionUser)

  // Check if vehicle can be deleted (has no related data)
  const canDeleteVehicle = (vehicle: Vehicle): boolean => {
    const hasTrips = vehicle.trips && vehicle.trips.length > 0
    const hasLicenses = vehicle.vehicleLicenses && vehicle.vehicleLicenses.length > 0
    const hasMaintenance = vehicle.maintenanceRecords && vehicle.maintenanceRecords.length > 0
    const hasExpenses = vehicle.expenseRecords && vehicle.expenseRecords.length > 0
    const hasAuthorizations = vehicle.driverAuthorizations && vehicle.driverAuthorizations.length > 0

    return !hasTrips && !hasLicenses && !hasMaintenance && !hasExpenses && !hasAuthorizations
  }

  const handleExportVehiclePdf = (vehicle: Vehicle) => {
    setExportPdfVehicle(vehicle)
  }

  const handlePrintVehiclePdf = (vehicle: Vehicle) => {
    const today = new Date()
    const formatExpiry = (dateStr: string) => {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-GB') + (d < today ? ' ⚠️ EXPIRED' : '')
    }

    const licenseRows = (vehicle.vehicleLicenses ?? []).map(lic => `
      <tr>
        <td>${lic.licenseType.replace(/_/g, ' ')}</td>
        <td>${lic.licenseNumber}</td>
        <td>${lic.issuingAuthority ?? 'N/A'}</td>
        <td>${lic.issueDate ? new Date(lic.issueDate).toLocaleDateString('en-GB') : 'N/A'}</td>
        <td style="color:${new Date(lic.expiryDate) < today ? '#dc2626' : 'inherit'}">${formatExpiry(lic.expiryDate)}</td>
        <td>${lic.isExempt ? 'EXEMPT' : lic.isActive ? 'Active' : 'Inactive'}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html><head><title>Vehicle Details - ${vehicle.licensePlate}</title>
<style>
  html,body{margin:0;padding:0;}
  .print-toolbar{position:sticky;top:0;background:#f8fafc;border-bottom:1px solid #e2e8f0;padding:10px 16px;display:flex;align-items:center;gap:12px;z-index:100;}
  .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
  .print-btn:hover{background:#374151;}
  .print-title{font-size:13px;color:#64748b;font-family:sans-serif;}
  .content{font-family:Arial,sans-serif;padding:32px;max-width:750px;margin:0 auto;color:#111;}
  h1{font-size:20px;margin-bottom:4px;}
  .sub{color:#555;font-size:13px;margin-bottom:16px;}
  h2{font-size:14px;margin-top:24px;margin-bottom:8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  td,th{padding:7px 10px;border-bottom:1px solid #e5e7eb;text-align:left;}
  th{background:#f3f4f6;font-weight:600;}
  .info td:first-child{font-weight:600;width:35%;color:#374151;}
  @media print{.print-toolbar{display:none;}.content{padding:16px;}}
</style>
</head><body>
<div class="print-toolbar">
  <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <span class="print-title">Vehicle Details — ${vehicle.licensePlate}</span>
</div>
<div class="content">
<h1>${vehicle.year} ${vehicle.make} ${vehicle.model}</h1>
<div class="sub">License Plate: <strong>${vehicle.licensePlate}</strong> &nbsp;|&nbsp; VIN: ${vehicle.vin} &nbsp;|&nbsp; ${vehicle.ownershipType}</div>
<h2>Vehicle Details</h2>
<table class="info">
  <tr><td>Color</td><td>${vehicle.color ?? 'N/A'}</td></tr>
  <tr><td>Mileage</td><td>${vehicle.currentMileage.toLocaleString()} ${vehicle.mileageUnit.toUpperCase()}</td></tr>
  <tr><td>Business</td><td>${vehicle.business?.name ?? 'N/A'}</td></tr>
  <tr><td>Owner</td><td>${vehicle.user?.name ?? 'N/A'}</td></tr>
  <tr><td>Status</td><td>${vehicle.isActive ? 'Active' : 'Inactive'}</td></tr>
  ${vehicle.notes ? `<tr><td>Notes</td><td>${vehicle.notes}</td></tr>` : ''}
</table>
<h2>License / Registration Status</h2>
${licenseRows ? `<table>
  <thead><tr><th>Type</th><th>Number</th><th>Issuing Authority</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th></tr></thead>
  <tbody>${licenseRows}</tbody>
</table>` : '<p style="color:#777;font-size:13px">No licenses recorded.</p>'}
<p style="font-size:11px;color:#aaa;margin-top:24px">Generated: ${today.toLocaleDateString('en-GB')} ${today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
</div>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }

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

  const handleDelete = async (vehicle: Vehicle) => {
    // Check if vehicle has related data
    const relatedData = []
    if (vehicle.trips && vehicle.trips.length > 0) relatedData.push('trips')
    if (vehicle.vehicleLicenses && vehicle.vehicleLicenses.length > 0) relatedData.push('licenses')
    if (vehicle.maintenanceRecords && vehicle.maintenanceRecords.length > 0) relatedData.push('maintenance records')
    if (vehicle.expenseRecords && vehicle.expenseRecords.length > 0) relatedData.push('expenses')
    if (vehicle.driverAuthorizations && vehicle.driverAuthorizations.length > 0) relatedData.push('driver authorizations')

    if (relatedData.length > 0) {
      toast.error(`Cannot delete vehicle: It has ${relatedData.join(', ')}. Please remove these first.`)
      return
    }

    const ok = await confirm({
      title: 'Delete vehicle',
      description: `Are you sure you want to delete ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    })

    if (!ok) return

    try {
      const response = await fetch(`/api/vehicles?id=${vehicle.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete vehicle')
      }

      toast.push('Vehicle deleted successfully')
      // Refresh the list
      fetchVehicles()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete vehicle')
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
                          <span className="font-medium">Business:</span> {vehicle.business.name}
                        </div>
                      )}

                      {vehicle.user && (
                        <div className="mt-1 text-sm text-secondary">
                          <span className="font-medium">Owner:</span> {vehicle.user.name}
                        </div>
                      )}

                      {/* License Status */}
                      {vehicle.vehicleLicenses && vehicle.vehicleLicenses.length > 0 && (
                        <div className="mt-2">
                          <LicenseStatusIndicator
                            licenses={vehicle.vehicleLicenses}
                            compact={true}
                            onLicenseClick={(license) => setViewingLicense(license)}
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
                          handleExportVehiclePdf(vehicle)
                        }}
                        className="w-full sm:w-auto px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-center cursor-pointer"
                        title="Export vehicle details to PDF"
                      >
                        📄 Export PDF
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(vehicle)
                        }}
                        disabled={!canDeleteVehicles || !canDeleteVehicle(vehicle)}
                        title={
                          !canDeleteVehicles
                            ? 'You do not have permission to delete vehicles'
                            : !canDeleteVehicle(vehicle)
                            ? 'Cannot delete vehicle with existing trips, licenses, maintenance, expenses, or driver authorizations'
                            : 'Delete vehicle'
                        }
                        className="w-full sm:w-auto px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* License Detail Modal */}
      {viewingLicense && (
        <LicenseDetailModal
          license={viewingLicense}
          onClose={() => setViewingLicense(null)}
          canEdit={false}
        />
      )}

      {/* Export PDF Modal */}
      {exportPdfVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 mx-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">📄 Vehicle Details</h3>
              <button onClick={() => setExportPdfVehicle(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            <div className="mb-4">
              <p className="font-semibold text-base text-gray-900 dark:text-white">
                {exportPdfVehicle.year} {exportPdfVehicle.make} {exportPdfVehicle.model}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {exportPdfVehicle.licensePlate} &nbsp;|&nbsp; {exportPdfVehicle.ownershipType}
              </p>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {[
                    ['Color', exportPdfVehicle.color ?? 'N/A'],
                    ['Mileage', `${exportPdfVehicle.currentMileage.toLocaleString()} ${exportPdfVehicle.mileageUnit.toUpperCase()}`],
                    ['VIN', exportPdfVehicle.vin],
                    ['Business', exportPdfVehicle.business?.name ?? 'N/A'],
                    ['Owner', exportPdfVehicle.user?.name ?? 'N/A'],
                    ['Status', exportPdfVehicle.isActive ? 'Active' : 'Inactive'],
                    ['Licenses', `${(exportPdfVehicle.vehicleLicenses ?? []).length} recorded`],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-1 pr-3 font-medium text-gray-600 dark:text-gray-400 w-2/5">{label}</td>
                      <td className="py-1 text-gray-800 dark:text-gray-200">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setExportPdfVehicle(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => handlePrintVehiclePdf(exportPdfVehicle)}
                className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700"
              >
                🖨️ Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}