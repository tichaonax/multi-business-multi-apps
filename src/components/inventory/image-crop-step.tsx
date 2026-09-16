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
 * ⚠ STATUS (2026-09-17): this is the step where the still-unresolved "Next"
 * button bug lives — see the status note atop `ProductImagePipelineModal`
 * for the full history of what's been tried. The whole pipeline is
 * currently disabled at the entry point (`ImageUploadDialog`'s
 * `SHOW_CROP_PIPELINE = false`) until that's debugged with a screen
 * recording.
 *
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
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function reset() {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
  }

  async function confirm() {
    if (!croppedAreaPixels) {
      // Should be unreachable now that the crop area has a guaranteed
      // minimum height (see the container below), but this still must
      // never be a silent no-op — every tap gets a visible response.
      setError('Still preparing the crop — wait a moment and try again.')
      return
    }
    setProcessing(true)
    setError(null)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation)
      onCropped(blob)
    } catch (e: any) {
      // A silent failure here previously looked like "nothing happened,
      // back to the app" — always surface it instead, so a real problem is
      // visible rather than indistinguishable from the button doing nothing.
      setError(e?.message || 'Could not process this photo. Try again, or use a different photo.')
      setProcessing(false)
    }
  }

  return (
    // `overflow-y-auto` + `shrink-0` on the header/footer + a `min-h` floor
    // on the crop area (below) are all defensive against the same failure:
    // on a short mobile viewport, `flex-1` with no floor can compute to a
    // near-zero height once the header and all the footer controls (zoom,
    // rotate, square toggle, buttons) are accounted for. `react-easy-crop`
    // measures its container to lay out the crop rectangle — a
    // near-zero-height container means it never gets a usable crop region,
    // which looks exactly like the reported bug: no visible crop grid, and
    // "Next" staying permanently disabled (it never receives a valid
    // region to work with, so tapping it does nothing at all). If the
    // floor ever does push total content past the viewport, scrolling is
    // now possible instead of the controls being unreachable.
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
        <span className="text-sm font-medium">Crop Photo</span>
        <button onClick={onCancel} className="text-white/80 hover:text-white text-lg leading-none">✕</button>
      </div>

      <div className="flex-1 relative min-h-[45vh]">
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

      <div className="p-4 space-y-3 bg-black shrink-0">
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
        {error && (
          <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-white/30 text-white text-sm font-medium">
            Cancel
          </button>
          <button onClick={confirm} disabled={processing}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-50">
            {processing ? 'Processing…' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
