'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useToast } from '@/components/ui/use-toast'

interface AssetPhoto {
  id: string
  imageId: string
  isPrimary: boolean
  sortOrder: number
  url: string
  createdAt: string
}

interface Props {
  assetId: string
  canManageAssets: boolean
}

export default function AssetPhotosTab({ assetId, canManageAssets }: Props) {
  const { push: showToast, error: showError } = useToast()
  const [photos, setPhotos] = useState<AssetPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assets/${assetId}/images`, { credentials: 'include' })
      const json = await res.json()
      setPhotos(json.data || [])
    } finally {
      setLoading(false)
    }
  }, [assetId])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      for (const file of Array.from(files)) fd.append('files', file)
      const res = await fetch(`/api/assets/${assetId}/images`, { method: 'POST', credentials: 'include', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      showToast(`${files.length} photo${files.length > 1 ? 's' : ''} uploaded`)
      fetchPhotos()
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (photo: AssetPhoto) => {
    if (!confirm('Delete this photo?')) return
    try {
      const res = await fetch(`/api/assets/${assetId}/images/${photo.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('Delete failed')
      showToast('Photo deleted')
      fetchPhotos()
    } catch {
      showError('Failed to delete photo')
    }
  }

  const handleSetPrimary = async (photo: AssetPhoto) => {
    try {
      await fetch(`/api/assets/${assetId}/images/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ setPrimary: true }),
      })
      fetchPhotos()
    } catch {
      showError('Failed to set primary photo')
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Loading photos...</div>
  }

  return (
    <div className="space-y-4">
      {canManageAssets && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {uploading ? (
              <>
                <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                Uploading...
              </>
            ) : (
              '+ Upload Photos'
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">JPEG, PNG, WebP — max 10MB each</p>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 py-16 text-center">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">No photos yet</p>
          {canManageAssets && (
            <button onClick={() => fileInputRef.current?.click()} className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Upload the first photo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="relative group bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Asset photo"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightbox(photo.url)}
                onError={e => { (e.target as HTMLImageElement).src = '/placeholder-image.svg' }}
              />

              {photo.isPrimary && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Primary
                </div>
              )}

              {canManageAssets && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2 gap-1">
                  {!photo.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(photo)}
                      className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-medium hover:bg-yellow-300"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(photo)}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 ml-auto"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Asset photo enlarged"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
