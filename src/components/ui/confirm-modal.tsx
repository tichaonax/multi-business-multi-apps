"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ConfirmOptions = {
  title?: string
  description?: string | React.ReactNode
  confirmText?: string
  cancelText?: string
  alertMode?: boolean // When true, shows only OK button
  onOK?: () => void  // Called synchronously when OK is clicked (alertMode only)
}

type PromptOptions = {
  title?: string
  description?: string | React.ReactNode
  placeholder?: string
  defaultValue?: string
  inputType?: 'text' | 'number'
  confirmText?: string
  cancelText?: string
  validator?: (value: string) => string | null // Returns error message or null if valid
}

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: Omit<ConfirmOptions, 'cancelText' | 'alertMode'>) => Promise<void>
  prompt: (options: PromptOptions) => Promise<string | null>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions | null
    resolve?: (value: boolean) => void
  } | null>(null)

  const [promptState, setPromptState] = useState<{
    options: PromptOptions | null
    resolve?: (value: string | null) => void
  } | null>(null)

  const [promptValue, setPromptValue] = useState('')
  const [promptError, setPromptError] = useState<string | null>(null)

  // Drag state for floating alert modal
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve })
    })
  }, [])

  const alert = useCallback((options: Omit<ConfirmOptions, 'cancelText' | 'alertMode'>) => {
    return new Promise<void>((resolve) => {
      setDragPos({ x: 0, y: 0 })
      setState({
        options: { ...options, alertMode: true },
        resolve: () => resolve()
      })
    })
  }, [])

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(options.defaultValue || '')
      setPromptError(null)
      setPromptState({ options, resolve })
    })
  }, [])

  const confirmRef = useRef<{ confirmButton?: HTMLButtonElement | null; cancelButton?: HTMLButtonElement | null } | null>(null)

  useEffect(() => {
    if (state && state.options) {
      const t = setTimeout(() => {
        confirmRef.current?.confirmButton?.focus()
      }, 0)
      return () => clearTimeout(t)
    }
    return
  }, [state])

  // Drag handlers (alert mode only)
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, originX: dragPos.x, originY: dragPos.y }
    e.preventDefault()
  }, [dragPos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return
      setDragPos({
        x: dragRef.current.originX + e.clientX - dragRef.current.startX,
        y: dragRef.current.originY + e.clientY - dragRef.current.startY,
      })
    }
    const onUp = () => { dragRef.current.dragging = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Close handler resolves promise and clears state
  const handleClose = (result: boolean) => {
    const onOK = state?.options?.onOK
    if (state?.resolve) {
      if (state.options?.alertMode) {
        (state.resolve as () => void)()
      } else {
        (state.resolve as (value: boolean) => void)(result)
      }
    }
    setState(null)
    if (result && onOK) onOK()
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
        const active = document.activeElement
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return
        e.preventDefault()
        handleClose(true)
      }
    }
    if (state) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  // Handle prompt close
  const handlePromptClose = (confirmed: boolean) => {
    if (promptState?.resolve) {
      if (confirmed) {
        // Validate if validator provided
        if (promptState.options?.validator) {
          const error = promptState.options.validator(promptValue)
          if (error) {
            setPromptError(error)
            return // Don't close, show error
          }
        }
        promptState.resolve(promptValue)
      } else {
        promptState.resolve(null)
      }
    }
    setPromptState(null)
    setPromptValue('')
    setPromptError(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm, alert, prompt }}>
      {children}

      {/* Confirm/Alert Modal */}
      {state?.options && (
        state.options.alertMode ? (
          // Floating draggable alert — no backdrop so page stays interactive
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="fixed z-[100000] w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 select-none"
            style={{
              top: '50%',
              left: '50%',
              transform: `translate(calc(-50% + ${dragPos.x}px), calc(-50% + ${dragPos.y}px))`,
            }}
          >
            {/* Drag handle */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-move rounded-t-lg bg-gray-50 dark:bg-gray-900"
              onMouseDown={handleDragStart}
            >
              <svg className="w-3 h-3 text-gray-400 shrink-0" viewBox="0 0 10 16" fill="currentColor">
                <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
              </svg>
              <h3 id="confirm-modal-title" className="text-sm font-semibold text-primary flex-1">{state.options.title || 'Notice'}</h3>
            </div>
            {state.options.description && (
              <div className="px-4 py-3 text-sm text-secondary">{state.options.description}</div>
            )}
            <div className="px-4 py-3 flex justify-end border-t border-gray-200 dark:border-gray-700">
              <button
                ref={(el) => { if (!confirmRef.current) confirmRef.current = {}; confirmRef.current.confirmButton = el }}
                className="rounded px-5 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => handleClose(true)}
              >
                {state.options.confirmText || 'OK'}
              </button>
            </div>
          </div>
        ) : (
          // Standard blocking confirm modal
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            className="fixed inset-0 z-[100000] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => handleClose(false)} />
            <div className="relative w-full max-w-lg rounded bg-white dark:bg-gray-800 p-6 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 id="confirm-modal-title" className="text-lg font-semibold text-primary">{state.options.title || 'Confirm'}</h3>
              {state.options.description && (
                <div className="mt-3 text-sm text-secondary">{state.options.description}</div>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  ref={(el) => { if (!confirmRef.current) confirmRef.current = {}; confirmRef.current.cancelButton = el }}
                  className="rounded border px-4 py-2 text-sm bg-white dark:bg-gray-700"
                  onClick={() => handleClose(false)}
                >
                  {state.options.cancelText || 'Cancel'}
                </button>
                <button
                  ref={(el) => { if (!confirmRef.current) confirmRef.current = {}; confirmRef.current.confirmButton = el }}
                  className="rounded px-4 py-2 text-sm text-white bg-red-600"
                  onClick={() => handleClose(true)}
                >
                  {state.options.confirmText || 'Yes, proceed'}
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Prompt Modal */}
      {promptState?.options && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prompt-modal-title"
          className="fixed inset-0 z-[100000] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => handlePromptClose(false)} />
          <div className="relative w-full max-w-lg rounded bg-white dark:bg-gray-800 p-6 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 id="prompt-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {promptState.options.title || 'Input Required'}
            </h3>
            {promptState.options.description && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                {promptState.options.description}
              </div>
            )}
            <div className="mt-4">
              <input
                type={promptState.options.inputType || 'text'}
                value={promptValue}
                onChange={(e) => {
                  setPromptValue(e.target.value)
                  setPromptError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handlePromptClose(true)
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    handlePromptClose(false)
                  }
                }}
                placeholder={promptState.options.placeholder}
                className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  promptError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                autoFocus
              />
              {promptError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{promptError}</p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                onClick={() => handlePromptClose(false)}
              >
                {promptState.options.cancelText || 'Cancel'}
              </button>
              <button
                className="rounded px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700"
                onClick={() => handlePromptClose(true)}
              >
                {promptState.options.confirmText || 'OK'}
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

export function usePrompt() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('usePrompt must be used within a ConfirmProvider')
  return ctx.prompt
}

export default ConfirmProvider
