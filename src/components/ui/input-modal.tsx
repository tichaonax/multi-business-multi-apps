"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type PromptOptions = {
  title?: string
  description?: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
}

type PromptContextValue = {
  prompt: (options: PromptOptions) => Promise<string | null>
}

const PromptContext = createContext<PromptContextValue | null>(null)

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    options: PromptOptions
    resolve: (value: string | null) => void
    value: string
  } | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setState({ options, resolve, value: options.defaultValue || '' })
    })
  }, [])

  useEffect(() => {
    if (state) {
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [state])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!state) return
      if (e.key === 'Escape') {
        e.preventDefault()
        state.resolve(null)
        setState(null)
      }
      if (e.key === 'Enter') {
        // prevent submitting when focus is not on input
        if (document.activeElement === inputRef.current) {
          e.preventDefault()
          state.resolve(state.value)
          setState(null)
        }
      }
    }
    if (state) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      {state && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { state.resolve(null); setState(null) }} />
          <div className="relative w-full max-w-lg rounded bg-white dark:bg-gray-800 p-6 shadow-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-primary">{state.options.title || 'Input'}</h3>
            {state.options.description && <p className="mt-2 text-sm text-secondary">{state.options.description}</p>}
            <div className="mt-4">
              <input
                ref={inputRef}
                className="w-full rounded border px-3 py-2"
                placeholder={state.options.placeholder}
                value={state.value}
                onChange={(e) => setState((s) => s ? { ...s, value: e.target.value } : s)}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded border px-4 py-2 text-sm bg-white dark:bg-gray-700" onClick={() => { state.resolve(null); setState(null) }}>{state.options.cancelText || 'Cancel'}</button>
              <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white" onClick={() => { state.resolve(state.value); setState(null) }}>{state.options.confirmText || 'OK'}</button>
            </div>
          </div>
        </div>
      )}
    </PromptContext.Provider>
  )
}

export function usePrompt() {
  const ctx = useContext(PromptContext)
  if (!ctx) throw new Error('usePrompt must be used within a PromptProvider')
  return ctx.prompt
}

export default PromptProvider
