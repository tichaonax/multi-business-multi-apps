'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { SystemAdminRoute } from '@/components/auth/system-admin-route'

interface Business {
  id: string
  name: string
  type: string
}

interface PayrollSummary {
  businessId: string
  businessName: string
  employeeCount: number
  totalGrossPay: number
  totalNetPay: number
  hasTimeTracking: boolean
  hasAllowances: boolean
}

export default function AdminPayrollPage() {
  const { data: session } = useSession()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedFormat, setSelectedFormat] = useState('xlsx')
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadBusinesses()
    loadPayrollSummary()
  }, [])

  const loadBusinesses = async () => {
    try {
      const response = await fetch('/api/admin/businesses')
      if (response.ok) {
        const data = await response.json()
        setBusinesses(data.businesses || [])
      }
    } catch (error) {
      setError('Failed to load businesses')
    }
  }

  const loadPayrollSummary = async () => {
    try {
      const response = await fetch(`/api/payroll/summary?month=${selectedMonth}&year=${selectedYear}`)
      if (response.ok) {
        const data = await response.json()
        setPayrollSummary(data.summary || [])
      }
    } catch (error) {
      // Summary endpoint might not exist yet - that's okay
    } finally {
      setLoading(false)
    }
  }

  const exportPayroll = async () => {
    if (!selectedBusiness) {
      setError('Please select a business')
      return
    }

    setExporting(true)
    setError('')
    
    try {
      const response = await fetch(
        `/api/payroll/export?businessId=${selectedBusiness}&month=${selectedMonth}&year=${selectedYear}&format=${selectedFormat}`
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        
        const business = businesses.find(b => b.id === selectedBusiness)
        const monthName = new Date(selectedYear, selectedMonth - 1, 1).toLocaleString('default', { month: 'long' })
        const filename = `${business?.name || 'Business'}_Payroll_${monthName}_${selectedYear}.${selectedFormat}`
        
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        
        setSuccess(`Payroll exported successfully: ${filename}`)
        setTimeout(() => setSuccess(''), 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to export payroll')
      }
    } catch (error) {
      setError('Error exporting payroll')
    } finally {
      setExporting(false)
    }
  }

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <SystemAdminRoute>
      <ContentLayout 
        title="Payroll Export"
        subtitle="Export employee payroll data for processing by third-party systems"
        breadcrumb={[
          { label: 'Admin Dashboard', href: '/admin' },
          { label: 'Payroll Export', isActive: true }
        ]}
      >
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-red-400 mr-2">⚠️</span>
              <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex">
              <span className="text-green-400 mr-2">✅</span>
              <span className="text-green-700 dark:text-green-400 text-sm">{success}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Export Configuration */}
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Export Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Business
                  </label>
                  <select
                    value={selectedBusiness}
                    onChange={(e) => setSelectedBusiness(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Select Business</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name} ({business.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="input-field"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="input-field"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Format
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="input-field"
                  >
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={exportPayroll}
                  disabled={exporting || !selectedBusiness}
                  className="btn-primary disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      📊 Export Payroll
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Export Information */}
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Export Information
              </h3>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Export Format Details
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
                  <p>The exported file will contain the following columns:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><strong>Employee Info:</strong> ID Number, Date of Birth, First Name, Last Name</li>
                    <li><strong>Time Tracking:</strong> Work Days for the selected month</li>
                    <li><strong>Compensation:</strong> Basic Salary, Commission, Living Allowance</li>
                    <li><strong>Allowances:</strong> Vehicle Reimbursement, Travel Allowance, Overtime</li>
                    <li><strong>Deductions:</strong> Advances, Loans</li>
                    <li><strong>Calculations:</strong> Gross Pay, Net Gross (after deductions)</li>
                  </ul>
                  <p className="mt-3">
                    <strong>Note:</strong> This export is designed for integration with third-party payroll processing systems
                    and matches the Employee-Worksheet format requirements.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Export History/Summary */}
          {payrollSummary.length > 0 && (
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Payroll Summary ({months.find(m => m.value === selectedMonth)?.label} {selectedYear})
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Business
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Employees
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Gross Pay
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Net Gross
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Data Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {payrollSummary.map((summary) => (
                        <tr key={summary.businessId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {summary.businessName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {summary.employeeCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${summary.totalGrossPay.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            ${summary.totalNetPay.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                summary.hasTimeTracking 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {summary.hasTimeTracking ? 'Time ✓' : 'Time ⚠️'}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${
                                summary.hasAllowances 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                              }`}>
                                {summary.hasAllowances ? 'Allowances ✓' : 'No Allowances'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </ContentLayout>
    </SystemAdminRoute>
  )
}