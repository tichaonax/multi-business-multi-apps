'use client'

import React from 'react'
import { X } from 'lucide-react'
import { ModalPortal } from './modal-portal'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

interface DialogHeaderProps {
  className?: string
  children: React.ReactNode
}

interface DialogTitleProps {
  className?: string
  children: React.ReactNode
}

interface DialogDescriptionProps {
  className?: string
  children: React.ReactNode
}

interface DialogFooterProps {
  className?: string
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={() => onOpenChange(false)}
      />

      {/* Content */}
      <div className="relative z-[10000] w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {children}
      </div>
    </div>
    </ModalPortal>
  )
}

// `className` is expected to carry any max-height (e.g. "max-h-[90vh]") the
// caller wants — DialogContent turns that into a flex column with
// overflow-hidden so DialogHeader/DialogFooter (marked shrink-0 below) stay
// pinned while whatever the caller puts between them scrolls. The caller's
// own body wrapper still needs `overflow-y-auto flex-1 min-h-0` — this only
// supplies the outer shell and fixes the header/footer scroll-away bug.
export function DialogContent({ className = '', children }: DialogContentProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 relative z-[10001] overflow-hidden flex flex-col ${className}`}>
      {children}
    </div>
  )
}

export function DialogHeader({ className = '', children }: DialogHeaderProps) {
  return (
    <div className={`p-6 pb-4 shrink-0 ${className}`}>
      {children}
    </div>
  )
}

export function DialogTitle({ className = '', children }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold text-primary ${className}`}>
      {children}
    </h2>
  )
}

export function DialogDescription({ className = '', children }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-secondary mt-2 ${className}`}>
      {children}
    </p>
  )
}

export function DialogFooter({ className = '', children }: DialogFooterProps) {
  return (
    <div className={`p-6 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0 ${className}`}>
      {children}
    </div>
  )
}