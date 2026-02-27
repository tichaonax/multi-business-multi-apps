'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { signOut } from 'next-auth/react'

interface Employee {
  id: string
  fullName: string
  employeeNumber: string
  profilePhotoUrl: string | null
  scheduledStartTime: string | null
  scheduledEndTime: string | null
}

interface Attendance {
  id: string
  checkIn: string | null
  checkOut: string | null
  hoursWorked: string | null
}

export interface ClockInModalProps {
  isOpen: boolean
  onClose: () => void
  employee: Employee
  clockState: 'notYetClockedIn' | 'clockedIn' | 'clockedOut'
  attendance: Attendance | null
  /** True when the scanned card belongs to the currently logged-in user */
  isOwnCard?: boolean
}

export function ClockInModal({ isOpen, onClose, employee, clockState, attendance, isOwnCard }: ClockInModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const formatTime = (iso: string | null) => {
    if (!iso) return '--'
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
      setCameraError(false)
    } catch {
      setCameraError(true)
    }
  }

  // Open/close lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCamera()
      setError(null)
      setSuccess(null)
      setCameraError(false)
    } else if (clockState !== 'clockedOut') {
      startCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Live clock — updates every second while modal is open
  useEffect(() => {
    if (!isOpen || clockState === 'clockedOut') return
    const tick = () =>
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isOpen, clockState])

  // Capture a frame from the video stream
  const captureFromStream = (): string | null => {
    if (!videoRef.current || !canvasRef.current) return null
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    return canvas.toDataURL('image/jpeg', 0.8)
  }

  const handleAction = async () => {
    if (clockState === 'clockedOut') return

    setIsLoading(true)
    setError(null)

    try {
      const action = clockState === 'notYetClockedIn' ? 'clockIn' : 'clockOut'

      // Auto-capture photo from live stream at the moment of confirmation
      let photoUrl: string | undefined
      if (cameraActive) {
        const dataUrl = captureFromStream()
        stopCamera()
        if (dataUrl) {
          try {
            const blob = await (await fetch(dataUrl)).blob()
            const fd = new FormData()
            fd.append('files', blob, 'clock-photo.jpg')
            fd.append('expiresInDays', '60')
            const upRes = await fetch('/api/universal/images', { method: 'POST', body: fd })
            if (upRes.ok) {
              const upData = await upRes.json()
              photoUrl = upData.data?.[0]?.url ?? upData.url
            }
          } catch {
            // Photo upload failure is non-fatal — proceed without it
          }
        }
      }

      const res = await fetch('/api/clock-in/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employee.id, action, photoUrl }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Action failed')
        return
      }

      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

      const shouldSignOut =
        action === 'clockOut' &&
        (isOwnCard || sessionStorage.getItem('kioskLogin') === 'true')

      if (shouldSignOut) {
        sessionStorage.removeItem('kioskLogin')
        setSuccess(`Clocked out at ${now} — signing out…`)
        setTimeout(() => {
          onClose()
          signOut({ callbackUrl: window.location.origin, redirect: true })
        }, 2000)
      } else {
        setSuccess(action === 'clockIn' ? `Clocked in at ${now}` : `Clocked out at ${now}`)
        setTimeout(() => onClose(), 2000)
      }
    } catch {
      setError('Failed to record clock action. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const action = clockState === 'notYetClockedIn' ? 'clockIn' : clockState === 'clockedIn' ? 'clockOut' : null
  const actionLabel = action === 'clockIn' ? 'Clock In' : action === 'clockOut' ? 'Clock Out' : null
  const actionColor = action === 'clockIn' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'
  const headerColor = action === 'clockIn' ? 'bg-green-600' : action === 'clockOut' ? 'bg-orange-500' : 'bg-gray-500'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[80]">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">

        {/* Header */}
        <div className={`px-6 py-4 text-white ${headerColor}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {clockState === 'notYetClockedIn' && '🟢 Clock In'}
              {clockState === 'clockedIn' && '🟠 Clock Out'}
              {clockState === 'clockedOut' && '✅ Already Clocked Out'}
            </h2>
            <button onClick={onClose} className="text-white/80 hover:text-white text-xl">✕</button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Employee info */}
          <div className="flex items-center gap-3">
            {employee.profilePhotoUrl ? (
              <img src={employee.profilePhotoUrl} alt={employee.fullName}
                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl flex-shrink-0">
                👤
              </div>
            )}
            <div>
              <div className="font-bold text-gray-900 dark:text-white">{employee.fullName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">#{employee.employeeNumber}</div>
              {employee.scheduledStartTime && employee.scheduledEndTime && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {employee.scheduledStartTime} – {employee.scheduledEndTime}
                </div>
              )}
            </div>
          </div>

          {/* Live clock — shows the time that will be recorded */}
          {action && !success && (
            <div className={`rounded-lg px-4 py-3 text-center ${action === 'clockIn' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                {action === 'clockIn' ? 'Clock-in time' : 'Clock-out time'}
              </div>
              <div className={`text-3xl font-bold tabular-nums tracking-tight ${action === 'clockIn' ? 'text-green-700 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {currentTime}
              </div>
              {attendance?.checkIn && action === 'clockOut' && (
                <div className="text-xs text-gray-400 mt-1">
                  Clocked in at {formatTime(attendance.checkIn)}
                </div>
              )}
            </div>
          )}

          {/* Today's status summary (already clocked out case) */}
          {clockState === 'clockedOut' && attendance && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>In: <strong>{formatTime(attendance.checkIn)}</strong></span>
                <span>Out: <strong>{formatTime(attendance.checkOut)}</strong></span>
              </div>
              {attendance.hoursWorked && (
                <div className="text-gray-500 dark:text-gray-400 mt-1 text-center">
                  {Number(attendance.hoursWorked).toFixed(2)} hours worked
                </div>
              )}
            </div>
          )}

          {/* Already clocked out */}
          {clockState === 'clockedOut' && (
            <div className="text-center py-2 text-gray-500 dark:text-gray-400">
              <div className="text-3xl mb-1">✅</div>
              <p className="text-sm">Already clocked out today.</p>
            </div>
          )}

          {/* Camera viewfinder — photo captured automatically on confirm */}
          {action && !success && (
            <div>
              {cameraError && (
                <p className="text-xs text-gray-400 text-center py-1">
                  Camera unavailable — proceeding without photo
                </p>
              )}
              {cameraActive && (
                <div className="relative rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full rounded-lg"
                    style={{ maxHeight: '160px', objectFit: 'cover' }} />
                  <div className="absolute bottom-1 right-2 text-white/70 text-xs bg-black/30 px-1.5 py-0.5 rounded">
                    Photo taken on confirm
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-center">
              <div className="text-3xl mb-1">✅</div>
              <div className="font-semibold">{success}</div>
            </div>
          )}

          {/* Action buttons */}
          {action && !success && (
            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                Cancel
              </button>
              <button onClick={handleAction} disabled={isLoading}
                className={`flex-1 py-2.5 text-white rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${actionColor}`}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                    Processing…
                  </span>
                ) : actionLabel}
              </button>
            </div>
          )}

          {clockState === 'clockedOut' && (
            <button onClick={onClose}
              className="w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
              Close
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
