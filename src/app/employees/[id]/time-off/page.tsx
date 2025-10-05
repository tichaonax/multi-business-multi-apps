'use client'

import { useState, useEffect } from 'react'
import { usePrompt } from '@/components/ui/input-modal'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { BusinessProtectedRoute } from '@/components/auth/business-protected-route'
import { DateInput } from '@/components/ui/date-input'
import { formatDateByFormat } from '@/lib/country-codes'
import { useDateFormat } from '@/contexts/settings-context'

interface Employee {
  id: string
  fullName: string
  employeeNumber: string
  hireDate: string
}

interface LeaveRequest {
  id: string
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
  reason?: string
  status: string
  createdAt: string
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  approver?: {
    fullName: string
    jobTitle: string
  }
}

interface LeaveBalance {
  id: string
  year: number
  annualLeaveDays: number
  usedAnnualDays: number
  remainingAnnual: number
  sickLeaveDays: number
  usedSickDays: number
  remainingSick: number
}

export default function EmployeeTimeOffPage() {
  const params = useParams()
  const { data: session } = useSession()
  const { format: globalDateFormat } = useDateFormat()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const prompt = usePrompt()

  const [showNewRequestForm, setShowNewRequestForm] = useState(false)
  const [newRequest, setNewRequest] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: ''
  })

  // Helper function to format dates
  const formatDate = (dateString: string) => formatDateByFormat(dateString, globalDateFormat)

  useEffect(() => {
    if (employeeId) {
      loadEmployeeData()
      loadLeaveRequests()
      loadLeaveBalance()
    }
  }, [employeeId])

  const loadEmployeeData = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`)
      if (response.ok) {
        const data = await response.json()
        setEmployee(data)
      } else {
        setError('Failed to load employee data')
      }
    } catch (error) {
      console.error('Error loading employee:', error)
      setError('Error loading employee data')
    }
  }

  const loadLeaveRequests = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/leave-requests`)
      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(data)
      }
    } catch (error) {
      console.error('Error loading leave requests:', error)
    }
  }

  const loadLeaveBalance = async () => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/leave-balance`)
      if (response.ok) {
        const data = await response.json()
        setLeaveBalance(data)
      }
    } catch (error) {
      console.error('Error loading leave balance:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const daysRequested = calculateDays(newRequest.startDate, newRequest.endDate)

      if (daysRequested <= 0) {
        setError('Please select valid start and end dates')
        setSubmitting(false)
        return
      }

      const response = await fetch(`/api/employees/${employeeId}/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRequest,
          daysRequested
        })
      })

      if (response.ok) {
        setSuccess('Leave request submitted successfully')
        setShowNewRequestForm(false)
        setNewRequest({
          leaveType: 'annual',
          startDate: '',
          endDate: '',
          reason: ''
        })
        loadLeaveRequests()
        loadLeaveBalance()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to submit leave request')
      }
    } catch (error) {
      console.error('Error submitting leave request:', error)
      setError('Error submitting leave request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/leave-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      })

      if (response.ok) {
        setSuccess('Leave request approved')
        loadLeaveRequests()
        loadLeaveBalance()
      } else {
        setError('Failed to approve leave request')
      }
    } catch (error) {
      setError('Error approving leave request')
    }
  }

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}/leave-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: reason
        })
      })

      if (response.ok) {
        setSuccess('Leave request rejected')
        loadLeaveRequests()
      } else {
        setError('Failed to reject leave request')
      }
    } catch (error) {
      setError('Error rejecting leave request')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">🕐 Pending</span>
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">✅ Approved</span>
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">❌ Rejected</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 rounded">{status}</span>
    }
  }

  const getLeaveTypeIcon = (leaveType: string) => {
    switch (leaveType) {
      case 'annual':
        return '🏖️'
      case 'sick':
        return '🤒'
      case 'personal':
        return '👤'
      case 'emergency':
        return '🚨'
      default:
        return '📅'
    }
  }

  if (loading) {
    return (
      <BusinessProtectedRoute>
        <ContentLayout title="Loading..." subtitle="Loading employee time-off data">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </ContentLayout>
      </BusinessProtectedRoute>
    )
  }

  return (
    <BusinessProtectedRoute>
      <ContentLayout
        title={`Time-Off Management`}
        subtitle={employee ? `Managing leave requests for ${employee.fullName} (${employee.employeeNumber})` : 'Employee time-off and vacation tracking'}
        breadcrumb={[
          { label: 'Employees', href: '/employees' },
          { label: employee?.fullName || 'Employee', href: `/employees/${employeeId}` },
          { label: 'Time-Off', isActive: true }
        ]}
        headerActions={
          <button
            onClick={() => setShowNewRequestForm(!showNewRequestForm)}
            className="btn-primary"
          >
            📝 New Request
          </button>
        }
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
          {/* Leave Balance Summary */}
          {leaveBalance && (
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  Leave Balance ({leaveBalance.year})
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">🏖️ Annual Leave</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-300">Total Days:</span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">{leaveBalance.annualLeaveDays}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700 dark:text-blue-300">Used Days:</span>
                        <span className="font-medium text-blue-900 dark:text-blue-100">{leaveBalance.usedAnnualDays}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-blue-200 dark:border-blue-700 pt-2">
                        <span className="text-blue-700 dark:text-blue-300">Remaining:</span>
                        <span className="font-bold text-blue-900 dark:text-blue-100">{leaveBalance.remainingAnnual}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-orange-900 dark:text-orange-100">🤒 Sick Leave</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700 dark:text-orange-300">Total Days:</span>
                        <span className="font-medium text-orange-900 dark:text-orange-100">{leaveBalance.sickLeaveDays}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-orange-700 dark:text-orange-300">Used Days:</span>
                        <span className="font-medium text-orange-900 dark:text-orange-100">{leaveBalance.usedSickDays}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-orange-200 dark:border-orange-700 pt-2">
                        <span className="text-orange-700 dark:text-orange-300">Remaining:</span>
                        <span className="font-bold text-orange-900 dark:text-orange-100">{leaveBalance.remainingSick}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New Request Form */}
          {showNewRequestForm && (
            <div className="card">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                  New Leave Request
                </h3>

                <form onSubmit={handleSubmitRequest} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Leave Type
                    </label>
                    <select
                      value={newRequest.leaveType}
                      onChange={(e) => setNewRequest({ ...newRequest, leaveType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="annual">🏖️ Annual Leave</option>
                      <option value="sick">🤒 Sick Leave</option>
                      <option value="personal">👤 Personal Leave</option>
                      <option value="emergency">🚨 Emergency Leave</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DateInput
                      value={newRequest.startDate}
                      onChange={(date) => setNewRequest({ ...newRequest, startDate: date })}
                      label="Start Date"
                      required
                    />
                    <DateInput
                      value={newRequest.endDate}
                      onChange={(date) => setNewRequest({ ...newRequest, endDate: date })}
                      label="End Date"
                      required
                    />
                  </div>

                  {newRequest.startDate && newRequest.endDate && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Days requested:</strong> {calculateDays(newRequest.startDate, newRequest.endDate)}
                      </p>
                      {newRequest.leaveType === 'annual' && leaveBalance && (
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Remaining annual leave: {leaveBalance.remainingAnnual} days
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Reason (Optional)
                    </label>
                    <textarea
                      value={newRequest.reason}
                      onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Optional reason for leave request..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={submitting || !newRequest.startDate || !newRequest.endDate}
                      className="btn-primary disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewRequestForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Leave Requests Table */}
          <div className="card">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
                Leave Requests
              </h3>

              {leaveRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-secondary">No leave requests found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dates</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {leaveRequests.map((request) => (
                        <tr key={request.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="flex items-center text-sm font-medium text-primary">
                              {getLeaveTypeIcon(request.leaveType)} {request.leaveType.charAt(0).toUpperCase() + request.leaveType.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                            {formatDate(request.startDate)} - {formatDate(request.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium">
                            {request.daysRequested}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(request.status)}
                          </td>
                          <td className="px-6 py-4 text-sm text-secondary max-w-xs truncate">
                            {request.reason || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {request.status === 'pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveRequest(request.id)}
                                  className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium"
                                >
                                  ✅ Approve
                                </button>
                                <button
                                  onClick={async () => {
                                    const reason = await prompt({ title: 'Reason for rejection (optional):', defaultValue: '' })
                                    if (reason !== null) {
                                      handleRejectRequest(request.id, reason)
                                    }
                                  }}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            )}
                            {request.approver && (
                              <div className="text-xs text-secondary mt-1">
                                By: {request.approver.fullName}
                              </div>
                            )}
                            {request.rejectionReason && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                Reason: {request.rejectionReason}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </ContentLayout>
    </BusinessProtectedRoute>
  )
}