'use client'

import { useState, useEffect } from 'react'
import { VehicleLicense } from '@/types/vehicle'
import { AlertTriangle, Calendar, Car, X } from 'lucide-react'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import Link from 'next/link'
import { LicenseDetailModal } from './license-detail-modal'

interface ExpiringLicense extends VehicleLicense {
  vehicle?: {
    id: string
    make: string
    model: string
    licensePlate: string
  }
  daysUntilExpiry: number
}

export function ExpiringLicensesWidget() {
  const [licenses, setLicenses] = useState<ExpiringLicense[]>([])
  const [loading, setLoading] = useState(true)
  const [showWidget, setShowWidget] = useState(true)
  const [viewingLicense, setViewingLicense] = useState<VehicleLicense | null>(null)
  const { format: globalDateFormat } = useDateFormat()

  useEffect(() => {
    const fetchExpiringLicenses = async () => {
      try {
        const response = await fetch('/api/vehicles?includeLicenses=true&isActive=true')
        if (!response.ok) return

        const result = await response.json()
        if (!result.success || !result.data) return

        const now = new Date()
        const expiringLicenses: ExpiringLicense[] = []

        result.data.forEach((vehicle: any) => {
          if (vehicle.vehicleLicenses && vehicle.vehicleLicenses.length > 0) {
            vehicle.vehicleLicenses.forEach((license: VehicleLicense) => {
              if (!license.isActive) return

              const expiryDate = new Date(license.expiryDate)
              const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

              // Include licenses expiring within 30 days or already expired
              if (daysDiff <= 30) {
                expiringLicenses.push({
                  ...license,
                  vehicle: {
                    id: vehicle.id,
                    make: vehicle.make,
                    model: vehicle.model,
                    licensePlate: vehicle.licensePlate
                  },
                  daysUntilExpiry: daysDiff
                })
              }
            })
          }
        })

        // Sort by urgency (expiring soonest first)
        expiringLicenses.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

        setLicenses(expiringLicenses)
      } catch (error) {
        console.error('Error fetching expiring licenses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExpiringLicenses()
  }, [])

  const getUrgencyColor = (days: number) => {
    if (days < 0) return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    if (days <= 7) return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    if (days <= 14) return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
    return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
  }

  const getUrgencyText = (days: number) => {
    if (days < 0) return { text: 'EXPIRED', color: 'text-red-700 dark:text-red-300' }
    if (days === 0) return { text: 'Expires Today', color: 'text-red-700 dark:text-red-300' }
    if (days === 1) return { text: 'Tomorrow', color: 'text-red-700 dark:text-red-300' }
    if (days <= 7) return { text: `${days} days`, color: 'text-red-700 dark:text-red-300' }
    if (days <= 14) return { text: `${days} days`, color: 'text-orange-700 dark:text-orange-300' }
    return { text: `${days} days`, color: 'text-yellow-700 dark:text-yellow-300' }
  }

  if (loading) return null
  if (!showWidget || licenses.length === 0) return null

  return (
    <>
      <div className="card p-6 border-l-4 border-red-500">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">
                Vehicle License Alerts
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                {licenses.length} license{licenses.length !== 1 ? 's' : ''} {licenses.length === 1 ? 'requires' : 'require'} attention
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWidget(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {licenses.map((license) => {
            const urgency = getUrgencyText(license.daysUntilExpiry)
            return (
              <button
                key={license.id}
                onClick={() => setViewingLicense(license)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border ${getUrgencyColor(license.daysUntilExpiry)} hover:opacity-80 transition-opacity cursor-pointer`}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Car className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {license.vehicle?.make} {license.vehicle?.model}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        ({license.vehicle?.licensePlate})
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-semibold">{license.licenseType.replace('_', ' ')}</span>
                      <span className="mx-1">•</span>
                      <span>Expires: {formatDateByFormat(license.expiryDate, globalDateFormat)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 flex-shrink-0">
                  <div className="text-right">
                    <div className={`text-sm font-bold ${urgency.color}`}>
                      {urgency.text}
                    </div>
                    {license.daysUntilExpiry < 0 && (
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                        {Math.abs(license.daysUntilExpiry)} day{Math.abs(license.daysUntilExpiry) !== 1 ? 's' : ''} ago
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/vehicles"
            className="inline-flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            <Calendar className="h-4 w-4" />
            <span>Manage Vehicle Licenses</span>
          </Link>
        </div>
      </div>

      {/* License Detail Modal */}
      {viewingLicense && (
        <LicenseDetailModal
          license={viewingLicense}
          onClose={() => setViewingLicense(null)}
          canEdit={false}
        />
      )}
    </>
  )
}
