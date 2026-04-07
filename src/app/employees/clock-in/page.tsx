'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EmployeeIdCard } from '@/components/clock-in/employee-id-card'
import { EmployeeAttendanceReport, type ReportEmployee } from '@/components/clock-in/employee-attendance-report'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useConfirm, useAlert } from '@/components/ui/confirm-modal'

interface AttendanceEmployee {
  id: string
  fullName: string
  employeeNumber: string
  scanToken?: string | null
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
  businessContactPhone?: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
  isClockInExempt: boolean
  isAutoExempt: boolean
  clockInExemptReason: string | null
  primaryBusiness: { id: string; name: string } | null
  jobTitle: { title: string; department: string | null } | null
}

export default function ClockInDashboardPage() {
  const router = useRouter()
  const { currentBusinessId, activeBusinesses, loading: contextLoading } = useBusinessPermissionsContext()
  const confirm = useConfirm()
  const alert = useAlert()

  const [activeTab, setActiveTab] = useState<'attendance' | 'exempt' | 'loginTracking' | 'monthly'>('attendance')

  // Business & date filter
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const [selectedDate, setSelectedDate] = useState(todayStr)

  // Track whether we've resolved the initial business selection
  const [businessReady, setBusinessReady] = useState(false)

  // Initialise business filter from context once (read from localStorage via context)
  // Wait for context to finish loading before resolving — prevents "All Businesses" flash
  const businessInitRef = useRef(false)
  useEffect(() => {
    if (businessInitRef.current) return
    if (contextLoading) return // wait for context to finish loading

    businessInitRef.current = true
    if (currentBusinessId) {
      setSelectedBusinessId(currentBusinessId)
    } else if (activeBusinesses.length > 0) {
      // No specific business in context — default to first non-demo business, or first overall
      const nonDemo = activeBusinesses.find(b => !b.isDemo)
      setSelectedBusinessId((nonDemo ?? activeBusinesses[0]).businessId)
    }
    // else: truly no businesses → leave null (will show empty state)
    setBusinessReady(true)
  }, [contextLoading, currentBusinessId, activeBusinesses])

  // Business dropdown search & demo filter
  const [bizSearch, setBizSearch] = useState('')
  const [bizOpen, setBizOpen] = useState(false)
  const [demoFilter, setDemoFilter] = useState<'real' | 'demo' | 'all'>('real')
  // Always strip the umbrella pseudo-business; apply demo filter on top
  const allRealBusinesses = activeBusinesses.filter(
    (b) => b.businessName !== 'Umbrella Business Settings',
  )
  const filteredByDemo =
    demoFilter === 'real' ? allRealBusinesses.filter((b) => !b.isDemo) :
    demoFilter === 'demo' ? allRealBusinesses.filter((b) => b.isDemo) :
    allRealBusinesses
  const bizOptions = bizSearch.trim()
    ? filteredByDemo.filter((b) => b.businessName.toLowerCase().includes(bizSearch.toLowerCase()))
    : filteredByDemo
  const selectedBizName = allRealBusinesses.find((b) => b.businessId === selectedBusinessId)?.businessName

  // Login Tracking tab state
  const [loginLogs, setLoginLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logDateFrom, setLogDateFrom] = useState(todayStr)
  const [logDateTo, setLogDateTo] = useState(todayStr)
  const [employees, setEmployees] = useState<AttendanceEmployee[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [exemptEmployees, setExemptEmployees] = useState<ExemptEmployee[]>([])
  const [isLoadingExempt, setIsLoadingExempt] = useState(false)
  const [isRunningAutoClockOut, setIsRunningAutoClockOut] = useState(false)
  const [autoClockOutMessage, setAutoClockOutMessage] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1)
  }, [])

  // Photo preview modal
  const [photoPreview, setPhotoPreview] = useState<{
    url: string
    action: 'Clock In' | 'Clock Out'
    time: string | null
    employeeName: string
  } | null>(null)

  // Employee attendance report modal
  const [attendanceReport, setAttendanceReport] = useState<{ employee: ReportEmployee; businessId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Per-tab search / filter state
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [exemptSearch, setExemptSearch] = useState('')
  const [logSearch, setLogSearch] = useState('')
  const [logActivePreset, setLogActivePreset] = useState<string | null>('today')

  // Inline schedule/exempt editor
  const [scheduleModal, setScheduleModal] = useState<ScheduleModalState | null>(null)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Manual entry
  const [manualEntry, setManualEntry] = useState<ManualEntryState | null>(null)
  const [isSavingManual, setIsSavingManual] = useState(false)
  const [manualMsg, setManualMsg] = useState<string | null>(null)

  // Monthly View
  const [monthlyEmployees, setMonthlyEmployees] = useState<any[]>([])
  const [monthlySelectedEmpId, setMonthlySelectedEmpId] = useState<string>('')
  const [monthlyYear,  setMonthlyYear]  = useState(new Date().getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyData,  setMonthlyData]  = useState<any | null>(null) // selected employee's monthly record
  const [monthlyMsg,   setMonthlyMsg]   = useState<string | null>(null)
  // Inline add/edit form: { date, checkIn, checkOut, recordId? }
  const [monthlyForm,  setMonthlyForm]  = useState<{ date: string; checkIn: string; checkOut: string; recordId?: string } | null>(null)
  const [monthlySaving, setMonthlySaving] = useState(false)

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
      const params = new URLSearchParams()
      if (selectedBusinessId) params.set('businessId', selectedBusinessId)
      if (selectedDate) params.set('date', selectedDate)
      const res = await fetch(`/api/clock-in/today?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load attendance')
      setEmployees(data.employees)
      setSummary(data.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading attendance')
    } finally {
      setIsLoading(false)
    }
  }, [selectedBusinessId, selectedDate])

  const loadMonthlyEmployees = useCallback(async () => {
    if (!selectedBusinessId) return
    const params = new URLSearchParams({ businessId: selectedBusinessId, year: String(monthlyYear), month: String(monthlyMonth) })
    const res = await fetch(`/api/clock-in/monthly?${params}`)
    const data = await res.json()
    if (res.ok) {
      setMonthlyEmployees(data.employees || [])
      // if a specific employee is selected, update their monthly data
      if (monthlySelectedEmpId) {
        const found = (data.employees || []).find((e: any) => e.id === monthlySelectedEmpId)
        setMonthlyData(found || null)
      }
    }
  }, [selectedBusinessId, monthlyYear, monthlyMonth, monthlySelectedEmpId])

  const loadExemptEmployees = useCallback(async () => {
    setIsLoadingExempt(true)
    try {
      const params = new URLSearchParams()
      if (selectedBusinessId) params.set('businessId', selectedBusinessId)
      const res = await fetch(`/api/clock-in/exempt-employees?${params}`)
      const data = await res.json()
      if (res.ok) setExemptEmployees(data.employees)
    } catch {
      // silent — exempt list is secondary
    } finally {
      setIsLoadingExempt(false)
    }
  }, [selectedBusinessId])

  useEffect(() => {
    if (!businessReady) return
    loadAttendance()
    loadExemptEmployees()
  }, [loadAttendance, loadExemptEmployees, businessReady])

  useEffect(() => {
    if (!businessReady || activeTab !== 'monthly') return
    loadMonthlyEmployees()
  }, [activeTab, businessReady, loadMonthlyEmployees])

  const loadLoginLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const params = new URLSearchParams({ dateFrom: logDateFrom, dateTo: logDateTo })
      if (selectedBusinessId) params.set('businessId', selectedBusinessId)
      const res = await fetch(`/api/clock-in/login-log?${params}`)
      const data = await res.json()
      if (res.ok) setLoginLogs(data.logs || [])
    } catch { /* silent */ }
    finally { setIsLoadingLogs(false) }
  }

  useEffect(() => {
    if (activeTab === 'loginTracking') loadLoginLogs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedBusinessId])

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
      await Promise.all([loadAttendance(), loadExemptEmployees()])
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
      await alert({ title: 'Upload Failed', description: e instanceof Error ? e.message : 'Photo upload failed' })
    } finally {
      setUploadingExemptPhotoId(null)
    }
  }

  const enableClockIn = async (emp: ExemptEmployee) => {
    const ok = await confirm({
      title: 'Remove Clock-In Exemption',
      description: `Remove clock-in exemption for ${emp.fullName}? They will appear in the daily attendance list.`,
      confirmText: 'Remove Exemption',
    })
    if (!ok) return
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
      await alert({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to enable clock-in' })
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
      const today = selectedDate
      const toISO = (timeStr: string) => new Date(`${today}T${timeStr}:00`).toISOString()

      const res = await fetch('/api/clock-in/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: manualEntry.employeeId,
          action: 'manualEntry',
          date: today,
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

  const clearMonthlyEntry = async (recordId: string) => {
    const ok = await confirm({
      title: 'Delete Attendance Record',
      description: 'Delete this attendance record? This cannot be undone.',
      confirmText: 'Delete',
    })
    if (!ok) return
    setMonthlyMsg(null)
    try {
      const res = await fetch(`/api/clock-in/monthly?recordId=${recordId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMonthlyMsg('Record cleared')
      setMonthlyForm(null)
      await loadMonthlyEmployees()
    } catch (e) {
      setMonthlyMsg(e instanceof Error ? e.message : 'Clear failed')
    }
  }

  const saveMonthlyEntry = async () => {
    if (!monthlyForm || !monthlySelectedEmpId) return
    if (!monthlyForm.checkIn) { setMonthlyMsg('Clock-in time is required'); return }
    setMonthlySaving(true)
    setMonthlyMsg(null)
    try {
      const toISO = (t: string) => new Date(`${monthlyForm.date}T${t}:00`).toISOString()
      const res = await fetch('/api/clock-in/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: monthlySelectedEmpId,
          action: 'manualEntry',
          date: monthlyForm.date,
          manualCheckIn: toISO(monthlyForm.checkIn),
          manualCheckOut: monthlyForm.checkOut ? toISO(monthlyForm.checkOut) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMonthlyMsg('Saved')
      setMonthlyForm(null)
      await loadMonthlyEmployees()
    } catch (e) {
      setMonthlyMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setMonthlySaving(false)
    }
  }

  const printDoubleCard = (name: string) => {
    const cardEl = document.getElementById('employee-id-card')
    if (!cardEl) return
    const printWindow = window.open('', '_blank', 'width=900,height=520')
    if (!printWindow) return
    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n') }
        catch { return '' }
      })
      .join('\n')
    const cardHtml = cardEl.outerHTML
    printWindow.document.write(`<!DOCTYPE html><html><head><title>ID Card — ${name}</title><style>${styles}
      html,body{height:100%;margin:0;padding:0;}
      body{display:flex;flex-direction:column;align-items:center;padding:16px;}
      .print-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding:10px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;width:100%;max-width:700px;box-sizing:border-box;}
      .print-btn{background:#1f2937;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:14px;font-weight:600;cursor:pointer;}
      .print-btn:hover{background:#374151;}
      .print-title{font-size:13px;color:#64748b;}
      .card-pair{display:inline-flex;align-items:flex-start;}
      .fold-guide{width:0;align-self:stretch;border-left:2px dashed #888;}
      @media print{.print-toolbar{display:none;}body{padding:5mm;}.fold-guide{border-left-color:#bbb;}}
    </style></head><body>
    <div class="print-toolbar">
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <span class="print-title">ID Card — ${name}</span>
    </div>
    <div class="card-pair">${cardHtml}<div class="fold-guide"></div>${cardHtml}</div>
    </body></html>`)
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

  // Date helpers for login-tracking presets
  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  }
  const applyLogPreset = (preset: string) => {
    const today = todayStr
    setLogActivePreset(preset)
    setLogSearch('')
    switch (preset) {
      case 'today':     setLogDateFrom(today);          setLogDateTo(today);     break
      case 'yesterday': { const y = daysAgo(1); setLogDateFrom(y); setLogDateTo(y); break }
      case '7days':     setLogDateFrom(daysAgo(6));     setLogDateTo(today);     break
      case '30days':    setLogDateFrom(daysAgo(29));    setLogDateTo(today);     break
      case 'month':     setLogDateFrom(todayStr.slice(0, 7) + '-01'); setLogDateTo(today); break
    }
  }

  // Client-side filtered data for each tab
  const lc = (s: string) => s.toLowerCase()

  // When a specific business is selected, no extra filtering needed.
  // When "All Businesses" (null) is selected, restrict to the businesses
  // visible under the current demoFilter chip (Real / Demo / All).
  const allowedBizIds = useMemo(() => {
    if (selectedBusinessId) return null // API already scoped to one business
    if (demoFilter === 'all') return null // no restriction
    const pool = demoFilter === 'real'
      ? allRealBusinesses.filter((b) => !b.isDemo)
      : allRealBusinesses.filter((b) => b.isDemo)
    return new Set(pool.map((b) => b.businessId))
  }, [selectedBusinessId, demoFilter, allRealBusinesses])

  const filteredEmployees = useMemo(() => {
    let base = employees
    if (allowedBizIds) base = base.filter((e) => e.primaryBusiness && allowedBizIds.has(e.primaryBusiness.id))
    if (attendanceSearch) base = base.filter(e =>
      lc(e.fullName).includes(lc(attendanceSearch)) ||
      lc(e.employeeNumber).includes(lc(attendanceSearch))
    )
    return base
  }, [employees, allowedBizIds, attendanceSearch])

  const filteredExemptEmployees = useMemo(() => {
    let base = exemptEmployees
    if (allowedBizIds) base = base.filter((e) => e.primaryBusiness && allowedBizIds.has(e.primaryBusiness.id))
    if (exemptSearch) base = base.filter(e =>
      lc(e.fullName).includes(lc(exemptSearch)) ||
      lc(e.employeeNumber).includes(lc(exemptSearch))
    )
    return base
  }, [exemptEmployees, allowedBizIds, exemptSearch])

  const filteredLoginLogs = useMemo(() => {
    let base = loginLogs
    if (allowedBizIds) base = base.filter((log: any) =>
      log.employees?.primaryBusinessId && allowedBizIds.has(log.employees.primaryBusinessId)
    )
    if (logSearch) base = base.filter((log: any) =>
      lc(log.employees?.fullName ?? '').includes(lc(logSearch)) ||
      lc(log.employees?.employeeNumber ?? '').includes(lc(logSearch))
    )
    return base
  }, [loginLogs, allowedBizIds, logSearch])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🕐 Clock-In Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {selectedDate === todayStr ? 'Today — ' : ''}
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            ← Back
          </button>
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

      {/* Filters: Business & Date */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
        <div className="relative flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Business</label>
          <div className="relative min-w-[200px]">
            <button
              type="button"
              onClick={() => { setBizOpen((o) => !o); setBizSearch('') }}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <span className="truncate">{selectedBizName ?? 'All Businesses'}</span>
              <svg className="w-4 h-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {bizOpen && (
              <div className="absolute z-50 mt-1 w-full min-w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search businesses…"
                    value={bizSearch}
                    onChange={(e) => setBizSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-1 mt-2">
                    {(['real', 'demo', 'all'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => { setDemoFilter(f); setSelectedBusinessId(null) }}
                        className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                          demoFilter === f
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {f === 'real' ? 'Real' : f === 'demo' ? 'Demo' : 'All'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setSelectedBusinessId(null); setBizOpen(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      !selectedBusinessId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    All Businesses
                  </button>
                  {bizOptions.map((biz) => (
                    <button
                      key={biz.businessId}
                      type="button"
                      onClick={() => { setSelectedBusinessId(biz.businessId); setBizOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedBusinessId === biz.businessId ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {biz.businessName}
                    </button>
                  ))}
                  {bizOptions.length === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-400 text-center">No businesses found</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {bizOpen && <div className="fixed inset-0 z-40" onClick={() => setBizOpen(false)} />}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</label>
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => setSelectedDate(e.target.value || todayStr)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        {selectedDate !== todayStr && (
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium"
          >
            ↩ Back to Today
          </button>
        )}
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
          {selectedDate === todayStr ? "📋 Today's Attendance" : `📋 ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Attendance`}
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
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'monthly'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          📅 Monthly View
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

      {/* Attendance name search */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by name or employee #…"
          value={attendanceSearch}
          onChange={(e) => setAttendanceSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-64"
        />
        {attendanceSearch && (
          <button
            onClick={() => setAttendanceSearch('')}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ✕ Clear
          </button>
        )}
        {attendanceSearch && (
          <span className="text-xs text-gray-400">{filteredEmployees.length} of {employees.length} shown</span>
        )}
      </div>

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
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {attendanceSearch ? 'No employees match your search' : 'No employees found'}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setAttendanceReport({
                            employee: {
                              id: emp.id,
                              fullName: emp.fullName,
                              employeeNumber: emp.employeeNumber,
                              profilePhotoUrl: emp.profilePhotoUrl,
                              scheduledStartTime: emp.scheduledStartTime,
                              scheduledEndTime: emp.scheduledEndTime,
                            },
                            businessId: selectedBusinessId || emp.primaryBusiness?.id || '',
                          })}
                          className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full"
                          title="View attendance report"
                        >
                          {emp.profilePhotoUrl ? (
                            <img src={emp.profilePhotoUrl} alt="" className="w-8 h-8 rounded-full object-cover hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-transform cursor-pointer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm hover:ring-2 hover:ring-blue-400 hover:scale-110 transition-transform cursor-pointer">👤</div>
                          )}
                        </button>
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
                          <button
                            onClick={() => setPhotoPreview({
                              url: emp.attendance!.clockInPhotoUrl!,
                              action: 'Clock In',
                              time: emp.attendance?.checkIn ?? null,
                              employeeName: emp.fullName
                            })}
                            className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full"
                            title="View clock-in photo"
                          >
                            <img
                              src={emp.attendance.clockInPhotoUrl}
                              alt="Clock-in photo"
                              className="w-8 h-8 rounded-full object-cover border-2 border-green-400 hover:border-green-500 hover:scale-110 transition-transform cursor-pointer"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/expired-photo.svg' }}
                            />
                          </button>
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
                          <button
                            onClick={() => setPhotoPreview({
                              url: emp.attendance!.clockOutPhotoUrl!,
                              action: 'Clock Out',
                              time: emp.attendance?.checkOut ?? null,
                              employeeName: emp.fullName
                            })}
                            className="flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full"
                            title="View clock-out photo"
                          >
                            <img
                              src={emp.attendance.clockOutPhotoUrl}
                              alt="Clock-out photo"
                              className="w-8 h-8 rounded-full object-cover border-2 border-red-400 hover:border-red-500 hover:scale-110 transition-transform cursor-pointer"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/expired-photo.svg' }}
                            />
                          </button>
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
            These employees are exempt from daily clock-in. <span className="text-blue-600 dark:text-blue-400 font-medium">🏢 Management roles</span> are auto-exempt by their job title. They still have company ID cards that can be printed.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by name or employee #…"
              value={exemptSearch}
              onChange={(e) => setExemptSearch(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-64"
            />
            {exemptSearch && (
              <button
                onClick={() => setExemptSearch('')}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕ Clear
              </button>
            )}
            {exemptSearch && (
              <span className="text-xs text-gray-400">{filteredExemptEmployees.length} of {exemptEmployees.length} shown</span>
            )}
          </div>
          {isLoadingExempt ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-500">Loading...</span>
            </div>
          ) : filteredExemptEmployees.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {exemptSearch ? 'No exempt employees match your search' : 'No exempt employees found.'}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Business</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Exemption</th>
                    <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExemptEmployees.map((emp) => (
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
                      <td className="px-4 py-3">
                        {emp.isAutoExempt ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            🏢 Management role
                          </span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-xs italic">{emp.clockInExemptReason ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* Photo Upload */}
                          <label
                            className="text-xs text-teal-600 hover:text-teal-800 dark:hover:text-teal-400 font-medium cursor-pointer"
                            title="Take photo with camera"
                          >
                            {uploadingExemptPhotoId === emp.id ? '⏳' : '📷'}
                            <input
                              type="file"
                              accept="image/*"
                              {...(isMobile ? { capture: 'environment' } : {})}
                              className="hidden"
                              disabled={uploadingExemptPhotoId === emp.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleExemptPhotoUpload(emp, file)
                                e.target.value = ''
                              }}
                            />
                          </label>
                          <label
                            className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
                            title="Upload from gallery"
                          >
                            🖼
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
          <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
            {/* Preset buttons */}
            {([
              { key: 'today',     label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: '7days',     label: 'Last 7 Days' },
              { key: '30days',    label: 'Last 30 Days' },
              { key: 'month',     label: 'This Month' },
            ] as const).map(p => (
              <button
                key={p.key}
                onClick={() => applyLogPreset(p.key)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  logActivePreset === p.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-1">
              <input
                type="date"
                value={logDateFrom}
                onChange={(e) => { setLogDateFrom(e.target.value); setLogActivePreset(null) }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={logDateTo}
                onChange={(e) => { setLogDateTo(e.target.value); setLogActivePreset(null) }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={loadLoginLogs}
              disabled={isLoadingLogs}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoadingLogs ? 'Loading…' : '🔍 Load'}
            </button>
            {/* Name search */}
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="text"
                placeholder="Search by name…"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-48"
              />
              {logSearch && (
                <button
                  onClick={() => setLogSearch('')}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-500">Loading…</span>
            </div>
          ) : filteredLoginLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {logSearch ? 'No login events match your search' : 'No login events found for this period.'}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {logSearch && (
                <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  Showing {filteredLoginLogs.length} of {loginLogs.length} events
                </div>
              )}
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
                  {filteredLoginLogs.map((log: any) => (
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

      {/* Monthly View Tab */}
      {activeTab === 'monthly' && (
        <div>
          {!selectedBusinessId && (
            <div className="mb-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 text-sm">
              Please select a specific business from the dropdown above to use Monthly View.
            </div>
          )}
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5 items-end">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Employee</label>
              <select
                value={monthlySelectedEmpId}
                onChange={e => {
                  const id = e.target.value
                  setMonthlySelectedEmpId(id)
                  setMonthlyData(monthlyEmployees.find((emp: any) => emp.id === id) || null)
                  setMonthlyMsg(null)
                  setMonthlyForm(null)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[200px]"
              >
                <option value="">— Select employee —</option>
                {monthlyEmployees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeNumber})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Month</label>
              <select
                value={monthlyMonth}
                onChange={e => { setMonthlyMonth(Number(e.target.value)); setMonthlyData(null); setMonthlyForm(null) }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Year</label>
              <input
                type="number"
                value={monthlyYear}
                onChange={e => { setMonthlyYear(Number(e.target.value)); setMonthlyData(null); setMonthlyForm(null) }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-24"
              />
            </div>
            <button
              onClick={loadMonthlyEmployees}
              disabled={monthlyLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {monthlyLoading ? 'Loading…' : '↻ Load'}
            </button>
          </div>

          {monthlyMsg && (
            <div className="mb-3 p-2 rounded text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">{monthlyMsg}</div>
          )}

          {/* Monthly attendance grid */}
          {monthlyData && (() => {
            const daysInMonth = new Date(monthlyYear, monthlyMonth, 0).getDate()
            const attendanceByDate: Record<string, any> = {}
            for (const r of (monthlyData.attendance || [])) attendanceByDate[r.date] = r

            const fmtTime = (iso: string | null) => {
              if (!iso) return '—'
              const d = new Date(iso)
              return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
            }

            return (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-900 dark:text-white">{monthlyData.fullName}</span>
                    <span className="ml-2 text-xs text-gray-500">Schedule: {monthlyData.scheduledStartTime || '?'}–{monthlyData.scheduledEndTime || '?'}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {(monthlyData.attendance || []).length} / {daysInMonth} days recorded
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Date</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Clock In</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Clock Out</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Hours</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Status</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1
                      const dateStr = `${monthlyYear}-${String(monthlyMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                      const rec = attendanceByDate[dateStr]
                      const dayName = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
                      const isEditing = monthlyForm?.date === dateStr

                      return (
                        <tr key={dateStr} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${isEditing ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                            <span className="text-xs text-gray-400 mr-2">{dayName}</span>{dateStr}
                          </td>
                          {isEditing ? (
                            <>
                              <td colSpan={4} className="px-4 py-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <input
                                    type="time"
                                    value={monthlyForm.checkIn}
                                    onChange={e => setMonthlyForm(f => f ? { ...f, checkIn: e.target.value } : null)}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                    placeholder="Clock In *"
                                  />
                                  <input
                                    type="time"
                                    value={monthlyForm.checkOut}
                                    onChange={e => setMonthlyForm(f => f ? { ...f, checkOut: e.target.value } : null)}
                                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                    placeholder="Clock Out"
                                  />
                                  <button
                                    onClick={saveMonthlyEntry}
                                    disabled={monthlySaving}
                                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                  >
                                    {monthlySaving ? 'Saving…' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setMonthlyForm(null)}
                                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : rec ? (
                            <>
                              <td className="px-4 py-2 text-green-700 dark:text-green-400">{fmtTime(rec.checkIn)}</td>
                              <td className="px-4 py-2 text-blue-700 dark:text-blue-400">{fmtTime(rec.checkOut)}</td>
                              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{rec.hoursWorked != null ? `${rec.hoursWorked}h` : '—'}</td>
                              <td className="px-4 py-2">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 capitalize">{rec.status || 'present'}</span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-2 text-gray-400">—</td>
                              <td className="px-4 py-2 text-gray-400">—</td>
                              <td className="px-4 py-2 text-gray-400">—</td>
                              <td className="px-4 py-2">
                                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500">No record</span>
                              </td>
                            </>
                          )}
                          <td className="px-4 py-2 text-right">
                            {!isEditing && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    const ci = rec?.checkIn ? (() => { const d = new Date(rec.checkIn); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` })() : ''
                                    const co = rec?.checkOut ? (() => { const d = new Date(rec.checkOut); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` })() : ''
                                    setMonthlyForm({ date: dateStr, checkIn: ci, checkOut: co, recordId: rec?.id })
                                    setMonthlyMsg(null)
                                  }}
                                  className="px-3 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                >
                                  {rec ? 'Edit' : '+ Add'}
                                </button>
                                {rec && (
                                  <button
                                    onClick={() => clearMonthlyEntry(rec.id)}
                                    className="px-3 py-1 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/40"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()}

          {!monthlySelectedEmpId && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">Select an employee to view their monthly attendance</div>
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
                Enter the correct times for {selectedDate === todayStr ? 'today' : selectedDate}. This will overwrite any existing clock-in/out record.
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
                  <label className={`px-3 py-1.5 border border-teal-500 bg-teal-600 text-white rounded-lg text-xs cursor-pointer hover:bg-teal-700 ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`} title="Take photo with camera">
                    {isUploadingPhoto ? '⏳' : '📷'} Camera
                    <input
                      type="file"
                      accept="image/*"
                      {...(isMobile ? { capture: 'environment' } : {})}
                      className="hidden"
                      disabled={isUploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <label className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`} title="Upload from gallery">
                    🖼 Gallery
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(file)
                        e.target.value = ''
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
                  scanToken: printCardEmp.scanToken ?? printCardEmp.employeeNumber,
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
                scanToken: (printExemptEmp as any).scanToken ?? printExemptEmp.employeeNumber,
                profilePhotoUrl: printExemptEmp.profilePhotoUrl,
                phone: printExemptEmp.phone,
                businessContactPhone: (printExemptEmp as any).businessContactPhone ?? null,
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

      {/* Employee Attendance Report Modal */}
      {attendanceReport && (
        <EmployeeAttendanceReport
          employee={attendanceReport.employee}
          businessId={attendanceReport.businessId}
          onClose={() => setAttendanceReport(null)}
        />
      )}

      {/* Photo Preview Modal */}
      {photoPreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4"
          onClick={() => setPhotoPreview(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${photoPreview.action === 'Clock In' ? 'bg-green-500' : 'bg-red-500'}`}>
              <div className="flex items-center gap-2">
                <span className="text-white text-xl">{photoPreview.action === 'Clock In' ? '🟢' : '🔴'}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{photoPreview.action}</p>
                  <p className="text-white/80 text-xs">{photoPreview.employeeName}</p>
                </div>
              </div>
              <button
                onClick={() => setPhotoPreview(null)}
                className="text-white/80 hover:text-white text-lg leading-none"
              >✕</button>
            </div>

            {/* Photo */}
            <div className="p-4 flex justify-center bg-gray-50 dark:bg-gray-900">
              <img
                src={photoPreview.url}
                alt={`${photoPreview.action} photo`}
                className="w-64 h-64 object-cover rounded-xl shadow-md"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/expired-photo.svg' }}
              />
            </div>

            {/* Time */}
            <div className="px-4 py-3 text-center border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">Time</p>
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {photoPreview.time
                  ? new Date(photoPreview.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : '--'}
              </p>
              {photoPreview.time && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(photoPreview.time).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Close button */}
            <div className="px-4 pb-4">
              <button
                onClick={() => setPhotoPreview(null)}
                className="w-full py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
