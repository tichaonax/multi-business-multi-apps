'use client'

import { useEffect, useRef, useState } from 'react'
import { MAX_VIDEO_ATTACHMENT_SIZE } from './chat-attachments'

interface VideoTrimModalProps {
  file: File
  onCancel: () => void
  onTrimmed: (file: File) => void
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/** A video over the 25MB chat-attachment cap routes here instead of being
 * rejected outright — the selected [start, end) window is cut server-side
 * via ffmpeg (POST /api/chat/attachments/trim-video), returning a video/mp4
 * clip. An earlier version did this entirely client-side via
 * HTMLVideoElement.captureStream() + MediaRecorder, but that proved
 * unreliable — it could silently produce a genuinely empty (0-byte) output
 * with no clear browser-side cause, so it was replaced with this
 * server-side approach, which is deterministic regardless of
 * browser/Electron quirks. The size shown before trimming is an estimate
 * (proportional to the selected fraction of the original) since the real
 * output size depends on re-encoding and isn't known until the server
 * responds; the actual trimmed file is re-checked against the cap on the
 * server before it's ever returned to the client. */
export function VideoTrimModal({ file, onCancel, onTrimmed }: VideoTrimModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [objectUrl] = useState(() => URL.createObjectURL(file))
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [trimming, setTrimming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl])

  function onLoadedMetadata() {
    const d = videoRef.current?.duration ?? 0
    setDuration(d)
    setEnd(d)
  }

  const selectedDuration = Math.max(0, end - start)
  const estimatedSize = duration > 0 ? (file.size * selectedDuration) / duration : file.size
  const overEstimate = estimatedSize > MAX_VIDEO_ATTACHMENT_SIZE

  function handleStartChange(v: number) {
    const clamped = Math.min(v, end - 0.5)
    setStart(clamped)
    if (videoRef.current) videoRef.current.currentTime = clamped
  }
  function handleEndChange(v: number) {
    setEnd(Math.max(v, start + 0.5))
  }

  function previewSelection() {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    v.currentTime = start
    v.play().catch(() => {})
    setPreviewing(true)
    const check = () => {
      if (!v || v.paused) { setPreviewing(false); return }
      if (v.currentTime >= end) {
        v.pause()
        setPreviewing(false)
        return
      }
      requestAnimationFrame(check)
    }
    requestAnimationFrame(check)
  }

  async function acceptTrim() {
    setError(null)
    setTrimming(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('start', String(start))
      formData.append('end', String(end))
      const res = await fetch('/api/chat/attachments/trim-video', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error || 'Failed to trim video')
        setTrimming(false)
        return
      }
      const blob = await res.blob()
      if (blob.size < 1024) {
        setError('Trimming produced an empty clip — try a different section.')
        setTrimming(false)
        return
      }
      const trimmedName = file.name.replace(/\.[^./]+$/, '') + '-trimmed.mp4'
      onTrimmed(new File([blob], trimmedName, { type: 'video/mp4' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trim video')
      setTrimming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">✂️ Trim Video</h3>
          <button type="button" onClick={onCancel} className="text-secondary hover:text-primary" disabled={trimming} title="Cancel">✕</button>
        </div>
        <p className="text-xs text-secondary">
          &ldquo;{file.name}&rdquo; is {fmtMB(file.size)} — over the 25MB video limit. Drag the handles below to select the section you want to send.
        </p>
        <video
          ref={videoRef}
          src={objectUrl}
          onLoadedMetadata={onLoadedMetadata}
          className="w-full rounded-lg bg-black max-h-56"
          playsInline
        />
        {duration > 0 && (
          <>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-secondary">Start — {fmtTime(start)}</label>
                <input
                  type="range" min={0} max={duration} step={0.1} value={start}
                  onChange={e => handleStartChange(parseFloat(e.target.value))}
                  className="w-full" disabled={trimming}
                />
              </div>
              <div>
                <label className="text-[10px] text-secondary">End — {fmtTime(end)}</label>
                <input
                  type="range" min={0} max={duration} step={0.1} value={end}
                  onChange={e => handleEndChange(parseFloat(e.target.value))}
                  className="w-full" disabled={trimming}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-secondary">Selected: {fmtTime(selectedDuration)}</span>
              <span className={overEstimate ? 'text-red-500 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}>
                ~{fmtMB(estimatedSize)} estimated
              </span>
            </div>
            {overEstimate && (
              <p className="text-[10px] text-red-500">Still estimated over 25MB — shorten the selection further.</p>
            )}
            {error && <p className="text-[10px] text-red-500">{error}</p>}
            {trimming && (
              <div className="flex items-center gap-2 text-[11px] text-secondary">
                <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
                Processing on the server — this can take a few seconds for longer clips…
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1 flex-wrap">
              <button type="button" onClick={previewSelection} disabled={previewing || trimming} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">
                {previewing ? 'Playing…' : '▶ Preview selection'}
              </button>
              <button type="button" onClick={onCancel} disabled={trimming} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-50">Cancel</button>
              <button
                type="button"
                onClick={acceptTrim}
                disabled={overEstimate || trimming || selectedDuration < 0.5}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
              >
                {trimming ? 'Trimming…' : 'Use Trimmed Video'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
