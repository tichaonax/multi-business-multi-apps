'use client'

import { useState, useEffect } from 'react'
import { hasPermission, SessionUser, isSystemAdmin } from '@/lib/permission-utils'

interface PayrollExportModalProps {
  currentUser: SessionUser
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (error: string) => void
}

export function PayrollExportModal({ 
  currentUser, 
  onClose, 
  onSuccess, 
  onError 
}: PayrollExportModalProps) {
  const [loading, setLoading] = useState(false)
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string; type: string }>>([])
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    businessId: ''
  })

  // Check permissions - HR manager needs both export and reports permissions
  const canExportPayroll = hasPermission(currentUser, 'canExportEmployeeData') && 
                          hasPermission(currentUser, 'canViewEmployeeReports')
  
  if (!canExportPayroll && !isSystemAdmin(currentUser)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Insufficient Permissions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Only HR managers with employee data export and reporting permissions can generate payroll exports.
          </p>
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        const response = await fetch('/api/admin/businesses')
        if (response.ok) {
          const data = await response.json()
          setBusinesses(data)
        }
      } catch (error) {
        console.error('Error loading businesses:', error)
      }
    }
    loadBusinesses()
  }, [])

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const params = new URLSearchParams({
        month: String(formData.month),
        year: String(formData.year),
        ...(formData.businessId && { businessId: formData.businessId })
      })

      const response = await fetch(`/api/payroll/export?${params}`)
      
      if (response.ok) {
        // Handle file download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        
        // Get filename from response header
        const contentDisposition = response.headers.get('content-disposition')
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
        const filename = filenameMatch?.[1] || `payroll-export-${formData.month}-${formData.year}.csv`
        
        a.style.display = 'none'
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        onSuccess(`Payroll export generated successfully: ${filename}`)
        onClose()
      } else {
        const errorData = await response.json()
        onError(errorData.error || 'Failed to generate payroll export')
      }
    } catch (error) {
      onError('Error generating payroll export')
    } finally {
      setLoading(false)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-lg mx-4">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Export Payroll Data
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Generate a CSV file for external payroll processing
          </p>
        </div>

        <form onSubmit={handleExport} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input-field"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="input-field"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Filter
            </label>
            <select
              className="input-field"
              value={formData.businessId}
              onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
            >
              <option value="">All Businesses</option>
              {businesses.map(business => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to export all businesses you have access to
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Export Will Include:
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Employee basic information and employment details</li>
              <li>• Current salary with recent increases</li>
              <li>• Bonuses and deductions for the selected month</li>
              <li>• Loan deductions and remaining balances</li>
              <li>• Leave balances and usage</li>
              <li>• Net Gross calculations</li>
            </ul>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Confidential Data
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  This export contains sensitive employee and payroll information. 
                  Handle with appropriate security measures and send only to authorized payroll vendors.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m15.84 9.13a4 4 0 0 0-7.01-2.13C7.1 8.15 6 9.82 6 11.5c0 .28.02.56.07.83A6.98 6.98 0 0 1 12 6c3.31 0 6.18 2.3 6.93 5.4z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  📊 Export Payroll Data
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}