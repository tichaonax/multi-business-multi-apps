'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface ReassignmentHistoryEntry {
  fromEmployeeName: string
  toEmployeeName: string
  reason: string
  reassignedAt: string
  reassignedByName: string | null
}

interface ReassignmentHistoryBadgeProps {
  history: ReassignmentHistoryEntry[]
}

export function ReassignmentHistoryBadge({ history }: ReassignmentHistoryBadgeProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close on outside click (covers click-to-open on touch devices)
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!history || history.length === 0) return null

  const show = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    setOpen(true)
  }

  const formatDate = (d: string) => new Date(d).toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <span className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onClick={() => (open ? setOpen(false) : show())}
        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50"
        title="Reassigned"
      >
        ↺ Reassigned{history.length > 1 ? ` ×${history.length}` : ''}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
          onMouseEnter={show}
          onMouseLeave={() => setOpen(false)}
          className="w-80 max-w-[90vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 space-y-2 text-left"
        >
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Reassignment History
          </p>
          {history.map((h, i) => (
            <div key={i} className={i > 0 ? 'pt-2 border-t border-gray-100 dark:border-gray-700' : ''}>
              <p className="text-xs text-gray-900 dark:text-white">
                <span className="font-medium">{h.fromEmployeeName}</span>
                {' → '}
                <span className="font-medium">{h.toEmployeeName}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{h.reason}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                {formatDate(h.reassignedAt)}{h.reassignedByName ? ` · by ${h.reassignedByName}` : ''}
              </p>
            </div>
          ))}
        </div>,
        document.body
      )}
    </span>
  )
}
