 'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { createPortal } from 'react-dom'
import { VehicleMaintenanceRecord } from '@/types/vehicle'
import { useDateFormat } from '@/contexts/settings-context'
import { formatDateByFormat } from '@/lib/country-codes'

interface MaintenanceDetailModalProps {
  maintenance: VehicleMaintenanceRecord | null
  onClose: () => void
}

export function MaintenanceDetailModal({ maintenance, onClose }: MaintenanceDetailModalProps) {
  const [mounted, setMounted] = useState(false)
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
  const { format: globalDateFormat } = useDateFormat()
  const toast = useToastContext()
  const formatDate = (d?: string) => (d ? formatDateByFormat(d, globalDateFormat) : 'N/A')

  if (!maintenance) return null
  if (!mounted || !elRef.current) return null

  const content = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4 overflow-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-primary">Maintenance Details</h3>
            <p className="text-sm text-secondary">{maintenance.serviceName}</p>
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
              className="px-4 py-2 bg-green-100 text-green-700 rounded-md"
            >
              Open Receipt
            </button>
          ) : (
            <button disabled className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md">No Receipt</button>
          )}

          <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md">Close</button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, elRef.current)
}
