'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface PendingRecord {
  id: string
  fullName: string
  employeeNumber: string
  checkIn: string | null
  checkOut: string | null
  hoursWorked: string | null
  scheduledEndTime: string | null
  attendanceId: string
}

export default function AutoApprovalsPage() {
  const [pending, setPending] = useState<PendingRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [adjustments, setAdjustments] = useState<Record<string, string>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/clock-in/today')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const pendingRecords: PendingRecord[] = data.employees
        .filter((e: any) => e.attendance?.isAutoClockOut && !e.attendance?.isApproved)
        .map((e: any) => ({
          id: e.id,
          fullName: e.fullName,
          employeeNumber: e.employeeNumber,
          checkIn: e.attendance.checkIn,
          checkOut: e.attendance.checkOut,
          hoursWorked: e.attendance.hoursWorked,
          scheduledEndTime: e.scheduledEndTime,
          attendanceId: e.attendance.id,
        }))
      setPending(pendingRecords)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  const approve = async (attendanceId: string, adjustedClockOut?: string) => {
    setProcessingId(attendanceId)
    setMessage(null)
    try {
      const body: any = {}
      if (adjustedClockOut) body.adjustedClockOut = adjustedClockOut
      const res = await fetch(`/api/clock-in/attendance/${attendanceId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage('Approved successfully')
      await loadPending()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Approval failed')
    } finally {
      setProcessingId(null)
    }
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const toTimeInputValue = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const toISOFromTimeInput = (timeStr: string, referenceIso: string | null) => {
    if (!timeStr || !referenceIso) return undefined
    const ref = new Date(referenceIso)
    const [h, m] = timeStr.split(':').map(Number)
    ref.setHours(h, m, 0, 0)
    return ref.toISOString()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/employees/clock-in" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⏳ Pending Auto Clock-Outs</h1>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
          {message}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : pending.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          <p>No pending auto clock-out approvals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((rec) => (
            <div key={rec.attendanceId} className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-lg">{rec.fullName}</div>
                  <div className="text-sm text-gray-400">#{rec.employeeNumber}</div>
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>Clock In: <strong>{formatTime(rec.checkIn)}</strong></div>
                    <div>
                      Auto Clock-Out: <strong>{formatTime(rec.checkOut)}</strong>
                      {rec.scheduledEndTime && <span className="ml-2 text-xs text-gray-400">(scheduled: {rec.scheduledEndTime})</span>}
                    </div>
                    {rec.hoursWorked && <div>Hours: {Number(rec.hoursWorked).toFixed(2)}h</div>}
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  <label className="text-xs text-gray-500 dark:text-gray-400">Adjust clock-out time (optional):</label>
                  <input
                    type="time"
                    value={adjustments[rec.attendanceId] ?? toTimeInputValue(rec.checkOut)}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, [rec.attendanceId]: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    onClick={() => approve(
                      rec.attendanceId,
                      adjustments[rec.attendanceId]
                        ? toISOFromTimeInput(adjustments[rec.attendanceId], rec.checkOut)
                        : undefined
                    )}
                    disabled={processingId === rec.attendanceId}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
                  >
                    {processingId === rec.attendanceId ? 'Approving...' : '✅ Approve'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
