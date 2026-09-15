export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

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
  const image = await loadImage(imageSrc)
  const rotRad = (rotationDeg * Math.PI) / 180

  // Draw onto a rotation-safe canvas first (sized to fit the rotated
  // bounding box), then crop the requested rectangle out of that.
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

  const outCanvas = document.createElement('canvas')
  outCanvas.width = cropPixels.width
  outCanvas.height = cropPixels.height
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) throw new Error('Canvas not supported')
  outCtx.drawImage(
    rotateCanvas,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height,
  )

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
