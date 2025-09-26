"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

type Toast = { id: string; message: string }

const ToastContext = createContext<{
  toasts: Toast[]
  push: (message: string) => void
  remove: (id: string) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

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
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="px-4 py-2 bg-black text-white rounded shadow">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider')
  return ctx
}

export default ToastProvider
