 'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToastContext } from '@/components/ui/toast'
import { useConfirm } from '@/components/ui/confirm-modal'
import { createPortal } from 'react-dom'
import { VehicleMaintenanceRecord } from '@/types/vehicle'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'

interface MaintenanceDetailModalProps {
  maintenance: VehicleMaintenanceRecord | null
  onClose: () => void
  onStatusChanged?: () => void
  onEdit?: (maintenance: VehicleMaintenanceRecord) => void
}

export function MaintenanceDetailModal({ maintenance, onClose, onStatusChanged, onEdit }: MaintenanceDetailModalProps) {
  const [mounted, setMounted] = useState(false)
  const [processing, setProcessing] = useState(false)
  const elRef = useRef<HTMLDivElement | null>(null)
  const portalRootRef = useRef<Element | null>(null)

  useEffect(() => {
    // Create container for portal on first mount
    elRef.current = document.createElement('div')
    portalRootRef.current = document.body
    if (portalRootRef.current && elRef.current) portalRootRef.current.appendChild(elRef.current)
    setMounted(true)

    return () => {
      if (portalRootRef.current && elRef.current && portalRootRef.current.contains(elRef.current)) {
        portalRootRef.current.removeChild(elRef.current)
      }
    }
  }, [])

  // Call context hooks before any early returns to maintain stable hooks order
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const toast = useToastContext()
  const confirm = useConfirm()
  const { hasPermission, isSystemAdmin } = useBusinessPermissionsContext()
  const formatDate = (d?: string) => (d ? formatDateByFormat(d, globalDateFormat) : 'N/A')

  if (!maintenance) return null
  if (!mounted || !elRef.current) return null

  // Permission checks
  const canManage = isSystemAdmin ||
    hasPermission('canManageTrips') ||
    hasPermission('canManageBusinessUsers')

  // Can edit only if maintenance is not completed
  const canEdit = !maintenance.isCompleted && canManage

  const handleMarkComplete = async () => {
    const confirmed = await confirm({
      title: 'Mark Maintenance as Complete',
      description: `Are you sure you want to mark this maintenance as complete?\n\nService: ${maintenance.serviceName}\nCost: ${maintenance.currency} ${maintenance.cost?.toLocaleString()}\n\nThis will prevent further editing unless reopened.`,
      confirmText: 'Mark Complete',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    setProcessing(true)
    try {
      const response = await fetch('/api/vehicles/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: maintenance.id,
          isCompleted: true
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark maintenance as complete')
      }

      toast.push('Maintenance marked as complete')
      onClose()
      if (onStatusChanged) onStatusChanged()
    } catch (err) {
      console.error('Error marking maintenance as complete:', err)
      toast.push(err instanceof Error ? err.message : 'Failed to mark maintenance as complete')
    } finally {
      setProcessing(false)
    }
  }

  const handleReopen = async () => {
    const confirmed = await confirm({
      title: 'Reopen Maintenance',
      description: `Are you sure you want to reopen this maintenance record?\n\nService: ${maintenance.serviceName}\nCost: ${maintenance.currency} ${maintenance.cost?.toLocaleString()}\n\nThis will change the status back to "Pending" and allow editing.`,
      confirmText: 'Reopen',
      cancelText: 'Cancel'
    })

    if (!confirmed) return

    setProcessing(true)
    try {
      const response = await fetch('/api/vehicles/maintenance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: maintenance.id,
          isCompleted: false
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reopen maintenance')
      }

      toast.push('Maintenance reopened successfully')
      onClose()
      if (onStatusChanged) onStatusChanged()
    } catch (err) {
      console.error('Error reopening maintenance:', err)
      toast.push(err instanceof Error ? err.message : 'Failed to reopen maintenance')
    } finally {
      setProcessing(false)
    }
  }

  const content = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4 overflow-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-primary">Maintenance Details</h3>
              {maintenance.isCompleted ? (
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Completed
                </span>
              ) : (
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Pending
                </span>
              )}
            </div>
            <p className="text-sm text-secondary mt-1">{maintenance.serviceName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-secondary">
          <div>
            <div className="font-medium">Vehicle</div>
            <div>{maintenance.vehicle ? maintenance.vehicle.licensePlate : 'N/A'}</div>
          </div>

          <div>
            <div className="font-medium">Date</div>
            <div>{formatDate(maintenance.serviceDate)}</div>
          </div>

          <div>
            <div className="font-medium">Provider</div>
            <div>{maintenance.serviceProvider || 'N/A'}</div>
          </div>

          <div>
            <div className="font-medium">Cost</div>
            <div>{maintenance.currency} {maintenance.cost?.toLocaleString() || 'N/A'}</div>
          </div>

          <div>
            <div className="font-medium">Mileage</div>
            <div>{maintenance.mileageAtService?.toLocaleString() || 'N/A'} miles</div>
          </div>

          {maintenance.nextServiceDate && (
            <div>
              <div className="font-medium">Next Service</div>
              <div>{formatDate(maintenance.nextServiceDate)}</div>
            </div>
          )}

          {maintenance.notes && (
            <div className="sm:col-span-2">
              <div className="font-medium">Notes</div>
              <div className="text-sm text-secondary">{maintenance.notes}</div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {maintenance.receiptUrl ? (
            <button
              onClick={async () => {
                const url = maintenance.receiptUrl!
                // Open a blank window immediately to avoid popup blockers
                const newWin = typeof window !== 'undefined' ? window.open('about:blank', '_blank', 'noopener') : null
                try {
                  if (!newWin) throw new Error('Unable to open new window')

                  // Try to fetch the receipt as a blob. Use credentials in case the file requires auth.
                  const res = await fetch(url, { credentials: 'include' })

                  // If the server returned HTML or redirected to a login/home page, bail out
                  const contentType = res.headers.get('content-type') || ''
                  if (!res.ok) {
                    newWin.close()
                    toast.push('Failed to open receipt: server returned an error')
                    return
                  }

                  if (contentType.includes('text/html')) {
                    // Likely a redirect to an HTML page (login/home). Close the tab and show message.
                    newWin.close()
                    toast.push('Receipt could not be opened — it may require authentication or is not available.')
                    return
                  }

                  const blob = await res.blob()
                  const blobUrl = URL.createObjectURL(blob)
                  newWin.location.href = blobUrl
                } catch (err) {
                  try { newWin?.close() } catch (e) {}
                  toast.push((err as any)?.message || 'Failed to open receipt')
                }
              }}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              Open Receipt
            </button>
          ) : (
            <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md">No Receipt</button>
          )}

          {/* Edit button - only show for pending maintenance if user has permission */}
          {canEdit && onEdit && (
            <button
              onClick={() => onEdit(maintenance)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          )}

          {/* Mark as Complete button - only show for pending maintenance if user has permission */}
          {!maintenance.isCompleted && canManage && (
            <button
              onClick={handleMarkComplete}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Mark Complete'}
            </button>
          )}

          {/* Reopen button - only show for completed maintenance if user has permission */}
          {maintenance.isCompleted && canManage && (
            <button
              onClick={handleReopen}
              disabled={processing}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : 'Reopen'}
            </button>
          )}

          <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, elRef.current)
}
