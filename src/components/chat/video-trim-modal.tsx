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
 * rejected outright — re-records just the selected [start, end) window via
 * HTMLVideoElement.captureStream() + MediaRecorder (no server round-trip,
 * no ffmpeg/WASM dependency), producing a video/webm clip, one of the
 * already-supported chat video types. The size shown before trimming is an
 * estimate (proportional to the selected fraction of the original) since
 * the real output size depends on re-encoding and isn't known until after;
 * the actual trimmed file is re-checked against the cap before accepting it. */
export function VideoTrimModal({ file, onCancel, onTrimmed }: VideoTrimModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [objectUrl] = useState(() => URL.createObjectURL(file))
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [trimming, setTrimming] = useState(false)
  const [trimProgress, setTrimProgress] = useState(0)
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
    const v = videoRef.current
    if (!v) return
    if (typeof (v as any).captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setError('Video trimming isn\'t supported in this app version — try a shorter clip exported elsewhere instead.')
      return
    }
    setError(null)
    setTrimming(true)
    setTrimProgress(0)
    const wasMuted = v.muted
    try {
      const stream: MediaStream = (v as any).captureStream()
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })

      v.muted = true // capture still records audio; this just silences local playback while trimming
      v.currentTime = start
      await new Promise<void>((resolve) => {
        const onSeeked = () => { v.removeEventListener('seeked', onSeeked); resolve() }
        v.addEventListener('seeked', onSeeked)
      })

      recorder.start()
      await v.play()

      const watch = () => {
        if (!v) return
        setTrimProgress(Math.min(1, (v.currentTime - start) / Math.max(0.01, end - start)))
        if (v.currentTime >= end || v.paused) {
          if (recorder.state !== 'inactive') recorder.stop()
          v.pause()
          return
        }
        requestAnimationFrame(watch)
      }
      requestAnimationFrame(watch)

      await stopped
      const blob = new Blob(chunks, { type: 'video/webm' })
      if (blob.size > MAX_VIDEO_ATTACHMENT_SIZE) {
        setError(`Trimmed clip is still ${fmtMB(blob.size)} — select a shorter section and try again.`)
        setTrimming(false)
        return
      }
      const trimmedName = file.name.replace(/\.[^./]+$/, '') + '-trimmed.webm'
      onTrimmed(new File([blob], trimmedName, { type: 'video/webm' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trim video')
      setTrimming(false)
    } finally {
      v.muted = wasMuted
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
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round(trimProgress * 100)}%` }} />
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
