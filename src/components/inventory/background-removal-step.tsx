'use client'

import { useEffect, useState } from 'react'

interface Props {
  imageBlob: Blob
  onDone: (result: { blob: Blob; processed: boolean }) => void
  onCancel: () => void
}

/**
 * MBM-297 Phase C — runs `@imgly/background-removal` (client-side WASM, no
 * server upload) on the cropped image and shows the result for review
 * before anything is saved. The model assets download from IMG.LY's CDN on
 * first use in a session and are cached by the browser after that, so the
 * first run in a while can take several seconds — later ones are faster.
 */
export function BackgroundRemovalStep({ imageBlob, onDone, onCancel }: Props) {
  const [status, setStatus] = useState<'processing' | 'done' | 'failed'>('processing')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const originalUrl = URL.createObjectURL(imageBlob)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const { removeBackground } = await import('@imgly/background-removal')
        const blob = await removeBackground(imageBlob)
        if (cancelled) return
        setResultBlob(blob)
        setResultUrl(URL.createObjectURL(blob))
        setStatus('done')
      } catch {
        if (!cancelled) setStatus('failed')
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => {
    URL.revokeObjectURL(originalUrl)
    if (resultUrl) URL.revokeObjectURL(resultUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function keepOriginal() {
    onDone({ blob: imageBlob, processed: false })
  }

  function useProcessed() {
    if (resultBlob) onDone({ blob: resultBlob, processed: true })
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Remove Background</span>
        <button onClick={onCancel} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {status === 'processing' && (
          <div className="text-center text-white/80 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto" />
            <p className="text-sm">Removing background — this can take a moment the first time…</p>
          </div>
        )}
        {status === 'failed' && (
          <div className="text-center text-white/80 space-y-4 max-w-xs">
            <p className="text-sm">Background removal didn&apos;t work on this image. You can still keep the cropped photo as-is.</p>
            <button onClick={keepOriginal} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
              Keep Cropped Original
            </button>
          </div>
        )}
        {status === 'done' && resultUrl && (
          <div className="w-full max-w-sm space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-white/60 text-xs mb-1 text-center">Original</p>
                <div className="aspect-square rounded-lg overflow-hidden bg-white/10">
                  <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
                </div>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1 text-center">Background removed</p>
                <div
                  className="aspect-square rounded-lg overflow-hidden"
                  style={{ backgroundImage: 'repeating-conic-gradient(#666 0% 25%, #444 0% 50%)', backgroundSize: '16px 16px' }}
                >
                  <img src={resultUrl} alt="Background removed" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {status === 'done' && (
        <div className="p-4 flex items-center gap-3">
          <button onClick={keepOriginal} className="flex-1 py-2 rounded-lg border border-white/30 text-white text-sm font-medium">
            Keep Original
          </button>
          <button onClick={useProcessed} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">
            Use This
          </button>
        </div>
      )}
    </div>
  )
}
