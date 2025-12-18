"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type Toast = {
  id: string
  message: string
  type?: ToastType
  duration?: number // milliseconds, 0 = requires manual dismiss
  requireDismiss?: boolean // If true, user must click to dismiss
}

type PushOptions = {
  type?: ToastType
  duration?: number
  requireDismiss?: boolean
}

const ToastContext = createContext<{
  toasts: Toast[]
  push: (message: string, options?: PushOptions) => void
  remove: (id: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const push = (message: string, options?: PushOptions) => {
    const id = Math.random().toString(36).slice(2, 9)
    const type = options?.type || 'success'
    const requireDismiss = options?.requireDismiss || false
    const duration = options?.duration !== undefined ? options.duration : 4000

    const t: Toast = {
      id,
      message,
      type,
      duration,
      requireDismiss
    }

    setToasts((s) => [...s, t])

    // Auto-dismiss only if not requireDismiss and duration > 0
    if (!requireDismiss && duration > 0) {
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), duration)
    }
  }

  const remove = (id: string) => setToasts((s) => s.filter((t) => t.id !== id))

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'error':
        return 'bg-red-600 dark:bg-red-700 border-red-500 dark:border-red-600'
      case 'warning':
        return 'bg-yellow-600 dark:bg-yellow-700 border-yellow-500 dark:border-yellow-600'
      case 'info':
        return 'bg-blue-600 dark:bg-blue-700 border-blue-500 dark:border-blue-600'
      case 'success':
      default:
        return 'bg-green-600 dark:bg-green-700 border-green-500 dark:border-green-600'
    }
  }

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
      case 'success':
      default:
        return '✅'
    }
  }

  return (
    <ToastContext.Provider value={{ toasts, push, remove }}>
      {children}
      {/* Render toasts into document.body via portal to avoid stacking-context issues; apply very high z-index */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10000, pointerEvents: 'none', maxWidth: '400px' }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{ pointerEvents: 'auto' }}
              className={`px-4 py-3 text-white rounded-lg shadow-lg border flex items-start gap-2 ${getToastStyles(t.type || 'success')}`}
            >
              <span className="text-lg flex-shrink-0">{getToastIcon(t.type || 'success')}</span>
              <div className="flex-1 whitespace-pre-wrap break-words">{t.message}</div>
              {(t.requireDismiss || t.duration === 0) && (
                <button
                  onClick={() => remove(t.id)}
                  className="flex-shrink-0 ml-2 text-white hover:text-gray-200 font-bold text-xl leading-none"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}

export default ToastProvider
