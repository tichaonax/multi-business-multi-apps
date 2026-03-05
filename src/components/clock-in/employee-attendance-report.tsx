'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'

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

export interface ReportEmployee {
  id: string
  fullName: string
  employeeNumber: string
  profilePhotoUrl: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
}

interface Props {
  employee: ReportEmployee
  businessId: string
  onClose: () => void
}

type DateRange = '7days' | 'month' | 'custom'

interface ChartEntry {
  dateLabel: string
  isWeekend: boolean
  clockInDev: number | null
  clockOutDev: number | null
  hoursWorked: number | null
  scheduledHours: number | null
  isAbsent: boolean
  checkInTime: string | null
  checkOutTime: string | null
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function fmtDev(minutes: number | null): string {
  if (minutes === null) return '--'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const sign = minutes >= 0 ? '+' : '-'
  return h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`
}

function fmtTime(iso: string | null): string {
  if (!iso) return '--'
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ─── Custom tooltips (defined outside component to avoid recharts memo issues) ─

function DeviationTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartEntry
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-52 space-y-0.5">
      <p className="font-semibold">{d.dateLabel}</p>
      {d.isAbsent && <p className="text-red-400">⚠️ Absent (working day)</p>}
      {d.isWeekend && !d.checkInTime && <p className="text-gray-400">Weekend</p>}
      {d.checkInTime && <p>🟢 Clocked in: {fmtTime(d.checkInTime)}</p>}
      {d.checkOutTime && <p>🔴 Clocked out: {fmtTime(d.checkOutTime)}</p>}
      {d.clockInDev !== null && (
        <p className={d.clockInDev > 0 ? 'text-red-400' : 'text-green-400'}>
          Clock-in: {fmtDev(d.clockInDev)} {d.clockInDev > 0 ? 'late' : 'early'}
        </p>
      )}
      {d.clockOutDev !== null && (
        <p className={d.clockOutDev < 0 ? 'text-orange-400' : 'text-blue-400'}>
          Clock-out: {fmtDev(d.clockOutDev)} {d.clockOutDev >= 0 ? 'overtime' : 'left early'}
        </p>
      )}
    </div>
  )
}

function HoursTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ChartEntry
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl space-y-0.5">
      <p className="font-semibold">{d.dateLabel}</p>
      <p>Worked: {d.hoursWorked != null ? `${d.hoursWorked.toFixed(2)}h` : '--'}</p>
      {d.scheduledHours != null && <p>Scheduled: {d.scheduledHours.toFixed(1)}h</p>}
      {d.isAbsent && <p className="text-red-400">⚠️ Absent</p>}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function EmployeeAttendanceReport({ employee, businessId, onClose }: Props) {
  const [dateRange, setDateRange] = useState<DateRange>('7days')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return toDateStr(d)
  })
  const [customTo, setCustomTo] = useState(() => toDateStr(new Date()))
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [summary, setSummary] = useState<{
    totalDays: number; lateDays: number; totalHours: number
    avgLateMinutes: number; punctualityScore: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chartData, setChartData] = useState<ChartEntry[]>([])

  const getDateBounds = useCallback(() => {
    const today = new Date()
    const todayStr = toDateStr(today)
    if (dateRange === '7days') {
      const from = new Date(today); from.setDate(from.getDate() - 6)
      return { from: toDateStr(from), to: todayStr }
    }
    if (dateRange === 'month') {
      return { from: toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayStr }
    }
    return { from: customFrom, to: customTo }
  }, [dateRange, customFrom, customTo])

  const fetchData = useCallback(async () => {
    const { from, to } = getDateBounds()
    if (!from || !to) return
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/clock-in/reports?${new URLSearchParams({ dateFrom: from, dateTo: to, employeeId: employee.id, businessId })}`)
      if (!res.ok) throw new Error('Failed to load attendance data')
      const data = await res.json()
      const empData = data.employees?.[0]
      if (empData) {
        setRecords(empData.records)
        setSummary({
          totalDays: empData.totalDays,
          lateDays: empData.lateDays,
          totalHours: empData.totalHours,
          avgLateMinutes: empData.avgLateMinutes,
          punctualityScore: empData.punctualityScore,
        })
      } else {
        setRecords([])
        setSummary({ totalDays: 0, lateDays: 0, totalHours: 0, avgLateMinutes: 0, punctualityScore: 100 })
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [getDateBounds, employee.id, businessId])

  // Rebuild chart data whenever records or date bounds change
  useEffect(() => {
    const { from, to } = getDateBounds()
    if (!from || !to) { setChartData([]); return }

    const scheduledStartMin = employee.scheduledStartTime ? parseTimeToMinutes(employee.scheduledStartTime) : null
    const scheduledEndMin = employee.scheduledEndTime ? parseTimeToMinutes(employee.scheduledEndTime) : null
    const scheduledHours = (scheduledStartMin !== null && scheduledEndMin !== null)
      ? (scheduledEndMin - scheduledStartMin) / 60 : null

    const recordMap = new Map<string, AttendanceRecord>()
    records.forEach((r) => recordMap.set(toDateStr(new Date(r.date)), r))

    const entries: ChartEntry[] = []
    const cursor = new Date(from + 'T00:00:00')
    const end = new Date(to + 'T23:59:59')

    while (cursor <= end) {
      const ds = toDateStr(cursor)
      const rec = recordMap.get(ds)
      const dow = cursor.getDay()
      const isWeekend = dow === 0 || dow === 6
      const dateLabel = `${DAYS[dow]} ${MONTHS[cursor.getMonth()]} ${cursor.getDate()}`

      let clockInDev: number | null = null
      let clockOutDev: number | null = null
      let hoursWorked: number | null = null

      if (rec) {
        hoursWorked = Number(rec.hoursWorked ?? 0)
        if (rec.checkIn && scheduledStartMin !== null) {
          const ci = new Date(rec.checkIn)
          clockInDev = (ci.getHours() * 60 + ci.getMinutes()) - scheduledStartMin
        }
        if (rec.checkOut && scheduledEndMin !== null) {
          const co = new Date(rec.checkOut)
          clockOutDev = (co.getHours() * 60 + co.getMinutes()) - scheduledEndMin
        }
      }

      entries.push({
        dateLabel,
        isWeekend,
        clockInDev,
        clockOutDev,
        hoursWorked,
        scheduledHours,
        isAbsent: !rec && !isWeekend,
        checkInTime: rec?.checkIn ?? null,
        checkOutTime: rec?.checkOut ?? null,
      })

      cursor.setDate(cursor.getDate() + 1)
    }
    setChartData(entries)
  }, [records, employee.scheduledStartTime, employee.scheduledEndTime, getDateBounds])

  useEffect(() => { fetchData() }, [fetchData])

  const scheduledHours = employee.scheduledStartTime && employee.scheduledEndTime
    ? (parseTimeToMinutes(employee.scheduledEndTime) - parseTimeToMinutes(employee.scheduledStartTime)) / 60
    : null

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div className="flex-shrink-0 border-b border-gray-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            {employee.profilePhotoUrl ? (
              <img src={employee.profilePhotoUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">👤</div>
            )}
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{employee.fullName}</h2>
              <p className="text-xs text-gray-400">
                #{employee.employeeNumber}
                {employee.scheduledStartTime && employee.scheduledEndTime && (
                  <span className="ml-2">· Schedule: {employee.scheduledStartTime} – {employee.scheduledEndTime}</span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(['7days', 'month', 'custom'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  dateRange === r
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {r === '7days' ? 'Last 7 Days' : r === 'month' ? 'This Month' : 'Custom Range'}
              </button>
            ))}
            {dateRange === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date" value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="date" value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                />
                <button
                  onClick={fetchData}
                  className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >Apply</button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {error && <p className="text-center text-red-500 py-8">{error}</p>}

          {!loading && !error && (
            <>
              {/* Summary stats */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Days Present', value: summary.totalDays, icon: '📅', color: 'text-blue-600 dark:text-blue-400' },
                    { label: 'Late Days', value: summary.lateDays, icon: '⏰', color: 'text-red-600 dark:text-red-400' },
                    { label: 'Total Hours', value: `${summary.totalHours.toFixed(1)}h`, icon: '🕐', color: 'text-green-600 dark:text-green-400' },
                    { label: 'Avg Late', value: summary.avgLateMinutes > 0 ? fmtDev(summary.avgLateMinutes) : '0m', icon: '📊', color: 'text-orange-600 dark:text-orange-400' },
                    {
                      label: 'Punctuality', value: `${summary.punctualityScore}%`, icon: '🎯',
                      color: summary.punctualityScore >= 90 ? 'text-green-600 dark:text-green-400' : summary.punctualityScore >= 70 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
                    },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                      <div className="text-xl mb-1">{icon}</div>
                      <div className={`text-lg font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Clock-In Deviation */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-0.5">
                  ⏰ Clock-In Deviation
                  {employee.scheduledStartTime && (
                    <span className="ml-2 font-normal text-xs text-gray-400">vs scheduled start ({employee.scheduledStartTime})</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  <span className="text-green-500 font-medium">■</span> Early &nbsp;·&nbsp;
                  <span className="text-red-500 font-medium">■</span> Late &nbsp;·&nbsp;
                  <span className="text-gray-300 font-medium">■</span> No data / weekend
                </p>
                {chartData.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No data for selected period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 44 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-40} textAnchor="end" interval={0} height={55} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="m" />
                      <Tooltip content={<DeviationTooltip />} />
                      <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.5} />
                      <Bar dataKey="clockInDev" maxBarSize={40} radius={[3, 3, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.clockInDev === null ? '#d1d5db' : entry.clockInDev > 0 ? '#ef4444' : '#22c55e'}
                            opacity={entry.isWeekend && !entry.checkInTime ? 0.35 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Clock-Out Deviation */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-0.5">
                  🚪 Clock-Out Deviation
                  {employee.scheduledEndTime && (
                    <span className="ml-2 font-normal text-xs text-gray-400">vs scheduled end ({employee.scheduledEndTime})</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  <span className="text-blue-500 font-medium">■</span> Stayed overtime &nbsp;·&nbsp;
                  <span className="text-orange-500 font-medium">■</span> Left early &nbsp;·&nbsp;
                  <span className="text-gray-300 font-medium">■</span> No data / weekend
                </p>
                {chartData.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No data for selected period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 44 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-40} textAnchor="end" interval={0} height={55} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="m" />
                      <Tooltip content={<DeviationTooltip />} />
                      <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.5} />
                      <Bar dataKey="clockOutDev" maxBarSize={40} radius={[3, 3, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.clockOutDev === null ? '#d1d5db' : entry.clockOutDev >= 0 ? '#3b82f6' : '#f97316'}
                            opacity={entry.isWeekend && !entry.checkOutTime ? 0.35 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Hours Worked */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 mb-0.5">
                  📊 Hours Worked Per Day
                  {scheduledHours !== null && (
                    <span className="ml-2 font-normal text-xs text-gray-400">Scheduled: {scheduledHours.toFixed(1)}h/day</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Full shift</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Partial shift</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-300 inline-block" /> Absent (weekday)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" /> Weekend</span>
                </div>
                {chartData.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">No data for selected period</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 44 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#9ca3af' }} angle={-40} textAnchor="end" interval={0} height={55} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} unit="h" />
                      <Tooltip content={<HoursTooltip />} />
                      {scheduledHours !== null && (
                        <ReferenceLine
                          y={scheduledHours}
                          stroke="#6b7280"
                          strokeDasharray="4 2"
                          strokeWidth={1.5}
                          label={{ value: `${scheduledHours}h`, fill: '#9ca3af', fontSize: 10, position: 'insideTopRight' }}
                        />
                      )}
                      <Bar dataKey="hoursWorked" maxBarSize={40} radius={[3, 3, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.isWeekend && !entry.hoursWorked
                                ? '#e5e7eb'
                                : entry.hoursWorked === null || entry.hoursWorked === 0
                                ? '#fca5a5'
                                : entry.hoursWorked >= (scheduledHours ?? 0)
                                ? '#22c55e'
                                : '#f97316'
                            }
                            opacity={entry.isWeekend && !entry.hoursWorked ? 0.5 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
