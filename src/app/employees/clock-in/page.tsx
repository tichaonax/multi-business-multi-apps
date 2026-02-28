'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { EmployeeIdCard } from '@/components/clock-in/employee-id-card'

interface AttendanceEmployee {
  id: string
  fullName: string
  employeeNumber: string
  profilePhotoUrl: string | null
  phone: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  primaryBusiness: { id: string; name: string } | null
  jobTitle: { title: string; department: string | null } | null
  attendance: {
    id: string
    checkIn: string | null
    checkOut: string | null
    hoursWorked: string | null
    isAutoClockOut: boolean
    isApproved: boolean
    status: string
    clockInPhotoUrl: string | null
    clockOutPhotoUrl: string | null
  } | null
  clockState: 'notYetClockedIn' | 'clockedIn' | 'clockedOut'
  isLate: boolean
}

interface Summary {
  total: number
  present: number
  late: number
  notYetClockedIn: number
  pendingAutoClockOut: number
}

interface ScheduleModalState {
  employeeId: string
  fullName: string
  profilePhotoUrl: string | null
  startTime: string
  endTime: string
  isExempt: boolean
  exemptReason: string
}

interface ManualEntryState {
  employeeId: string
  fullName: string
  checkIn: string
  checkOut: string
}

interface ExemptEmployee {
  id: string
  fullName: string
  employeeNumber: string
  profilePhotoUrl: string | null
  phone: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  clockInExemptReason: string | null
  primaryBusiness: { id: string; name: string } | null
  jobTitle: { title: string; department: string | null } | null
}

export default function ClockInDashboardPage() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'exempt' | 'loginTracking'>('attendance')

  // Login Tracking tab state
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const todayStr = new Date().toISOString().split('T')[0]
  const [logDateFrom, setLogDateFrom] = useState(todayStr)
  const [logDateTo, setLogDateTo] = useState(todayStr)
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [exemptEmployees, setExemptEmployees] = useState<ExemptEmployee[]>([])
  const [isLoadingExempt, setIsLoadingExempt] = useState(false)
  const [isRunningAutoClockOut, setIsRunningAutoClockOut] = useState(false)
  const [autoClockOutMessage, setAutoClockOutMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Inline schedule/exempt editor
  const [scheduleModal, setScheduleModal] = useState<ScheduleModalState | null>(null)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Manual entry
  const [manualEntry, setManualEntry] = useState<ManualEntryState | null>(null)
  const [isSavingManual, setIsSavingManual] = useState(false)
  const [manualMsg, setManualMsg] = useState<string | null>(null)

  // Print ID Card
  const [printCardEmp, setPrintCardEmp] = useState<AttendanceEmployee | null>(null)
  const [printExemptEmp, setPrintExemptEmp] = useState<ExemptEmployee | null>(null)
  const printCardRef = useRef<HTMLDivElement>(null)

  // Exempt employee actions
  const [uploadingExemptPhotoId, setUploadingExemptPhotoId] = useState<string | null>(null)
  const [enablingClockInId, setEnablingClockInId] = useState<string | null>(null)

  const loadAttendance = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clock-in/today')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load attendance')
      setEmployees(data.employees)
      setSummary(data.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading attendance')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadExemptEmployees = useCallback(async () => {
    setIsLoadingExempt(true)
    try {
      const res = await fetch('/api/clock-in/exempt-employees')
      const data = await res.json()
      if (res.ok) setExemptEmployees(data.employees)
    } catch {
      // silent — exempt list is secondary
    } finally {
      setIsLoadingExempt(false)
    }
  }, [])

  useEffect(() => {
    loadAttendance()
    loadExemptEmployees()
  }, [loadAttendance, loadExemptEmployees])

  const loadLoginLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const res = await fetch(`/api/clock-in/login-log?dateFrom=${logDateFrom}&dateTo=${logDateTo}`)
      const data = await res.json()
      if (res.ok) setLoginLogs(data.logs || [])
    } catch { /* silent */ }
    finally { setIsLoadingLogs(false) }
  }

  useEffect(() => {
    if (activeTab === 'loginTracking') loadLoginLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const runAutoClockOut = async () => {
    setIsRunningAutoClockOut(true)
    setAutoClockOutMessage(null)
    try {
      const res = await fetch('/api/clock-in/auto-clockout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAutoClockOutMessage(`Auto clock-out complete: ${data.count} employee(s) clocked out`)
      await loadAttendance()
    } catch (e) {
      setAutoClockOutMessage(e instanceof Error ? e.message : 'Auto clock-out failed')
    } finally {
      setIsRunningAutoClockOut(false)
    }
  }

  const openScheduleModal = (emp: AttendanceEmployee) => {
    setScheduleMsg(null)
    setScheduleModal({
      employeeId: emp.id,
      fullName: emp.fullName,
      profilePhotoUrl: emp.profilePhotoUrl,
      startTime: emp.scheduledStartTime ?? '',
      endTime: emp.scheduledEndTime ?? '',
      isExempt: false,
      exemptReason: '',
    })
  }

  const handlePhotoUpload = async (file: File) => {
    if (!scheduleModal) return
    setIsUploadingPhoto(true)
    setScheduleMsg(null)
    try {
      // Upload image file
      const formData = new FormData()
      formData.append('files', file)
      const uploadRes = await fetch('/api/universal/images', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.data?.[0]?.url) throw new Error('Image upload failed')
      const photoUrl = uploadData.data[0].url

      // Save to employee record
      const saveRes = await fetch(`/api/clock-in/employees/${scheduleModal.employeeId}/photo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhotoUrl: photoUrl }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error)

      setScheduleModal(prev => prev ? { ...prev, profilePhotoUrl: photoUrl } : null)
      setScheduleMsg('Photo saved!')
      await loadAttendance()
    } catch (e) {
      setScheduleMsg(e instanceof Error ? e.message : 'Photo upload failed')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const saveScheduleModal = async () => {
    if (!scheduleModal) return
    setIsSavingSchedule(true)
    setScheduleMsg(null)
    try {
      // Save schedule
      const schedRes = await fetch(`/api/clock-in/employees/${scheduleModal.employeeId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledStartTime: scheduleModal.startTime || null,
          scheduledEndTime: scheduleModal.endTime || null,
        }),
      })
      const schedData = await schedRes.json()
      if (!schedRes.ok) throw new Error(schedData.error)

      // Save exemption if toggled
      if (scheduleModal.isExempt) {
        const exRes = await fetch(`/api/clock-in/employees/${scheduleModal.employeeId}/exempt`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isClockInExempt: true, clockInExemptReason: scheduleModal.exemptReason }),
        })
        const exData = await exRes.json()
        if (!exRes.ok) throw new Error(exData.error)
      }

      setScheduleMsg('Saved!')
      await loadAttendance()
      setTimeout(() => setScheduleModal(null), 800)
    } catch (e) {
      setScheduleMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setIsSavingSchedule(false)
    }
  }

  const handleExemptPhotoUpload = async (emp: ExemptEmployee, file: File) => {
    setUploadingExemptPhotoId(emp.id)
    try {
      const formData = new FormData()
      formData.append('files', file)
      const uploadRes = await fetch('/api/universal/images', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.data?.[0]?.url) throw new Error('Image upload failed')
      const photoUrl = uploadData.data[0].url

      const saveRes = await fetch(`/api/clock-in/employees/${emp.id}/photo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePhotoUrl: photoUrl }),
      })
      if (!saveRes.ok) throw new Error('Failed to save photo')
      await loadExemptEmployees()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Photo upload failed')
    } finally {
      setUploadingExemptPhotoId(null)
    }
  }

  const enableClockIn = async (emp: ExemptEmployee) => {
    if (!confirm(`Remove clock-in exemption for ${emp.fullName}? They will appear in the daily attendance list.`)) return
    setEnablingClockInId(emp.id)
    try {
      const res = await fetch(`/api/clock-in/employees/${emp.id}/exempt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isClockInExempt: false }),
      })
      if (!res.ok) throw new Error('Failed to update')
      await loadExemptEmployees()
      await loadAttendance()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to enable clock-in')
    } finally {
      setEnablingClockInId(null)
    }
  }

  const openManualEntry = (emp: AttendanceEmployee) => {
    setManualMsg(null)
    const toTimeStr = (iso: string | null) => {
      if (!iso) return ''
      const d = new Date(iso)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    setManualEntry({
      employeeId: emp.id,
      fullName: emp.fullName,
      checkIn: toTimeStr(emp.attendance?.checkIn ?? null),
      checkOut: toTimeStr(emp.attendance?.checkOut ?? null),
    })
  }

  const saveManualEntry = async () => {
    if (!manualEntry) return
    if (!manualEntry.checkIn) {
      setManualMsg('Clock-in time is required')
      return
    }
    setIsSavingManual(true)
    setManualMsg(null)
    try {
      const today = new Date().toISOString().split('T')[0]
      const toISO = (timeStr: string) => new Date(`${today}T${timeStr}:00`).toISOString()

      const res = await fetch('/api/clock-in/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: manualEntry.employeeId,
          action: 'manualEntry',
          manualCheckIn: toISO(manualEntry.checkIn),
          manualCheckOut: manualEntry.checkOut ? toISO(manualEntry.checkOut) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setManualMsg('Saved!')
      await loadAttendance()
      setTimeout(() => setManualEntry(null), 800)
    } catch (e) {
      setManualMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setIsSavingManual(false)
    }
  }

  const printDoubleCard = (name: string) => {
    const cardEl = document.getElementById('employee-id-card')
    if (!cardEl) return
    const printWindow = window.open('', '_blank', 'width=720,height=420')
    if (!printWindow) return
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n') }
        catch { return '' }
      })
      .join('\n')
    const cardHtml = cardEl.outerHTML
    printWindow.document.write(`<!DOCTYPE html><html><head><title>ID Card — ${name}</title><style>${styles}body{margin:10px;display:flex;justify-content:center;align-items:flex-start;}.card-pair{display:inline-flex;align-items:flex-start;}.fold-guide{width:0;align-self:stretch;border-left:2px dashed #888;}@media print{body{margin:0;padding:10px;}.fold-guide{border-left-color:#bbb;}}</style></head><body><div class="card-pair">${cardHtml}<div class="fold-guide"></div>${cardHtml}</div><script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`)
    printWindow.document.close()
  }

  const printIdCard = () => printDoubleCard(printCardEmp?.fullName ?? '')

  const formatTime = (iso: string | null) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const getStateColor = (state: string) => {
    if (state === 'clockedIn') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
    if (state === 'clockedOut') return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
  }

  const getStateLabel = (state: string) => {
    if (state === 'clockedIn') return 'Present'
    if (state === 'clockedOut') return 'Clocked Out'
    return 'Not In'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🕐 Clock-In Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/employees/clock-in/bulk-print"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            🖨️ Bulk Print
          </Link>
          <Link
            href="/employees/clock-in/external"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            👥 External
          </Link>
          <Link
            href="/employees/clock-in/reports"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            📈 Reports
          </Link>
          <Link
            href="/employees/clock-in/auto-approvals"
            className="px-4 py-2 border border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm"
          >
            ⏳ Pending Approvals
            {summary && summary.pendingAutoClockOut > 0 && (
              <span className="ml-2 bg-orange-500 text-white rounded-full px-1.5 py-0.5 text-xs">{summary.pendingAutoClockOut}</span>
            )}
          </Link>
          <button
            onClick={runAutoClockOut}
            disabled={isRunningAutoClockOut}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunningAutoClockOut ? 'Running...' : '🤖 Run Auto Clock-Out'}
          </button>
          <button
            onClick={loadAttendance}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          📋 Today&apos;s Attendance
          {summary && <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">{summary.total}</span>}
        </button>
        <button
          onClick={() => setActiveTab('exempt')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'exempt'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          🏷️ Exempt Employees
          <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full">{exemptEmployees.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('loginTracking')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'loginTracking'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          🔐 Login Tracking
        </button>
      </div>

      {autoClockOutMessage && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
          {autoClockOutMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {activeTab === 'attendance' && (<>
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</div>
            <div className="text-xs text-gray-500 mt-1">Total Expected</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.present}</div>
            <div className="text-xs text-green-600 dark:text-green-500 mt-1">Present Today</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary.late}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Late Arrivals</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{summary.pendingAutoClockOut}</div>
            <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">Pending Auto-Out</div>
          </div>
        </div>
      )}

      {/* Attendance table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading attendance...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Employee</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Schedule</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Clock In</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Clock Out</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Hours</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">No employees found</td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {emp.profilePhotoUrl ? (
                          <img src={emp.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm">👤</div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{emp.fullName}</div>
                          <div className="text-xs text-gray-400">#{emp.employeeNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {emp.scheduledStartTime && emp.scheduledEndTime
                        ? (
                          <button onClick={() => openScheduleModal(emp)} className="hover:underline text-left">
                            {emp.scheduledStartTime} – {emp.scheduledEndTime}
                          </button>
                        ) : (
                          <button
                            onClick={() => openScheduleModal(emp)}
                            className="text-blue-500 hover:underline text-xs"
                          >
                            + Set schedule
                          </button>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {emp.attendance?.clockInPhotoUrl && (
                          <img
                            src={emp.attendance.clockInPhotoUrl}
                            alt="Clock-in photo"
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/expired-photo.svg' }}
                          />
                        )}
                        <span className={emp.isLate ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                          {formatTime(emp.attendance?.checkIn ?? null)}
                          {emp.isLate && <span className="ml-1 text-xs">⚠️ Late</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {emp.attendance?.clockOutPhotoUrl && (
                          <img
                            src={emp.attendance.clockOutPhotoUrl}
                            alt="Clock-out photo"
                            className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/expired-photo.svg' }}
                          />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">
                          {formatTime(emp.attendance?.checkOut ?? null)}
                          {emp.attendance?.isAutoClockOut && (
                            <span className="ml-1 text-xs text-orange-500" title="Auto clock-out">🤖</span>
                          )}
                          {emp.attendance?.isAutoClockOut && !emp.attendance?.isApproved && (
                            <span className="ml-1 text-xs text-orange-500">Pending</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {emp.attendance?.hoursWorked ? `${Number(emp.attendance.hoursWorked).toFixed(2)}h` : '--'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(emp.clockState)}`}>
                        {getStateLabel(emp.clockState)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openManualEntry(emp)}
                          className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          title="Manual clock entry"
                        >
                          ✏️ Manual
                        </button>
                        <button
                          onClick={() => openScheduleModal(emp)}
                          className="text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                          title="Clock-In Settings / Upload Photo"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => setPrintCardEmp(emp)}
                          className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                          title="Print ID Card"
                        >
                          🪪
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      </>)}

      {/* Exempt Employees Tab */}
      {activeTab === 'exempt' && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            These employees are exempt from daily clock-in. They still have company ID cards that can be printed below.
          </p>
          {isLoadingExempt ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-500">Loading...</span>
            </div>
          ) : exemptEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No exempt employees found.</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Business</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Exemption Reason</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {exemptEmployees.map((emp) => (
                    <tr key={emp.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {emp.profilePhotoUrl ? (
                            <img src={emp.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm">👤</div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{emp.fullName}</div>
                            <div className="text-xs text-gray-400">#{emp.employeeNumber} {emp.jobTitle ? `· ${emp.jobTitle.title}` : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-sm">
                        {emp.primaryBusiness?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs italic">
                        {emp.clockInExemptReason ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Photo Upload */}
                          <label
                            className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
                            title="Upload Photo"
                          >
                            {uploadingExemptPhotoId === emp.id ? '⏳' : '📸'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingExemptPhotoId === emp.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleExemptPhotoUpload(emp, file)
                                e.target.value = ''
                              }}
                            />
                          </label>
                          {/* Print Card */}
                          <button
                            onClick={() => setPrintExemptEmp(emp)}
                            className="text-xs text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium"
                            title="Print ID Card"
                          >
                            🪪
                          </button>
                          {/* Enable Clock-In */}
                          <button
                            onClick={() => enableClockIn(emp)}
                            disabled={enablingClockInId === emp.id}
                            className="text-xs text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 font-medium disabled:opacity-50"
                            title="Remove exemption — enable daily clock-in"
                          >
                            {enablingClockInId === emp.id ? '⏳' : '🔓'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Login Tracking Tab */}
      {activeTab === 'loginTracking' && (
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <input
              type="date"
              value={logDateFrom}
              onChange={(e) => setLogDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-500 text-sm">to</span>
            <input
              type="date"
              value={logDateTo}
              onChange={(e) => setLogDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={loadLoginLogs}
              disabled={isLoadingLogs}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingLogs ? 'Loading…' : 'Load'}
            </button>
          </div>

          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-500">Loading…</span>
            </div>
          ) : loginLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No login events found for this period.</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Method</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Date / Time</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {log.employees?.profilePhotoUrl ? (
                            <img src={log.employees.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm">👤</div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{log.employees?.fullName}</div>
                            <div className="text-xs text-gray-400">#{log.employees?.employeeNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.action === 'login'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : log.action === 'logout'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                            : log.action === 'clock_in'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : log.action === 'clock_out'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                            : log.action === 'scan'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {log.action === 'login' ? '🔑 Login'
                            : log.action === 'logout' ? '🚪 Logout'
                            : log.action === 'clock_in' ? '⏰ Clock In'
                            : log.action === 'clock_out' ? '⏱ Clock Out'
                            : log.action === 'scan' ? '📡 Scan'
                            : '❌ Declined'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 capitalize">{log.method}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {log.photoUrl ? (
                          <img
                            src={log.photoUrl}
                            alt="Login photo"
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/expired-photo.svg' }}
                          />
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Manual Clock Entry Modal */}
      {manualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">✏️ Manual Clock Entry</h3>
              <button onClick={() => setManualEntry(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{manualEntry.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter the correct times for today. This will overwrite any existing clock-in/out record.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Clock-In Time <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={manualEntry.checkIn}
                    onChange={(e) => setManualEntry(prev => prev ? { ...prev, checkIn: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Clock-Out Time</label>
                  <input
                    type="time"
                    value={manualEntry.checkOut}
                    onChange={(e) => setManualEntry(prev => prev ? { ...prev, checkOut: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {manualMsg && (
                <p className={`text-sm ${manualMsg === 'Saved!' ? 'text-green-600' : 'text-red-600'}`}>{manualMsg}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setManualEntry(null)}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveManualEntry}
                  disabled={isSavingManual || !manualEntry.checkIn}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingManual ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inline Schedule / Exempt / Photo Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <h3 className="text-white font-semibold">⚙️ Clock-In Settings</h3>
              <button onClick={() => setScheduleModal(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{scheduleModal.fullName}</p>

              {/* Photo upload */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Employee Photo</label>
                <div className="flex items-center gap-3">
                  {scheduleModal.profilePhotoUrl ? (
                    <img src={scheduleModal.profilePhotoUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl border border-gray-200 dark:border-gray-600">👤</div>
                  )}
                  <label className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isUploadingPhoto ? 'Uploading...' : '📸 Upload Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file)
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">Work Schedule</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={scheduleModal.startTime}
                      onChange={(e) => setScheduleModal(prev => prev ? { ...prev, startTime: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Time</label>
                    <input
                      type="time"
                      value={scheduleModal.endTime}
                      onChange={(e) => setScheduleModal(prev => prev ? { ...prev, endTime: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleModal.isExempt}
                    onChange={(e) => setScheduleModal(prev => prev ? { ...prev, isExempt: e.target.checked, exemptReason: '' } : null)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Exempt from clock-in</span>
                </label>
                {scheduleModal.isExempt && (
                  <input
                    type="text"
                    value={scheduleModal.exemptReason}
                    onChange={(e) => setScheduleModal(prev => prev ? { ...prev, exemptReason: e.target.value } : null)}
                    placeholder="Reason (required)"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                )}
              </div>

              {scheduleMsg && (
                <p className={`text-sm ${scheduleMsg === 'Saved!' || scheduleMsg === 'Photo saved!' ? 'text-green-600' : 'text-red-600'}`}>{scheduleMsg}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setScheduleModal(null)}
                  className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveScheduleModal}
                  disabled={isSavingSchedule}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSavingSchedule ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print ID Card Modal */}
      {printCardEmp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">🪪 Employee ID Card</h3>
              <button onClick={() => setPrintCardEmp(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            <div ref={printCardRef}>
              <EmployeeIdCard
                employee={{
                  id: printCardEmp.id,
                  fullName: printCardEmp.fullName,
                  employeeNumber: printCardEmp.employeeNumber,
                  profilePhotoUrl: printCardEmp.profilePhotoUrl,
                  phone: printCardEmp.phone,
                  scheduledStartTime: printCardEmp.scheduledStartTime,
                  scheduledEndTime: printCardEmp.scheduledEndTime,
                  primaryBusiness: printCardEmp.primaryBusiness,
                  jobTitle: printCardEmp.jobTitle,
                }}
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPrintCardEmp(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={printIdCard}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print ID Card Modal — Exempt Employee */}
      {printExemptEmp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-5 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">🪪 Employee ID Card</h3>
              <button onClick={() => setPrintExemptEmp(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            <EmployeeIdCard
              employee={{
                id: printExemptEmp.id,
                fullName: printExemptEmp.fullName,
                employeeNumber: printExemptEmp.employeeNumber,
                profilePhotoUrl: printExemptEmp.profilePhotoUrl,
                phone: printExemptEmp.phone,
                scheduledStartTime: printExemptEmp.scheduledStartTime,
                scheduledEndTime: printExemptEmp.scheduledEndTime,
                primaryBusiness: printExemptEmp.primaryBusiness,
                jobTitle: printExemptEmp.jobTitle,
              }}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPrintExemptEmp(null)}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Close
              </button>
              <button
                onClick={() => printDoubleCard(printExemptEmp?.fullName ?? '')}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
