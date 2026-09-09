'use client'

import { useState, useEffect } from 'react'
import { useToastContext } from '@/components/ui/toast'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface CategoryOption {
  id: string
  name: string
  emoji: string | null
  domainId: string | null
  domain: { id: string; name: string; emoji: string } | null
  attributes: { isGroup?: boolean } | null
  parent: { id: string; name: string; emoji: string | null } | null
}

interface Props {
  businessId: string
  businessType: string
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
export function ReferencePoolBulkUploadModal({ businessId, businessType, domains, defaultDomainId, onClose }: Props) {
  const toast = useToastContext()
  const [domainId, setDomainId] = useState(defaultDomainId || domains[0]?.id || '')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: string[] } | null>(null)

  // Fetched once, across every domain -- picking a category is now the
  // primary action (search "Blouses" directly rather than first having to
  // already know it lives under "Women's"), with the domain auto-derived
  // from whichever category gets picked. The domain-only path (upload for a
  // whole domain, no specific category) still exists via the Domain field
  // below for the cases that genuinely have no finer category to tag.
  useEffect(() => {
    setLoadingCategories(true)
    fetch(`/api/inventory/categories?businessId=${businessId}&businessType=${businessType}`)
      .then(r => r.ok ? r.json() : { categories: [] })
      .then(d => {
        // Group-header rows (the 51 clothing "Tops"/"Bottoms"/... parents,
        // and any future equivalents) exist only to organize real categories
        // under a heading -- they're never themselves a taggable category,
        // so they're excluded here the same way leaf-category pickers
        // elsewhere already do (see /api/admin/clothing/categories's
        // includeGroups handling).
        // Also excludes the small number of real leaf categories with no
        // domain at all -- the upload endpoint always requires a matching
        // domainId for a tagged category (see its own domainId check), so a
        // domainless category could never actually be submitted here.
        const leaves = ((d.categories ?? []) as CategoryOption[]).filter(
          c => !(c.attributes && c.attributes.isGroup === true) && !!c.domainId
        )
        setCategories(leaves)
      })
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false))
  }, [businessId, businessType])

  function handleCategoryChange(newCategoryId: string) {
    setCategoryId(newCategoryId)
    if (!newCategoryId) return
    // The server rejects a category/domain pair that doesn't match, so the
    // domain field is driven from whichever category was actually picked
    // rather than requiring that as a separate manual step first.
    const category = categories.find(c => c.id === newCategoryId)
    if (category?.domainId) setDomainId(category.domainId)
  }

  function handleDomainChange(newDomainId: string) {
    setDomainId(newDomainId)
    // Manually switching the domain away from the selected category's own
    // domain would leave a mismatched pair the server would reject -- clear
    // the category rather than silently leaving that invalid combination in
    // place. This is also how a deliberate "actually, whole domain, no
    // specific category" change happens.
    const category = categories.find(c => c.id === categoryId)
    if (category && category.domainId !== newDomainId) setCategoryId('')
  }

  async function handleUpload() {
    if (!domainId || files.length === 0) return
    setUploading(true)
    setResult(null)
    try {
      const form = new FormData()
      files.forEach(f => form.append('files', f))
      form.append('domainId', domainId)
      if (categoryId) form.append('categoryId', categoryId)

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

        {/* The Domain/Category pickers below only reveal categories one
            domain at a time -- no way to see the whole tree (including the
            new parent-grouped clothing categories) before picking one. Link
            out to the existing full category browser rather than building a
            second one here. */}
        <a
          href={`/business/inventory-categories?businessType=${businessType}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          🔎 Browse all {businessType} categories (opens in a new tab)
        </a>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Category (optional)</label>
          <SearchableSelect
            options={categories.map(c => ({
              id: c.id,
              label: `${c.emoji ?? ''} ${c.name}`.trim() + (c.domain ? ` · ${c.domain.emoji ?? ''} ${c.domain.name}`.trim() : ''),
              parentName: c.parent?.name ?? c.domain?.name ?? null,
            }))}
            value={categoryId}
            onChange={handleCategoryChange}
            placeholder="Search any category…"
            searchPlaceholder="Search categories…"
            loading={loadingCategories}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-secondary mb-1">Domain</label>
          <SearchableSelect
            required
            options={domains.map(d => ({ id: d.id, label: `${d.emoji} ${d.name}` }))}
            value={domainId}
            onChange={handleDomainChange}
            placeholder="Select a domain…"
            searchPlaceholder="Search domains…"
          />
          {categoryId && (
            <p className="text-[11px] text-secondary mt-1">Auto-filled from the selected category</p>
          )}
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
