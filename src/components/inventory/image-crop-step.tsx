'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { getCroppedImageBlob } from '@/lib/inventory/crop-image'

interface Props {
  imageSrc: string
  onCropped: (blob: Blob) => void
  onCancel: () => void
}

/**
 * MBM-297 Phase C — crop/zoom/rotate step of the shared product-image
 * pipeline. 1:1 is the recommended default (product tiles are square
 * everywhere in this app), with a toggle to switch to the image's original
 * aspect ratio for cases where a full-frame shot is wanted as-is.
 */
export function ImageCropStep({ imageSrc, onCropped, onCancel }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [square, setSquare] = useState(true)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function reset() {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }

  async function confirm() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation)
      onCropped(blob)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Crop Photo</span>
        <button onClick={onCancel} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
      </div>

      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={square ? 1 : undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="p-4 space-y-3 bg-black">
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-xs w-12">Zoom</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="flex-1" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-xs w-12">Rotate</span>
          <input type="range" min={-180} max={180} step={1} value={rotation}
            onChange={e => setRotation(Number(e.target.value))}
            className="flex-1" />
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-white/80 text-xs">
            <input type="checkbox" checked={square} onChange={e => setSquare(e.target.checked)} />
            Square (1:1) — recommended
          </label>
          <button onClick={reset} className="text-xs text-white/60 hover:text-white underline">Reset</button>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-white/30 text-white text-sm font-medium">
            Cancel
          </button>
          <button onClick={confirm} disabled={processing || !croppedAreaPixels}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50">
            {processing ? 'Processing…' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
