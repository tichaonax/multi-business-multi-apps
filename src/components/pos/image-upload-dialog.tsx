'use client'

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { useClipboardImagePaste } from '@/hooks/use-clipboard-image-paste'

export type QuickEditSourceTable = 'BUSINESS_PRODUCT' | 'BARCODE_ITEM'

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
export function ImageUploadDialog({ businessId, itemId, itemName, sourceTable, currentImageUrl, onClose, onSaved }: Props) {
  const toast = useToastContext()
  const [uploading, setUploading] = useState(false)

  useClipboardImagePaste(handleFile, !uploading)

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

        <label className="block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer">
          {uploading ? 'Uploading…' : currentImageUrl ? 'Replace Image' : 'Upload Image'}
          <input
            type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
          />
        </label>
        <p className="text-xs text-center text-secondary">or paste an image from your clipboard (Ctrl+V)</p>

        <button onClick={onClose} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Cancel
        </button>
      </div>
    </div>
  )
}
