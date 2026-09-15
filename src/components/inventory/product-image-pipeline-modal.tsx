'use client'

import { useRef, useState } from 'react'
import { useIsMobileDevice } from '@/hooks/use-is-mobile-device'
import { ProductPhotoCamera } from './product-photo-camera'
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

type Step = 'source' | 'camera' | 'crop' | 'background' | 'finalizing'

const MAX_DIMENSION = 1600
const THUMBNAIL_DIMENSION = 320

/**
 * MBM-297 Phase C — the shared crop → background-removal → review pipeline,
 * used identically whether the source image came from the camera or an
 * uploaded file (plan §6.4). Nothing is saved until the final review step
 * in `BackgroundRemovalStep` is confirmed; this component only ever hands
 * the caller a finished, already-resized blob pair (full + thumbnail) plus
 * the metadata `POST /api/universal/images` needs to record the pipeline
 * fields on the `Images` row.
 */
export function ProductImagePipelineModal({ onComplete, onCancel }: Props) {
  const isMobile = useIsMobileDevice()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('source')
  const [sourceType, setSourceType] = useState<ProductImagePipelineResult['sourceType']>('DESKTOP_UPLOAD')
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)

  function pickFile() {
    setSourceType(isMobile ? 'MOBILE_UPLOAD' : 'DESKTOP_UPLOAD')
    fileInputRef.current?.click()
  }

  function handleFileSelected(file: File) {
    setRawImageSrc(URL.createObjectURL(file))
    setStep('crop')
  }

  function handleCameraCapture(blob: Blob) {
    setSourceType('MOBILE_CAMERA')
    setRawImageSrc(URL.createObjectURL(blob))
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
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = '' }}
      />

      {step === 'source' && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4" onClick={onCancel}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Add Product Photo</h2>
            <div className="flex flex-col gap-2">
              {isMobile && (
                <button
                  onClick={() => setStep('camera')}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <p className="font-semibold text-gray-900 dark:text-white">📷 Take Photo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Use your camera</p>
                </button>
              )}
              <button
                onClick={pickFile}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <p className="font-semibold text-gray-900 dark:text-white">⬆️ Upload From Device</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Choose an existing photo</p>
              </button>
            </div>
            <button onClick={onCancel} className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'camera' && (
        <ProductPhotoCamera onCapture={handleCameraCapture} onClose={() => setStep('source')} />
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
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center">
          <div className="text-white text-sm">Preparing image…</div>
        </div>
      )}
    </>
  )
}
