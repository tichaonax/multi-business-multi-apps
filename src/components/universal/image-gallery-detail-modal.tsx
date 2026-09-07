'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { ProductAttachSearch } from '@/components/universal/product-attach-search'
import { ProductTagPicker } from '@/components/universal/product-tag-picker'
import { LinkedProductsList, LinkedProduct } from '@/components/universal/linked-products-list'

interface LinkedItem extends LinkedProduct {
  stockStatus: 'in' | 'low' | 'out'
}

interface ImageDetail {
  id: string
  url: string
  mimeType: string
  size: number
  createdAt: string
  uploaderName: string | null
  tags: Array<{ id: string; name: string; emoji?: string }>
}

interface Props {
  businessId: string
  businessType: string
  imageId: string
  /** Called on close; `changed` is true if anything the gallery grid shows
   * (tags, linked-item count/stock) may be stale and worth refetching. */
  onClose: (changed: boolean) => void
}

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

export function ImageGalleryDetailModal({ businessId, businessType, imageId, onClose }: Props) {
  const toast = useToastContext()
  const [image, setImage] = useState<ImageDetail | null>(null)
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [changed, setChanged] = useState(false)
  const [busyTagAction, setBusyTagAction] = useState(false)
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/business/${businessId}/images/${imageId}`)
      if (!res.ok) throw new Error('Failed to load image')
      const data = await res.json()
      setImage(data.image)
      setLinkedItems(data.linkedItems)
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to load image')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [imageId])

  // Diffs against the currently-loaded tags and persists each add/remove via
  // the existing per-tag endpoints — ProductTagPicker itself is purely
  // presentational (search + multi-select over the shared tag vocabulary,
  // MBM-295) and doesn't know how to attach to anything on its own.
  async function handleTagsChange(names: string[]) {
    if (!image) return
    const currentNames = image.tags.map(t => t.name)
    const added = names.filter(n => !currentNames.includes(n))
    const removed = image.tags.filter(t => !names.includes(t.name))
    setBusyTagAction(true)
    try {
      for (const name of added) {
        const res = await fetch(`/api/business/${businessId}/images/${imageId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to add tag') }
      }
      for (const t of removed) {
        const res = await fetch(`/api/business/${businessId}/images/${imageId}/tags/${t.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed to remove tag')
      }
      setChanged(true)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to update tags')
    } finally {
      setBusyTagAction(false)
    }
  }

  async function handleSetPrimary(item: LinkedItem) {
    setBusyLinkId(item.productImageId)
    try {
      const res = await fetch(`/api/universal/products/${item.productId}/images/${item.productImageId}/primary`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to set primary image')
      setChanged(true)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to set primary image')
    } finally {
      setBusyLinkId(null)
    }
  }

  async function handleRemoveLink(item: LinkedItem) {
    setBusyLinkId(item.productImageId)
    try {
      const res = await fetch(`/api/universal/products/${item.productId}/images`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: item.productImageId }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? 'Failed to remove') }
      setChanged(true)
      await load()
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to remove image from product')
    } finally {
      setBusyLinkId(null)
    }
  }

  async function handleCopyImage() {
    if (!image) return
    setCopying(true)
    try {
      const res = await fetch(image.url)
      if (!res.ok) throw new Error('Failed to load image')
      const blob = await res.blob()
      const pngBlob = await toPngBlob(blob)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      toast.push('Image copied — paste it while creating a new product')
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to copy image')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onClose(changed)}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">Image Detail</h3>
          <button onClick={() => onClose(changed)} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        {loading || !image ? (
          <p className="text-center text-secondary py-8">Loading…</p>
        ) : (
          <>
            <div className="w-full aspect-video rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
              <img src={image.url} alt="" className="max-w-full max-h-full object-contain" />
            </div>

            <div className="flex items-center justify-between text-xs text-secondary">
              <span>{image.uploaderName ? `Uploaded by ${image.uploaderName}` : 'System/imported'} · {new Date(image.createdAt).toLocaleDateString()}</span>
              <button
                onClick={handleCopyImage}
                disabled={copying}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {copying ? 'Copying…' : '📋 Copy Image'}
              </button>
            </div>

            <div>
              <p className="text-xs font-medium text-secondary mb-1">Tags</p>
              <ProductTagPicker
                businessId={businessId}
                value={image.tags.map(t => t.name)}
                onChange={handleTagsChange}
              />
              {busyTagAction && <p className="text-xs text-secondary mt-1">Saving…</p>}
            </div>

            <div>
              <p className="text-xs font-medium text-secondary mb-2">Linked inventory items ({linkedItems.length})</p>
              <LinkedProductsList
                businessId={businessId}
                businessType={businessType}
                items={linkedItems}
                imageUrl={image.url}
                showManageActions
                onSetPrimary={handleSetPrimary}
                onRemove={handleRemoveLink}
                busyProductImageId={busyLinkId}
                onItemChanged={() => { setChanged(true); load() }}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-secondary mb-1">Add this image to another product</p>
              <ProductAttachSearch
                businessId={businessId}
                imageId={imageId}
                onAttached={() => { setChanged(true); load() }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
