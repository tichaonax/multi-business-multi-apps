'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentLayout } from '@/components/layout/content-layout'
import { useBusinessPermissionsContext } from '@/contexts/business-permissions-context'
import { useToastContext } from '@/components/ui/toast'

interface AbsenceEmployee {
  employeeId: string
  fullName: string
  employeeNumber: string
  isAbsent: boolean
  absenceId: string | null
  businessId: string
  businessName: string
}

interface EmpOption { id: string; fullName: string; employeeNumber: string }

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function pad2(n: number) { return String(n).padStart(2, '0') }

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

export default function AbsencesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToastContext()
  const { currentBusinessId, businesses } = useBusinessPermissionsContext()

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [date, setDate] = useState(todayISO())
  const [employees, setEmployees] = useState<AbsenceEmployee[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set())
  const [batchNote, setBatchNote] = useState('')
  const [originalNote, setOriginalNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [lockedMessage, setLockedMessage] = useState('')

  // Employee-month modal state
  const [empModalOpen, setEmpModalOpen] = useState(false)
  const [empOptions, setEmpOptions] = useState<EmpOption[]>([])
  const [empModalBizId, setEmpModalBizId] = useState<string>('')
  const [selectedEmpId, setSelectedEmpId] = useState<string>('')
  const [empModalMonth, setEmpModalMonth] = useState(() => new Date().getMonth() + 1)
  const [empModalYear, setEmpModalYear] = useState(() => new Date().getFullYear())
  const [absentDays, setAbsentDays] = useState<Set<number>>(new Set())
  const [empModalLoading, setEmpModalLoading] = useState(false)
  const [empModalSaving, setEmpModalSaving] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) { router.push('/auth/signin'); return }
  }, [session, status, router])

  useEffect(() => {
    if (currentBusinessId && !selectedBusinessId) {
      setSelectedBusinessId(currentBusinessId)
    }
  }, [currentBusinessId, selectedBusinessId])

  const ALL_KEY = '__all__'
  const isAllMode = selectedBusinessId === ALL_KEY

  // Memoize to prevent new array references causing infinite useCallback/useEffect loops
  const subBusinesses = useMemo(() => businesses.filter(b => !b.isUmbrellaBusiness), [businesses])
  const bizIdList = useMemo(() => subBusinesses.map(b => b.businessId).join(','), [subBusinesses])

  // Searchable dropdown state
  const [bizSearch, setBizSearch] = useState('')
  const [bizOpen, setBizOpen] = useState(false)
  const bizRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bizRef.current && !bizRef.current.contains(e.target as Node)) setBizOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const bizOptions = useMemo(() => [
    { value: ALL_KEY, label: 'All Businesses' },
    ...subBusinesses.map(b => ({ value: b.businessId, label: b.businessName })),
  ], [subBusinesses])
  const filteredBizOptions = useMemo(() => bizOptions.filter(o => o.label.toLowerCase().includes(bizSearch.toLowerCase())), [bizOptions, bizSearch])
  const selectedBizLabel = useMemo(() => bizOptions.find(o => o.value === selectedBusinessId)?.label ?? '', [bizOptions, selectedBusinessId])

  const fetchAbsences = useCallback(async () => {
    if (!selectedBusinessId || !date || subBusinesses.length === 0) return
    setLoading(true)
    setIsLocked(false)
    setLockedMessage('')

    try {
      if (isAllMode) {
        // Fetch all sub-businesses in parallel
        const results = await Promise.all(
          subBusinesses.map(async (b) => {
            const params = new URLSearchParams({ businessId: b.businessId, date })
            const res = await fetch(`/api/employees/absences?${params}`, { credentials: 'include' })
            const json = await res.json()
            if (!res.ok) return { employees: [], batchNote: '' }
            const emps: AbsenceEmployee[] = (json.employees || []).map((e: any) => ({
              ...e,
              businessId: b.businessId,
              businessName: b.businessName,
            }))
            return { employees: emps, batchNote: json.batchNote || '' }
          })
        )
        const allEmps = results.flatMap(r => r.employees)
        setEmployees(allEmps)
        const absentSet = new Set(allEmps.filter(e => e.isAbsent).map(e => e.employeeId))
        setCheckedIds(new Set(absentSet))
        setOriginalIds(new Set(absentSet))
        setBatchNote('')
        setOriginalNote('')
      } else if (selectedBusinessId !== ALL_KEY) {
        const params = new URLSearchParams({ businessId: selectedBusinessId, date })
        const res = await fetch(`/api/employees/absences?${params}`, { credentials: 'include' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load absences')
        const biz = businesses.find(b => b.businessId === selectedBusinessId)
        const emps: AbsenceEmployee[] = (json.employees || []).map((e: any) => ({
          ...e,
          businessId: selectedBusinessId,
          businessName: biz?.businessName ?? '',
        }))
        setEmployees(emps)
        const absentSet = new Set(emps.filter(e => e.isAbsent).map(e => e.employeeId))
        setCheckedIds(new Set(absentSet))
        setOriginalIds(new Set(absentSet))
        setBatchNote(json.batchNote || '')
        setOriginalNote(json.batchNote || '')
      }
    } catch (e: any) {
      if (e.message?.includes('locked') || e.message?.includes('processed')) {
        setIsLocked(true)
        setLockedMessage(e.message)
      } else {
        toast.error(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedBusinessId, date, isAllMode, bizIdList, toast])

  useEffect(() => { fetchAbsences() }, [fetchAbsences])

  const checkLockStatus = useCallback(async () => {
    if (!selectedBusinessId || !date || isAllMode) return
    try {
      const [year, month] = date.split('-').map(Number)
      const params = new URLSearchParams({ businessId: selectedBusinessId, year: String(year), month: String(month) })
      const res = await fetch(`/api/payroll/periods?${params}`, { credentials: 'include' })
      const json = await res.json()
      if (res.ok && json.periods) {
        const period = json.periods.find((p: any) => p.year === year && p.month === month)
        if (period && (period.status === 'closed' || period.status === 'exported')) {
          setIsLocked(true)
          setLockedMessage('Payroll for this period has been processed. Records are locked.')
        }
      }
    } catch { /* non-blocking */ }
  }, [selectedBusinessId, date, isAllMode])

  useEffect(() => { checkLockStatus() }, [checkLockStatus])

  function toggleEmployee(employeeId: string) {
    if (isLocked) return
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(employeeId)) next.delete(employeeId)
      else next.add(employeeId)
      return next
    })
  }

  function toggleAll() {
    if (isLocked) return
    if (checkedIds.size === employees.length) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(employees.map(e => e.employeeId)))
    }
  }

  const isDirty =
    batchNote !== originalNote ||
    checkedIds.size !== originalIds.size ||
    [...checkedIds].some(id => !originalIds.has(id)) ||
    [...originalIds].some(id => !checkedIds.has(id))

  async function openEmpModal() {
    const bizId = selectedBusinessId === ALL_KEY ? (subBusinesses[0]?.businessId ?? '') : (selectedBusinessId ?? '')
    setEmpModalBizId(bizId)
    setSelectedEmpId('')
    setAbsentDays(new Set())
    setEmpModalOpen(true)
    try {
      const res = await fetch(`/api/employees?businessId=${bizId}&status=active`, { credentials: 'include' })
      const json = await res.json()
      const list: EmpOption[] = (json.employees || json.data || []).map((e: any) => ({ id: e.id, fullName: e.fullName, employeeNumber: e.employeeNumber }))
      setEmpOptions(list.sort((a, b) => a.fullName.localeCompare(b.fullName)))
    } catch { toast.error('Failed to load employees') }
  }

  async function loadEmpAbsences(empId: string, month: number, year: number, bizId: string) {
    if (!empId || !bizId) return
    setEmpModalLoading(true)
    try {
      const res = await fetch(`/api/employees/absences?employeeId=${empId}&month=${month}&year=${year}&businessId=${bizId}`, { credentials: 'include' })
      const json = await res.json()
      const days = new Set<number>((json.absentDates || []).map((d: string) => parseInt(d.split('-')[2])))
      setAbsentDays(days)
    } catch { toast.error('Failed to load absences') } finally { setEmpModalLoading(false) }
  }

  function toggleDay(day: number) {
    setAbsentDays(prev => { const next = new Set(prev); next.has(day) ? next.delete(day) : next.add(day); return next })
  }

  async function saveEmpAbsences() {
    if (!selectedEmpId || !empModalBizId) return
    setEmpModalSaving(true)
    try {
      const absentDates = [...absentDays].map(d => `${empModalYear}-${pad2(empModalMonth)}-${pad2(d)}`)
      const res = await fetch('/api/employees/absences/by-employee', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmpId, businessId: empModalBizId, month: empModalMonth, year: empModalYear, absentDates }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')
      toast.push(`Saved ${json.saved} absence${json.saved !== 1 ? 's' : ''}, removed ${json.removed}`, { type: 'success' })
      setEmpModalOpen(false)
      fetchAbsences()
    } catch (e: any) { toast.error(e.message) } finally { setEmpModalSaving(false) }
  }

  async function handleSave() {
    if (!selectedBusinessId || selectedBusinessId === ALL_KEY && subBusinesses.length === 0) return
    setSaving(true)
    try {
      if (isAllMode) {
        // Save per-business
        const bizIds = [...new Set(employees.map(e => e.businessId))]
        let totalSaved = 0
        for (const bizId of bizIds) {
          const bizEmpIds = employees.filter(e => e.businessId === bizId).map(e => e.employeeId)
          const absentForBiz = bizEmpIds.filter(id => checkedIds.has(id))
          const res = await fetch('/api/employees/absences', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId: bizId, date, absentEmployeeIds: absentForBiz, notes: null }),
          })
          const json = await res.json()
          if (res.ok) totalSaved += json.saved ?? 0
        }
        toast.push(`Saved ${totalSaved} absence${totalSaved !== 1 ? 's' : ''} for ${date}`, { type: 'success' })
        setOriginalIds(new Set(checkedIds))
        setOriginalNote(batchNote)
      } else {
        const res = await fetch('/api/employees/absences', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: selectedBusinessId, date, absentEmployeeIds: [...checkedIds], notes: batchNote || null }),
        })
        const json = await res.json()
        if (!res.ok) {
          if (res.status === 403 && json.error?.includes('locked')) {
            setIsLocked(true)
            setLockedMessage(json.error)
            toast.error(json.error)
          } else {
            throw new Error(json.error || 'Failed to save absences')
          }
          return
        }
        toast.push(`Saved ${json.saved} absence${json.saved !== 1 ? 's' : ''} for ${date}`, { type: 'success' })
        setOriginalIds(new Set(checkedIds))
        setOriginalNote(batchNote)
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    )
  }

  const absentCount = checkedIds.size

  // Group employees by business for "All" mode
  const grouped: { businessId: string; businessName: string; emps: AbsenceEmployee[] }[] = isAllMode
    ? subBusinesses
        .map(b => ({ businessId: b.businessId, businessName: b.businessName, emps: employees.filter(e => e.businessId === b.businessId) }))
        .filter(g => g.emps.length > 0)
    : [{ businessId: selectedBusinessId ?? '', businessName: '', emps: employees }]

  return (
    <ContentLayout title="Absence Tracker">
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border">
          <span className="px-4 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px">Tracker</span>
          <Link href="/employees/absences/report" className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors">Reports</Link>
        </div>

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Absence Tracker</h1>
            <p className="text-sm text-secondary mt-1">Mark employees who did not show up for work</p>
          </div>
          <button
            onClick={openEmpModal}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            By Employee
          </button>
          <div className="flex flex-col items-end gap-1">
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={e => setDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {absentCount > 0 && (
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {absentCount} employee{absentCount !== 1 ? 's' : ''} marked absent
              </span>
            )}
          </div>
        </div>

        {/* Business selector — searchable combobox */}
        {subBusinesses.length > 1 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-secondary whitespace-nowrap">Business:</label>
            <div ref={bizRef} className="relative flex-1">
              <button
                type="button"
                onClick={() => { setBizOpen(o => !o); setBizSearch('') }}
                className="w-full flex items-center justify-between px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <span>{selectedBizLabel || 'Select business…'}</span>
                <svg className="w-4 h-4 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {bizOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-border rounded-md shadow-lg">
                  <div className="p-2 border-b border-border">
                    <input
                      autoFocus
                      type="text"
                      value={bizSearch}
                      onChange={e => setBizSearch(e.target.value)}
                      placeholder="Search business…"
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <ul className="max-h-52 overflow-y-auto">
                    {filteredBizOptions.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-secondary">No results</li>
                    ) : filteredBizOptions.map(o => (
                      <li
                        key={o.value}
                        onClick={() => { setSelectedBusinessId(o.value); setBizOpen(false) }}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 ${selectedBusinessId === o.value ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-primary'}`}
                      >
                        {o.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lock banner */}
        {isLocked && (
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Records Locked</p>
              <p className="text-sm text-red-700 dark:text-red-400">{lockedMessage}</p>
            </div>
          </div>
        )}

        {/* Employee list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-16 text-secondary">
              <p className="text-4xl mb-3">👥</p>
              <p className="font-medium">No active employees found</p>
            </div>
          ) : (
            <>
              {/* Select all toggle */}
              {!isLocked && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                  <input
                    type="checkbox"
                    id="toggle-all"
                    checked={checkedIds.size === employees.length && employees.length > 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="toggle-all" className="text-sm font-medium text-secondary cursor-pointer">
                    {checkedIds.size === employees.length ? 'Deselect all' : 'Select all absent'}
                  </label>
                </div>
              )}

              {grouped.map(group => (
                <div key={group.businessId}>
                  {/* Business group header — only shown in All mode */}
                  {isAllMode && (
                    <div className="px-4 py-2 bg-muted/50 border-b border-border">
                      <span className="text-xs font-semibold text-secondary uppercase tracking-wide">{group.businessName}</span>
                    </div>
                  )}
                  <ul className="divide-y divide-border">
                    {group.emps.map(emp => {
                      const isAbsent = checkedIds.has(emp.employeeId)
                      return (
                        <li
                          key={emp.employeeId}
                          onClick={() => toggleEmployee(emp.employeeId)}
                          className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                            isLocked ? 'cursor-default' : 'cursor-pointer hover:bg-muted/40'
                          } ${isAbsent ? 'bg-red-50 dark:bg-red-900/10' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isAbsent}
                            onChange={() => toggleEmployee(emp.employeeId)}
                            disabled={isLocked}
                            onClick={e => e.stopPropagation()}
                            className="h-4 w-4 rounded border-border text-red-600 focus:ring-red-500"
                          />
                          <div className="flex-1 min-w-0">
                            <span className={`font-medium ${isAbsent ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>
                              {emp.fullName}
                            </span>
                          </div>
                          <span className="text-xs text-secondary font-mono">#{emp.employeeNumber}</span>
                          {isAbsent && (
                            <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                              Absent
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Note field — only shown for single-business mode */}
        {!isAllMode && (
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Note for {date} <span className="text-xs text-secondary font-normal">(optional — applies to the whole day)</span>
            </label>
            <textarea
              value={batchNote}
              onChange={e => setBatchNote(e.target.value)}
              disabled={isLocked}
              rows={2}
              placeholder="e.g. Public holiday, storm, site closure..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-primary focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        )}

        {/* Save button */}
        {!isLocked && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!isDirty || saving || loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving…' : 'Save Absences'}
            </button>
          </div>
        )}
      </div>
      {/* Employee-Month Modal */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Mark Absences by Employee</h2>
              <button onClick={() => setEmpModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Controls row */}
              <div className="flex flex-wrap gap-3">
                {/* Employee picker */}
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-secondary mb-1">Employee</label>
                  <select
                    value={selectedEmpId}
                    onChange={e => { setSelectedEmpId(e.target.value); if (e.target.value) loadEmpAbsences(e.target.value, empModalMonth, empModalYear, empModalBizId) }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select employee…</option>
                    {empOptions.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeNumber})</option>)}
                  </select>
                </div>

                {/* Month picker */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Month</label>
                  <select
                    value={empModalMonth}
                    onChange={e => { const m = Number(e.target.value); setEmpModalMonth(m); setAbsentDays(new Set()); if (selectedEmpId) loadEmpAbsences(selectedEmpId, m, empModalYear, empModalBizId) }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    {MONTH_NAMES.map((name, i) => <option key={i} value={i + 1}>{name}</option>)}
                  </select>
                </div>

                {/* Year picker */}
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Year</label>
                  <select
                    value={empModalYear}
                    onChange={e => { const y = Number(e.target.value); setEmpModalYear(y); setAbsentDays(new Set()); if (selectedEmpId) loadEmpAbsences(selectedEmpId, empModalMonth, y, empModalBizId) }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    {[new Date().getFullYear() - 1, new Date().getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Calendar */}
              {!selectedEmpId ? (
                <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Select an employee to mark absences</p>
              ) : empModalLoading ? (
                <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{MONTH_NAMES[empModalMonth - 1]} {empModalYear}</p>
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">{absentDays.size} day{absentDays.size !== 1 ? 's' : ''} marked absent</span>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>)}
                  </div>

                  {/* Calendar cells */}
                  <div className="grid grid-cols-7 gap-1">
                    {buildCalendar(empModalYear, empModalMonth).map((day, idx) => {
                      if (!day) return <div key={idx} />
                      const isAbsent = absentDays.has(day)
                      const isFuture = new Date(`${empModalYear}-${pad2(empModalMonth)}-${pad2(day)}`) > new Date()
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={isFuture}
                          onClick={() => toggleDay(day)}
                          className={`aspect-square flex items-center justify-center rounded-md text-sm font-medium transition-colors
                            ${isFuture ? 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600' :
                              isAbsent ? 'bg-red-500 text-white hover:bg-red-600' :
                              'bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-800 dark:text-gray-200'}`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Click a day to toggle absent (red). Future days are disabled.</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setEmpModalOpen(false)} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100">Cancel</button>
              <button
                onClick={saveEmpAbsences}
                disabled={!selectedEmpId || empModalSaving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {empModalSaving ? 'Saving…' : 'Save Absences'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContentLayout>
  )
}
