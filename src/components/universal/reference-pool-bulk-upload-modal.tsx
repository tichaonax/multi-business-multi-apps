'use client'

import { useState } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Props {
  businessId: string
  domains: Array<{ id: string; name: string; emoji: string }>
  defaultDomainId: string
  /** Called on close; `uploaded` is true if at least one image was added —
   * worth refreshing the pool grid/domain counts. */
  onClose: (uploaded: boolean) => void
}

/**
 * Bulk-add images to the shared category reference pool (MBM-294) — the UI
 * counterpart to the one-time `mbm294-import-categories-and-images.js`
 * script, so the pool can keep growing without a developer running a script
 * by hand every time.
 */
export function ReferencePoolBulkUploadModal({ businessId, domains, defaultDomainId, onClose }: Props) {
  const toast = useToastContext()
  const [domainId, setDomainId] = useState(defaultDomainId || domains[0]?.id || '')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null)

  async function handleUpload() {
    if (!domainId || files.length === 0) return
    setUploading(true)
    setResult(null)
    try {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      form.append('domainId', domainId)

      const res = await fetch(`/api/business/${businessId}/images/reference-pool/bulk-upload`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')

      setResult({ created: data.created, skipped: data.skipped ?? [] })
      setFiles([])
      if (data.created > 0) toast.push(`${data.created} image${data.created === 1 ? '' : 's'} added to the pool`)
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onClose(!!result && result.created > 0)}>
      <div className="card w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-primary">⬆️ Bulk Upload to Reference Pool</h3>
          <button onClick={() => onClose(!!result && result.created > 0)} className="text-secondary hover:text-primary text-lg leading-none">✕</button>
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Category</label>
          <SearchableSelect
            required
            options={domains.map(d => ({ id: d.id, label: `${d.emoji} ${d.name}` }))}
            value={domainId}
            onChange={setDomainId}
            placeholder="Select a category…"
            searchPlaceholder="Search categories…"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Images</label>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            onChange={e => setFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm text-secondary file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
          />
          {files.length > 0 && <p className="text-xs text-secondary mt-1">{files.length} file{files.length === 1 ? '' : 's'} selected</p>}
        </div>

        {result && (
          <div className="text-xs space-y-1">
            <p className="text-green-600">{result.created} added</p>
            {result.skipped.length > 0 && (
              <div className="text-orange-600">
                <p>{result.skipped.length} skipped:</p>
                <ul className="list-disc list-inside">
                  {result.skipped.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !domainId || files.length === 0}
          className="block w-full text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>

        <button onClick={() => onClose(!!result && result.created > 0)} className="w-full text-center py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-secondary hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
          Close
        </button>
      </div>
    </div>
  )
}
