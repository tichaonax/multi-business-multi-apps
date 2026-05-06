'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { formatDate } from '@/lib/utils'

interface Employee {
  id: string
  fullName: string
  employeeNumber?: string
  primaryBusiness?: { name: string }
  jobTitle?: { title: string }
}

interface LeaveStatus {
  leaveRequestId: string
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
}

interface SickLeaveUsageRow {
  employeeId: string
  employeeName: string
  employeeNumber?: string | null
  allocated: number
  used: number
  remaining: number
  isNearLimit: boolean
}

interface SickOverflowRow extends SickLeaveUsageRow {
  overflowDays: number
}

interface OnLeaveRow {
  leaveRequestId: string
  employeeId: string
  employeeName: string
  employeeNumber?: string | null
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
}

export default function LeaveManagementPage() {
  const { data: session } = useSession()
  const { hasPermission } = useBusinessPermissionsContext()

  const canManage = hasPermission('canManageEmployees') || hasPermission('canAccessPayroll')

  // Manage tab state
  const [activeTab, setActiveTab] = useState<'manage' | 'reports'>('manage')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Employee[]>([])
  const [searching, setSearching] = useState(false)
  const [leaveStatusMap, setLeaveStatusMap] = useState<Map<string, LeaveStatus>>(new Map())

  // Place on leave modal
  const [placeOnLeaveModal, setPlaceOnLeaveModal] = useState<{
    isOpen: boolean; employee: Employee | null; leaveType: 'annual' | 'sick'
  }>({ isOpen: false, employee: null, leaveType: 'sick' })
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedReturnDate, setExpectedReturnDate] = useState('')
  const [reason, setReason] = useState('')
  const [placeLoading, setPlaceLoading] = useState(false)

  // Return to work modal
  const [returnModal, setReturnModal] = useState<{
    isOpen: boolean; employee: Employee | null; leaveRequestId: string | null
  }>({ isOpen: false, employee: null, leaveRequestId: null })
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0])
  const [returnLoading, setReturnLoading] = useState(false)

  // Reports tab state
  const [reports, setReports] = useState<{
    currentlyOnLeave: OnLeaveRow[]
    sickLeaveUsage: SickLeaveUsageRow[]
    sickOverflow: SickOverflowRow[]
  } | null>(null)
  const [reportsLoading, setReportsLoading] = useState(false)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 6000)
  }

  const fetchLeaveStatus = useCallback(async (employeeIds: string[]) => {
    if (employeeIds.length === 0) return
    const res = await fetch('/api/employees/leave-status')
    if (res.ok) {
      const data = await res.json()
      const map = new Map<string, LeaveStatus>()
      for (const e of data.onLeave ?? []) {
        if (employeeIds.includes(e.employeeId)) map.set(e.employeeId, e)
      }
      setLeaveStatusMap(map)
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/employees?search=${encodeURIComponent(searchQuery.trim())}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        const emps: Employee[] = data.employees ?? []
        setSearchResults(emps)
        await fetchLeaveStatus(emps.map(e => e.id))
      }
    } catch {
      showMsg('error', 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handlePlaceOnLeave = async () => {
    if (!placeOnLeaveModal.employee || !startDate || !expectedReturnDate) return
    setPlaceLoading(true)
    try {
      const res = await fetch(`/api/employees/${placeOnLeaveModal.employee.id}/place-on-leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType: placeOnLeaveModal.leaveType,
          startDate,
          expectedReturnDate,
          reason: reason || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        showMsg('success', `${placeOnLeaveModal.employee.fullName} placed on ${placeOnLeaveModal.leaveType} leave`)
        setPlaceOnLeaveModal({ isOpen: false, employee: null, leaveType: 'sick' })
        setReason('')
        await fetchLeaveStatus(searchResults.map(e => e.id))
      } else {
        showMsg('error', data.error ?? 'Failed to place employee on leave')
      }
    } catch {
      showMsg('error', 'Failed to place employee on leave')
    } finally {
      setPlaceLoading(false)
    }
  }

  const handleReturnToWork = async () => {
    if (!returnModal.employee || !returnModal.leaveRequestId || !returnDate) return
    setReturnLoading(true)
    try {
      const res = await fetch(`/api/employees/${returnModal.employee.id}/return-to-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveRequestId: returnModal.leaveRequestId, returnDate }),
      })
      const data = await res.json()
      if (res.ok) {
        showMsg('success', data.message ?? 'Employee returned to work')
        setReturnModal({ isOpen: false, employee: null, leaveRequestId: null })
        await fetchLeaveStatus(searchResults.map(e => e.id))
      } else {
        showMsg('error', data.error ?? 'Failed to process return to work')
      }
    } catch {
      showMsg('error', 'Failed to process return to work')
    } finally {
      setReturnLoading(false)
    }
  }

  const fetchReports = async () => {
    setReportsLoading(true)
    try {
      const res = await fetch('/api/employees/leave-reports')
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch {
      showMsg('error', 'Failed to load reports')
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'reports' && !reports) {
      fetchReports()
    }
  }, [activeTab])

  if (!session) {
    return (
      <ContentLayout title="Leave Management">
        <p className="text-secondary text-center py-8">Please sign in.</p>
      </ContentLayout>
    )
  }

  if (!canManage) {
    return (
      <ContentLayout title="Leave Management">
        <p className="text-secondary text-center py-8">You don't have permission to manage leave.</p>
      </ContentLayout>
    )
  }

  return (
    <ContentLayout
      title="Leave Management"
      subtitle="Place employees on leave, record returns, and view leave reports"
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Employees', href: '/employees' },
        { label: 'Leave Management', isActive: true },
      ]}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex space-x-1 border-b border-gray-200 dark:border-gray-700">
          {(['manage', 'reports'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-secondary hover:text-primary'
              }`}
            >
              {tab === 'manage' ? 'Manage' : 'Reports'}
            </button>
          ))}
        </div>

        {/* ── MANAGE TAB ── */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by name or employee number..."
                  className="input-field flex-1"
                />
                <button
                  className="btn-primary"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase">Leave Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {searchResults.map(emp => {
                      const ls = leaveStatusMap.get(emp.id)
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-primary">{emp.fullName}</div>
                            <div className="text-xs text-secondary">{emp.employeeNumber}</div>
                            {emp.primaryBusiness && (
                              <div className="text-xs text-secondary">{emp.primaryBusiness.name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {ls ? (
                              ls.leaveType === 'sick' ? (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded border border-amber-300">
                                  On Sick Leave since {formatDate(ls.startDate)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 rounded border border-teal-300">
                                  On Annual Leave since {formatDate(ls.startDate)}
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-secondary">Not on leave</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!ls && (
                                <>
                                  <button
                                    className="text-xs px-3 py-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded font-medium hover:bg-amber-200"
                                    onClick={() => {
                                      setStartDate(new Date().toISOString().split('T')[0])
                                      setExpectedReturnDate('')
                                      setReason('')
                                      setPlaceOnLeaveModal({ isOpen: true, employee: emp, leaveType: 'sick' })
                                    }}
                                  >
                                    Sick Leave
                                  </button>
                                  <button
                                    className="text-xs px-3 py-1.5 bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 rounded font-medium hover:bg-teal-200"
                                    onClick={() => {
                                      setStartDate(new Date().toISOString().split('T')[0])
                                      setExpectedReturnDate('')
                                      setReason('')
                                      setPlaceOnLeaveModal({ isOpen: true, employee: emp, leaveType: 'annual' })
                                    }}
                                  >
                                    Annual Leave
                                  </button>
                                </>
                              )}
                              {ls && (
                                <button
                                  className="text-xs px-3 py-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded font-medium hover:bg-green-200"
                                  onClick={() => {
                                    setReturnDate(new Date().toISOString().split('T')[0])
                                    setReturnModal({ isOpen: true, employee: emp, leaveRequestId: ls.leaveRequestId })
                                  }}
                                >
                                  ✓ Return to Work
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <div className="card p-8 text-center text-secondary text-sm">
                No employees found for "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button className="btn-secondary" onClick={fetchReports} disabled={reportsLoading}>
                {reportsLoading ? 'Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {reportsLoading && (
              <div className="card p-8 text-center text-secondary">Loading reports...</div>
            )}

            {reports && (
              <>
                {/* Report 1: Currently on Leave */}
                <div className="card">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-primary">Currently on Leave</h3>
                    <p className="text-xs text-secondary">{reports.currentlyOnLeave.length} employee(s)</p>
                  </div>
                  {reports.currentlyOnLeave.length === 0 ? (
                    <div className="p-6 text-center text-secondary text-sm">No employees currently on leave</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Employee</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Started</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Expected Return</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Days</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {reports.currentlyOnLeave.map(row => (
                            <tr key={row.leaveRequestId}>
                              <td className="px-4 py-2">
                                <div className="text-sm font-medium text-primary">{row.employeeName}</div>
                                <div className="text-xs text-secondary">{row.employeeNumber}</div>
                              </td>
                              <td className="px-4 py-2">
                                {row.leaveType === 'sick' ? (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded">
                                    Sick
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 rounded">
                                    Annual
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-secondary">{formatDate(row.startDate)}</td>
                              <td className="px-4 py-2 text-sm text-secondary">{formatDate(row.endDate)}</td>
                              <td className="px-4 py-2 text-sm text-secondary">{row.daysRequested}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Report 2: Sick Leave Usage */}
                <div className="card">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-primary">Sick Leave Usage — {new Date().getFullYear()}</h3>
                    <p className="text-xs text-secondary">{reports.sickLeaveUsage.length} employee(s) with leave records</p>
                  </div>
                  {reports.sickLeaveUsage.length === 0 ? (
                    <div className="p-6 text-center text-secondary text-sm">No sick leave records for this year</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Employee</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Allocated</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Used</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Remaining</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {reports.sickLeaveUsage.map(row => (
                            <tr key={row.employeeId} className={row.isNearLimit ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                              <td className="px-4 py-2">
                                <div className="text-sm font-medium text-primary">{row.employeeName}</div>
                                <div className="text-xs text-secondary">{row.employeeNumber}</div>
                              </td>
                              <td className="px-4 py-2 text-sm text-secondary">{row.allocated} days</td>
                              <td className="px-4 py-2">
                                <span className={`text-sm font-medium ${row.isNearLimit ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                                  {row.used} days
                                  {row.isNearLimit && <span className="ml-1 text-xs">⚠️</span>}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm text-secondary">{row.remaining} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Report 3: Sick Day Overflow */}
                <div className="card">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-primary">Sick Day Overflow Log — {new Date().getFullYear()}</h3>
                    <p className="text-xs text-secondary">Employees whose sick leave exceeded their allocation (excess = absent days)</p>
                  </div>
                  {reports.sickOverflow.length === 0 ? (
                    <div className="p-6 text-center text-secondary text-sm">No overflow recorded this year</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Employee</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Allocation</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Used</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-secondary uppercase">Overflow (Absent Days)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {reports.sickOverflow.map(row => (
                            <tr key={row.employeeId} className="bg-red-50 dark:bg-red-900/10">
                              <td className="px-4 py-2">
                                <div className="text-sm font-medium text-primary">{row.employeeName}</div>
                                <div className="text-xs text-secondary">{row.employeeNumber}</div>
                              </td>
                              <td className="px-4 py-2 text-sm text-secondary">{row.allocated} days</td>
                              <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400 font-medium">{row.used} days</td>
                              <td className="px-4 py-2 text-sm text-red-700 dark:text-red-300 font-semibold">{row.overflowDays} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          message.type === 'success'
            ? 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-200'
            : 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Place on Leave Modal */}
      {placeOnLeaveModal.isOpen && placeOnLeaveModal.employee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-1">
              Place on {placeOnLeaveModal.leaveType === 'sick' ? 'Sick' : 'Annual'} Leave
            </h3>
            <p className="text-sm text-secondary mb-4">{placeOnLeaveModal.employee.fullName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Expected Return Date</label>
                <input type="date" value={expectedReturnDate} onChange={e => setExpectedReturnDate(e.target.value)} className="input-field w-full" />
                <p className="text-xs text-secondary mt-1">First day back at work</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Reason (optional)</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional reason" className="input-field w-full" />
              </div>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                className="flex-1 btn-secondary"
                onClick={() => setPlaceOnLeaveModal({ isOpen: false, employee: null, leaveType: 'sick' })}
                disabled={placeLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 btn-primary"
                onClick={handlePlaceOnLeave}
                disabled={placeLoading || !startDate || !expectedReturnDate}
              >
                {placeLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return to Work Modal */}
      {returnModal.isOpen && returnModal.employee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-primary mb-1">Return to Work</h3>
            <p className="text-sm text-secondary mb-4">{returnModal.employee.fullName}</p>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">Return Date</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="input-field w-full" />
              <p className="text-xs text-secondary mt-1">First day back at work</p>
            </div>
            <div className="flex space-x-3 mt-4">
              <button
                className="flex-1 btn-secondary"
                onClick={() => setReturnModal({ isOpen: false, employee: null, leaveRequestId: null })}
                disabled={returnLoading}
              >
                Cancel
              </button>
              <button
                className="flex-1 btn-primary"
                onClick={handleReturnToWork}
                disabled={returnLoading || !returnDate}
              >
                {returnLoading ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
