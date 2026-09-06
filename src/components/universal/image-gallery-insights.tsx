'use client'

import { useState, useEffect } from 'react'

interface MostUsedImage { id: string; url: string; usageCount: number }
interface TurnoverImage { id: string; url: string; productId: string; productName: string; unitsSold: number }
interface LowStockImage { id: string; url: string; productId: string; productName: string; stockLabel: string }

interface AnalyticsData {
  mostUsed: MostUsedImage[]
  highTurnoverImages: TurnoverImage[]
  lowStockImages: LowStockImage[]
  turnoverWindowDays: number
}

function Row({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-secondary mb-2">{title}</p>
      {children.length === 0 ? (
        <p className="text-sm text-secondary">{empty}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">{children}</div>
      )}
    </div>
  )
}

/**
 * Business Image Gallery analytics panel (MBM-294 Phase 10) — a starting cut
 * of "most-used images" and "high-turnover / low-stock" correlation, not a
 * locked spec (see plan §12).
 */
export function ImageGalleryInsights({ businessId, onSelectImage }: { businessId: string; onSelectImage: (imageId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setData(null)
    if (!open || !businessId) return
    setLoading(true)
    fetch(`/api/business/${businessId}/images/analytics`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [open, businessId])

  return (
    <div className="card mb-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary"
      >
        <span>📊 Insights</span>
        <span className="text-secondary">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-gray-200 dark:border-gray-700 pt-4">
          {loading || !data ? (
            <p className="text-sm text-secondary">Loading…</p>
          ) : (
            <>
              <Row title="Most-used images" empty="No image is linked to more than one item yet.">
                {data.mostUsed.map(img => (
                  <button key={img.id} onClick={() => onSelectImage(img.id)} className="flex-shrink-0 w-20 text-center">
                    <img src={img.url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                    <span className="text-xs text-secondary">used by {img.usageCount}</span>
                  </button>
                ))}
              </Row>

              <Row title={`High-turnover items (last ${data.turnoverWindowDays} days)`} empty="No sales in this window yet.">
                {data.highTurnoverImages.map(img => (
                  <button key={img.id} onClick={() => onSelectImage(img.id)} className="flex-shrink-0 w-24 text-center">
                    <img src={img.url} alt="" className="w-20 h-20 mx-auto object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                    <span className="text-xs text-secondary block truncate" title={img.productName}>{img.productName}</span>
                    <span className="text-[10px] text-secondary">{img.unitsSold} sold</span>
                  </button>
                ))}
              </Row>

              <Row title="Images on low-stock/out-of-stock items" empty="Nothing linked here is running low.">
                {data.lowStockImages.map(img => (
                  <button key={img.id} onClick={() => onSelectImage(img.id)} className="flex-shrink-0 w-24 text-center">
                    <img src={img.url} alt="" className="w-20 h-20 mx-auto object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                    <span className="text-xs text-secondary block truncate" title={img.productName}>{img.productName}</span>
                    <span className="text-[10px] text-orange-600">{img.stockLabel}</span>
                  </button>
                ))}
              </Row>
            </>
          )}
        </div>
      )}
    </div>
  )
}
