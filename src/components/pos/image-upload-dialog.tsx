'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useClipboardImagePaste } from '@/hooks/use-clipboard-image-paste'

export type QuickEditSourceTable = 'BUSINESS_PRODUCT' | 'BARCODE_ITEM'

function toPngBlob(source: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url)
        if (blob) resolve(blob)
        else reject(new Error('Failed to convert image'))
      }, 'image/png')
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}

interface Props {
  businessId: string
  /** Raw (unprefixed) id of the item — same id the item's own table uses as its PK. */
  itemId: string
  itemName: string
  sourceTable: QuickEditSourceTable
  currentImageUrl: string | null
  onClose: () => void
  onSaved: (newImageUrl: string) => void
}

/**
 * Shared Image Upload Mode dialog (MBM-290). Resolves which pair of endpoints to
 * call from `sourceTable` — same two-step upload-then-set-primary flow the Menu
 * Numbers page already uses for BusinessProducts, and the generic image-upload +
 * display-image PATCH flow for BarcodeInventoryItems.
 */
interface GalleryImage {
  id: string
  imageId: string
  url: string
}

export function ImageUploadDialog({ businessId, itemId, itemName, sourceTable, currentImageUrl, onClose, onSaved }: Props) {
  const toast = useToastContext()
  const [uploading, setUploading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [view, setView] = useState<'main' | 'gallery'>('main')
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [galleryTier, setGalleryTier] = useState<'subcategory' | 'category' | 'domain' | null>(null)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set())

  useClipboardImagePaste(handleFile, !uploading && view === 'main')

  async function handleCopyImage() {
    if (!currentImageUrl) return
    setCopying(true)
    try {
      const res = await fetch(currentImageUrl)
      if (!res.ok) throw new Error('Failed to load image')
      const blob = await res.blob()
      // Clipboard image formats aren't universally supported across apps the
      // way PNG is (a raw JPEG blob can silently fail to paste into some
      // targets), so always normalize to PNG via canvas before writing.
      const pngBlob = await toPngBlob(blob)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      toast.push('Image copied to clipboard')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to copy image')
    } finally {
      setCopying(false)
    }
  }

  // Ctrl+C / Cmd+C while this dialog is open copies the current image —
  // mirrors the explicit Copy Image button, the same way Ctrl+V already
  // mirrors the Paste button (via useClipboardImagePaste above). Skipped
  // when there's an actual text selection so a deliberate text copy
  // elsewhere on the page still works normally.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return
      if (!currentImageUrl || uploading || copying) return
      if ((window.getSelection()?.toString().length ?? 0) > 0) return
      e.preventDefault()
      handleCopyImage()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentImageUrl, uploading, copying])

  async function handlePasteButton() {
    setPasting(true)
    try {
      if (!navigator.clipboard?.read) {
        toast.error('Clipboard read is not supported here — use Ctrl+V instead')
        return
      }
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const file = new File([blob], 'pasted-image.png', { type: imageType })
          await handleFile(file)
          return
        }
      }
      toast.error('No image found on clipboard')
    } catch (e: any) {
      toast.error(e.message ?? 'Could not read clipboard — try Ctrl+V instead')
    } finally {
      setPasting(false)
    }
  }

  async function handleFile(file: File) {
    setUploading(true)
    try {
      let newImageUrl: string
      if (sourceTable === 'BUSINESS_PRODUCT') {
        const form = new FormData()
        form.append('files', file)
        const uploadRes = await fetch(`/api/universal/products/${itemId}/images`, { method: 'POST', body: form })
        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({}))
          throw new Error(errBody.error ?? `Upload failed (${uploadRes.status})`)
        }
        const { data } = await uploadRes.json()
        // Highest sortOrder is always the image this request just created (sortOrder
        // is a strictly increasing per-product sequence) — matching by altText/file
        // name is unreliable for pasted images, which browsers usually name
        // identically (e.g. "image.png"), so a same-named earlier upload could shadow it.
        const images = data?.images ?? []
        const newImg = images.length > 0 ? images.reduce((a: any, b: any) => (b.sortOrder > a.sortOrder ? b : a)) : null
        if (!newImg) throw new Error('Upload succeeded but the new image could not be found')
        const primaryRes = await fetch(`/api/universal/products/${itemId}/images/${newImg.id}/primary`, { method: 'POST' })
        if (!primaryRes.ok) throw new Error('Failed to set as primary image')
        newImageUrl = newImg.imageUrl
      } else {
        const form = new FormData()
        form.append('files', file)
        const uploadRes = await fetch('/api/universal/images', { method: 'POST', body: form })
        if (!uploadRes.ok) {
          const errBody = await uploadRes.json().catch(() => ({}))
          throw new Error(errBody.error ?? `Upload failed (${uploadRes.status})`)
        }
        const { data } = await uploadRes.json()
        const newImageId: string = data[0].filename
        const patchRes = await fetch(`/api/grocery/inventory/${itemId}/display-image`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId: newImageId }),
        })
        if (!patchRes.ok) {
          const errBody = await patchRes.json().catch(() => ({}))
          throw new Error(errBody.error ?? `Failed to save image (${patchRes.status})`)
        }
        newImageUrl = `/api/images/${newImageId}`
      }

      fetch('/api/pos/quick-edit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, itemId, sourceTable, field: 'imageUrl',
          oldValue: currentImageUrl, newValue: newImageUrl,
        }),
      }).catch(() => {})

      toast.push('Image updated')
      onSaved(newImageUrl)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update image')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!currentImageUrl) return
    setUploading(true)
    try {
      if (sourceTable === 'BUSINESS_PRODUCT') {
        const res = await fetch(`/api/universal/products/${itemId}/images`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error ?? `Failed to remove image (${res.status})`)
        }
      } else {
        const res = await fetch(`/api/grocery/inventory/${itemId}/display-image`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId: null }),
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error ?? `Failed to remove image (${res.status})`)
        }
      }

      fetch('/api/pos/quick-edit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, itemId, sourceTable, field: 'imageUrl',
          oldValue: currentImageUrl, newValue: null,
        }),
      }).catch(() => {})

      toast.push('Image removed')
      onSaved('')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to remove image')
    } finally {
      setUploading(false)
    }
  }

  async function openGallery() {
    setView('gallery')
    setSelectedImageIds(new Set())
    setGalleryLoading(true)
    try {
      const res = await fetch(`/api/pos/quick-edit/gallery-images?sourceTable=${sourceTable}&itemId=${itemId}`)
      const data = await res.json().catch(() => ({}))
      setGalleryImages(res.ok ? (data.images ?? []) : [])
      setGalleryTier(data.tier ?? null)
    } catch {
      setGalleryImages([])
      setGalleryTier(null)
    } finally {
      setGalleryLoading(false)
    }
  }

  function toggleGallerySelection(imageId: string) {
    setSelectedImageIds(prev => {
      const next = new Set(prev)
      if (next.has(imageId)) next.delete(imageId)
      else next.add(imageId)
      return next
    })
  }

  // BARCODE_ITEM only has one display-image slot — clicking a thumbnail
  // applies it immediately instead of requiring a separate "Add" step.
  async function handleGalleryApplyBarcode(imageId: string, url: string) {
    setUploading(true)
    try {
      const patchRes = await fetch(`/api/grocery/inventory/${itemId}/display-image`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId }),
      })
      if (!patchRes.ok) {
        const errBody = await patchRes.json().catch(() => ({}))
        throw new Error(errBody.error ?? `Failed to save image (${patchRes.status})`)
      }

      fetch('/api/pos/quick-edit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, itemId, sourceTable, field: 'imageUrl',
          oldValue: currentImageUrl, newValue: url,
        }),
      }).catch(() => {})

      toast.push('Image updated')
      onSaved(url)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update image')
    } finally {
      setUploading(false)
    }
  }

  // BUSINESS_PRODUCT supports multiple images per product — the first
  // selection becomes the primary (shown on the POS card), the rest are
  // attached as additional product images.
  async function handleGalleryAttachProduct() {
    if (selectedImageIds.size === 0) return
    setUploading(true)
    try {
      const res = await fetch(`/api/universal/products/${itemId}/images/from-gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: Array.from(selectedImageIds) }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error ?? `Failed to add images (${res.status})`)
      }
      const { primaryImageUrl } = await res.json()

      fetch('/api/pos/quick-edit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId, itemId, sourceTable, field: 'imageUrl',
          oldValue: currentImageUrl, newValue: primaryImageUrl,
        }),
      }).catch(() => {})

      toast.push(selectedImageIds.size > 1 ? 'Images added' : 'Image added')
      onSaved(primaryImageUrl)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to add images')
    } finally {
      setUploading(false)
    }
  }

  if (view === 'gallery') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
        <div className="card w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary truncate">🖼 Choose from Gallery</h3>
            <button onClick={onClose} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
          </div>

          {galleryLoading ? (
            <p className="text-sm text-center text-secondary py-8">Loading…</p>
          ) : galleryImages.length === 0 ? (
            <p className="text-sm text-center text-secondary py-8">
              No gallery images yet for this category — upload one and it'll appear here for reuse.
            </p>
          ) : (
            <>
              {galleryTier && galleryTier !== 'subcategory' && (
                <p className="text-xs text-secondary text-center">
                  Showing images from this item's {galleryTier === 'category' ? 'category' : 'general product area'}.
                </p>
              )}
              <div className="grid grid-cols-4 gap-2 max-h-72 overflow-y-auto">
                {galleryImages.map(img => {
                  const selected = selectedImageIds.has(img.imageId)
                  return (
                    <button
                      key={img.id}
                      type="button"
                      disabled={uploading}
                      onClick={() => sourceTable === 'BUSINESS_PRODUCT'
                        ? toggleGallerySelection(img.imageId)
                        : handleGalleryApplyBarcode(img.imageId, img.url)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 disabled:opacity-50 ${
                        selected ? 'border-blue-600' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      {selected && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {sourceTable === 'BUSINESS_PRODUCT' && galleryImages.length > 0 && (
            <button
              onClick={handleGalleryAttachProduct}
              disabled={selectedImageIds.size === 0 || uploading}
              className="block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {uploading ? 'Adding…' : `Add Selected${selectedImageIds.size > 0 ? ` (${selectedImageIds.size})` : ''}`}
            </button>
          )}

          <button onClick={() => setView('main')} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary truncate">📷 {itemName}</h3>
          <button onClick={onClose} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        <div className="w-full aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
          {currentImageUrl ? (
            <img src={currentImageUrl} alt={itemName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm text-secondary">No image</span>
          )}
        </div>

        {currentImageUrl && (
          <button
            onClick={handleCopyImage}
            disabled={copying || uploading}
            className="block w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
          >
            {copying ? 'Copying…' : '📋 Copy Image to Clipboard'}
          </button>
        )}

        <label className="block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer">
          {uploading ? 'Uploading…' : currentImageUrl ? 'Replace Image' : 'Upload Image'}
          <input
            type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
        </label>

        <button
          onClick={handlePasteButton}
          disabled={pasting || uploading}
          className="block w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
        >
          {pasting ? 'Pasting…' : '📋 Paste Image from Clipboard'}
        </button>
        <p className="text-xs text-center text-secondary">or just press Ctrl+V anywhere in this dialog</p>

        <button
          onClick={openGallery}
          disabled={uploading}
          className="block w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50"
        >
          🖼 Choose from Gallery
        </button>

        {currentImageUrl && (
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="block w-full text-center py-2 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium disabled:opacity-50"
          >
            🗑 Remove Image
          </button>
        )}

        <button onClick={onClose} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
