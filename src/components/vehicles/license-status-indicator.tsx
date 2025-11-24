'use client'

import { VehicleLicense } from '@/types/vehicle'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface LicenseStatusIndicatorProps {
  licenses: VehicleLicense[]
  showDetails?: boolean
  compact?: boolean
  onLicenseClick?: (license: VehicleLicense) => void
}

export function LicenseStatusIndicator({ licenses, showDetails = false, compact = false, onLicenseClick }: LicenseStatusIndicatorProps) {
  const { format: globalDateFormat } = useDateFormat()

  if (!licenses || licenses.length === 0) {
    return (
      <div className={`flex items-center space-x-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        <AlertTriangle className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-gray-400`} />
        <span className="text-gray-500">No licenses</span>
      </div>
    )
  }

  const now = new Date()
  // Filter for active licenses with valid data (must have id, licenseType, and expiryDate)
  const activeLicenses = licenses.filter(license =>
    license.isActive &&
    license.id &&
    license.licenseType &&
    license.expiryDate &&
    license.licenseNumber &&
    license.licenseNumber.trim() !== ''
  )

  // Calculate license status for each active license
  const licenseStatuses = activeLicenses.map(license => {
    const expiryDate = new Date(license.expiryDate)
    const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let status: 'expired' | 'expiring' | 'warning' | 'valid' = 'valid'
    if (daysDiff < 0) {
      status = 'expired'
    } else if (daysDiff <= 7) {
      status = 'expiring'
    } else if (daysDiff <= 30) {
      status = 'warning'
    }

    return {
      license,
      daysDiff,
      status,
      formattedDate: formatDateByFormat(license.expiryDate, globalDateFormat)
    }
  })

  // Determine overall status (worst case)
  const overallStatus = licenseStatuses.reduce((worst, current) => {
    const priority = { expired: 4, expiring: 3, warning: 2, valid: 1 }
    return priority[current.status] > priority[worst] ? current.status : worst
  }, 'valid' as 'expired' | 'expiring' | 'warning' | 'valid')

  // Get status styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'expired':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      case 'expiring':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      case 'warning':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
      case 'valid':
        return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    const iconSize = compact ? 'h-3 w-3' : 'h-4 w-4'
    switch (status) {
      case 'expired':
        return <AlertTriangle className={`${iconSize} text-red-600`} />
      case 'expiring':
        return <AlertTriangle className={`${iconSize} text-red-600`} />
      case 'warning':
        return <Clock className={`${iconSize} text-orange-600`} />
      case 'valid':
        return <CheckCircle className={`${iconSize} text-green-600`} />
      default:
        return <Calendar className={`${iconSize} text-gray-600`} />
    }
  }

  // Get status text
  const getStatusText = (status: string, count: number) => {
    switch (status) {
      case 'expired':
        return `${count} expired`
      case 'expiring':
        return `${count} expiring`
      case 'warning':
        return `${count} due soon`
      case 'valid':
        return `${count} valid`
      default:
        return `${count} licenses`
    }
  }

  if (compact) {
    // Only show if there are actual licenses - don't show empty state in compact mode
    if (licenseStatuses.length === 0) {
      return null
    }

    // Group by license type and prioritize unexpired licenses
    const prioritizedLicenses = licenseStatuses.reduce((acc, item) => {
      const licenseType = item.license.licenseType

      if (!acc[licenseType]) {
        acc[licenseType] = item
      } else {
        // Prioritize unexpired over expired, then by expiry date (later dates first)
        const current = acc[licenseType]
        const isCurrentExpired = current.status === 'expired'
        const isNewExpired = item.status === 'expired'

        if (isCurrentExpired && !isNewExpired) {
          // Replace expired with unexpired
          acc[licenseType] = item
        } else if (isCurrentExpired === isNewExpired) {
          // Both same expiry status, choose the one with later expiry date
          const currentExpiry = new Date(current.license.expiryDate)
          const newExpiry = new Date(item.license.expiryDate)
          if (newExpiry > currentExpiry) {
            acc[licenseType] = item
          }
        }
        // If current is unexpired and new is expired, keep current
      }

      return acc
    }, {} as Record<string, typeof licenseStatuses[0]>)

    const uniqueLicenseStatuses = Object.values(prioritizedLicenses)

    return (
      <div className="flex flex-wrap gap-1">
        {uniqueLicenseStatuses.map(({ license, status }) => {
          const Component = onLicenseClick ? 'button' : 'div'
          return (
            <Component
              key={license.id}
              onClick={onLicenseClick ? () => onLicenseClick(license) : undefined}
              className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border text-xs ${getStatusStyle(status)} ${onLicenseClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            >
              {getStatusIcon(status)}
              <span>{license.licenseType.replace('_', ' ')}</span>
            </Component>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Overall Status Summary */}
      <div className={`flex items-center space-x-2 p-2 rounded-lg border ${getStatusStyle(overallStatus)}`}>
        {getStatusIcon(overallStatus)}
        <span className="text-sm font-medium">
          {getStatusText(overallStatus, activeLicenses.length)}
        </span>
      </div>

      {/* Detailed License List */}
      {showDetails && (
        <div className="space-y-1">
          {licenseStatuses.map(({ license, status, formattedDate, daysDiff }) => (
            <div key={license.id} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <div className="flex items-center space-x-2">
                {getStatusIcon(status)}
                <span className="font-medium">
                  {license.licenseType.replace('_', ' ')}
                </span>
              </div>
              <div className="text-right">
                <div className={`font-medium ${
                  status === 'expired' ? 'text-red-600' :
                  status === 'expiring' ? 'text-red-600' :
                  status === 'warning' ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {formattedDate}
                </div>
                <div className="text-gray-500">
                  {daysDiff < 0 ? `${Math.abs(daysDiff)} days ago` :
                   daysDiff === 0 ? 'Today' :
                   `${daysDiff} days`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper function to get the most critical license status for a vehicle
export function getVehicleLicenseStatus(licenses: VehicleLicense[]) {
  if (!licenses || licenses.length === 0) {
    return { status: 'none', count: 0, message: 'No licenses' }
  }

  const now = new Date()
  const activeLicenses = licenses.filter(license => license.isActive)

  if (activeLicenses.length === 0) {
    return { status: 'none', count: 0, message: 'No active licenses' }
  }

  let expiredCount = 0
  let expiringCount = 0
  let warningCount = 0
  let validCount = 0

  activeLicenses.forEach(license => {
    const expiryDate = new Date(license.expiryDate)
    const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) {
      expiredCount++
    } else if (daysDiff <= 7) {
      expiringCount++
    } else if (daysDiff <= 30) {
      warningCount++
    } else {
      validCount++
    }
  })

  // Return worst case status
  if (expiredCount > 0) {
    return { status: 'expired', count: expiredCount, message: `${expiredCount} expired` }
  }
  if (expiringCount > 0) {
    return { status: 'expiring', count: expiringCount, message: `${expiringCount} expiring` }
  }
  if (warningCount > 0) {
    return { status: 'warning', count: warningCount, message: `${warningCount} due soon` }
  }

  return { status: 'valid', count: validCount, message: `${validCount} valid` }
}