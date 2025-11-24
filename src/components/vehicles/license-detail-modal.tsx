'use client'

import { VehicleLicense } from '@/types/vehicle'
import { X, Calendar, AlertCircle, CheckCircle, Edit, Trash2 } from 'lucide-react'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface LicenseDetailModalProps {
  license: VehicleLicense | null
  onClose: () => void
  onEdit?: (license: VehicleLicense) => void
  onDelete?: (licenseId: string) => void
  canEdit?: boolean
}

export function LicenseDetailModal({ license, onClose, onEdit, onDelete, canEdit }: LicenseDetailModalProps) {
  const { format: globalDateFormat } = useDateFormat()

  if (!license) return null

  const formatDate = (date: string) => formatDateByFormat(date, globalDateFormat)

  // License status calculation
  const getLicenseStatus = () => {
    const now = new Date()
    const expiryDate = new Date(license.expiryDate)
    const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff < 0) return 'expired'
    if (daysDiff <= 7) return 'expiring'
    if (daysDiff <= 30) return 'warning'
    return 'valid'
  }

  const status = getLicenseStatus()

  const getStatusIcon = () => {
    switch (status) {
      case 'expired':
      case 'expiring':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-600" />
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'expired': return 'Expired'
      case 'expiring': return 'Expiring Soon'
      case 'warning': return 'Due Soon'
      case 'valid': return 'Valid'
      default: return 'Unknown'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'expired':
      case 'expiring':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300'
      case 'warning':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300'
      case 'valid':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-300'
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary">
                {license.licenseType.replace('_', ' ')} License
              </h2>
              <p className="text-sm text-secondary">#{license.licenseNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="ml-2">{getStatusText()}</span>
            </span>
          </div>

          {/* License Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary">License Type</label>
              <p className="text-sm text-primary font-medium">{license.licenseType.replace('_', ' ')}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary">License Number</label>
              <p className="text-sm text-primary font-mono font-semibold">#{license.licenseNumber}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Effective Date</span>
              </label>
              <p className="text-sm text-primary">{formatDate(license.issueDate)}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Expiry Date</span>
              </label>
              <p className="text-sm text-primary font-semibold">{formatDate(license.expiryDate)}</p>
            </div>

            {license.issuingAuthority && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary">Issuing Authority</label>
                <p className="text-sm text-primary">{license.issuingAuthority}</p>
              </div>
            )}

            {license.renewalCost !== null && license.renewalCost !== undefined && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary">Renewal Cost</label>
                <p className="text-sm text-primary font-semibold text-green-700 dark:text-green-400">
                  ${Number(license.renewalCost).toLocaleString()}
                </p>
              </div>
            )}

            {license.lateFee !== null && license.lateFee !== undefined && license.lateFee > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-secondary">Late Fee / Penalty</label>
                <p className="text-sm text-primary font-semibold text-red-700 dark:text-red-400">
                  ${Number(license.lateFee).toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary">Status</label>
              <p className="text-sm">
                <span className={`px-2 py-1 rounded-full text-xs ${license.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                  {license.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary">Reminder</label>
              <p className="text-sm text-primary">{license.reminderDays} days before expiry</p>
            </div>

            {license.documentUrl && (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-medium text-secondary">Document</label>
                <a
                  href={license.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Document
                </a>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-secondary">
              <div>
                <span className="font-medium">Created:</span> {formatDate(license.createdAt)}
              </div>
              <div>
                <span className="font-medium">Last Updated:</span> {formatDate(license.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {canEdit && onEdit && (
            <button
              onClick={() => {
                onEdit(license)
                onClose()
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              <span>Edit</span>
            </button>
          )}
          {canEdit && onDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this license?')) {
                  onDelete(license.id)
                  onClose()
                }
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
