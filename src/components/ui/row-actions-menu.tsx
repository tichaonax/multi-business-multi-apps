'use client'

import { useState, useRef, useEffect, CSSProperties, ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface RowAction {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
  /** Red styling for destructive actions like Delete */
  destructive?: boolean
}

interface RowActionsMenuProps {
  actions: RowAction[]
}

/**
 * Single "⋮" trigger that opens a portal-positioned dropdown listing all row
 * actions. Replaces a horizontal row of icon buttons in a table cell -- that
 * approach doesn't scale (every new action makes the Actions column wider,
 * squeezing whatever's next to it) and this does, since the column width
 * never changes no matter how many actions exist.
 *
 * Positioned via a fixed-position portal to document.body, flipping upward
 * near the bottom of the viewport -- same technique as SearchableSelect,
 * needed because a table row can sit anywhere in a long scrollable body and
 * a plain `absolute` dropdown would get clipped by the table's own overflow.
 */
export function RowActionsMenu({ actions }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const updatePosition = () => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const menuWidth = 220
    // No max-height / scrolling here on purpose -- the menu always renders
    // at its full natural height so every action is visible at once. Only
    // decide which side (above/below the trigger) has more room, to reduce
    // how far off-screen it can run, not to cap or scroll it.
    const estimatedHeight = actions.length * 36 + 8
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top

    if (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) {
      setStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top,
        right: window.innerWidth - rect.right,
        width: menuWidth,
        zIndex: 9999,
      })
    } else {
      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
        width: menuWidth,
        zIndex: 9999,
      })
    }
  }

  useEffect(() => {
    if (!open) return
    updatePosition()

    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (buttonRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (actions.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg leading-none"
        title="Actions"
      >
        ⋮
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={style}
          className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              title={action.title}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                action.onClick()
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed ${
                action.destructive ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <span className="text-base leading-none w-5 text-center shrink-0">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
