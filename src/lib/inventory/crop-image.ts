export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

// A modern phone camera photo is routinely 3000-4000px+ on its long side.
// The naive version of this function always allocated a full-resolution
// "rotation buffer" canvas *in addition to* the crop output canvas, even
// for the common case of no rotation at all — on a memory-constrained
// mobile browser, two full-size canvases for one photo is a realistic way
// to exceed the tab's memory budget and have the browser silently kill it,
// which looks exactly like "nothing happened" from the user's side (no
// error, no crop, back to wherever they started). Downscaling the working
// image first, and skipping the rotation buffer entirely when there's no
// rotation to apply, keeps memory use proportional to what the output
// actually needs instead of the sensor's full resolution.
const MAX_WORKING_DIMENSION = 3000

/**
 * MBM-297 Phase C — applies a `react-easy-crop` crop region (plus optional
 * rotation) to the source image and returns the result as a JPEG blob.
 * `react-easy-crop` only reports the crop rectangle/rotation; it never
 * touches pixels itself, so turning that into an actual image is always a
 * canvas step the caller has to do.
 */
export async function getCroppedImageBlob(
  imageSrc: string,
  cropPixels: PixelCrop,
  rotationDeg = 0,
): Promise<Blob> {
  const rawImage = await loadImage(imageSrc)

  // Downscale an oversized source once, up front, before any crop math —
  // `cropPixels` from react-easy-crop is already in the *displayed* image's
  // coordinate space, so it must be scaled down by the same factor.
  const workingScale = Math.min(1, MAX_WORKING_DIMENSION / Math.max(rawImage.width, rawImage.height))
  let image: HTMLImageElement | HTMLCanvasElement = rawImage
  let scaledCrop = cropPixels
  if (workingScale < 1) {
    const scaledCanvas = document.createElement('canvas')
    scaledCanvas.width = Math.round(rawImage.width * workingScale)
    scaledCanvas.height = Math.round(rawImage.height * workingScale)
    const scaledCtx = scaledCanvas.getContext('2d')
    if (!scaledCtx) throw new Error('Canvas not supported')
    scaledCtx.drawImage(rawImage, 0, 0, scaledCanvas.width, scaledCanvas.height)
    image = scaledCanvas
    scaledCrop = {
      x: cropPixels.x * workingScale,
      y: cropPixels.y * workingScale,
      width: cropPixels.width * workingScale,
      height: cropPixels.height * workingScale,
    }
  }

  const rotRad = (rotationDeg * Math.PI) / 180
  const outCanvas = document.createElement('canvas')
  outCanvas.width = scaledCrop.width
  outCanvas.height = scaledCrop.height
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) throw new Error('Canvas not supported')

  if (rotationDeg === 0) {
    // The common case — no extra rotation buffer needed at all.
    outCtx.drawImage(
      image,
      scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height,
      0, 0, scaledCrop.width, scaledCrop.height,
    )
  } else {
    // Rotation needs an intermediate canvas sized to the rotated bounding
    // box — only allocated when actually rotating, and already working
    // from the downscaled image above rather than the original.
    const sin = Math.abs(Math.sin(rotRad))
    const cos = Math.abs(Math.cos(rotRad))
    const boundingWidth = image.width * cos + image.height * sin
    const boundingHeight = image.width * sin + image.height * cos

    const rotateCanvas = document.createElement('canvas')
    rotateCanvas.width = boundingWidth
    rotateCanvas.height = boundingHeight
    const rotateCtx = rotateCanvas.getContext('2d')
    if (!rotateCtx) throw new Error('Canvas not supported')
    rotateCtx.translate(boundingWidth / 2, boundingHeight / 2)
    rotateCtx.rotate(rotRad)
    rotateCtx.drawImage(image, -image.width / 2, -image.height / 2)

    outCtx.drawImage(
      rotateCanvas,
      scaledCrop.x, scaledCrop.y, scaledCrop.width, scaledCrop.height,
      0, 0, scaledCrop.width, scaledCrop.height,
    )
  }

  return new Promise((resolve, reject) => {
    outCanvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Failed to export cropped image'))), 'image/jpeg', 0.92)
  })
}

/** Resizes an image blob down to fit within `maxDim` on its longest side (never upscales), re-encoding as JPEG. */
export async function resizeImageBlob(blob: Blob, maxDim: number, quality = 0.85): Promise<Blob> {
  const src = URL.createObjectURL(blob)
  try {
    const image = await loadImage(src)
    const scale = Math.min(1, maxDim / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale)
    canvas.height = Math.round(image.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to export resized image'))), 'image/jpeg', quality)
    })
  } finally {
    URL.revokeObjectURL(src)
  }
}

/** SHA-256 of a blob's bytes, hex-encoded — used client-side for exact-duplicate detection before upload. */
export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}
