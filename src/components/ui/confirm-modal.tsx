"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ConfirmOptions = {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  alertMode?: boolean // When true, shows only OK button
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: Omit<ConfirmOptions, 'cancelText' | 'alertMode'>) => Promise<void>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions | null
    resolve?: (value: boolean) => void
  } | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve })
    })
  }, [])

  const alert = useCallback((options: Omit<ConfirmOptions, 'cancelText' | 'alertMode'>) => {
    return new Promise<void>((resolve) => {
      setState({ 
        options: { ...options, alertMode: true }, 
        resolve: () => resolve() 
      })
    })
  }, [])

  const confirmRef = useRef<{ confirmButton?: HTMLButtonElement | null; cancelButton?: HTMLButtonElement | null } | null>(null)

  useEffect(() => {
    // When modal opens, focus the confirm button
    if (state && state.options) {
      const t = setTimeout(() => {
        confirmRef.current?.confirmButton?.focus()
      }, 0)
      return () => clearTimeout(t)
    }
    return
  }, [state])

  // Close handler resolves promise and clears state
  const handleClose = (result: boolean) => {
    if (state?.resolve) {
      if (state.options?.alertMode) {
        (state.resolve as () => void)()
      } else {
        (state.resolve as (value: boolean) => void)(result)
      }
    }
    setState(null)
  }

  // Keyboard handling: ESC cancels, Enter confirms
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!state) return
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose(state.options?.alertMode ? true : false)
      }
      if (e.key === 'Enter') {
        // Avoid triggering when focusing form elements
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return
        e.preventDefault()
        handleClose(true)
      }
    }
    if (state) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {state?.options && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => handleClose(false)} />
          <div className="relative w-full max-w-lg rounded bg-white dark:bg-gray-800 p-6 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 id="confirm-modal-title" className="text-lg font-semibold text-primary">{state.options.title || 'Confirm'}</h3>
            {state.options.description && (
              <p className="mt-3 text-sm text-secondary">{state.options.description}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              {!state.options.alertMode && (
                <button
                  ref={(el) => { if (!confirmRef.current) confirmRef.current = {}; confirmRef.current.cancelButton = el }}
                  className="rounded border px-4 py-2 text-sm bg-white dark:bg-gray-700"
                  onClick={() => handleClose(false)}
                >
                  {state.options.cancelText || 'Cancel'}
                </button>
              )}
              <button
                ref={(el) => { if (!confirmRef.current) confirmRef.current = {}; confirmRef.current.confirmButton = el }}
                className={`rounded px-4 py-2 text-sm text-white ${
                  state.options.alertMode ? 'bg-blue-600' : 'bg-red-600'
                }`}
                onClick={() => handleClose(true)}
              >
                {state.options.confirmText || (state.options.alertMode ? 'OK' : 'Yes, proceed')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider')
  return ctx.confirm
}

export function useAlert() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useAlert must be used within a ConfirmProvider')
  return ctx.alert
}

export default ConfirmProvider
