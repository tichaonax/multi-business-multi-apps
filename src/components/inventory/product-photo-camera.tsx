'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  onCapture: (blob: Blob) => void
  onClose: () => void
}

/**
 * MBM-297 Phase C — rear-camera capture for a product photo. Adapted from
 * the getUserMedia + canvas-snapshot pattern in
 * `src/components/clock-in/card-scan-overlay.tsx` (built for front-camera
 * face capture at clock-in); this switches to `facingMode: 'environment'`
 * and adds a retake step, since a product shot — unlike an identity photo
 * — is worth letting the user review before committing.
 */
export function ProductPhotoCamera({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setReady(true)
      } catch {
        if (!cancelled) setError('Could not access the camera — check permissions, or upload a photo from your device instead.')
      }
    }
    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  function snap() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.92))
  }

  function retake() {
    setCaptured(null)
  }

  function confirm() {
    if (!canvasRef.current) return
    canvasRef.current.toBlob(blob => { if (blob) onCapture(blob) }, 'image/jpeg', 0.92)
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Take Product Photo</span>
        <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white/80 text-sm text-center px-8">{error}</p>
        ) : captured ? (
          <img src={captured} alt="Captured" className="max-w-full max-h-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="max-w-full max-h-full object-contain" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-4 flex items-center justify-center gap-4">
        {error ? (
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium">
            Close
          </button>
        ) : captured ? (
          <>
            <button onClick={retake} className="px-4 py-2 rounded-lg border border-white/40 text-white text-sm font-medium">
              Retake
            </button>
            <button onClick={confirm} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
              Use Photo
            </button>
          </>
        ) : (
          <button
            onClick={snap}
            disabled={!ready}
            title="Take photo"
            className="w-16 h-16 rounded-full bg-white border-4 border-white/40 disabled:opacity-40"
          />
        )}
      </div>
    </div>
  )
}
