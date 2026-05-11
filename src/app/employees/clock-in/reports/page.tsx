'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { DateRangeSelector, DateRange } from '@/components/reports/date-range-selector'
import { getLocalDateString } from '@/lib/utils'

interface AttendanceRecord {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  hoursWorked: string | null
  isAutoClockOut: boolean
  isApproved: boolean
  status: string
}

interface EmployeeReport {
  employee: {
    id: string
    fullName: string
    employeeNumber: string
    scheduledStartTime: string | null
    scheduledEndTime: string | null
  }
  totalDays: number
  lateDays: number
  totalHours: number
  avgLateMinutes: number
  punctualityScore: number
  records: AttendanceRecord[]
}

export default function AttendanceReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 30); return { start, end }
  })
  const [search, setSearch] = useState('')
  const [data, setData] = useState<EmployeeReport[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const from = getLocalDateString(dateRange.start)
      const to = getLocalDateString(dateRange.end)
      const res = await fetch(`/api/clock-in/reports?dateFrom=${from}&dateTo=${to}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setData(json.employees)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  useEffect(() => { loadReport() }, [loadReport])

  // Client-side search filter
  const q = search.trim().toLowerCase()
  const filteredData = q
    ? data.filter((emp) =>
        emp.employee.fullName.toLowerCase().includes(q) ||
        emp.employee.employeeNumber.toLowerCase().includes(q)
      )
    : data

  const exportCsv = () => {
    const rows = [['Employee', 'Emp#', 'Days', 'Late Days', 'Total Hours', 'Punctuality %', 'Avg Late (min)']]
    data.forEach((emp) => {
      rows.push([
        emp.employee.fullName,
        emp.employee.employeeNumber,
        String(emp.totalDays),
        String(emp.lateDays),
        String(emp.totalHours),
        String(emp.punctualityScore),
        String(emp.avgLateMinutes),
      ])
    })
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance-${getLocalDateString(dateRange.start)}-to-${getLocalDateString(dateRange.end)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/employees/clock-in" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📈 Attendance Reports</h1>
      </div>

      {/* Date Range */}
      <DateRangeSelector value={dateRange} onChange={setDateRange} />

      {/* Search + Export */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or employee number…"
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm placeholder-gray-400"
        />
        {data.length > 0 && (
          <button
            onClick={exportCsv}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {data.length === 0 && !isLoading && (
        <div className="text-center py-16 text-gray-400">
          No attendance records found for the selected period.
        </div>
      )}

      {data.length > 0 && filteredData.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          No employees match &quot;{search}&quot;.
        </div>
      )}

      {filteredData.length > 0 && (
        <>
          {/* Summary aggregate — reflects filtered set */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{filteredData.length}</div>
              <div className="text-xs text-gray-500 mt-1">Employees</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {filteredData.reduce((s, e) => s + e.totalHours, 0).toFixed(1)}h
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Hours</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">
                {filteredData.reduce((s, e) => s + e.lateDays, 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Late Arrivals</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {filteredData.length > 0
                  ? Math.round(filteredData.reduce((s, e) => s + e.punctualityScore, 0) / filteredData.length)
                  : 0}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Avg Punctuality</div>
            </div>
          </div>

          {/* Per-employee table */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Employee</th>
                  <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Days</th>
                  <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Late</th>
                  <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Avg Late</th>
                  <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Total Hrs</th>
                  <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Punctuality</th>
                  <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((emp) => (
                  <React.Fragment key={emp.employee.id}>
                    <tr className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{emp.employee.fullName}</div>
                        <div className="text-xs text-gray-400">#{emp.employee.employeeNumber}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{emp.totalDays}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={emp.lateDays > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-400'}>
                          {emp.lateDays}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {emp.avgLateMinutes > 0 ? `${emp.avgLateMinutes}m` : '--'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">{emp.totalHours.toFixed(1)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          emp.punctualityScore >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          emp.punctualityScore >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {emp.punctualityScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExpandedEmployee(expandedEmployee === emp.employee.id ? null : emp.employee.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        >
                          {expandedEmployee === emp.employee.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedEmployee === emp.employee.id && (
                      <tr key={`${emp.employee.id}-detail`}>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-700/20 border-b border-gray-100 dark:border-gray-700">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 dark:text-gray-400">
                                <th className="text-left py-1">Date</th>
                                <th className="text-left py-1">Clock In</th>
                                <th className="text-left py-1">Clock Out</th>
                                <th className="text-left py-1">Hours</th>
                                <th className="text-left py-1">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emp.records.map((rec) => (
                                <tr key={rec.id} className="text-gray-700 dark:text-gray-300">
                                  <td className="py-1">{formatDate(rec.date)}</td>
                                  <td className="py-1">{formatTime(rec.checkIn)}</td>
                                  <td className="py-1">
                                    {formatTime(rec.checkOut)}
                                    {rec.isAutoClockOut && <span className="ml-1 text-orange-500" title="Auto">🤖</span>}
                                  </td>
                                  <td className="py-1">{rec.hoursWorked ? `${Number(rec.hoursWorked).toFixed(2)}h` : '--'}</td>
                                  <td className="py-1">
                                    {rec.isAutoClockOut && !rec.isApproved && <span className="text-orange-500">Pending approval</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
