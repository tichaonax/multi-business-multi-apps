'use client'

import { useMemo, useState } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  loading?: boolean
}

// Compact page-number list with ellipses — always shows first, last, the
// current page, and a couple of neighbors, so it stays usable even with
// hundreds of pages instead of rendering every single page number.
function buildPageList(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1])
  const sorted = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
  const result: Array<number | '…'> = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push('…')
    result.push(p)
    prev = p
  }
  return result
}

/**
 * Shared pagination footer — total record count + numbered page buttons the
 * user can jump straight to, instead of the Previous/Next-only pagers
 * scattered across ~40 list pages in this app (none of which showed how
 * many more records existed or let you skip ahead).
 */
export function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange, loading }: PaginationProps) {
  const [jumpValue, setJumpValue] = useState('')
  const pageList = useMemo(() => buildPageList(currentPage, totalPages), [currentPage, totalPages])

  if (totalItems === 0) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  function goTo(page: number) {
    const clamped = Math.max(1, Math.min(totalPages, page))
    if (clamped !== currentPage) onPageChange(clamped)
  }

  function handleJumpSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(jumpValue, 10)
    if (!isNaN(n)) goTo(n)
    setJumpValue('')
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
      <div className="text-sm text-secondary">
        Showing <span className="font-medium text-primary">{startItem}–{endItem}</span> of{' '}
        <span className="font-medium text-primary">{totalItems}</span>
      </div>

      <div className="flex items-center gap-1 flex-wrap justify-center">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="px-2.5 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ‹ Prev
        </button>

        {pageList.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-secondary">…</span>
          ) : (
            <button
              key={p}
              onClick={() => goTo(p)}
              disabled={loading}
              aria-current={p === currentPage ? 'page' : undefined}
              className={`min-w-[2rem] px-2 py-1.5 text-sm rounded-md transition-colors disabled:cursor-not-allowed ${
                p === currentPage
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="px-2.5 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Next ›
        </button>

        {totalPages > 7 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-secondary whitespace-nowrap">Go to</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpValue}
              onChange={e => setJumpValue(e.target.value)}
              placeholder={String(currentPage)}
              className="w-14 px-1.5 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-primary"
            />
          </form>
        )}
      </div>
    </div>
  )
}
