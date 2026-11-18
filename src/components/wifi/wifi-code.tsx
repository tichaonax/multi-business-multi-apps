'use client'

/**
 * MBM-338 — WiFi codes shown in lists (Receipt History, WiFi expense account).
 *
 * - <WifiCodeCopy>: a highlighted code with a 📋 Copy button.
 * - <WifiCodeHover>: a small code pill; hovering it opens a card with the
 *   pass details and the copyable code (the card stays open while the
 *   pointer is over it, so Copy can be clicked).
 */
import { useState, useRef, useLayoutEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // older browsers / insecure context fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function CopyButton({ text, label = '📋 Copy', className = '' }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        if (await copyText(text)) {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }
      }}
      className={`shrink-0 text-xs px-2 py-0.5 rounded border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 ${className}`}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

export function WifiCodeCopy({ code, packageName }: { code: string; packageName?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950 px-3 py-2">
      <div className="min-w-0">
        {packageName && <div className="text-[11px] text-blue-700 dark:text-blue-300 truncate">📶 {packageName}</div>}
        <div className="font-mono text-lg font-bold tracking-wider text-blue-800 dark:text-blue-200 select-all">{code}</div>
      </div>
      <CopyButton text={code} />
    </div>
  )
}

export function WifiCodePill({ code }: { code: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
      {code}
    </span>
  )
}

export function WifiCodeHover({ code, packageName, details }: { code: string; packageName?: string | null; details?: ReactNode }) {
  // Portal + measured placement (like the row actions menu): below the pill
  // when it fits, otherwise above it — never cut off by the window edge or a
  // scrolling table.
  const [anchor, setAnchor] = useState<{ top: number; bottom: number; left: number } | null>(null)
  const [pos, setPos] = useState<{ top: number; above: boolean } | null>(null)
  const cardRef = useRef<HTMLSpanElement | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => { if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const scheduleClose = () => { cancelClose(); closeTimer.current = setTimeout(() => { setAnchor(null); setPos(null) }, 150) }

  useLayoutEffect(() => {
    if (!anchor || !cardRef.current) return
    const h = cardRef.current.offsetHeight
    const below = window.innerHeight - anchor.bottom - 8
    const above = anchor.top - 8
    setPos(h <= below || below >= above
      ? { top: anchor.bottom, above: false }
      : { top: Math.max(8, anchor.top - h), above: true })
  }, [anchor])

  return (
    <span
      className="inline-block align-middle"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={(e) => {
        cancelClose()
        const r = e.currentTarget.getBoundingClientRect()
        if (!anchor) setAnchor({ top: r.top, bottom: r.bottom, left: Math.max(8, Math.min(r.left, window.innerWidth - 272)) })
      }}
      onMouseLeave={scheduleClose}
    >
      <span className="cursor-help"><WifiCodePill code={code} /></span>
      {anchor && typeof document !== 'undefined' && createPortal(
        <span
          ref={cardRef}
          className={`fixed z-50 block ${pos?.above ? 'pb-1' : 'pt-1'}`}
          style={{ top: pos?.top ?? 0, left: anchor.left, visibility: pos ? 'visible' : 'hidden' }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="block w-64 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-3 space-y-2 text-left whitespace-normal">
            <WifiCodeCopy code={code} packageName={packageName} />
            {details && <span className="block text-xs text-gray-600 dark:text-gray-300 space-y-0.5">{details}</span>}
          </span>
        </span>,
        document.body
      )}
    </span>
  )
}
