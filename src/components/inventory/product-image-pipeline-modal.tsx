'use client'

import { useState } from 'react'
import { useIsMobileDevice } from '@/hooks/use-is-mobile-device'
import { ImageCropStep } from './image-crop-step'
import { BackgroundRemovalStep } from './background-removal-step'
import { hashBlob, resizeImageBlob } from '@/lib/inventory/crop-image'

export interface ProductImagePipelineResult {
  blob: Blob
  thumbnailBlob: Blob
  sourceType: 'DESKTOP_UPLOAD' | 'MOBILE_UPLOAD' | 'MOBILE_CAMERA'
  backgroundProcessingStatus: 'PROCESSED' | 'KEPT_ORIGINAL'
  contentHash: string
}

interface Props {
  onComplete: (result: ProductImagePipelineResult) => void
  onCancel: () => void
}

type Step = 'source' | 'crop' | 'background' | 'finalizing'

const MAX_DIMENSION = 1600
const THUMBNAIL_DIMENSION = 320

/**
 * MBM-298 (2026-09-19): the long-standing "Next never registers a click" bug
 * is fixed — root cause was this component rendering as a sibling of
 * `ImageUploadDialog`'s propagation-stopping `.card` wrapper rather than
 * inside it, so any click here (including "Next") bubbled up to the
 * dialog's own backdrop `onClick={onClose}` and silently closed the whole
 * dialog mid-async-step. Fixed with the `stopPropagation` wrapper below.
 * `@imgly/background-removal` itself still routinely times out on real
 * mobile devices even with crossOriginIsolated headers enabled (falls back
 * to single-threaded WASM, or is just slow) — shelved for a follow-up
 * ticket; the graceful "Keep Cropped Original" fallback (`BackgroundRemovalStep`)
 * covers this today.
 *
 * MBM-297 Phase C — the shared crop → background-removal → review pipeline,
 * used identically whether the source image came from the camera or an
 * uploaded file (plan §6.4). Nothing is saved until the final review step
 * in `BackgroundRemovalStep` is confirmed; this component only ever hands
 * the caller a finished, already-resized blob pair (full + thumbnail) plus
 * the metadata `POST /api/universal/images` needs to record the pipeline
 * fields on the `Images` row.
 *
 * "Take Photo" uses the device's own native camera app via `<input
 * capture>` rather than an in-page `getUserMedia` live preview — the
 * original implementation (a custom `ProductPhotoCamera` overlay) shot
 * back to the underlying edit screen with no photo captured on a real
 * phone, most likely the live video preview getting killed under mobile
 * memory pressure.
 *
 * The trigger is a `<label>` wrapping its `<input>` directly rather than a
 * button that calls `inputRef.current.click()` — the first version used a
 * ref-click, which returned from the native camera with no `change` event
 * ever firing on at least one real device (the app was left looking
 * exactly as it did before "Take Photo" was tapped, meaning the click
 * never reopened, or React's listener never saw it). A label's native
 * click-to-open-picker association doesn't go through JS at all, which is
 * the same pattern this app's own plain "quick, no crop" upload button
 * already uses successfully elsewhere in `ImageUploadDialog`.
 */
export function ProductImagePipelineModal({ onComplete, onCancel }: Props) {
  const isMobile = useIsMobileDevice()
  const [step, setStep] = useState<Step>('source')
  const [sourceType, setSourceType] = useState<ProductImagePipelineResult['sourceType']>('DESKTOP_UPLOAD')
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)

  function handleFileSelected(file: File) {
    setRawImageSrc(URL.createObjectURL(file))
    setStep('crop')
  }

  function handleCropped(blob: Blob) {
    setCroppedBlob(blob)
    setStep('background')
  }

  async function finalize(finalBlob: Blob, processed: boolean) {
    setStep('finalizing')
    try {
      const [resized, thumbnail, contentHash] = await Promise.all([
        resizeImageBlob(finalBlob, MAX_DIMENSION),
        resizeImageBlob(finalBlob, THUMBNAIL_DIMENSION, 0.8),
        hashBlob(finalBlob),
      ])
      onComplete({
        blob: resized,
        thumbnailBlob: thumbnail,
        sourceType,
        backgroundProcessingStatus: processed ? 'PROCESSED' : 'KEPT_ORIGINAL',
        contentHash,
      })
    } catch {
      // Resize/hash failing shouldn't lose the user's work — fall back to
      // uploading the unresized image with no dedupe hash.
      onComplete({
        blob: finalBlob,
        thumbnailBlob: finalBlob,
        sourceType,
        backgroundProcessingStatus: processed ? 'PROCESSED' : 'KEPT_ORIGINAL',
        contentHash: '',
      })
    }
  }

  return (
    // Stops every click inside this pipeline (including the crop step's
    // "Next" button) from bubbling up to ImageUploadDialog's own backdrop
    // div, which closes the whole dialog on any click reaching it
    // (`onClick={onClose}`) — this component renders as a sibling of that
    // backdrop's own click-stopping `.card` wrapper, not inside it, so
    // without this it silently closes the entire dialog out from under an
    // in-progress async step (MBM-298, the root cause of "Next" appearing
    // to do nothing).
    <div onClick={e => e.stopPropagation()}>
      {step === 'source' && (
        <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Add Product Photo</h2>
            <div className="flex flex-col gap-2">
              {isMobile && (
                <label className="block w-full text-left px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                  <p className="font-semibold text-gray-900 dark:text-white">📷 Take Photo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use your camera</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) { setSourceType('MOBILE_CAMERA'); handleFileSelected(f) }
                      e.target.value = ''
                    }}
                  />
                </label>
              )}
              <label className="block w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                <p className="font-semibold text-gray-900 dark:text-white">⬆️ Upload From Device</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Choose an existing photo</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setSourceType(isMobile ? 'MOBILE_UPLOAD' : 'DESKTOP_UPLOAD'); handleFileSelected(f) }
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
            <button onClick={onCancel} className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'crop' && rawImageSrc && (
        <ImageCropStep imageSrc={rawImageSrc} onCropped={handleCropped} onCancel={onCancel} />
      )}

      {step === 'background' && croppedBlob && (
        <BackgroundRemovalStep
          imageBlob={croppedBlob}
          onDone={({ blob, processed }) => finalize(blob, processed)}
          onCancel={onCancel}
        />
      )}

      {step === 'finalizing' && (
        <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center">
          <div className="text-white text-sm">Preparing image…</div>
        </div>
      )}
    </div>
  )
}
