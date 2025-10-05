"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

type Toast = { id: string; message: string }

const ToastContext = createContext<{
  toasts: Toast[]
  push: (message: string) => void
  remove: (id: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const push = (message: string) => {
    const id = Math.random().toString(36).slice(2, 9)
    const t = { id, message }
    setToasts((s) => [...s, t])
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4000)
  }

  const remove = (id: string) => setToasts((s) => s.filter((t) => t.id !== id))

  return (
    <ToastContext.Provider value={{ toasts, push, remove }}>
      {children}
      {/* Render toasts into document.body via portal to avoid stacking-context issues; apply very high z-index */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10000, pointerEvents: 'none' }}>
          {toasts.map((t) => (
            <div key={t.id} style={{ pointerEvents: 'auto' }} className="px-4 py-2 bg-black text-white rounded shadow">
              {t.message}
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
