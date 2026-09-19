'use client'

import { useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  /** Uncontrolled initial state. Ignored once `open`/`onOpenChange` are provided. */
  defaultOpen?: boolean
  /** Controlled mode — pass both to let a parent (e.g. a sibling section) react to this toggle. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Optional trailing content shown next to the title even while collapsed, e.g. an active-filter count. */
  badge?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * MBM-299 — generic collapsed-by-default section used to keep secondary
 * controls (action buttons, filters) out of the way on mobile until the
 * user explicitly asks for them. Works standalone (own internal state) or
 * controlled (pass `open`/`onOpenChange`) when a parent needs to keep two
 * sections in sync — e.g. a page's own extra filters toggling together with
 * UniversalInventoryGrid's built-in filter row.
 */
export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  badge,
  children,
  className = '',
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  function toggle() {
    const next = !open
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={toggle}
        className="flex items-center justify-between w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
      >
        <span className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
          {badge}
        </span>
        <span className="text-xs text-secondary shrink-0">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
