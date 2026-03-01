'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ScanResult {
  found: boolean
  canLogin: boolean
  attendanceId?: string | null
  employee?: { id: string; fullName: string; profilePhotoUrl: string | null; employeeNumber: string }
  isExempt?: boolean
  clockedIn?: boolean
  alreadyClockedIn?: boolean
  clockedOut?: boolean
  clockInTime?: string | null
  error?: string
}

export function CardScanOverlay() {
  const router = useRouter()

  // ── Scan state ────────────────────────────────────────────────────────────
  const [scanState, setScanState] = useState<'idle' | 'scanning' | 'result'>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Camera state ─────────────────────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Login prompt state ────────────────────────────────────────────────────
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // ── Barcode detection ─────────────────────────────────────────────────────
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const GAP_MS = 80

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraActive(false)
  }, [])

  const resetOverlay = useCallback(() => {
    stopCamera()
    setCapturedPhoto(null)
    setCameraError(false)
    setIsLoggingIn(false)
    setScanState('idle')
    setScanResult(null)
  }, [stopCamera])

  const dismiss = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    resetOverlay()
  }, [resetOverlay])

  const startCamera = async () => {
    setCameraError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraActive(true)
    } catch {
      setCameraError(true)
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8))
    stopCamera()
  }

  // Upload a photo data-URL to the images API; returns the stored URL
  const uploadPhotoForLog = async (dataUrl: string): Promise<string | undefined> => {
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const fd = new FormData()
      fd.append('files', blob, 'login-photo.jpg')
      fd.append('expiresInDays', '60')
      const res = await fetch('/api/universal/images', { method: 'POST', body: fd })
      const data = await res.json()
      return data.data?.[0]?.url
    } catch { return undefined }
  }

  const handleLoginYes = async (employeeNumber: string) => {
    setIsLoggingIn(true)

    // Capture photo now if camera is still active
    if (cameraActive) capturePhoto()

    // Small delay to let capturedPhoto state settle, then read from ref alternative
    // We use a snapshot of the canvas directly to avoid async state issues
    let photoUrl: string | undefined
    if (canvasRef.current && canvasRef.current.width > 0) {
      const snapshot = canvasRef.current.toDataURL('image/jpeg', 0.8)
      if (snapshot && snapshot !== 'data:,') {
        photoUrl = await uploadPhotoForLog(snapshot)
      }
    } else if (capturedPhoto) {
      photoUrl = await uploadPhotoForLog(capturedPhoto)
    }

    const result = await signIn('credentials', {
      employeeNumber,
      type: 'card',
      identifier: '',
      password: '',
      redirect: false,
    })

    if (!result?.error) {
      // Log the login event (fire-and-forget)
      if (scanResult?.employee?.id) {
        fetch('/api/clock-in/login-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId: scanResult.employee.id,
            action: 'login',
            method: 'card',
            photoUrl: photoUrl ?? null,
          }),
        }).catch(() => {})
      }
      sessionStorage.setItem('kioskLogin', 'true')
      router.push('/auth/redirect')
    } else {
      setIsLoggingIn(false)
    }
  }

  const handleLoginNo = async () => {
    // Capture photo if camera is active
    if (cameraActive) capturePhoto()

    let photoUrl: string | undefined
    if (canvasRef.current && canvasRef.current.width > 0) {
      const snapshot = canvasRef.current.toDataURL('image/jpeg', 0.8)
      if (snapshot && snapshot !== 'data:,') {
        photoUrl = await uploadPhotoForLog(snapshot)
      }
    } else if (capturedPhoto) {
      photoUrl = await uploadPhotoForLog(capturedPhoto)
    }

    // Log the declined event (fire-and-forget)
    if (scanResult?.employee?.id) {
      fetch('/api/clock-in/login-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: scanResult.employee.id,
          action: 'declined',
          method: 'card',
          photoUrl: photoUrl ?? null,
        }),
      }).catch(() => {})
    }

    dismiss()
  }

  const handleCardScan = useCallback(async (scanToken: string) => {
    setScanState('scanning')
    setScanResult(null)
    setCapturedPhoto(null)
    setCameraError(false)
    setIsLoggingIn(false)

    try {
      const res = await fetch('/api/clock-in/card-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanToken }),
      })
      const data: ScanResult = await res.json()
      setScanResult(data)
      setScanState('result')

      // Log every scan that triggers a workflow (fire-and-forget)
      if (data.found && data.employee?.id) {
        fetch('/api/clock-in/login-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId: data.employee.id, action: 'scan', method: 'card' }),
        }).catch(() => {})
      }

      // For fresh clock-ins — keep open so user can respond to login prompt
      if (data.found && data.clockedIn) return

      // For exempt users who can login — keep open for the login dialog
      if (data.found && data.isExempt && data.canLogin) return

      // Already clocked out today — brief message then auto-dismiss
      if (data.found && data.clockedOut) {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        closeTimerRef.current = setTimeout(dismiss, 3000)
        return
      }

      // All other cases (already clocked in, not found, exempt without login) — auto-dismiss
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = setTimeout(dismiss, 4000)
    } catch {
      setScanResult({ found: false, error: 'Connection error' })
      setScanState('result')
      closeTimerRef.current = setTimeout(dismiss, 3000)
    }
  }, [dismiss])

  // Global keydown listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (scanState !== 'idle') return

      const now = Date.now()
      if (now - lastKeyTimeRef.current > GAP_MS) bufferRef.current = ''
      lastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        bufferRef.current = ''
        if (code.length >= 4) handleCardScan(code)
        return
      }
      if (e.key.length === 1) bufferRef.current += e.key
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [scanState, handleCardScan])

  // Auto-start camera for fresh clock-ins OR exempt users who can login
  useEffect(() => {
    if (
      (scanResult?.found && scanResult.clockedIn) ||
      (scanResult?.found && scanResult.isExempt && scanResult.canLogin)
    ) {
      startCamera()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanResult?.clockedIn, scanResult?.isExempt, scanResult?.canLogin])

  // Re-assign stream once cameraActive flips true and the <video> element is in the DOM
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraActive])

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    stopCamera()
  }, [stopCamera])

  if (scanState === 'idle') return null

  const formatTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''

  // ── Overlay body ──────────────────────────────────────────────────────────
  let body: React.ReactNode

  if (scanState === 'scanning') {
    body = (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="text-gray-600 font-medium">Reading card…</p>
      </div>
    )
  } else if (!scanResult?.found) {
    body = (
      <div className="text-center space-y-3">
        <div className="text-5xl">❌</div>
        <h3 className="text-lg font-semibold text-gray-900">Card Not Recognised</h3>
        <p className="text-sm text-gray-500">{scanResult?.error ?? 'This card is not registered.'}</p>
      </div>
    )
  } else if (scanResult.clockedOut) {
    // Employee already completed their shift today
    const emp = scanResult.employee!
    body = (
      <div className="space-y-4">
        <div className="text-center">
          {emp.profilePhotoUrl ? (
            <img src={emp.profilePhotoUrl} alt={emp.fullName}
              className="w-16 h-16 rounded-full object-cover border-4 border-gray-200 mx-auto mb-2" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mx-auto mb-2">👤</div>
          )}
          <h3 className="text-lg font-bold text-gray-900">{emp.fullName}</h3>
          <p className="text-sm font-medium text-gray-500 mt-1">Already clocked out today</p>
        </div>
        <button onClick={dismiss}
          className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
          Dismiss
        </button>
      </div>
    )
  } else {
    const emp = scanResult.employee!
    const isNewClockIn = !!scanResult.clockedIn
    const isExemptWithLogin = !!scanResult.isExempt && !!scanResult.canLogin
    const showCameraSection = isNewClockIn || isExemptWithLogin
    const showLoginPrompt = (isNewClockIn || isExemptWithLogin) && scanResult.canLogin

    const clockMsg = scanResult.isExempt
      ? 'Clock-in not required for this employee'
      : scanResult.alreadyClockedIn
      ? `Already clocked in at ${formatTime(scanResult.clockInTime)}`
      : isNewClockIn
      ? `Clocked in at ${formatTime(scanResult.clockInTime)} ✓`
      : ''

    body = (
      <div className="space-y-4">
        {/* Employee info */}
        <div className="text-center">
          {emp.profilePhotoUrl ? (
            <img src={emp.profilePhotoUrl} alt={emp.fullName}
              className="w-16 h-16 rounded-full object-cover border-4 border-blue-100 mx-auto mb-2" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl mx-auto mb-2">👤</div>
          )}
          <h3 className="text-lg font-bold text-gray-900">{emp.fullName}</h3>
          {clockMsg && (
            <p className={`text-sm font-medium mt-1 ${isNewClockIn ? 'text-green-600' : 'text-gray-500'}`}>
              {clockMsg}
            </p>
          )}
        </div>

        {/* Camera section — live feed with auto-capture on confirm */}
        {showCameraSection && (
          <div>
            {cameraError && (
              <p className="text-xs text-gray-400 text-center py-1">
                Camera unavailable — proceeding without photo
              </p>
            )}
            {cameraActive && (
              <div className="relative rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted
                  className="w-full rounded-lg" style={{ maxHeight: '160px', objectFit: 'cover' }} />
                <div className="absolute bottom-1 right-2 text-white/70 text-xs bg-black/30 px-1.5 py-0.5 rounded">
                  Photo taken on confirm
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Hidden canvas for non-camera cases (still needed for capture) */}
        {!showCameraSection && <canvas ref={canvasRef} className="hidden" />}

        {/* Login prompt — for fresh clock-ins and exempt users who can login */}
        {showLoginPrompt && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm text-gray-600 text-center mb-3">Would you like to log into the system?</p>
            <div className="flex gap-2">
              <button onClick={handleLoginNo} disabled={isLoggingIn}
                className="flex-1 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                {isExemptWithLogin ? 'No, just scan' : 'No, just clock in'}
              </button>
              <button
                onClick={() => handleLoginYes(scanResult.employee!.employeeNumber)}
                disabled={isLoggingIn}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isLoggingIn ? 'Logging in…' : 'Yes, log in'}
              </button>
            </div>
          </div>
        )}

        {/* Dismiss for non-interactive results */}
        {!isNewClockIn && !isExemptWithLogin && (
          <button onClick={dismiss}
            className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg">
            Dismiss
          </button>
        )}

        {/* Done button — for fresh clock-ins where no login is possible */}
        {isNewClockIn && !scanResult.canLogin && (
          <button onClick={async () => {
            // Auto-capture and save attendance photo
            if (cameraActive) capturePhoto()
            if (canvasRef.current && canvasRef.current.width > 0) {
              const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8)
              if (dataUrl && dataUrl !== 'data:,' && scanResult?.attendanceId) {
                try {
                  const blob = await (await fetch(dataUrl)).blob()
                  const fd = new FormData()
                  fd.append('files', blob, 'clock-in.jpg')
                  fd.append('expiresInDays', '60')
                  const upRes = await fetch('/api/universal/images', { method: 'POST', body: fd })
                  const upData = await upRes.json()
                  const url = upData.data?.[0]?.url
                  if (url) {
                    fetch(`/api/clock-in/attendance/${scanResult.attendanceId}/photo`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clockInPhotoUrl: url }),
                    }).catch(() => {})
                  }
                } catch { /* non-fatal */ }
              }
            }
            dismiss()
          }}
            className="w-full py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            Done
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={scanState === 'result' && !cameraActive ? dismiss : undefined}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full mx-4"
        onClick={(e) => e.stopPropagation()}>
        {body}
      </div>
    </div>
  )
}
